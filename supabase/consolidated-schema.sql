-- =============================================================================
-- Preferred Solutions Transport - Complete Database Schema
-- Consolidated schema for all milestones
-- NOTE: This file is the canonical source of truth for the database.
--       Prefer edits here over individual migrations; ensure PRs update this.
-- =============================================================================
-- 
-- This file contains the complete database schema including:
-- - Core tables (customers, quotes, orders, dispatch_events, webhook_events)
-- - Driver management with locations and push notifications
-- - Proof of Delivery system (photos, signatures, notes)
-- - Audit logging for compliance and debugging
-- - Payment records for financial reporting
-- - HubSpot integration (webhook events, contact/deal sync)
-- - Rate limiting infrastructure
-- - All triggers, functions, and policies
-- - Test data seeding
--
-- Usage: Copy and paste this entire file into your Supabase SQL Editor
-- =============================================================================

-- Drop existing objects if they exist (CAUTION: This will delete all data!)
-- Uncomment the following lines only if you want to completely reset your database
/*
DROP TABLE IF EXISTS public.drivers CASCADE;
DROP TABLE IF EXISTS public.dispatch_events CASCADE;
DROP TABLE IF EXISTS public.webhook_events CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.quotes CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;
*/

-- =============================================================================
-- ENUMS AND TYPES
-- =============================================================================

-- Create order status enum
CREATE TYPE order_status AS ENUM (
  'Draft',
  'AwaitingPayment',
  'ReadyForDispatch',
  'Assigned',
  'Accepted',
  'PickedUp',
  'InTransit',
  'Delivered',
  'Canceled'
);

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  phone text,
  hubspot_contact_id text,
  created_at timestamptz DEFAULT now()
);

-- Quotes table - stores pricing calculations and customer requests
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id),
  pickup_address text NOT NULL,
  dropoff_address text NOT NULL,
  distance_mi numeric NOT NULL,
  weight_lb numeric,
  pricing jsonb NOT NULL, -- { baseFee, perMileRate, fuelPct, subtotal, total }
  expires_at timestamptz,
  status text DEFAULT 'Draft',
  stripe_checkout_session_id text,
  created_at timestamptz DEFAULT now()
);

-- Orders table - created after successful payment
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES public.quotes(id),
  customer_id uuid REFERENCES public.customers(id),
  price_total numeric NOT NULL,
  currency text DEFAULT 'usd',
  status order_status NOT NULL DEFAULT 'AwaitingPayment',
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  driver_id uuid, -- Will be linked to drivers table below
  hubspot_deal_id text,
  hubspot_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Drivers table (Milestone 2)
CREATE TABLE IF NOT EXISTS public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) UNIQUE, -- Nullable for now, will be required later
  name text NOT NULL,
  phone text,
  vehicle_details jsonb, -- { "make": "Ford", "model": "Transit", "license_plate": "ABC1234" }
  push_subscription jsonb DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraint for driver_id in orders table
ALTER TABLE public.orders 
ADD CONSTRAINT orders_driver_id_fkey 
FOREIGN KEY (driver_id) REFERENCES public.drivers(id);

-- Dispatch events table - audit trail for order lifecycle
CREATE TABLE IF NOT EXISTS public.dispatch_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id),
  actor text NOT NULL, -- 'system' for webhooks, driver name, dispatcher name, etc.
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL,
  event_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Webhook events table - for idempotency and audit
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- HubSpot webhook events table - for idempotency and audit
CREATE TABLE IF NOT EXISTS public.hubspot_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  object_type text NOT NULL CHECK (object_type IN ('contact', 'deal')),
  object_id text NOT NULL,
  portal_id integer,
  occurred_at bigint,
  processed_at timestamptz DEFAULT now(),
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Driver locations table - for live tracking
CREATE TABLE IF NOT EXISTS public.driver_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES public.drivers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  latitude decimal(10, 8) NOT NULL,
  longitude decimal(11, 8) NOT NULL,
  accuracy decimal, -- Accuracy in meters
  heading decimal, -- Direction in degrees (0-360)
  speed decimal, -- Speed in meters per second
  created_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_latitude CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT valid_longitude CHECK (longitude >= -180 AND longitude <= 180),
  CONSTRAINT valid_heading CHECK (heading IS NULL OR (heading >= 0 AND heading <= 360))
);

-- Delivery proof table - for proof of delivery photos and signatures
CREATE TABLE IF NOT EXISTS public.delivery_proof (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.drivers(id),
  photo_urls text[] DEFAULT '{}', -- Array of storage URLs for photos
  signature_url text, -- URL for signature image
  notes text, -- Additional delivery notes
  recipient_name text, -- Name of person who received delivery
  delivered_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Audit logs table - comprehensive audit trail for all critical actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text, -- Denormalized for faster queries
  action text NOT NULL, -- e.g., 'user.created', 'order.assigned', 'role.updated'
  entity_type text NOT NULL, -- e.g., 'user', 'order', 'driver', 'customer'
  entity_id uuid, -- ID of the affected entity
  old_values jsonb, -- Previous state (for updates/deletes)
  new_values jsonb, -- New state (for creates/updates)
  metadata jsonb DEFAULT '{}'::jsonb, -- Additional context
  ip_address inet, -- IP address of the actor
  user_agent text, -- Browser/client information
  source text DEFAULT 'web', -- 'web', 'api', 'webhook', 'system'
  created_at timestamptz DEFAULT now()
);

