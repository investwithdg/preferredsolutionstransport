# Proof of Delivery System - Implementation Guide

## Overview

A comprehensive proof of delivery (PoD) system has been implemented, allowing drivers to capture photos and digital signatures when completing deliveries. This document outlines the implementation, setup, and usage.

## Features

- **Photo Capture**: Up to 3 photos per delivery using device camera or file upload
- **Digital Signature**: Touch/mouse-based signature pad
- **Delivery Notes**: Optional text notes for additional delivery information
- **Recipient Tracking**: Record the name of the person who received the delivery
- **Automatic Compression**: Photos are automatically compressed to reduce storage size
- **Secure Storage**: Files stored in private Supabase Storage bucket with RLS policies
- **HubSpot Integration**: PoD data synced to HubSpot deals

## Database Setup

### 1. Run the Migration

Execute the migration file to create the necessary database structure:

```bash
# Using Supabase CLI
supabase migration up

# Or apply directly in Supabase SQL Editor:
# Copy and paste contents of: supabase/migrations/005_add_proof_of_delivery.sql
```

### 2. Create Storage Bucket

In Supabase Dashboard:

1. Go to **Storage** → **Create a new bucket**
2. Name: `proof-of-delivery`
3. **Public**: ❌ (Keep private)
4. Click **Create bucket**

The RLS policies are automatically created by the migration.

### 3. Verify Setup

Check that the following exist:

- ✅ Table: `delivery_proof`
- ✅ Storage bucket: `proof-of-delivery`
- ✅ RLS policies on `delivery_proof` table
- ✅ Storage policies for authenticated access

## Usage

### For Drivers

1. Navigate to **Driver Dashboard** (`/driver`)
2. Select an order with status **In Transit**
3. Click **Mark Delivered** button
4. **Proof of Delivery Modal** opens with two tabs:
   - **Photos Tab**:
     - Click "Start Camera" to use device camera
     - Click "Upload Photo" to select from device
     - Capture up to 3 photos
     - Photos are automatically compressed
   - **Signature Tab**:
     - Draw signature with finger/mouse
     - Click "Clear" to reset
     - Click "Confirm Signature" to save
5. Enter **Recipient Name** (required)
6. Add optional **Delivery Notes**
7. Click **Submit & Mark Delivered**

### For Customers

View proof of delivery in customer dashboard:

1. Navigate to **Customer Dashboard** (`/customer/dashboard`)
2. Select a delivered order
3. View photos, signature, and delivery notes in order details

### For Dispatchers

View all proof of delivery records:

1. Navigate to **Dispatcher Dashboard** (`/dispatcher`)
2. Select any completed order
3. View PoD details including photos, signature, and notes

## File Structure

### Components

```
app/components/delivery/
├── ProofOfDeliveryModal.tsx      # Main modal with tabs
├── PhotoCapture.tsx               # Camera and upload component
├── SignaturePad.tsx               # Signature capture canvas
└── ProofOfDeliveryViewer.tsx     # Display PoD for viewing
```

### Utilities

```
lib/proof-of-delivery/
├── capture.ts                     # Camera, photo, signature utilities
└── storage.ts                     # Supabase Storage operations
```

### API

```
app/api/orders/[orderId]/proof-of-delivery/
└── route.ts                       # POST: Submit PoD, GET: Retrieve PoD
```

### Database

```
supabase/migrations/
└── 005_add_proof_of_delivery.sql  # Database schema and policies
```

## API Reference

### POST /api/orders/[orderId]/proof-of-delivery

Submit proof of delivery for an order.

**Request Body** (FormData):
- `photo_0`, `photo_1`, `photo_2`: Photo files (optional, max 3)
- `signature`: Signature image file (optional)
- `notes`: Delivery notes (optional)
- `recipientName`: Name of recipient (required)

**Response**:
```json
{
  "success": true,
  "pod": {
    "id": "uuid",
    "photoUrls": ["url1", "url2"],
    "signatureUrl": "url"
  }
}
```

### GET /api/orders/[orderId]/proof-of-delivery

Retrieve proof of delivery for an order.

**Response**:
```json
{
  "pod": {
    "id": "uuid",
    "photo_urls": ["signed_url1", "signed_url2"],
    "signature_url": "signed_url",
    "notes": "Left at front door",
    "recipient_name": "John Doe",
    "delivered_at": "2025-10-29T10:30:00Z",
    "drivers": {
      "name": "Driver Name",
      "phone": "555-1234"
    }
  }
}
```

## Security

### Row Level Security (RLS)

**delivery_proof table:**
- Drivers can insert their own PoD
- Drivers can view their own PoD
- Customers can view PoD for their orders
- Dispatchers and admins can view all PoD

