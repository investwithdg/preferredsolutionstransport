import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createHubSpotClient, sendHubSpotEmail } from '@/lib/hubspot/client';
import { driverAssignedEmail } from '@/lib/hubspot/emails';
import { sendPushNotification, type PushSubscription } from '@/lib/webpush/config';
import { z } from 'zod';

const assignDriverSchema = z.object({
  orderId: z.string().uuid(),
  driverId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const { orderId, driverId } = assignDriverSchema.parse(body);

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

    // Send driver assignment email to customer
    const hubspotClient = createHubSpotClient();
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
