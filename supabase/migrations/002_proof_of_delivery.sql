-- ============================================================================
-- Proof of Delivery Migration
-- Creates delivery_proof table and storage policies
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Delivery proof table
CREATE TABLE IF NOT EXISTS public.delivery_proof (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL NOT NULL,
  photo_urls TEXT[] DEFAULT '{}',
  signature_url TEXT,
  notes TEXT,
  recipient_name TEXT,
  delivered_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_proof ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_delivery_proof_order_id ON public.delivery_proof(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_proof_driver_id ON public.delivery_proof(driver_id);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Drivers can insert their own proof of delivery
CREATE POLICY "Drivers can insert their own PoD"
  ON public.delivery_proof
  FOR INSERT
  WITH CHECK (
    driver_id IN (
      SELECT d.id FROM public.drivers d
      INNER JOIN public.users u ON u.id = d.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Drivers can view their own proof of delivery
CREATE POLICY "Drivers can view their own PoD"
  ON public.delivery_proof
  FOR SELECT
  USING (
    driver_id IN (
      SELECT d.id FROM public.drivers d
      INNER JOIN public.users u ON u.id = d.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Customers can view proof of delivery for their orders
CREATE POLICY "Customers can view PoD for their orders"
  ON public.delivery_proof
  FOR SELECT
  USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      INNER JOIN public.customers c ON c.id = o.customer_id
      INNER JOIN auth.users au ON au.email = c.email
      WHERE au.id = auth.uid()
    )
  );

-- Admins and dispatchers can view all proof of delivery
CREATE POLICY "Admins and dispatchers can view all PoD"
  ON public.delivery_proof
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('admin', 'dispatcher')
    )
  );

-- Admins can delete proof of delivery
CREATE POLICY "Admins can delete PoD"
  ON public.delivery_proof
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================================
-- STORAGE POLICIES
-- Note: The storage bucket 'proof-of-delivery' must be created manually
-- in the Supabase dashboard. These policies will be applied once the bucket exists.
-- ============================================================================

-- Allow drivers to upload files to their own folder
CREATE POLICY "Drivers can upload to their folder"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'proof-of-delivery' AND
    (storage.foldername(name))[1] IN (
      SELECT d.id::text FROM public.drivers d
      INNER JOIN public.users u ON u.id = d.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Allow authenticated users to view files (access controlled via signed URLs)
CREATE POLICY "Authenticated users can view PoD files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'proof-of-delivery' AND
    auth.role() = 'authenticated'
  );

-- Allow drivers to update/delete their own files
CREATE POLICY "Drivers can update their own files"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'proof-of-delivery' AND
    (storage.foldername(name))[1] IN (
      SELECT d.id::text FROM public.drivers d
      INNER JOIN public.users u ON u.id = d.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can delete their own files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'proof-of-delivery' AND
    (storage.foldername(name))[1] IN (
      SELECT d.id::text FROM public.drivers d
      INNER JOIN public.users u ON u.id = d.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Allow admins to delete any files
CREATE POLICY "Admins can delete any PoD files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'proof-of-delivery' AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role = 'admin'
    )
  );
