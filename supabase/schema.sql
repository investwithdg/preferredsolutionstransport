-- Delivery Platform Database Schema for Milestone 1
-- This schema supports the core workflow: Quote → Payment → Order → Dispatch Queue

-- Create order status enum
create type order_status as enum (
  'Draft','AwaitingPayment','ReadyForDispatch','Assigned','Accepted','PickedUp','InTransit','Delivered','Canceled'
);

-- Customers table
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  phone text,
  created_at timestamptz default now()
);

-- Quotes table - stores pricing calculations and customer requests
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id),
  pickup_address text not null,
  dropoff_address text not null,
  distance_mi numeric not null,
  weight_lb numeric,
  pricing jsonb not null,   -- { baseFee, perMileRate, fuelPct, subtotal, total }
  expires_at timestamptz,
  status text default 'Draft',
  created_at timestamptz default now()
);

-- Orders table - created after successful payment
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references public.quotes(id),
  customer_id uuid references public.customers(id),
  price_total numeric not null,
  currency text default 'usd',
  status order_status not null default 'AwaitingPayment',
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Dispatch events table - audit trail for order lifecycle
create table public.dispatch_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id),
  actor text not null,   -- 'system' for webhooks in M1
  event_type text not null,
  payload jsonb,
  created_at timestamptz default now()
);

-- Webhook events table - for idempotency and audit
create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text unique not null,
  event_type text not null,
  processed_at timestamptz,
  created_at timestamptz default now()
);

-- Enable RLS (Row Level Security) - will be configured properly in Milestone 2
alter table public.customers enable row level security;
alter table public.quotes enable row level security;
alter table public.orders enable row level security;
alter table public.dispatch_events enable row level security;
alter table public.webhook_events enable row level security;

-- Temporary permissive policies for Milestone 1
-- NOTE: These will be tightened in Milestone 2 with proper authentication

-- Allow anonymous read access to orders for dispatcher queue
create policy "Allow anonymous read orders" on public.orders for select using (true);

-- Allow service role full access for API operations
create policy "Allow service role full access customers" on public.customers for all using (auth.jwt() ->> 'role' = 'service_role');
create policy "Allow service role full access quotes" on public.quotes for all using (auth.jwt() ->> 'role' = 'service_role');
create policy "Allow service role full access orders" on public.orders for all using (auth.jwt() ->> 'role' = 'service_role');
create policy "Allow service role full access dispatch_events" on public.dispatch_events for all using (auth.jwt() ->> 'role' = 'service_role');
create policy "Allow service role full access webhook_events" on public.webhook_events for all using (auth.jwt() ->> 'role' = 'service_role');

-- Allow anonymous insert for quotes (customer form submission)
create policy "Allow anonymous insert quotes" on public.quotes for insert with check (true);
create policy "Allow anonymous insert customers" on public.customers for insert with check (true);

-- Indexes for performance
create index idx_orders_status on public.orders(status);
create index idx_orders_created_at on public.orders(created_at desc);
create index idx_customers_email on public.customers(email);
create index idx_webhook_events_stripe_id on public.webhook_events(stripe_event_id);

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at on orders
create trigger update_orders_updated_at
  before update on public.orders
  for each row execute function update_updated_at_column();
