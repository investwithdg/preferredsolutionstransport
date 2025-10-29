-- =============================================================================
-- Migration 007: Add Audit Logs Table
-- =============================================================================
-- This migration creates a comprehensive audit logging system for tracking
-- all critical actions in the platform for compliance and debugging.
--
-- Features:
-- - Tracks user actions (create, update, delete operations)
-- - Records system events (webhooks, automated processes)
-- - Stores metadata for complete audit trail
-- - Includes IP address tracking
-- - Indexed for fast querying
-- =============================================================================

-- Create audit_logs table
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

-- Create indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON public.audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON public.audit_logs(user_email);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type_id ON public.audit_logs(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only read access to audit logs
DROP POLICY IF EXISTS "Admins read audit logs" ON public.audit_logs;
CREATE POLICY "Admins read audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Service role can insert audit logs
DROP POLICY IF EXISTS "Service role insert audit logs" ON public.audit_logs;
CREATE POLICY "Service role insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Service role full access
DROP POLICY IF EXISTS "Service role full access audit logs" ON public.audit_logs;
CREATE POLICY "Service role full access audit logs"
  ON public.audit_logs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================================================
-- Helper Functions for Audit Logging
-- =============================================================================

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

-- =============================================================================
-- Automatic Audit Triggers for Critical Tables
-- =============================================================================

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

-- Apply trigger to users table
DROP TRIGGER IF EXISTS audit_user_changes ON public.users;
CREATE TRIGGER audit_user_changes
  AFTER INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_user_role_changes();

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

-- Apply trigger to orders table  
DROP TRIGGER IF EXISTS audit_order_assignments ON public.orders;
CREATE TRIGGER audit_order_assignments
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_order_assignments();

-- =============================================================================
-- Sample Audit Queries
-- =============================================================================

COMMENT ON TABLE public.audit_logs IS 'Comprehensive audit trail for all critical system actions';
COMMENT ON COLUMN public.audit_logs.action IS 'Action performed (e.g., user.created, order.assigned)';
COMMENT ON COLUMN public.audit_logs.entity_type IS 'Type of entity affected (e.g., user, order, driver)';
COMMENT ON COLUMN public.audit_logs.old_values IS 'Previous state before change (for updates/deletes)';
COMMENT ON COLUMN public.audit_logs.new_values IS 'New state after change (for creates/updates)';

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Migration 007 complete: audit_logs table created';
  RAISE NOTICE 'Audit logging enabled for: users, orders';
  RAISE NOTICE 'Admin-only access policies in place';
  RAISE NOTICE 'Helper function log_audit_event() available for manual logging';
END $$;

