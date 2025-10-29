# Proof of Delivery - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Database Migration (2 minutes)

**Option A: Using Supabase CLI**
```bash
supabase migration up
```

**Option B: Using Supabase Dashboard**
1. Open [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **SQL Editor**
3. Copy contents of `supabase/migrations/005_add_proof_of_delivery.sql`
4. Click **Run**
5. Verify: ✅ Table `delivery_proof` created

### Step 2: Storage Bucket Setup (1 minute)

1. In Supabase Dashboard, go to **Storage**
2. Click **Create a new bucket**
3. Settings:
   - **Name**: `proof-of-delivery`
   - **Public**: ❌ (Keep it private!)
   - **File size limit**: 5MB (default is fine)
4. Click **Create bucket**
5. Verify: ✅ Bucket appears in list

**Note**: RLS policies are automatically created by the migration.

### Step 3: Deploy (1 minute)

```bash
# Install dependencies (if needed)
npm install @radix-ui/react-tabs

# Build
npm run build

# Deploy to Vercel (or your platform)
vercel deploy --prod
```

### Step 4: Test (1 minute)

#### Quick Test Flow:
1. Navigate to `/driver` (demo mode works!)
2. Select a driver
3. Find an "In Transit" order
4. Click **Mark Delivered**
5. Take a photo or draw a signature
6. Enter recipient name
7. Click **Submit & Mark Delivered**
8. ✅ Order status → "Delivered"

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Table `delivery_proof` exists in Supabase
- [ ] Storage bucket `proof-of-delivery` exists and is private
- [ ] Can access `/driver` page without errors
- [ ] PoD modal opens when clicking "Mark Delivered"
- [ ] Camera permission request appears (on HTTPS)
- [ ] Photo upload alternative works
- [ ] Signature pad draws smoothly
- [ ] Form validation works (recipient name required)
- [ ] Files upload to Storage bucket
- [ ] Order status updates to "Delivered"

---

## 🔧 Troubleshooting

### Camera Doesn't Work
**Problem**: "Failed to access camera" error

**Solutions**:
```bash
# 1. Ensure you're on HTTPS
✅ https://yourdomain.com  # Works
❌ http://yourdomain.com   # Camera blocked

# 2. Check browser permissions
# Chrome: Settings → Privacy → Camera → Allow

# 3. Use file upload as fallback
# Click "Upload Photo" instead of "Start Camera"
```

### Photos Don't Upload
**Problem**: Upload fails or times out

**Solutions**:
1. Check bucket exists: `proof-of-delivery`
2. Verify bucket is set to **Private** (not public)
3. Check browser console for specific error
4. Ensure photos are under 5MB each

### Database Error
**Problem**: "Failed to save PoD metadata"

**Solutions**:
```sql
-- Run in Supabase SQL Editor to verify:
SELECT * FROM delivery_proof LIMIT 1;

-- If table doesn't exist, run migration:
-- Copy contents of supabase/migrations/005_add_proof_of_delivery.sql
```

---

## 📱 Mobile Testing

### iOS Safari
1. Deploy to production (HTTPS required)
2. Open in Safari mobile
3. Grant camera permissions when prompted
4. Test front/back camera switch
5. Test signature with finger

### Android Chrome
1. Deploy to production (HTTPS required)
2. Open in Chrome mobile
3. Grant camera permissions
4. Test camera and signature

**Note**: `localhost` works for testing on desktop but not mobile. Use ngrok or deploy to staging for mobile testing.

---

## 🎯 Usage Examples

### Example 1: Photo Only
```
1. Click "Start Camera"
2. Capture 1-3 photos
3. Enter recipient name: "John Doe"
4. Submit
```

### Example 2: Signature Only
```
1. Switch to "Signature" tab
2. Draw signature
3. Click "Confirm Signature"
4. Enter recipient name: "Jane Smith"
5. Submit
```

### Example 3: Complete PoD
```
1. Capture 3 photos of package
2. Switch to "Signature" tab
3. Get customer signature
4. Enter recipient name: "Bob Johnson"
5. Add notes: "Left at front door"
6. Submit
```

---

## 📊 What Happens After Submission

1. **Files Uploaded**:
   - Photos → `proof-of-delivery/{driverId}/{orderId}/photo_*.jpg`
   - Signature → `proof-of-delivery/{driverId}/{orderId}/signature_*.png`

2. **Database Updated**:
   - Record created in `delivery_proof` table
   - Order status → "Delivered"
   - Timestamp recorded

3. **HubSpot Synced** (if configured):
   - Deal stage → "Delivered"
   - Actual delivery time set
   - Custom fields updated (optional)

4. **Customer Notified**:
   - Can view PoD in customer dashboard
   - Sees delivery confirmation

---

## 🔐 Security Notes

- ✅ Files stored in **private** bucket
- ✅ Access controlled by RLS policies
- ✅ Only drivers can upload their own PoD
- ✅ Customers can only view their orders
- ✅ Dispatchers/admins can view all
- ✅ URLs expire after 1 hour

---

## 📖 Additional Resources

- **Full Documentation**: `PROOF_OF_DELIVERY_README.md`
- **Implementation Details**: `IMPLEMENTATION_SUMMARY.md`
- **Design System**: `DESIGN_SYSTEM.md`
- **API Reference**: `REFERENCE.md`

---

## 💡 Tips

### For Best Results:
1. **Good Lighting**: Take photos in well-lit areas
2. **Clear Shots**: Capture package from multiple angles
3. **Signature Clarity**: Ensure signature is legible
4. **Accurate Names**: Double-check recipient name spelling
5. **Detailed Notes**: Add specific location info ("left at side door")

### For Developers:
1. Test in demo mode first
2. Use browser DevTools to debug
3. Check Supabase logs for errors
4. Monitor Storage usage
5. Keep compression settings optimized

---

## 🎉 You're Done!

The Proof of Delivery system is now ready to use. Drivers can capture professional delivery confirmations, customers can view proof of receipt, and all data is securely stored and integrated with your existing systems.

**Need Help?** Check the troubleshooting section or review the full documentation in `PROOF_OF_DELIVERY_README.md`.

---

*Quick Start Guide*
*Version 1.0 - October 29, 2025*


