export const dynamic = 'error';
export const runtime = 'nodejs';

// This file is deprecated in favor of /api/orders/[orderId]/assign
// Keeping a small stub to guide callers
export function POST() {
  return new Response(
    JSON.stringify({ error: 'Use /api/orders/{orderId}/assign' }),
    { status: 410, headers: { 'Content-Type': 'application/json' } }
  );
}
