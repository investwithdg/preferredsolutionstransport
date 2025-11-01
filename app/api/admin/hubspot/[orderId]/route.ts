import { NextRequest, NextResponse } from 'next/server';
import { createServerClientRSC } from '@/lib/supabase/server';
import { createHubSpotClient } from '@/lib/hubspot/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/hubspot/[orderId]
 *
 * Admin-only endpoint to fetch fresh HubSpot data for an order.
 * This bypasses the cached metadata and retrieves current data directly from HubSpot.
 *
 * Only accessible by admin users.
 */
export async function GET(_request: NextRequest, context: { params: { orderId: string } }) {
  try {
    const supabase = await createServerClientRSC();
    const supabaseDb = supabase as any;
    const { orderId } = context.params;

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify admin role
    const { data: userData, error: userError } = await supabaseDb
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get order with HubSpot deal ID
    const { data: order, error: orderError } = await supabaseDb
      .from('orders')
      .select('id, order_number, hubspot_deal_id, customer_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (!order.hubspot_deal_id) {
      return NextResponse.json({
        order_id: order.id,
        hubspot_deal_id: null,
        message: 'Order not synced to HubSpot',
        hubspot_data: null,
      });
    }

    // Initialize HubSpot client
    const hubspotClient = createHubSpotClient();
    if (!hubspotClient) {
      return NextResponse.json(
        {
          error: 'HubSpot integration not configured',
          hubspot_deal_id: order.hubspot_deal_id,
        },
        { status: 503 }
      );
    }

    // Fetch fresh deal data from HubSpot
    try {
      const dealResponse = await hubspotClient.crm.deals.basicApi.getById(order.hubspot_deal_id);
      const dealData = dealResponse;

      // Also fetch associated contact if exists
      let contactData = null;
      if (order.customer_id) {
        const { data: customer } = await supabaseDb
          .from('customers')
          .select('hubspot_contact_id')
          .eq('id', order.customer_id)
          .single();

        if (customer?.hubspot_contact_id) {
          try {
            const contactResponse = await hubspotClient.crm.contacts.basicApi.getById(
              customer.hubspot_contact_id
            );
            contactData = contactResponse;
          } catch (contactError) {
            console.warn('Failed to fetch contact:', contactError);
          }
        }
      }

      // Return comprehensive HubSpot data
      return NextResponse.json({
        order_id: order.id,
        order_number: order.order_number,
        hubspot_deal_id: order.hubspot_deal_id,
        hubspot_deal_url: `https://app.hubspot.com/contacts/${process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID}/deal/${order.hubspot_deal_id}`,
        fetched_at: new Date().toISOString(),
        hubspot_data: {
          deal: {
            id: dealData.id,
            properties: dealData.properties,
            associations: dealData.associations,
          },
          contact: contactData
            ? {
                id: contactData.id,
                properties: contactData.properties,
              }
            : null,
        },
        cached_vs_fresh_comparison: await compareWithCached(
          supabaseDb,
          order.id,
          dealData.properties
        ),
      });
    } catch (hubspotError: any) {
      console.error('HubSpot API error:', hubspotError);
      return NextResponse.json(
        {
          error: 'Failed to fetch from HubSpot',
          details: hubspotError.message,
          hubspot_deal_id: order.hubspot_deal_id,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Admin HubSpot endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Compare cached metadata with fresh HubSpot data
 */
async function compareWithCached(
  supabase: any,
  orderId: string,
  freshProperties: Record<string, any>
): Promise<any> {
  const { data: order } = await supabase
    .from('orders')
    .select('hubspot_metadata')
    .eq('id', orderId)
    .single();

  if (!order?.hubspot_metadata) {
    return { has_cached_data: false };
  }

  const cached = order.hubspot_metadata;
  const differences: Record<string, any> = {};

  // Check our cached properties against fresh data
  const cachedKeys = ['specialDeliveryInstructions', 'recurringFrequency', 'rushRequested'];

  for (const key of cachedKeys) {
    const hubspotKey = mapToHubSpotPropertyName(key);
    const cachedValue = cached[key];
    const freshValue = freshProperties[hubspotKey];

    if (cachedValue !== freshValue) {
      differences[key] = {
        cached: cachedValue,
        fresh: freshValue,
      };
    }
  }

  return {
    has_cached_data: true,
    has_differences: Object.keys(differences).length > 0,
    differences,
  };
}

/**
 * Map our internal property names to HubSpot property names
 */
function mapToHubSpotPropertyName(internalName: string): string {
  const mapping: Record<string, string> = {
    specialDeliveryInstructions:
      process.env.HUBSPOT_PROP_SPECIAL_DELIVERY_INSTRUCTIONS || 'special_delivery_instructions',
    recurringFrequency: process.env.HUBSPOT_PROP_RECURRING_FREQUENCY || 'recurring_frequency',
    rushRequested: process.env.HUBSPOT_PROP_RUSH_REQUESTED || 'rush_requested',
  };

  return mapping[internalName] || internalName;
}
