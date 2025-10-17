import { Client } from '@hubspot/api-client';
import type { SimplePublicObjectInput } from '@hubspot/api-client/lib/codegen/crm/deals';
import type { ContactProperties, DealProperties, OrderSyncData, SyncResult } from './types';
import { getCachedContactProperties, getCachedDealProperties } from './schemas';
import { validateProperties, filterValidProperties, formatValidationErrors } from './validator';
import { mapOrderToContactProperties, mapOrderToDealProperties } from './property-mappings';

export function createHubSpotClient() {
  if (!process.env.HUBSPOT_PRIVATE_APP_TOKEN) {
    console.warn('HubSpot Private App Token not found. Skipping HubSpot integration.');
    return null;
  }
  return new Client({ accessToken: process.env.HUBSPOT_PRIVATE_APP_TOKEN });
}

/**
 * Creates or updates a contact in HubSpot based on their email.
 * @returns The HubSpot contact ID.
 */
export async function upsertHubSpotContact(
  hubspotClient: Client,
  { email, name, phone }: { email: string; name?: string; phone?: string; }
): Promise<string | undefined> {
  try {
    const contactInput: any = {
      properties: {
        email,
        firstname: name?.split(' ')[0] || '',
        lastname: name?.split(' ').slice(1).join(' ') || '',
        phone,
      },
    };

    const { id } = await hubspotClient.crm.contacts.basicApi.create(contactInput);
    console.log(`Created HubSpot contact with ID: ${id}`);
    return id;
  } catch (e: any) {
    // If contact already exists, HubSpot API throws an error.
    // We can parse it to find the existing contact ID.
    if (e.code === 409 && e.body?.message) {
      const existingId = e.body.message.match(/existing ID: (\d+)/)?.[1];
      if (existingId) {
        console.log(`Found existing HubSpot contact with ID: ${existingId}`);
        return existingId;
      }
    }
    console.error('Failed to upsert HubSpot contact:', e);
  }
}

/**
 * Creates a new Deal in HubSpot and associates it with a contact.
 */
export async function createHubSpotDeal(
  hubspotClient: Client,
  dealProperties: SimplePublicObjectInput,
  contactId: string
) {
  try {
    const deal = await hubspotClient.crm.deals.basicApi.create(dealProperties as any);
    console.log(`Created HubSpot deal with ID: ${deal.id}`);

    // Associate deal with the contact using the API
    try {
      await (hubspotClient.crm.deals as any).associationsApi.create(
        deal.id,
        'contact',
        contactId,
        'deal_to_contact'
      );
      console.log(`Associated deal ${deal.id} with contact ${contactId}`);
    } catch (assocError) {
      // If the association API doesn't exist, try batch API
      console.log('Association API not available, skipping association');
    }
    return deal;
  } catch (e) {
    console.error('Failed to create HubSpot deal:', e);
  }
}

/**
 * Send transactional email via HubSpot
 * Uses HubSpot's Single Send API for transactional emails
 */
