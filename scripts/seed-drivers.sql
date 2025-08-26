-- Sample drivers for testing Milestone 2 functionality
-- Run this in your Supabase SQL editor to add test drivers

-- Note: In production, drivers would be created through proper authentication flow
-- For now, we're creating drivers without linking to auth.users (user_id will be NULL)

INSERT INTO public.drivers (name, phone, vehicle_details) VALUES 
  ('John Smith', '555-0101', '{"make": "Ford", "model": "Transit", "license_plate": "ABC1234", "color": "White"}'),
  ('Sarah Johnson', '555-0102', '{"make": "Mercedes", "model": "Sprinter", "license_plate": "DEF5678", "color": "Blue"}'),
  ('Mike Davis', '555-0103', '{"make": "Isuzu", "model": "NPR", "license_plate": "GHI9012", "color": "Silver"}'),
  ('Lisa Wilson', '555-0104', '{"make": "Ford", "model": "E-350", "license_plate": "JKL3456", "color": "White"}'),
  ('Tom Anderson', '555-0105', '{"make": "Chevrolet", "model": "Express", "license_plate": "MNO7890", "color": "Gray"}')
ON CONFLICT (id) DO NOTHING;

-- Verify the drivers were created
SELECT 
  id,
  name,
  phone,
  vehicle_details->>'make' as vehicle_make,
  vehicle_details->>'model' as vehicle_model,
  vehicle_details->>'license_plate' as license_plate,
  created_at
FROM public.drivers
ORDER BY created_at DESC;