**Storage (proof-of-delivery bucket):**
- Drivers can upload files to their own folder
- Authenticated users can view files (access controlled via signed URLs)
- Drivers can update/delete their own files

### Storage Structure

Files are organized by driver and order:
```
proof-of-delivery/
└── {driverId}/
    └── {orderId}/
        ├── photo_{timestamp}_0.jpg
        ├── photo_{timestamp}_1.jpg
        ├── photo_{timestamp}_2.jpg
        └── signature_{timestamp}.png
```

## Configuration

### Image Compression

Default settings in `lib/proof-of-delivery/capture.ts`:

```typescript
const maxWidth = 1920;      // Maximum photo width in pixels
const quality = 0.85;       // JPEG quality (0-1)
```

Modify these values to adjust file size vs. quality tradeoff.

### Storage Limits

Default limits in `lib/proof-of-delivery/storage.ts`:

```typescript
const MAX_FILE_SIZE = 5 * 1024 * 1024;  // 5MB per file
const MAX_PHOTOS = 3;                    // Maximum photos per delivery
```

## Troubleshooting

### Camera Not Working

**Issue**: "Failed to access camera" error

**Solutions**:
1. Check browser permissions (Allow camera access)
2. Ensure HTTPS is enabled (cameras require secure context)
3. Try fallback: Click "Upload Photo" instead
4. Check browser console for detailed error

### Photos Not Uploading

**Issue**: Photos fail to upload to storage

**Solutions**:
1. Verify storage bucket exists: `proof-of-delivery`
2. Check RLS policies are correctly applied
3. Verify file size is under 5MB
4. Check browser console for API errors

### Signature Not Saving

**Issue**: Signature doesn't convert to blob

**Solutions**:
1. Ensure canvas has content (not blank)
2. Check browser console for canvas errors
3. Try drawing signature again
4. Verify SignaturePad component is mounted

### Database Errors

**Issue**: Failed to save PoD metadata

**Solutions**:
1. Run migration: `supabase/migrations/005_add_proof_of_delivery.sql`
2. Verify table `delivery_proof` exists
3. Check foreign key constraints (order_id, driver_id)
4. Ensure driver has permission to insert

## Testing

### Local Testing

1. **Start Development Server**:
   ```bash
   npm run dev
   ```

2. **Test Photo Capture**:
   - Navigate to `/driver`
   - Select a driver (demo mode)
   - Find an "In Transit" order
   - Click "Mark Delivered"
   - Test camera functionality

3. **Test Signature**:
   - Switch to "Signature" tab
   - Draw with mouse/touch
   - Verify signature displays correctly

4. **Test Submission**:
   - Fill recipient name
   - Add optional notes
   - Submit PoD
   - Verify order status updates to "Delivered"

5. **Test Viewing**:
   - Navigate to customer dashboard
   - View delivered order
   - Verify photos and signature display

### Mobile Testing

Test on actual mobile devices:

1. Deploy to staging/production (HTTPS required for camera)
2. Access on mobile device
3. Test camera access (front/back cameras)
4. Test touch-based signature drawing
5. Verify image compression on mobile

### HubSpot Integration Testing

1. Complete a delivery with PoD
2. Check HubSpot deal for order
3. Verify deal stage updated to "Delivered"
4. Check custom fields for PoD URLs (if configured)

## Best Practices

### For Drivers

1. **Good Lighting**: Take photos in well-lit areas
2. **Clear Photos**: Ensure package is clearly visible
3. **Multiple Angles**: Use all 3 photo slots for different angles
4. **Signature Clarity**: Ask recipient to sign clearly
5. **Accurate Notes**: Add specific delivery location details

### For Implementation

1. **Monitor Storage**: Set up alerts for storage usage
2. **Regular Cleanup**: Archive old PoD data (>1 year)
3. **Compression Testing**: Validate image quality vs. size
4. **Error Logging**: Monitor API errors in production
5. **User Feedback**: Collect driver feedback on usability

## Future Enhancements

Potential improvements:

- [ ] Video proof of delivery (15-30 second clips)
- [ ] GPS coordinates embedded in photos
- [ ] OCR for tracking numbers from packages
- [ ] Barcode/QR code scanning
- [ ] Voice notes for delivery conditions
- [ ] Automated damage detection via ML
- [ ] Customer rating system post-delivery
- [ ] Batch photo upload for multiple deliveries

## Support

For issues or questions:

1. Check this README first
2. Review browser console errors
3. Check Supabase logs in dashboard
4. Verify database schema matches migration
5. Test in demo mode to isolate issues

## License

This implementation is part of the Preferred Solutions Transport platform.