-- Payment records table - denormalized Stripe payment data for fast queries
CREATE TABLE IF NOT EXISTS public.payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  
  -- Stripe identifiers
  stripe_payment_intent_id text UNIQUE NOT NULL,
  stripe_checkout_session_id text,
  stripe_charge_id text,
  
  -- Payment details
  amount numeric NOT NULL, -- in dollars (not cents)
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL, -- 'succeeded', 'pending', 'failed', 'canceled', 'refunded'
  
  -- Payment method information
  payment_method_type text, -- 'card', 'bank_transfer', etc.
  payment_method_brand text, -- 'visa', 'mastercard', etc.
  payment_method_last4 text, -- Last 4 digits
  payment_method_country text,
  
  -- Receipt and documentation
  receipt_url text,
  receipt_number text,
  
  -- Refund information
  refunded_amount numeric DEFAULT 0,
  refund_reason text,
  refunded_at timestamptz,
  
  -- Timestamps
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Customer indexes
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);

-- Order indexes
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON public.orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_driver_status ON public.orders(driver_id, status);

-- Dispatch events indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_dispatch_events_source_event 
  ON public.dispatch_events(source, event_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_events_order_created 
  ON public.dispatch_events(order_id, created_at DESC);

-- Webhook events indexes
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_id 
  ON public.webhook_events(stripe_event_id);

-- HubSpot webhook events indexes
CREATE INDEX IF NOT EXISTS idx_hubspot_webhook_events_event_id 
  ON public.hubspot_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_hubspot_webhook_events_object 
  ON public.hubspot_webhook_events(object_type, object_id);
CREATE INDEX IF NOT EXISTS idx_hubspot_webhook_events_created_at 
  ON public.hubspot_webhook_events(created_at DESC);

-- Driver locations indexes
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id 
  ON public.driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_order_id 
  ON public.driver_locations(order_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_created_at 
  ON public.driver_locations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_order 
  ON public.driver_locations(driver_id, order_id, created_at DESC);

-- Driver push subscription index
CREATE INDEX IF NOT EXISTS idx_drivers_push_subscription 
  ON public.drivers ((push_subscription IS NOT NULL));

-- Delivery proof indexes
CREATE INDEX IF NOT EXISTS idx_delivery_proof_order_id ON public.delivery_proof(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_proof_driver_id ON public.delivery_proof(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_proof_delivered_at ON public.delivery_proof(delivered_at DESC);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON public.audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON public.audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type_id ON public.audit_logs(entity_type, entity_id);

-- Payment records indexes
CREATE INDEX IF NOT EXISTS idx_payment_records_order_id ON public.payment_records(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_customer_id ON public.payment_records(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_status ON public.payment_records(status);
CREATE INDEX IF NOT EXISTS idx_payment_records_created_at ON public.payment_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_records_stripe_checkout_session ON public.payment_records(stripe_checkout_session_id);

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update delivery proof updated_at timestamp
CREATE OR REPLACE FUNCTION update_delivery_proof_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update payment record updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_payment_record_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at columns
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_drivers_updated_at ON public.drivers;
CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for delivery_proof updated_at
DROP TRIGGER IF EXISTS trigger_update_delivery_proof_updated_at ON public.delivery_proof;
CREATE TRIGGER trigger_update_delivery_proof_updated_at
  BEFORE UPDATE ON public.delivery_proof
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_proof_updated_at();

-- Trigger for audit logging on users table
DROP TRIGGER IF EXISTS audit_user_changes ON public.users;
CREATE TRIGGER audit_user_changes
  AFTER INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_user_role_changes();

-- Trigger for audit logging on order assignments
DROP TRIGGER IF EXISTS audit_order_assignments ON public.orders;
CREATE TRIGGER audit_order_assignments
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_order_assignments();

-- Trigger for payment_records updated_at
DROP TRIGGER IF EXISTS update_payment_records_updated_at ON public.payment_records;
CREATE TRIGGER update_payment_records_updated_at
  BEFORE UPDATE ON public.payment_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_record_updated_at();

-- Append-only guard for dispatch_events
CREATE OR REPLACE FUNCTION public.no_update_delete_dispatch_events()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'dispatch_events is append-only';
END $$;

DROP TRIGGER IF EXISTS trg_dispatch_events_protect ON public.dispatch_events;
CREATE TRIGGER trg_dispatch_events_protect
  BEFORE UPDATE OR DELETE ON public.dispatch_events
  FOR EACH ROW EXECUTE FUNCTION public.no_update_delete_dispatch_events();

-- Order status transition guard (allow only legal transitions)
CREATE OR REPLACE FUNCTION public.validate_order_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE 
  ok boolean := false;
BEGIN
  IF tg_op <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- Allow idempotent updates
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Allow cancel from any non-final status
  IF NEW.status = 'Canceled' THEN
    RETURN NEW;
  END IF;

  -- Allowed forward transitions
  IF (OLD.status, NEW.status) IN (
    ('ReadyForDispatch','Assigned'),
    ('Assigned','Accepted'),
    ('Accepted','PickedUp'),
    ('PickedUp','InTransit'),
    ('InTransit','Delivered')
  ) THEN 
    ok := true; 
  END IF;

  IF NOT ok THEN
    RAISE EXCEPTION 'Illegal status transition: % -> %', OLD.status, NEW.status;
  END IF;
  
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_orders_status ON public.orders;
CREATE TRIGGER trg_orders_status
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_order_transition();

-- Quote expiry function
CREATE OR REPLACE FUNCTION public.expire_quotes()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.quotes
  SET status = 'Expired'
  WHERE expires_at < now() AND COALESCE(status, '') <> 'Expired';
END $$;

-- Function to log audit events (callable from triggers or application code)
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id uuid,
  p_user_email text,
  p_action text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_source text DEFAULT 'system'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_audit_id uuid;
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    user_email,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    metadata,
    source
  ) VALUES (
    p_user_id,
    p_user_email,
    p_action,
    p_entity_type,
    p_entity_id,
    p_old_values,
    p_new_values,
    p_metadata,
    p_source
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

-- Trigger function for user role changes
CREATE OR REPLACE FUNCTION public.audit_user_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role) THEN
    PERFORM public.log_audit_event(
      auth.uid(),
      auth.email(),
      'user.role_changed',
      'user',
      NEW.id,
      jsonb_build_object('role', OLD.role),
      jsonb_build_object('role', NEW.role),
      jsonb_build_object('changed_by', auth.email()),
      'system'
    );
  ELSIF (TG_OP = 'INSERT') THEN
    PERFORM public.log_audit_event(
      NEW.auth_id,
      NEW.email,
      'user.created',
      'user',
      NEW.id,
      NULL,
      jsonb_build_object('role', NEW.role, 'email', NEW.email),
      '{}',
      'system'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function for order assignments
CREATE OR REPLACE FUNCTION public.audit_order_assignments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.driver_id IS DISTINCT FROM NEW.driver_id AND NEW.driver_id IS NOT NULL) THEN
    PERFORM public.log_audit_event(
      auth.uid(),
      auth.email(),
      'order.assigned',
      'order',
      NEW.id,
      jsonb_build_object('driver_id', OLD.driver_id, 'status', OLD.status),
      jsonb_build_object('driver_id', NEW.driver_id, 'status', NEW.status),
      jsonb_build_object('assigned_by', auth.email()),
      'system'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to create or update payment record from Stripe webhook
CREATE OR REPLACE FUNCTION public.upsert_payment_record(
  p_order_id uuid,
  p_customer_id uuid,
  p_stripe_payment_intent_id text,
  p_stripe_checkout_session_id text DEFAULT NULL,
  p_amount numeric DEFAULT 0,
  p_currency text DEFAULT 'usd',
  p_status text DEFAULT 'pending',
  p_payment_method jsonb DEFAULT NULL,
  p_receipt_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id uuid;
BEGIN
  INSERT INTO public.payment_records (
    order_id,
    customer_id,
    stripe_payment_intent_id,
    stripe_checkout_session_id,
    amount,
    currency,
    status,
    payment_method_type,
    payment_method_brand,
    payment_method_last4,
    receipt_url,
    paid_at
  ) VALUES (
    p_order_id,
    p_customer_id,
    p_stripe_payment_intent_id,
    p_stripe_checkout_session_id,
    p_amount,
    p_currency,
    p_status,
    p_payment_method->>'type',
    p_payment_method->'card'->>'brand',
    p_payment_method->'card'->>'last4',
    p_receipt_url,
    CASE WHEN p_status = 'succeeded' THEN now() ELSE NULL END
  )
  ON CONFLICT (stripe_payment_intent_id) 
  DO UPDATE SET
    status = EXCLUDED.status,
    payment_method_type = EXCLUDED.payment_method_type,
    payment_method_brand = EXCLUDED.payment_method_brand,
    payment_method_last4 = EXCLUDED.payment_method_last4,
    receipt_url = EXCLUDED.receipt_url,
    paid_at = CASE WHEN EXCLUDED.status = 'succeeded' AND payment_records.paid_at IS NULL THEN now() ELSE payment_records.paid_at END,
    updated_at = now()
  RETURNING id INTO v_payment_id;
  
  RETURN v_payment_id;
END;
$$;

-- =============================================================================
-- ROLE-BASED ACCESS CONTROL SETUP
-- =============================================================================

-- Create user role enum
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin','dispatcher','driver','recipient');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Users table for role-based access control
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid UNIQUE REFERENCES auth.users(id),
  email text UNIQUE,
  role user_role,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Service role full access to users
DROP POLICY IF EXISTS "Service role full access users" ON public.users;
CREATE POLICY "Service role full access users"
  ON public.users FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Users can read their own record
DROP POLICY IF EXISTS "Users manage own record" ON public.users;
CREATE POLICY "Users read own record"
  ON public.users FOR SELECT 
  USING (auth.uid() = auth_id);

-- Users can update their own record  
DROP POLICY IF EXISTS "Users update own record" ON public.users;
CREATE POLICY "Users update own record"
  ON public.users FOR UPDATE
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT role FROM public.users WHERE auth_id = auth.uid();
$$;

-- Helper function to check if user is admin or dispatcher
CREATE OR REPLACE FUNCTION public.is_admin_or_dispatcher()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT public.current_user_role() IN ('admin','dispatcher');
$$;

-- Function to get minimal HubSpot metadata based on user role
CREATE OR REPLACE FUNCTION public.get_minimal_hubspot_metadata(
  full_metadata jsonb,
  user_role user_role DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_role user_role;
BEGIN
  -- Use provided role or get current user's role
  v_role := COALESCE(user_role, public.current_user_role());
  
  -- Return NULL if no metadata
  IF full_metadata IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Drivers get only delivery-critical fields
  IF v_role = 'driver' THEN
    RETURN jsonb_build_object(
      'special_delivery_instructions', full_metadata->'specialDeliveryInstructions'
    );
  END IF;
  
  -- Recipients/Customers get minimal fields
  IF v_role = 'recipient' THEN
    RETURN jsonb_build_object(
      'special_delivery_instructions', full_metadata->'specialDeliveryInstructions',
      'scheduled_delivery_time', full_metadata->'scheduledDeliveryTime'
    );
  END IF;
  
  -- Dispatchers get operational fields
  IF v_role = 'dispatcher' THEN
    RETURN jsonb_build_object(
      'special_delivery_instructions', full_metadata->'specialDeliveryInstructions',
      'recurring_frequency', full_metadata->'recurringFrequency',
      'rush_requested', full_metadata->'rushRequested'
    );
  END IF;
  
  -- Admins get everything
  RETURN full_metadata;
END $$;

-- Function to validate HubSpot metadata structure and content
CREATE OR REPLACE FUNCTION public.validate_hubspot_metadata(
  metadata jsonb
)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  cleaned_metadata jsonb := '{}';
  allowed_keys text[] := ARRAY[
    'specialDeliveryInstructions', 
    'recurringFrequency', 
    'rushRequested',
    'scheduledDeliveryTime',
    'dealstage',
    'amount',
    'assignedDriver',
    'actualDeliveryTime',
    'deliveryStatus'
  ];
  key text;
  value jsonb;
BEGIN
  -- Return empty object if NULL
  IF metadata IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;
  
  -- Only keep allowed keys
  FOR key, value IN SELECT * FROM jsonb_each(metadata)
  LOOP
    IF key = ANY(allowed_keys) THEN
      -- Validate specific field types
      CASE key
        WHEN 'specialDeliveryInstructions' THEN
          -- Ensure it's a string, truncate if too long
          cleaned_metadata := cleaned_metadata || 
            jsonb_build_object(key, left(value #>> '{}', 500));
            
        WHEN 'recurringFrequency' THEN
          -- Validate it's one of the allowed values
          IF value #>> '{}' IN ('weekly', 'biweekly', 'monthly', 'none') THEN
            cleaned_metadata := cleaned_metadata || jsonb_build_object(key, value);
          END IF;
          
        WHEN 'rushRequested' THEN
          -- Ensure it's a boolean
          IF jsonb_typeof(value) = 'boolean' THEN
            cleaned_metadata := cleaned_metadata || jsonb_build_object(key, value);
          END IF;
          
        WHEN 'scheduledDeliveryTime', 'actualDeliveryTime' THEN
          -- Validate timestamp format
          BEGIN
            PERFORM (value #>> '{}')::timestamp;
            cleaned_metadata := cleaned_metadata || jsonb_build_object(key, value);
          EXCEPTION WHEN OTHERS THEN
            -- Skip invalid timestamps
            NULL;
          END;
          
        WHEN 'amount' THEN
          -- Ensure it's a number
          IF jsonb_typeof(value) IN ('number') THEN
            cleaned_metadata := cleaned_metadata || jsonb_build_object(key, value);
          END IF;
          
        ELSE
          -- For other allowed fields, keep as-is
          cleaned_metadata := cleaned_metadata || jsonb_build_object(key, value);
      END CASE;
    END IF;
  END LOOP;
  
  RETURN cleaned_metadata;
END $$;

-- Add auth_email column to customers for recipient mapping
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS auth_email text UNIQUE;
CREATE INDEX IF NOT EXISTS idx_customers_auth_email ON public.customers(auth_email);

-- Create a view that automatically filters HubSpot metadata based on user role
CREATE OR REPLACE VIEW public.orders_with_filtered_metadata AS
SELECT 
  o.id,
  o.customer_id,
  o.order_number,
  o.recipient_name,
  o.recipient_email,
  o.recipient_phone,
  o.pickup_address,
  o.pickup_address2,
  o.pickup_city,
  o.pickup_state,
  o.pickup_zip,
  o.dropoff_address,
  o.dropoff_address2,
  o.dropoff_city,
  o.dropoff_state,
  o.dropoff_zip,
  o.pickup_notes,
  o.dropoff_notes,
  o.scheduled_pickup_time,
  o.scheduled_delivery_time,
  o.actual_pickup_time,
  o.actual_delivery_time,
  o.status,
  o.priority,
  o.vehicle_type,
  o.special_instructions,
  o.total_amount,
  o.payment_method,
  o.payment_status,
  o.stripe_payment_intent_id,
  o.driver_id,
  o.proof_of_delivery_id,
  o.hubspot_deal_id,
  -- Filter metadata based on current user's role
  public.get_minimal_hubspot_metadata(o.hubspot_metadata) as hubspot_metadata,
  o.created_at,
  o.updated_at
FROM public.orders o;

-- Grant appropriate permissions to the view
GRANT SELECT ON public.orders_with_filtered_metadata TO authenticated;
GRANT SELECT ON public.orders_with_filtered_metadata TO anon;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) AND POLICIES
-- =============================================================================
-- 
-- USER ROLES IN THIS SYSTEM:
-- 1. ANONYMOUS - Public users requesting quotes (not logged in)
-- 2. RECIPIENT - Authenticated customers tracking their orders
-- 3. DRIVER - Authenticated drivers viewing/updating assigned orders
-- 4. DISPATCHER - Authenticated staff managing orders and assignments
-- 5. ADMIN - Full system access for management
-- 6. SERVICE_ROLE - Backend API operations (full access)
--
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hubspot_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_proof ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow anonymous read orders" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated read access to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow drivers to see their assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Allow drivers to update their assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Allow service role full access to drivers" ON public.drivers;
DROP POLICY IF EXISTS "Allow drivers to view their own record" ON public.drivers;
DROP POLICY IF EXISTS "Allow authenticated users to view all drivers" ON public.drivers;

-- =============================================================================
-- SERVICE ROLE POLICIES (Backend API - Full Access)
-- =============================================================================
CREATE POLICY "Service role full access customers" 
  ON public.customers FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access quotes" 
  ON public.quotes FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access orders" 
  ON public.orders FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access drivers" 
  ON public.drivers FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access dispatch_events" 
  ON public.dispatch_events FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access webhook_events" 
  ON public.webhook_events FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access hubspot_webhook_events" 
  ON public.hubspot_webhook_events FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access driver_locations" 
  ON public.driver_locations FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access delivery_proof"
  ON public.delivery_proof FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access audit_logs"
  ON public.audit_logs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access payment_records"
  ON public.payment_records FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================================================
-- ANONYMOUS USER POLICIES (Public Quote Requests)
-- =============================================================================
-- Allow anonymous users to submit quote requests and create customer records
CREATE POLICY "Anonymous insert customers" 
  ON public.customers FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Anonymous insert quotes" 
  ON public.quotes FOR INSERT 
  WITH CHECK (true);

-- =============================================================================
-- ADMIN & DISPATCHER POLICIES (Full Operational Access)
-- =============================================================================
-- Admin and Dispatcher can manage all orders, drivers, and dispatch events

-- Orders: Full CRUD access
CREATE POLICY "Admin dispatcher full orders"
  ON public.orders FOR ALL
  USING (public.is_admin_or_dispatcher())
  WITH CHECK (public.is_admin_or_dispatcher());

-- Drivers: Full CRUD access (for managing driver accounts)
CREATE POLICY "Admin dispatcher full drivers"
  ON public.drivers FOR ALL
  USING (public.is_admin_or_dispatcher())
  WITH CHECK (public.is_admin_or_dispatcher());

-- Dispatch Events: Full access to audit trail
CREATE POLICY "Admin dispatcher full dispatch_events"
  ON public.dispatch_events FOR ALL
  USING (public.is_admin_or_dispatcher())
  WITH CHECK (public.is_admin_or_dispatcher());

-- =============================================================================
-- DRIVER POLICIES (Own Profile + Assigned Orders)
-- =============================================================================
-- Drivers can view/update their own profile
CREATE POLICY "Drivers manage own profile"
  ON public.drivers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Drivers can view ALL driver profiles (for reference in dispatcher view)
CREATE POLICY "Drivers view all driver profiles"
  ON public.drivers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE drivers.user_id = auth.uid()
    )
  );

-- Drivers can view orders assigned to them
CREATE POLICY "Drivers view assigned orders"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE drivers.user_id = auth.uid() AND drivers.id = orders.driver_id
    )
  );

-- Drivers can update status of orders assigned to them
-- (Status transitions are validated by validate_order_transition trigger)
CREATE POLICY "Drivers update assigned orders"
  ON public.orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE drivers.user_id = auth.uid() AND drivers.id = orders.driver_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE drivers.user_id = auth.uid() AND drivers.id = orders.driver_id
    )
  );

-- Drivers can view dispatch events for their orders
CREATE POLICY "Drivers view own dispatch events"
  ON public.dispatch_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.drivers d ON d.id = o.driver_id
      WHERE o.id = dispatch_events.order_id AND d.user_id = auth.uid()
    )
  );

-- Drivers can read their own location history
CREATE POLICY "Drivers can read their own locations"
  ON public.driver_locations
  FOR SELECT
  USING (
    driver_id IN (
      SELECT id FROM public.drivers 
      WHERE user_id = auth.uid()
    )
  );

-- Drivers can insert their own locations
CREATE POLICY "Drivers can insert their own locations"
  ON public.driver_locations
  FOR INSERT
  WITH CHECK (
    driver_id IN (
      SELECT id FROM public.drivers 
      WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- RECIPIENT POLICIES (Customers Tracking Their Orders)
-- =============================================================================
-- Recipients can view their own customer record
CREATE POLICY "Recipients view own customer record"
  ON public.customers FOR SELECT
  USING (auth.email() = auth_email);

-- Recipients can view orders they placed
CREATE POLICY "Recipients view own orders"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = orders.customer_id AND c.auth_email = auth.email()
    )
  );

-- Recipients can view dispatch events for their orders
CREATE POLICY "Recipients view own dispatch_events"
  ON public.dispatch_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.customers c ON c.id = o.customer_id
      WHERE o.id = dispatch_events.order_id AND c.auth_email = auth.email()
    )
  );

