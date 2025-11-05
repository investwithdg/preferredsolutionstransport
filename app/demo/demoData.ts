// Minimal stubs used only when demo mode is enabled.

export function generateDemoOrders(): any[] {
  return [];
}

export function createTestOrder(): any {
  return {
    id: 'demo-order',
    created_at: new Date().toISOString(),
    status: 'ReadyForDispatch',
  };
}
