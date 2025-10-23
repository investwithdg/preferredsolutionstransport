import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createHubSpotClient, sendHubSpotEmail, findDealByOrderId, updateHubSpotDeal } from '@/lib/hubspot/client';
import { driverAssignedEmail } from '@/lib/hubspot/emails';
import { sendPushNotification, type PushSubscription } from '@/lib/webpush/config';
import { mapOrderToDealProperties } from '@/lib/hubspot/property-mappings';
import type { OrderSyncData } from '@/lib/hubspot/types';
import { z } from 'zod';
import { assignDriverSchema } from '@/lib/validations';
import { notifyDriverAssignment, notifyOrderStatusChange } from '@/lib/notifications/dispatcher';

const assignDriverSchemaLocal = assignDriverSchema;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const { orderId, driverId } = assignDriverSchemaLocal.parse(body);

    // Create Supabase client with service role
    const supabase = createServiceRoleClient();

    // Verify the order exists and is in the correct status
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order lookup error:', orderError);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Only allow assignment for orders that are ReadyForDispatch
    if (order.status !== 'ReadyForDispatch') {
      return NextResponse.json(
        { error: 'Order is not ready for dispatch' },
        { status: 400 }
      );
    }

    // Verify the driver exists and get push subscription
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('id, name, push_subscription')
      .eq('id', driverId)
      .single();

    if (driverError || !driver) {
      console.error('Driver lookup error:', driverError);
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      );
    }

    // Assign the driver to the order and update status
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        driver_id: driverId,
        status: 'Assigned',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select(`
        *,
        drivers (id, name, phone, vehicle_details),
        customers (id, name, email),
        quotes (pickup_address, dropoff_address, distance_mi)
      `)
      .single();

    if (updateError) {
      console.error('Order assignment error:', updateError);
      return NextResponse.json(
        { error: 'Failed to assign driver to order' },
        { status: 500 }
      );
    }

    // Log the assignment event
    const { error: eventError } = await supabase
      .from('dispatch_events')
      .insert({
        order_id: orderId,
        actor: 'dispatcher', // In a future milestone, this would be the actual dispatcher's ID
        event_type: 'driver_assigned',
        payload: {
          driver_id: driverId,
          driver_name: driver.name,
          previous_status: 'ReadyForDispatch',
          new_status: 'Assigned'
        },
        source: 'dispatcher_ui',
        event_id: `assign_${orderId}_${driverId}_${Date.now()}`
      });

    if (eventError) {
      // Log the error but don't fail the request
      console.error('Failed to log assignment event:', eventError);
    }

    // Send notifications about driver assignment
    try {
      const driverData = updatedOrder.drivers as any;
      const customerData = updatedOrder.customers as any;
      const quotesData = updatedOrder.quotes as any;
      
      // Notify driver about new assignment (stub for now)
      await notifyDriverAssignment({
        driverId,
        orderId,
        customerName: customerData?.name || 'Customer',
        pickupAddress: quotesData?.pickup_address || 'N/A',
        dropoffAddress: quotesData?.dropoff_address || 'N/A',
        distance: quotesData?.distance_mi,
        driverName: driverData?.name,
        driverEmail: driverData?.email,
        driverPhone: driverData?.phone,
      });
      
      // Notify customer about driver assignment (stub for now)
      await notifyOrderStatusChange({
        orderId,
        customerId: customerData?.id || '',
        customerName: customerData?.name,
        customerEmail: customerData?.email,
        customerPhone: customerData?.phone,
        previousStatus: 'ReadyForDispatch',
        newStatus: 'Assigned',
        driverName: driverData?.name,
      });
    } catch (notificationError) {
      // Log error but don't fail the request
      console.error('Failed to send notification stubs:', notificationError);
    }

    // Send push notification to driver
    if (driver.push_subscription) {
      try {
        const subscription = driver.push_subscription as PushSubscription;
        const quotes = updatedOrder.quotes as any;
        
        await sendPushNotification(subscription, {
          title: '🚚 New Delivery Assignment',
          body: `Order #${orderId.slice(-8)} - ${quotes?.pickup_address || 'Pickup'} to ${quotes?.dropoff_address || 'Dropoff'}`,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: `order-${orderId}`,
          url: '/driver',
          data: {
            orderId,
            type: 'order_assigned'
          }
        });

        // Log push notification event
        await supabase
          .from('dispatch_events')
          .insert({
            order_id: orderId,
            actor: 'system',
            event_type: 'push_notification_sent',
            payload: {
              notification_type: 'driver_assigned',
              driver_id: driverId,
            },
            source: 'webpush',
            event_id: `push_${orderId}_driver_assigned_${Date.now()}`,
          });
      } catch (pushError) {
        // Log error but don't fail the request
        console.error('Failed to send push notification:', pushError);
      }
    }

    // Update HubSpot deal with driver assignment
    const hubspotClient = createHubSpotClient();
    if (hubspotClient) {
      try {
        // Find the deal by order ID
        const dealId = await findDealByOrderId(hubspotClient, orderId);
        
        if (dealId) {
          const driver = updatedOrder.drivers as any;
          const customer = updatedOrder.customers as any;
          const quotes = updatedOrder.quotes as any;
          
          // Create order sync data for property mapping
          const orderSyncData: OrderSyncData = {
            orderId: updatedOrder.id,
            customerId: updatedOrder.customer_id!,
            customerEmail: customer?.email || '',
            customerName: customer?.name || undefined,
            customerPhone: customer?.phone || undefined,
            priceTotal: updatedOrder.price_total || 0,
            currency: updatedOrder.currency || 'usd',
            status: updatedOrder.status,
            pickupAddress: quotes?.pickup_address || undefined,
            dropoffAddress: quotes?.dropoff_address || undefined,
            distanceMiles: quotes?.distance_mi || undefined,
            driverId: updatedOrder.driver_id || undefined,
            driverName: driver?.name || undefined,
            driverPhone: driver?.phone || undefined,
            createdAt: new Date(updatedOrder.created_at || new Date().toISOString()),
            updatedAt: new Date(updatedOrder.updated_at || new Date().toISOString()),
            
            // Driver/Vehicle properties
            vehicleType: driver?.vehicle_details?.type || 'van', // Default to van if not specified
            
            // Preserve delivery details from original order
            deliveryRoute: quotes?.pickup_address && quotes?.dropoff_address 
              ? `${quotes.pickup_address} → ${quotes.dropoff_address}`
              : undefined,
            deliveryLocation: quotes?.dropoff_address || undefined,
            
            // Quote properties remain the same
            quoteSent: true,
            quoteStatus: 'accepted',
          };
          
          // Map to deal properties and update
          const dealProperties = mapOrderToDealProperties(orderSyncData);
          const updated = await updateHubSpotDeal(hubspotClient, dealId, dealProperties);
          
          if (updated) {
            console.log(`Updated HubSpot deal ${dealId} with driver assignment`);
          } else {
            console.warn(`Failed to update HubSpot deal ${dealId}`);
          }
        } else {
          console.warn(`No HubSpot deal found for order ${orderId}`);
        }
      } catch (hubspotError) {
        console.error('Failed to update HubSpot deal:', hubspotError);
        // Don't fail the request if HubSpot update fails
      }
    }

    // Send driver assignment email to customer
    if (hubspotClient && updatedOrder.customers?.email && updatedOrder.drivers) {
      const customer = updatedOrder.customers as any;
      const driver = updatedOrder.drivers as any;
      const quotes = updatedOrder.quotes as any;
      
      const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/track/${orderId}`;
      const emailTemplate = driverAssignedEmail(
        {
          orderId: updatedOrder.id,
          customerName: customer.name || 'Customer',
          customerEmail: customer.email,
          pickupAddress: quotes?.pickup_address || 'N/A',
          dropoffAddress: quotes?.dropoff_address || 'N/A',
          distance: quotes?.distance_mi || 0,
          priceTotal: updatedOrder.price_total || 0,
          currency: updatedOrder.currency || 'usd',
          trackingUrl,
          createdAt: new Date(updatedOrder.created_at || new Date().toISOString()),
        },
        {
          name: driver.name,
          phone: driver.phone || 'N/A',
          vehicleDetails: driver.vehicle_details 
            ? JSON.stringify(driver.vehicle_details) 
            : undefined,
        }
      );

      const emailSent = await sendHubSpotEmail(hubspotClient, {
        to: customer.email,
        subject: emailTemplate.subject,
        htmlContent: emailTemplate.html,
      });

      // Log email event
      if (emailSent) {
        await supabase
          .from('dispatch_events')
          .insert({
            order_id: orderId,
            actor: 'system',
            event_type: 'email_sent',
            payload: {
              email_type: 'driver_assigned',
              recipient: customer.email,
            },
            source: 'hubspot_email',
            event_id: `email_${orderId}_driver_assigned_${Date.now()}`,
          });
      }
    }

    return NextResponse.json({
      message: 'Driver assigned successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Driver assignment API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