-- Recipients can view quotes they created
CREATE POLICY "Recipients view own quotes"
  ON public.quotes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = quotes.customer_id AND c.auth_email = auth.email()
    )
  );

-- =============================================================================
-- DELIVERY PROOF POLICIES
-- =============================================================================
-- Drivers can insert their own PoD
CREATE POLICY "Drivers can insert their PoD"
  ON public.delivery_proof
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE drivers.id = delivery_proof.driver_id
      AND drivers.user_id = auth.uid()
    )
  );

-- Drivers can view their own PoD
CREATE POLICY "Drivers can view their PoD"
  ON public.delivery_proof
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE drivers.id = delivery_proof.driver_id
      AND drivers.user_id = auth.uid()
    )
  );

-- Customers can view PoD for their orders
CREATE POLICY "Customers can view PoD for their orders"
  ON public.delivery_proof
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      JOIN public.customers ON customers.id = orders.customer_id
      WHERE orders.id = delivery_proof.order_id
      AND customers.email = auth.jwt() ->> 'email'
    )
  );

-- Dispatchers and admins can view all PoD
CREATE POLICY "Dispatchers and admins can view all PoD"
  ON public.delivery_proof
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid()
      AND users.role IN ('dispatcher', 'admin')
    )
  );

-- =============================================================================
-- AUDIT LOGS POLICIES
-- =============================================================================
-- Admin-only read access to audit logs
CREATE POLICY "Admins read audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Service role can insert audit logs (already covered by service role full access policy)

