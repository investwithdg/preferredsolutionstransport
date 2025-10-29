import { Buffer } from 'buffer';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;

export function isTwilioConfigured(): boolean {
  return Boolean(
    TWILIO_ACCOUNT_SID &&
      TWILIO_AUTH_TOKEN &&
      (TWILIO_FROM_NUMBER || TWILIO_MESSAGING_SERVICE_SID)
  );
}

export async function sendSms(to: string, body: string): Promise<boolean> {
  if (!isTwilioConfigured()) {
    console.warn('[Twilio] Configuration missing, SMS not sent.');
    return false;
  }

  try {
    const params = new URLSearchParams();
    params.append('To', to);
    params.append('Body', body);

    if (TWILIO_MESSAGING_SERVICE_SID) {
      params.append('MessagingServiceSid', TWILIO_MESSAGING_SERVICE_SID);
    } else if (TWILIO_FROM_NUMBER) {
      params.append('From', TWILIO_FROM_NUMBER);
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`
          ).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Twilio] Failed to send SMS:', errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Twilio] Error sending SMS:', error);
    return false;
  }
}
