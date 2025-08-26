import { Client } from '@hubspot/api-client';
import type { SimplePublicObjectInput } from '@hubspot/api-client/lib/codegen/crm/deals';

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
    const contactInput = {
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
    const deal = await hubspotClient.crm.deals.basicApi.create(dealProperties);
    console.log(`Created HubSpot deal with ID: ${deal.id}`);

    // Associate deal with the contact
    await hubspotClient.crm.deals.associationsApi.create(
      deal.id,
      'contact',
      contactId,
      'deal_to_contact'
    );
    console.log(`Associated deal ${deal.id} with contact ${contactId}`);
    return deal;
  } catch (e) {
    console.error('Failed to create HubSpot deal:', e);
  }
}
