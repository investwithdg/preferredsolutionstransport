/**
 * Proof of Delivery Storage Utilities
 * Handles uploading photos/signatures to Supabase Storage and database operations
 */

import { createClient } from '@/lib/supabase/client';

const BUCKET_NAME = 'proof-of-delivery';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface ProofOfDeliveryData {
  orderId: string;
  driverId: string;
  photos: Blob[];
  signature: Blob | null;
  notes: string;
  recipientName?: string;
}

export interface ProofOfDeliveryResult {
  id: string;
  photoUrls: string[];
  signatureUrl: string | null;
}

/**
 * Upload proof of delivery data
 * @param data - PoD data including photos, signature, and notes
 * @returns Result with uploaded URLs and PoD record ID
 */
export async function uploadProofOfDelivery(
  data: ProofOfDeliveryData
): Promise<ProofOfDeliveryResult> {
  const supabase = createClient() as any;
  
  // Validate photos
  if (data.photos.length === 0 && !data.signature) {
    throw new Error('At least one photo or signature is required');
  }

  if (data.photos.length > 3) {
    throw new Error('Maximum 3 photos allowed');
  }

  // Validate file sizes
  for (const photo of data.photos) {
    if (photo.size > MAX_FILE_SIZE) {
      throw new Error(`Photo size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    }
  }

  if (data.signature && data.signature.size > MAX_FILE_SIZE) {
    throw new Error(`Signature size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
  }

  const timestamp = Date.now();
  const photoUrls: string[] = [];
  let signatureUrl: string | null = null;

  try {
    // Upload photos
    for (let i = 0; i < data.photos.length; i++) {
      const photo = data.photos[i];
      const fileName = `${data.driverId}/${data.orderId}/photo_${timestamp}_${i}.jpg`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, photo, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Failed to upload photo ${i + 1}: ${uploadError.message}`);
      }

      // Get public URL (will use signed URL for private bucket)
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(uploadData.path);

      photoUrls.push(urlData.publicUrl);
    }

    // Upload signature if provided
    if (data.signature) {
      const signatureFileName = `${data.driverId}/${data.orderId}/signature_${timestamp}.png`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(signatureFileName, data.signature, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Failed to upload signature: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(uploadData.path);

      signatureUrl = urlData.publicUrl;
    }

    // Save metadata to database
    const { data: podData, error: dbError } = await supabase
      .from('delivery_proof' as any)
      .insert({
        order_id: data.orderId,
        driver_id: data.driverId,
        photo_urls: photoUrls,
        signature_url: signatureUrl,
        notes: data.notes,
        recipient_name: data.recipientName || null,
        delivered_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (dbError) {
      throw new Error(`Failed to save PoD metadata: ${dbError.message}`);
    }

    const podRecord = podData as any;

    return {
      id: podRecord.id,
      photoUrls,
      signatureUrl
    };
  } catch (error) {
    // Clean up uploaded files if database insert fails
    if (photoUrls.length > 0 || signatureUrl) {
      await cleanupFailedUpload(data.driverId, data.orderId, timestamp);
    }
    throw error;
  }
}

/**
 * Get proof of delivery for an order
 * @param orderId - Order ID
 * @returns PoD data or null if not found
 */
export async function getProofOfDelivery(orderId: string) {
  const supabase = createClient() as any;

  const { data, error } = await supabase
    .from('delivery_proof' as any)
    .select(`
      *,
      drivers:driver_id (
        name,
        phone
      )
    `)
    .eq('order_id', orderId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch PoD: ${error.message}`);
  }

  const record = data as any;

  const signedPhotoUrls = await Promise.all(
    (record.photo_urls || []).map(async (url: string) => {
      const path = extractPathFromUrl(url);
      if (!path) return url;

      const { data: signedData } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(path, 3600);

      return signedData?.signedUrl || url;
    })
  );

  let signedSignatureUrl = record.signature_url;
  if (record.signature_url) {
    const path = extractPathFromUrl(record.signature_url);
    if (path) {
      const { data: signedData } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(path, 3600);

      signedSignatureUrl = signedData?.signedUrl || record.signature_url;
    }
  }

  return {
    ...record,
    photo_urls: signedPhotoUrls,
    signature_url: signedSignatureUrl
  };
}

/**
 * Check if order has proof of delivery
 * @param orderId - Order ID
 * @returns True if PoD exists
 */
export async function hasProofOfDelivery(orderId: string): Promise<boolean> {
  const supabase = createClient() as any;

  const { data, error } = await supabase
    .from('delivery_proof' as any)
    .select('id')
    .eq('order_id', orderId)
    .single();

  return !!data && !error;
}

/**
 * Clean up failed upload
 * @param driverId - Driver ID
 * @param orderId - Order ID
 * @param timestamp - Timestamp used in file names
 */
async function cleanupFailedUpload(
  driverId: string,
  orderId: string,
  timestamp: number
): Promise<void> {
  const supabase = createClient() as any;
  const folderPath = `${driverId}/${orderId}`;

  try {
    // List all files in the folder
    const { data: files, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(folderPath);

    if (error || !files) return;

    // Filter files with matching timestamp
    const filesToDelete = files
      .filter((file: any) => file.name.includes(String(timestamp)))
      .map((file: any) => `${folderPath}/${file.name}`);

    if (filesToDelete.length > 0) {
      await supabase.storage
        .from(BUCKET_NAME)
        .remove(filesToDelete);
    }
  } catch (error) {
    console.error('Failed to cleanup files:', error);
  }
}

/**
 * Extract storage path from public URL
 * @param url - Public URL
 * @returns Storage path
 */
function extractPathFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split(`/object/public/${BUCKET_NAME}/`);
    return pathParts.length > 1 ? pathParts[1] : null;
  } catch {
    return null;
  }
}

/**
 * Delete proof of delivery (admin only)
 * @param podId - PoD record ID
 */
export async function deleteProofOfDelivery(podId: string): Promise<void> {
  const supabase = createClient() as any;

  // Get PoD data first to delete files
  const { data: pod, error: fetchError } = await supabase
    .from('delivery_proof' as any)
    .select('photo_urls, signature_url, driver_id, order_id')
    .eq('id', podId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch PoD: ${fetchError.message}`);
  }

  // Delete files from storage
  const filesToDelete: string[] = [];
  
  (pod.photo_urls || []).forEach((url: string) => {
    const path = extractPathFromUrl(url);
    if (path) filesToDelete.push(path);
  });

  if (pod.signature_url) {
    const path = extractPathFromUrl(pod.signature_url);
    if (path) filesToDelete.push(path);
  }

  if (filesToDelete.length > 0) {
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(filesToDelete);

    if (deleteError) {
      console.error('Failed to delete files:', deleteError);
    }
  }

  // Delete database record
  const { error: dbError } = await supabase
    .from('delivery_proof' as any)
    .delete()
    .eq('id', podId);

  if (dbError) {
    throw new Error(`Failed to delete PoD record: ${dbError.message}`);
  }
}

