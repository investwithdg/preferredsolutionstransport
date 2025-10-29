-- =============================================================================
-- Migration 008: Add Payment Records Table
-- =============================================================================
-- This migration creates a denormalized payment records table for:
-- - Faster payment history queries (avoid Stripe API calls)
-- - Local caching of Stripe payment data
-- - Financial reporting and analytics
-- - Webhook event deduplication
-- =============================================================================

-- Create payment_records table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_records_order_id ON public.payment_records(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_customer_id ON public.payment_records(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_status ON public.payment_records(status);
CREATE INDEX IF NOT EXISTS idx_payment_records_created_at ON public.payment_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_records_stripe_checkout_session ON public.payment_records(stripe_checkout_session_id);

-- Enable RLS
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- Service role full access
DROP POLICY IF EXISTS "Service role full access payment records" ON public.payment_records;
CREATE POLICY "Service role full access payment records"
  ON public.payment_records FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Admins can view all payment records
DROP POLICY IF EXISTS "Admins view all payments" ON public.payment_records;
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
DROP POLICY IF EXISTS "Dispatchers view all payments" ON public.payment_records;
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
DROP POLICY IF EXISTS "Customers view own payments" ON public.payment_records;
CREATE POLICY "Customers view own payments"
  ON public.payment_records FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers
      WHERE customers.email = auth.email()
    )
  );

-- =============================================================================
-- Trigger for Automatic Updated At
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_payment_record_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_payment_records_updated_at ON public.payment_records;
CREATE TRIGGER update_payment_records_updated_at
  BEFORE UPDATE ON public.payment_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_record_updated_at();

-- =============================================================================
-- Helper Functions
-- =============================================================================

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
-- Verification
-- =============================================================================

COMMENT ON TABLE public.payment_records IS 'Denormalized Stripe payment data for fast queries and reporting';
COMMENT ON COLUMN public.payment_records.amount IS 'Amount in dollars (not cents) - already converted from Stripe';
COMMENT ON COLUMN public.payment_records.refunded_amount IS 'Total amount refunded (partial or full)';

DO $$
BEGIN
  RAISE NOTICE 'Migration 008 complete: payment_records table created';
  RAISE NOTICE 'Indexes created for optimized queries';
  RAISE NOTICE 'RLS policies: Admin/Dispatcher (all), Customers (own records)';
  RAISE NOTICE 'Helper function upsert_payment_record() available for webhooks';
END $$;

