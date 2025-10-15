import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createHubSpotClient, sendHubSpotEmail, findDealByOrderId, updateHubSpotDeal } from '@/lib/hubspot/client';
import { statusUpdateEmail, formatStatusDisplay } from '@/lib/hubspot/emails';
import { mapOrderToDealProperties } from '@/lib/hubspot/property-mappings';
import type { OrderSyncData } from '@/lib/hubspot/types';
import { z } from 'zod';
import { updateOrderStatusSchema } from '@/lib/validations';

const updateStatusSchema = updateOrderStatusSchema;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    const body = await request.json();
    
    // Validate input
    const { status, notes } = updateStatusSchema.parse(body);

    // Create Supabase client with service role
    const supabase = createServiceRoleClient();

    // Get the current order with driver info
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        drivers (id, name, user_id),
        customers (id, name, email),
        quotes (pickup_address, dropoff_address, distance_mi)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order lookup error:', orderError);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // In a production app, we would verify that the authenticated user
    // is the driver assigned to this order. For now, we'll skip auth.
    // TODO: Add proper driver authentication in a future milestone

    // Update the order status
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select(`
        *,
        drivers (id, name, phone),
        customers (id, name, email),
        quotes (pickup_address, dropoff_address, distance_mi)
      `)
      .single();

    if (updateError) {
      console.error('Order status update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update order status' },
        { status: 500 }
      );
    }

    // Log the status change event
    const { error: eventError } = await supabase
      .from('dispatch_events')
      .insert({
        order_id: orderId,
        actor: order.drivers?.name || 'driver', // In production, this would be the authenticated driver's name
        event_type: 'status_updated',
        payload: {
          previous_status: order.status,
          new_status: status,
          notes: notes || null,
          driver_id: order.driver_id
        },
        source: 'driver_app',
        event_id: `status_${orderId}_${status}_${Date.now()}`
      });

    if (eventError) {
      // Log the error but don't fail the request
      console.error('Failed to log status change event:', eventError);
    }

    // Update HubSpot deal with new status
    const hubspotClient = createHubSpotClient();
    if (hubspotClient) {
      try {
        // Find the deal by order ID
        const dealId = await findDealByOrderId(hubspotClient, orderId);
        
        if (dealId) {
          const customer = updatedOrder.customers as any;
          const quotes = updatedOrder.quotes as any;
          const driver = updatedOrder.drivers as any;
          
          // Create order sync data for property mapping
          const orderSyncData: OrderSyncData = {
            orderId: updatedOrder.id,
            customerId: updatedOrder.customer_id,
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
            vehicleType: driver?.vehicle_details?.type || 'van',
            
            // Preserve delivery details
            deliveryRoute: quotes?.pickup_address && quotes?.dropoff_address 
              ? `${quotes.pickup_address} → ${quotes.dropoff_address}`
              : undefined,
            deliveryLocation: quotes?.dropoff_address || undefined,
            quoteSent: true,
            quoteStatus: 'accepted',
            
            // Set actual times based on status
            actualPickupTime: status === 'PickedUp' ? new Date() : undefined,
            actualDeliveryTime: status === 'Delivered' ? new Date() : undefined,
            
            // Handle exception data if provided in notes
            deliveryExceptionType: status === 'Canceled' ? 'customer_canceled' : undefined,
            deliveryExceptionNotes: status === 'Canceled' && notes ? notes : undefined,
            deliveryResolutionStatus: status === 'Canceled' ? 'unresolved' : undefined,
          };
          
          // Map to deal properties and update
          const dealProperties = mapOrderToDealProperties(orderSyncData);
          const updated = await updateHubSpotDeal(hubspotClient, dealId, dealProperties);
          
          if (updated) {
            console.log(`Updated HubSpot deal ${dealId} with status change to ${status}`);
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

    // Send status update email for key status changes
    const emailStatuses = ['PickedUp', 'InTransit', 'Delivered'];
    
    if (hubspotClient && emailStatuses.includes(status) && updatedOrder.customers?.email) {
      const customer = updatedOrder.customers as any;
      const quotes = updatedOrder.quotes as any;
      const driver = updatedOrder.drivers as any;
      
      const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/track/${orderId}`;
      const emailTemplate = statusUpdateEmail(
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
          status,
          statusDisplay: formatStatusDisplay(status),
          timestamp: new Date(),
        },
        driver ? {
          name: driver.name,
          phone: driver.phone || 'N/A',
        } : undefined
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
              email_type: 'status_update',
              status,
              recipient: customer.email,
            },
            source: 'hubspot_email',
            event_id: `email_${orderId}_status_${status}_${Date.now()}`,
          });
      }
    }

    return NextResponse.json({
      message: 'Order status updated successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Order status update API error:', error);
    
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
