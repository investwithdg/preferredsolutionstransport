-- Generate 5 fake customers, quotes, and ReadyForDispatch orders for demo
-- Assumes drivers may be assigned later via UI

with new_customers as (
  insert into public.customers (email, name, phone)
  select
    'demo' || g || '@example.com',
    'Demo Customer ' || g,
    '555-01' || to_char(g, 'FM00')
  from generate_series(1,5) g
  on conflict (email) do update set name = excluded.name
  returning id, email
),
new_quotes as (
  insert into public.quotes (customer_id, pickup_address, dropoff_address, distance_mi, pricing, status, expires_at)
  select c.id,
         '100 Main St, Anytown, USA',
         '200 Oak Ave, Othertown, USA',
         12.5 + (random()*10),
         jsonb_build_object(
           'baseFee', 50,
           'perMileRate', 2,
           'fuelPct', 0.10,
           'distanceMi', 12.5,
           'subtotal', 50 + 2*12.5,
           'fuel', (50 + 2*12.5)*0.10,
           'total', round(((50 + 2*12.5)*1.10)::numeric, 2)
         ),
         'Draft',
         now() + interval '1 day'
  from new_customers c
  returning id, customer_id, pricing
)
insert into public.orders (quote_id, customer_id, price_total, currency, status)
select q.id, q.customer_id, (q.pricing->>'total')::numeric, 'usd', 'ReadyForDispatch'
from new_quotes q
returning id, status, created_at;

select id, status, created_at from public.orders order by created_at desc limit 5;

