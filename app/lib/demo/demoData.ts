// Demo data for testing the application flow

export interface DemoOrder {
  id: string;
  status: string;
  price_total: number;
  currency: string;
  created_at: string;
  updated_at: string;
  driver_id?: string;
  customers: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  quotes: {
    id: string;
    pickup_address: string;
    dropoff_address: string;
    distance_mi: number;
    price_base: number;
    price_per_mile: number;
    price_fuel_surcharge: number;
    price_total: number;
  };
}

// Sample addresses in New York City
const NYC_ADDRESSES = [
  { pickup: '123 Broadway, New York, NY 10007', dropoff: '456 5th Avenue, New York, NY 10018', distance: 3.2 },
  { pickup: '789 Park Avenue, New York, NY 10021', dropoff: '321 Wall Street, New York, NY 10005', distance: 5.8 },
  { pickup: '555 Madison Avenue, New York, NY 10022', dropoff: '777 Lexington Avenue, New York, NY 10065', distance: 2.1 },
  { pickup: '888 6th Avenue, New York, NY 10019', dropoff: '999 Hudson Street, New York, NY 10014', distance: 4.5 },
  { pickup: '111 East 42nd Street, New York, NY 10017', dropoff: '222 West 23rd Street, New York, NY 10011', distance: 2.8 },
];

// Demo customers
const DEMO_CUSTOMERS = [
  { name: 'Alice Johnson', email: 'alice@demo.com', phone: '(555) 123-4567' },
  { name: 'Bob Williams', email: 'bob@demo.com', phone: '(555) 234-5678' },
  { name: 'Carol Davis', email: 'carol@demo.com', phone: '(555) 345-6789' },
  { name: 'David Miller', email: 'david@demo.com', phone: '(555) 456-7890' },
  { name: 'Emma Wilson', email: 'emma@demo.com', phone: '(555) 567-8901' },
];

function calculatePricing(distance: number) {
  const base = 50;
  const perMile = 2;
  const subtotal = base + (distance * perMile);
  const fuelSurcharge = subtotal * 0.1;
  const total = subtotal + fuelSurcharge;
  
  return {
    price_base: base,
    price_per_mile: perMile,
    price_fuel_surcharge: Number(fuelSurcharge.toFixed(2)),
    price_total: Number(total.toFixed(2)),
  };
}

export function generateDemoOrders(): DemoOrder[] {
  const now = new Date();
  const orders: DemoOrder[] = [];
  
  // Generate 5 orders with different statuses
  const statuses = ['ReadyForDispatch', 'ReadyForDispatch', 'Assigned', 'PickedUp', 'Delivered'];
  
  statuses.forEach((status, index) => {
    const address = NYC_ADDRESSES[index];
    const customer = DEMO_CUSTOMERS[index];
    const pricing = calculatePricing(address.distance);
    const createdAt = new Date(now.getTime() - (index * 3600000)); // 1 hour apart
    
    const order: DemoOrder = {
      id: `demo-order-${index + 1}`,
      status,
      price_total: pricing.price_total,
      currency: 'usd',
      created_at: createdAt.toISOString(),
      updated_at: createdAt.toISOString(),
      driver_id: status === 'Assigned' || status === 'PickedUp' ? 'demo-driver-1' : undefined,
      customers: {
        id: `demo-customer-${index + 1}`,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
      quotes: {
        id: `demo-quote-${index + 1}`,
        pickup_address: address.pickup,
        dropoff_address: address.dropoff,
        distance_mi: address.distance,
        ...pricing,
      },
    };
    
    orders.push(order);
  });
  
  return orders;
}

// Generate a new demo order for testing
export function createTestOrder(): DemoOrder {
  const randomIndex = Math.floor(Math.random() * NYC_ADDRESSES.length);
  const address = NYC_ADDRESSES[randomIndex];
  const customer = DEMO_CUSTOMERS[Math.floor(Math.random() * DEMO_CUSTOMERS.length)];
  const pricing = calculatePricing(address.distance);
  const now = new Date();
  
  return {
    id: `demo-order-${Date.now()}`,
    status: 'ReadyForDispatch',
    price_total: pricing.price_total,
    currency: 'usd',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    customers: {
      id: `demo-customer-${Date.now()}`,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    },
    quotes: {
      id: `demo-quote-${Date.now()}`,
      pickup_address: address.pickup,
      dropoff_address: address.dropoff,
      distance_mi: address.distance,
      ...pricing,
    },
  };
}