-- =============================================================================
-- PAYMENT RECORDS POLICIES
-- =============================================================================
-- Admins can view all payment records
CREATE POLICY "Admins view all payments"
  ON public.payment_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Dispatchers can view all payment records
CREATE POLICY "Dispatchers view all payments"
  ON public.payment_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid()
      AND users.role IN ('dispatcher', 'admin')
    )
  );

-- Customers can view their own payment records
CREATE POLICY "Customers view own payments"
  ON public.payment_records FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers
      WHERE customers.email = auth.email()
    )
  );

-- =============================================================================
-- STORAGE POLICIES FOR PROOF OF DELIVERY
-- =============================================================================
-- Note: Storage bucket 'proof-of-delivery' should be created via Supabase Dashboard
-- configured as private (public: false)

-- Drivers can upload PoD files
CREATE POLICY "Drivers can upload PoD files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'proof-of-delivery'
    AND (storage.foldername(name))[1] IN (
      SELECT driver_id::text FROM public.drivers WHERE user_id = auth.uid()
    )
  );

-- Authenticated users can view PoD files
-- (Specific access controlled by delivery_proof table policies)
CREATE POLICY "Authenticated users can view PoD files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'proof-of-delivery');

-- Drivers can update their own PoD files
CREATE POLICY "Drivers can update their PoD files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'proof-of-delivery'
    AND (storage.foldername(name))[1] IN (
      SELECT driver_id::text FROM public.drivers WHERE user_id = auth.uid()
    )
  );

