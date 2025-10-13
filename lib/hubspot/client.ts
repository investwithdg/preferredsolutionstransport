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
  hubspotClient: Client,
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
