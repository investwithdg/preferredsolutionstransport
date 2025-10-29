-- Migration: Add Proof of Delivery System
-- Description: Creates tables and storage bucket for proof of delivery photos and signatures

-- Create delivery_proof table
CREATE TABLE IF NOT EXISTS public.delivery_proof (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id),
  photo_urls TEXT[] DEFAULT '{}', -- Array of storage URLs for photos
  signature_url TEXT, -- URL for signature image
  notes TEXT, -- Additional delivery notes
  recipient_name TEXT, -- Name of person who received delivery
  delivered_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on order_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_delivery_proof_order_id ON public.delivery_proof(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_proof_driver_id ON public.delivery_proof(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_proof_delivered_at ON public.delivery_proof(delivered_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_delivery_proof_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_delivery_proof_updated_at
  BEFORE UPDATE ON public.delivery_proof
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_proof_updated_at();

-- Enable RLS
ALTER TABLE public.delivery_proof ENABLE ROW LEVEL SECURITY;

-- RLS Policies for delivery_proof table
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

-- Storage bucket for proof of delivery images
-- Note: This should be created via Supabase Dashboard or API
-- The bucket should be configured as private (public: false)
-- Storage policies are defined below

-- Storage RLS Policies
-- Note: These are applied to storage.objects table

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

-- Drivers can update/delete their own PoD files
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

-- Grant necessary permissions
GRANT ALL ON public.delivery_proof TO authenticated;
GRANT ALL ON public.delivery_proof TO service_role;

-- Comments for documentation
COMMENT ON TABLE public.delivery_proof IS 'Stores proof of delivery data including photos, signatures, and notes';
COMMENT ON COLUMN public.delivery_proof.photo_urls IS 'Array of storage URLs for delivery photos (max 3)';
COMMENT ON COLUMN public.delivery_proof.signature_url IS 'Storage URL for digital signature image';
COMMENT ON COLUMN public.delivery_proof.notes IS 'Additional notes about the delivery';
COMMENT ON COLUMN public.delivery_proof.recipient_name IS 'Name of the person who received the delivery';