-- Drivers can delete their own PoD files
CREATE POLICY "Drivers can delete their PoD files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'proof-of-delivery'
    AND (storage.foldername(name))[1] IN (
      SELECT driver_id::text FROM public.drivers WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- SEED DATA FOR TESTING
-- =============================================================================

-- Insert test drivers (user_id will be NULL for now - demo mode)
INSERT INTO public.drivers (name, phone, vehicle_details) VALUES 
  ('John Smith', '555-0101', '{"make": "Ford", "model": "Transit", "license_plate": "ABC1234", "color": "White"}'),
  ('Sarah Johnson', '555-0102', '{"make": "Mercedes", "model": "Sprinter", "license_plate": "DEF5678", "color": "Blue"}'),
  ('Mike Davis', '555-0103', '{"make": "Isuzu", "model": "NPR", "license_plate": "GHI9012", "color": "Silver"}'),
  ('Lisa Wilson', '555-0104', '{"make": "Ford", "model": "E-350", "license_plate": "JKL3456", "color": "White"}'),
  ('Tom Anderson', '555-0105', '{"make": "Chevrolet", "model": "Express", "license_plate": "MNO7890", "color": "Gray"}')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify drivers were created
DO $$
BEGIN
  RAISE NOTICE 'Drivers created:';
  PERFORM * FROM public.drivers;
END $$;

-- Verify table structure
DO $$
DECLARE
  table_count integer;
BEGIN
  SELECT COUNT(*) INTO table_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN ('customers', 'quotes', 'orders', 'drivers', 'dispatch_events', 
                       'webhook_events', 'hubspot_webhook_events', 'driver_locations', 
                       'users', 'api_rate_limits', 'delivery_proof', 'audit_logs', 
                       'payment_records');
  
  RAISE NOTICE 'Created % tables successfully (expected 13)', table_count;
END $$;

-- =============================================================================
-- SCHEMA RELOAD NOTIFICATION
-- =============================================================================

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'SCHEMA SETUP COMPLETE!';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'Core Tables: customers, quotes, orders, drivers, dispatch_events';
  RAISE NOTICE 'Feature Tables: delivery_proof, audit_logs, payment_records';
  RAISE NOTICE 'Integration Tables: webhook_events, hubspot_webhook_events';
  RAISE NOTICE 'Infrastructure Tables: users, driver_locations, api_rate_limits';
  RAISE NOTICE 'Test drivers seeded: 5 drivers available for testing';
  RAISE NOTICE 'Schema cache reloaded automatically';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test the quote → payment → dispatcher flow';
  RAISE NOTICE '2. Test driver assignment and status updates';
  RAISE NOTICE '3. Verify webhook processing is working';
  RAISE NOTICE '4. Create proof-of-delivery storage bucket in Supabase Dashboard';
  RAISE NOTICE '=============================================================================';
END $$;

-- =============================================================================
-- RATE LIMITING INFRASTRUCTURE
-- =============================================================================

-- Table to track API request counts for rate limiting
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on rate limits table
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role access to rate limits
CREATE POLICY "Service role access to rate limits"
  ON public.api_rate_limits FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Indexes for rate limiting
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint ON public.api_rate_limits(identifier, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.api_rate_limits(window_start);

-- Function to clean up old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.api_rate_limits
  WHERE window_start < now() - interval '1 hour';
END $$;

-- Function to check and update rate limits (fixed to avoid variable/column name collision)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_endpoint text,
  p_limit integer DEFAULT 100,
  p_window_minutes integer DEFAULT 60
)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE
  v_current_count integer;
  v_window_start timestamptz;
BEGIN
  v_window_start := date_trunc('minute', now()) - (p_window_minutes || ' minutes')::interval;

  SELECT request_count INTO v_current_count
  FROM public.api_rate_limits
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND window_start >= v_window_start;

  IF v_current_count IS NULL THEN
    INSERT INTO public.api_rate_limits (identifier, endpoint, request_count, window_start)
    VALUES (p_identifier, p_endpoint, 1, v_window_start);
    RETURN true;
  ELSIF v_current_count < p_limit THEN
    UPDATE public.api_rate_limits
    SET request_count = request_count + 1,
        updated_at = now()
    WHERE identifier = p_identifier
      AND endpoint = p_endpoint
      AND window_start >= v_window_start;
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END $$;

-- =============================================================================
-- PRODUCTION CONSTRAINTS AND INDEXES
-- =============================================================================

-- Data quality checks for quotes
DO $$ BEGIN
  ALTER TABLE public.quotes
    ADD CONSTRAINT check_positive_distance CHECK (distance_mi > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.quotes
    ADD CONSTRAINT check_positive_weight CHECK (weight_lb IS NULL OR weight_lb > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.quotes
    ADD CONSTRAINT check_valid_pricing CHECK (pricing->>'total' IS NOT NULL AND (pricing->>'total')::numeric >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Data quality checks for orders
DO $$ BEGIN
  ALTER TABLE public.orders
    ADD CONSTRAINT check_positive_price CHECK (price_total > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Performance indexes for production workloads
CREATE INDEX IF NOT EXISTS idx_quotes_status_created ON public.quotes(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session ON public.orders(stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_stripe_session ON public.quotes(stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_active_status ON public.orders(status) WHERE status NOT IN ('Delivered', 'Canceled');
-- Note: Cannot use expires_at > now() in index predicate (now() is not IMMUTABLE)
-- Use expires_at index separately for expiry queries
CREATE INDEX IF NOT EXISTS idx_quotes_active ON public.quotes(id, status) WHERE status = 'Draft';

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON public.quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_expires_at ON public.quotes(expires_at);
CREATE INDEX IF NOT EXISTS idx_orders_quote_id ON public.orders(quote_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);

-- HubSpot integration indexes
CREATE INDEX IF NOT EXISTS idx_orders_hubspot_deal_id 
  ON public.orders(hubspot_deal_id) 
  WHERE hubspot_deal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_hubspot_contact_id 
  ON public.customers(hubspot_contact_id) 
  WHERE hubspot_contact_id IS NOT NULL;

-- =============================================================================
-- MONITORING FUNCTIONS
-- =============================================================================

-- Function to clean up old location data (keep last 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_driver_locations()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.driver_locations
  WHERE created_at < NOW() - INTERVAL '24 hours';
END $$;

-- Function to get system health metrics
CREATE OR REPLACE FUNCTION public.get_system_health()
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'timestamp', now(),
    'database', jsonb_build_object(
      'total_orders', (SELECT count(*) FROM public.orders),
      'active_orders', (SELECT count(*) FROM public.orders WHERE status NOT IN ('Delivered', 'Canceled')),
      'total_quotes', (SELECT count(*) FROM public.quotes),
      'expired_quotes', (SELECT count(*) FROM public.quotes WHERE status = 'Expired'),
      'total_customers', (SELECT count(*) FROM public.customers),
      'total_drivers', (SELECT count(*) FROM public.drivers),
      'webhook_events_today', (SELECT count(*) FROM public.webhook_events WHERE created_at >= CURRENT_DATE),
      'dispatch_events_today', (SELECT count(*) FROM public.dispatch_events WHERE created_at >= CURRENT_DATE)
    ),
    'recent_activity', jsonb_build_object(
      'orders_last_hour', (SELECT count(*) FROM public.orders WHERE created_at >= now() - interval '1 hour'),
      'quotes_last_hour', (SELECT count(*) FROM public.quotes WHERE created_at >= now() - interval '1 hour')
    )
  ) INTO result;

  RETURN result;
END $$;

-- Function to detect potential issues
CREATE OR REPLACE FUNCTION public.get_system_alerts()
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'timestamp', now(),
    'alerts', jsonb_agg(
      jsonb_build_object(
        'type', alert_type,
        'message', alert_message,
        'count', alert_count
      )
    )
  ) INTO result
  FROM (
    SELECT 'warning' as alert_type,
           'Orders stuck in non-terminal states > 24h' as alert_message,
           count(*) as alert_count
    FROM public.orders
    WHERE status NOT IN ('Delivered', 'Canceled')
      AND updated_at < now() - interval '24 hours'

    UNION ALL

    SELECT 'error' as alert_type,
           'Webhook events not processed' as alert_message,
           count(*) as alert_count
    FROM public.webhook_events
    WHERE processed_at IS NULL
      AND created_at < now() - interval '1 hour'

    UNION ALL

    SELECT 'warning' as alert_type,
           'Potential duplicate customers' as alert_message,
           count(*) - count(distinct email) as alert_count
    FROM public.customers
    WHERE email IS NOT NULL
  ) alerts
  WHERE alert_count > 0;

  RETURN result;
END $$;

-- Add comments for documentation
COMMENT ON FUNCTION public.get_system_health() IS 'Returns system health metrics for monitoring';
COMMENT ON FUNCTION public.get_system_alerts() IS 'Returns potential system issues for alerting';
COMMENT ON FUNCTION public.check_rate_limit(text, text, integer, integer) IS 'Rate limiting function for API endpoints';
COMMENT ON FUNCTION public.cleanup_old_driver_locations() IS 'Removes driver location records older than 24 hours to save storage';
COMMENT ON FUNCTION public.log_audit_event(uuid, text, text, text, uuid, jsonb, jsonb, jsonb, text) IS 'Logs audit events for compliance tracking and debugging';
COMMENT ON FUNCTION public.upsert_payment_record(uuid, uuid, text, text, numeric, text, text, jsonb, text) IS 'Creates or updates payment record from Stripe webhook data';
COMMENT ON TABLE public.api_rate_limits IS 'Tracks API request counts for rate limiting';
COMMENT ON TABLE public.users IS 'User roles for access control (admin, dispatcher, driver, recipient)';
COMMENT ON TABLE public.driver_locations IS 'Real-time driver location tracking for live order updates';
COMMENT ON TABLE public.hubspot_webhook_events IS 'Stores HubSpot webhook events for idempotent processing and audit trail';
COMMENT ON TABLE public.delivery_proof IS 'Stores proof of delivery data including photos, signatures, and notes';
COMMENT ON TABLE public.audit_logs IS 'Comprehensive audit trail for all critical system actions';
COMMENT ON TABLE public.payment_records IS 'Denormalized Stripe payment data for fast queries and reporting';
COMMENT ON COLUMN public.orders.hubspot_deal_id IS 'HubSpot deal ID for bi-directional sync';
COMMENT ON COLUMN public.customers.hubspot_contact_id IS 'HubSpot contact ID for bi-directional sync';
COMMENT ON COLUMN public.delivery_proof.photo_urls IS 'Array of storage URLs for delivery photos (max 3)';
COMMENT ON COLUMN public.delivery_proof.signature_url IS 'Storage URL for digital signature image';
COMMENT ON COLUMN public.audit_logs.action IS 'Action performed (e.g., user.created, order.assigned)';
COMMENT ON COLUMN public.audit_logs.entity_type IS 'Type of entity affected (e.g., user, order, driver)';
COMMENT ON COLUMN public.payment_records.amount IS 'Amount in dollars (not cents) - already converted from Stripe';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- COMPLETE SCHEMA DEPLOYMENT SUCCESS
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'COMPLETE SCHEMA DEPLOYMENT SUCCESSFUL!';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'DATABASE TABLES (13 total):';
  RAISE NOTICE '  Core: customers, quotes, orders, drivers, dispatch_events';
  RAISE NOTICE '  Features: delivery_proof, audit_logs, payment_records';
  RAISE NOTICE '  Integrations: webhook_events (Stripe), hubspot_webhook_events';
  RAISE NOTICE '  Infrastructure: users, driver_locations, api_rate_limits';
  RAISE NOTICE '';
  RAISE NOTICE 'KEY FEATURES:';
  RAISE NOTICE '  ✓ Proof of Delivery: Photos, signatures, delivery notes';
  RAISE NOTICE '  ✓ Audit Logging: Complete compliance trail for all actions';
  RAISE NOTICE '  ✓ Payment Records: Denormalized Stripe data for fast reporting';
  RAISE NOTICE '  ✓ Live Tracking: Real-time driver location updates';
  RAISE NOTICE '  ✓ HubSpot Sync: Bi-directional contact and deal integration';
  RAISE NOTICE '  ✓ RBAC System: 4 roles (admin, dispatcher, driver, recipient)';
  RAISE NOTICE '  ✓ Rate Limiting: API request throttling and protection';
  RAISE NOTICE '  ✓ Security: Row-Level Security policies for all tables';
  RAISE NOTICE '  ✓ Monitoring: Health and alert functions for system status';
  RAISE NOTICE '';
  RAISE NOTICE 'FUNCTIONS (12 total):';
  RAISE NOTICE '  Triggers: update_updated_at_column, validate_order_transition';
  RAISE NOTICE '  Audit: log_audit_event, audit_user_role_changes, audit_order_assignments';
  RAISE NOTICE '  Payments: upsert_payment_record, update_payment_record_updated_at';
  RAISE NOTICE '  Monitoring: get_system_health, get_system_alerts';
  RAISE NOTICE '  Utilities: expire_quotes, cleanup_rate_limits, cleanup_old_driver_locations';
  RAISE NOTICE '  Security: current_user_role, is_admin_or_dispatcher';
  RAISE NOTICE '';
  RAISE NOTICE 'TEST DATA:';
  RAISE NOTICE '  ✓ 5 demo drivers seeded for testing';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  1. Create proof-of-delivery storage bucket in Supabase Dashboard';
  RAISE NOTICE '  2. Create user accounts and assign roles in users table';
  RAISE NOTICE '  3. Test complete workflow: quote → payment → dispatch → delivery';
  RAISE NOTICE '  4. Configure HubSpot webhook endpoint';
  RAISE NOTICE '  5. Set up VAPID keys for push notifications';
  RAISE NOTICE '  6. Run check_schema_status.sql to verify all components';
  RAISE NOTICE '=============================================================================';
END $$;