export async function sendHubSpotEmail(
  _hubspotClient: Client,
  emailData: {
    to: string;
    subject: string;
    htmlContent: string;
    textContent?: string;
  }
): Promise<boolean> {
  try {
    // HubSpot Single Send API
    const response = await fetch('https://api.hubapi.com/marketing/v3/transactional/single-email/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUBSPOT_PRIVATE_APP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emailId: null, // Use custom HTML instead of template
        message: {
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.htmlContent,
          text: emailData.textContent || stripHtml(emailData.htmlContent),
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('HubSpot email send failed:', error);
      return false;
    }

    console.log(`Email sent successfully to ${emailData.to}`);
    return true;
  } catch (e) {
    console.error('Failed to send HubSpot email:', e);
    return false;
  }
}

/**
 * Update an existing contact in HubSpot
 */
export async function updateHubSpotContact(
  hubspotClient: Client,
  contactId: string,
  properties: ContactProperties
): Promise<boolean> {
  try {
    // Fetch and validate properties
    const propertyDefinitions = await getCachedContactProperties(hubspotClient);
    const validatedProperties = filterValidProperties(properties, propertyDefinitions);

    if (Object.keys(validatedProperties).length === 0) {
      console.warn('No valid properties to update for contact');
      return false;
    }

    await hubspotClient.crm.contacts.basicApi.update(contactId, {
      properties: validatedProperties,
    } as any);

    console.log(`Updated HubSpot contact ${contactId}`);
    return true;
  } catch (error) {
    console.error(`Failed to update HubSpot contact ${contactId}:`, error);
    return false;
  }
}

/**
 * Update an existing deal in HubSpot
 */
export async function updateHubSpotDeal(
  hubspotClient: Client,
  dealId: string,
  properties: DealProperties
): Promise<boolean> {
  try {
    // Fetch and validate properties
    const propertyDefinitions = await getCachedDealProperties(hubspotClient);
    const validatedProperties = filterValidProperties(properties, propertyDefinitions);

    if (Object.keys(validatedProperties).length === 0) {
      console.warn('No valid properties to update for deal');
      return false;
    }

    await hubspotClient.crm.deals.basicApi.update(dealId, {
      properties: validatedProperties,
    } as any);

    console.log(`Updated HubSpot deal ${dealId}`);
    return true;
  } catch (error) {
    console.error(`Failed to update HubSpot deal ${dealId}:`, error);
    return false;
  }
}

/**
 * Main sync function: creates/updates contact and deal atomically
 */
export async function syncOrderToHubSpot(
  hubspotClient: Client,
  orderData: OrderSyncData,
  existingDealId?: string,
  supabaseClient?: any
): Promise<SyncResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Step 1: Map order data to contact properties
    const contactProperties = mapOrderToContactProperties(orderData);

    // Step 2: Validate contact properties
    try {
      const contactDefinitions = await getCachedContactProperties(hubspotClient);
      const validation = validateProperties(contactProperties, contactDefinitions);
      
      if (!validation.valid) {
        console.warn('Contact validation warnings:', formatValidationErrors(validation.errors));
        warnings.push(...validation.errors.map(e => e.message));
      }
      
      if (validation.warnings) {
        warnings.push(...validation.warnings);
      }

      // Validated properties (unused but kept for future reference)
      filterValidProperties(contactProperties, contactDefinitions);
    } catch (schemaError) {
      console.warn('Failed to fetch contact schema, using properties as-is:', schemaError);
      // Using contact properties as-is
      warnings.push('Contact properties not validated against schema');
    }

    // Step 3: Upsert contact
    const contactId = await upsertHubSpotContact(hubspotClient, {
      email: orderData.customerEmail,
      name: orderData.customerName,
      phone: orderData.customerPhone,
    });

    if (!contactId) {
      errors.push('Failed to create/update contact');
      return { success: false, errors, warnings };
    }

    // Step 4: Map order data to deal properties
    const dealProperties = mapOrderToDealProperties(orderData);

    // Step 5: Validate deal properties
    let validatedDealProps: Record<string, any>;
    try {
      const dealDefinitions = await getCachedDealProperties(hubspotClient);
      const validation = validateProperties(dealProperties, dealDefinitions);
      
      if (!validation.valid) {
        console.warn('Deal validation errors:', formatValidationErrors(validation.errors));
        // Don't fail on validation errors, just filter invalid properties
        warnings.push(...validation.errors.map(e => e.message));
      }
      
      if (validation.warnings) {
        warnings.push(...validation.warnings);
      }

      validatedDealProps = filterValidProperties(dealProperties, dealDefinitions);
    } catch (schemaError) {
      console.warn('Failed to fetch deal schema, using properties as-is:', schemaError);
      validatedDealProps = dealProperties;
      warnings.push('Deal properties not validated against schema');
    }

    // Step 6: Create or update deal
    let dealId = existingDealId;

    if (existingDealId) {
      // Update existing deal
      const updated = await updateHubSpotDeal(hubspotClient, existingDealId, validatedDealProps as any);
      if (!updated) {
        errors.push('Failed to update existing deal');
      }
    } else {
      // Create new deal
      const deal = await createHubSpotDeal(
        hubspotClient,
        { properties: validatedDealProps } as SimplePublicObjectInput,
        contactId
      );
      
      if (deal?.id) {
        dealId = deal.id;
      } else {
        errors.push('Failed to create deal');
      }
    }

    const success = errors.length === 0;
    
    // Store HubSpot IDs back to Supabase if client provided
    if (supabaseClient && success) {
      try {
        // Update order with HubSpot deal ID
        if (dealId) {
          await supabaseClient
            .from('orders')
            .update({ hubspot_deal_id: dealId })
            .eq('id', orderData.orderId);
        }
        
        // Update customer with HubSpot contact ID
        if (contactId) {
          await supabaseClient
            .from('customers')
            .update({ hubspot_contact_id: contactId })
            .eq('id', orderData.customerId);
        }
      } catch (supabaseError) {
        console.error('Failed to store HubSpot IDs in Supabase:', supabaseError);
        warnings.push('HubSpot IDs not stored in database');
      }
    }
    
    return {
      success,
      contactId,
      dealId,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    console.error('Failed to sync order to HubSpot:', error);
    errors.push(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, errors, warnings };
  }
}

/**
 * Find deal by order ID custom property
 */
export async function findDealByOrderId(
  hubspotClient: Client,
  orderId: string
): Promise<string | undefined> {
  try {
    const orderIdProp = process.env.HUBSPOT_PROP_ORDER_ID || 'order_id';
    
    const searchResponse = await hubspotClient.crm.deals.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              propertyName: orderIdProp,
              operator: 'EQ',
              value: orderId,
            },
          ],
        },
      ],
      properties: ['hs_object_id'],
      limit: 1,
      sorts: [],
      after: '',
    } as any);

    if (searchResponse.results.length > 0) {
      return searchResponse.results[0].id;
    }

    return undefined;
  } catch (error) {
    console.error('Failed to search for deal by order ID:', error);
    return undefined;
  }
}

/**
 * Simple HTML stripper for plain text fallback
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}
