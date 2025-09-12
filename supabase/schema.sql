-- Delivery Platform Database Schema for Milestone 1
-- This schema supports the core workflow: Quote → Payment → Order → Dispatch Queue

-- Create order status enum
create type order_status as enum (
  'Draft','AwaitingPayment','ReadyForDispatch','Assigned','Accepted','PickedUp','InTransit','Delivered','Canceled'
);

-- Customers table
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
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

-- Remove permissive anonymous read; tightened in M2 below
-- (Left intentionally blank; see Drivers/Dispatchers & RLS section)

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


-- =====================================================
-- Hardening & Append-only and Status Transition Guards
-- Consolidated into base schema for easier setup
-- =====================================================

-- Ensure required columns exist on dispatch_events
alter table public.dispatch_events
  add column if not exists source text,
  add column if not exists event_id text;

-- Backfill defaults for not-null constraints if needed
update public.dispatch_events set payload = '{}'::jsonb where payload is null;
update public.dispatch_events set source = coalesce(source, 'system');
update public.dispatch_events set event_id = coalesce(event_id, gen_random_uuid()::text);

-- Enforce not-null going forward
alter table public.dispatch_events
  alter column payload set not null,
  alter column source set not null,
  alter column event_id set not null;

-- Unique idempotency key on (source, event_id)
create unique index if not exists idx_dispatch_events_source_event
  on public.dispatch_events (source, event_id);

-- Hot path index for order timeline
create index if not exists idx_dispatch_events_order_created
  on public.dispatch_events (order_id, created_at desc);

-- Append-only guard for dispatch_events
create or replace function public.no_update_delete_dispatch_events()
returns trigger language plpgsql as $$
begin
  raise exception 'dispatch_events is append-only';
end $$;

drop trigger if exists trg_dispatch_events_protect on public.dispatch_events;
create trigger trg_dispatch_events_protect
before update or delete on public.dispatch_events
for each row execute function public.no_update_delete_dispatch_events();

-- Order status transition guard (allow only legal transitions)
create or replace function public.validate_order_transition()
returns trigger language plpgsql as $$
declare ok boolean := false;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.status = old.status then
    return new; -- idempotent update
  end if;

  -- Allow cancel from any non-final status
  if new.status = 'Canceled' then
    return new;
  end if;

  -- Allowed forward transitions
  if (old.status, new.status) in (
    ('ReadyForDispatch','Assigned'),
    ('Assigned','Accepted'),
    ('Accepted','PickedUp'),
    ('PickedUp','InTransit'),
    ('InTransit','Delivered')
  ) then ok := true; end if;

  if not ok then
    raise exception 'illegal status transition % -> %', old.status, new.status;
  end if;
  return new;
end $$;

drop trigger if exists trg_orders_status on public.orders;
create trigger trg_orders_status
before update of status on public.orders
for each row execute function public.validate_order_transition();

-- Composite indexes for hot paths
create index if not exists idx_orders_status_created
  on public.orders (status, created_at desc);

-- Create driver index only if driver_id column exists (future milestones)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' and table_name = 'orders' and column_name = 'driver_id'
  ) THEN
    EXECUTE 'create index if not exists idx_orders_driver_status on public.orders (driver_id, status)';
  END IF;
END
$$;

-- Quote expiry support
create or replace function public.expire_quotes()
returns void language plpgsql as $$
begin
  update public.quotes
  set status = 'Expired'
  where expires_at < now() and coalesce(status, '') <> 'Expired';
end
$$;

-- Persist checkout session id on quotes for idempotency/diagnostics
alter table public.quotes add column if not exists stripe_checkout_session_id text;


-- =====================================================
-- Milestone 2: Drivers, Dispatchers & Tightened RLS
-- =====================================================

-- Drivers table (public)
create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) unique,
  name text not null,
  phone text,
  vehicle_details jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.drivers enable row level security;

-- Dispatchers table (auth-linked)
create table if not exists public.dispatchers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) unique,
  name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.dispatchers enable row level security;

-- Columns needed for M2 on orders
alter table public.orders
  add column if not exists driver_id uuid references public.drivers(id);

-- Indexes
create index if not exists idx_orders_driver_id on public.orders(driver_id);

-- Update helper trigger for drivers/dispatchers
drop trigger if exists update_drivers_updated_at on public.drivers;
create trigger update_drivers_updated_at
  before update on public.drivers
  for each row execute function update_updated_at_column();

drop trigger if exists update_dispatchers_updated_at on public.dispatchers;
create trigger update_dispatchers_updated_at
  before update on public.dispatchers
  for each row execute function update_updated_at_column();

-- RLS Policies

-- Service role full access for new tables
create policy if not exists "Allow service role full access drivers"
on public.drivers for all using (auth.jwt() ->> 'role' = 'service_role');

create policy if not exists "Allow service role full access dispatchers"
on public.dispatchers for all using (auth.jwt() ->> 'role' = 'service_role');

-- Drivers can view their own driver record
create policy if not exists "Drivers can view own driver record"
on public.drivers for select using (auth.uid() = user_id);

-- Dispatchers can view all drivers
create policy if not exists "Dispatchers can view all drivers"
on public.drivers for select using (
  exists (
    select 1 from public.dispatchers d where d.user_id = auth.uid()
  )
);

-- Dispatchers can view their own dispatcher record
create policy if not exists "Dispatchers can view own dispatcher record"
on public.dispatchers for select using (auth.uid() = user_id);

-- Tighten orders access: remove prior anonymous read policy if present
drop policy if exists "Allow anonymous read orders" on public.orders;

-- Dispatchers may read all orders
create policy if not exists "Dispatchers can read all orders"
on public.orders for select using (
  exists (
    select 1 from public.dispatchers d where d.user_id = auth.uid()
  )
);

-- Drivers can read orders assigned to them
create policy if not exists "Drivers can read assigned orders"
on public.orders for select using (
  exists (
    select 1 from public.drivers dr
    where dr.user_id = auth.uid() and dr.id = orders.driver_id
  )
);

-- Drivers can update only their assigned orders (status updates)
create policy if not exists "Drivers can update assigned orders"
on public.orders for update using (
  exists (
    select 1 from public.drivers dr
    where dr.user_id = auth.uid() and dr.id = orders.driver_id
  )
);

-- Dispatchers can update any order (e.g., assign driver)
create policy if not exists "Dispatchers can update all orders"
on public.orders for update using (
  exists (
    select 1 from public.dispatchers d where d.user_id = auth.uid()
  )
);

-- Dispatchers can read all customers and quotes
create policy if not exists "Dispatchers can read all customers"
on public.customers for select using (
  exists (
    select 1 from public.dispatchers d where d.user_id = auth.uid()
  )
);

create policy if not exists "Dispatchers can read all quotes"
on public.quotes for select using (
  exists (
    select 1 from public.dispatchers d where d.user_id = auth.uid()
  )
);
