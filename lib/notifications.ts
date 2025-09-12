export type MakeEventPayload = {
  eventType: string;
  timestamp?: string;
  data?: Record<string, any>;
};

export async function postToMake(payload: MakeEventPayload) {
  const url = process.env.MAKE_WEBHOOK_URL;
  if (!url) return { skipped: true } as const;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: payload.eventType,
        timestamp: payload.timestamp || new Date().toISOString(),
        ...payload.data,
      }),
    });
    return { ok: res.ok, status: res.status } as const;
  } catch (err) {
    console.error('Failed to post to Make.com', err);
    return { ok: false, error: 'request_failed' } as const;
  }
}

