-- Hardening migration for Milestone 1
-- 1) dispatch_events: append-only + idempotent + indexes

-- Ensure required columns exist on existing table
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

-- Append-only guard
create or replace function public.no_update_delete_dispatch_events()
returns trigger language plpgsql as $$
begin
  raise exception 'dispatch_events is append-only';
end $$;

drop trigger if exists trg_dispatch_events_protect on public.dispatch_events;
create trigger trg_dispatch_events_protect
before update or delete on public.dispatch_events
for each row execute function public.no_update_delete_dispatch_events();


-- 2) order status transition guard (allow only legal transitions)
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


-- 3) composite indexes for hot paths
create index if not exists idx_orders_status_created
  on public.orders (status, created_at desc);

-- Create driver index only if driver_id column exists (for future milestones)
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


-- 4) quote expiry support (function)
create or replace function public.expire_quotes()
returns void language plpgsql as $$
begin
  update public.quotes
  set status = 'Expired'
  where expires_at < now() and coalesce(status, '') <> 'Expired';
end
$$;

-- 5) persist checkout session id on quotes for idempotency/diagnostics
alter table public.quotes add column if not exists stripe_checkout_session_id text;


