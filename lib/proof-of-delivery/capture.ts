/**
 * Proof of Delivery Capture Utilities
 * Handles camera access, photo capture, image compression, and signature conversion
 */

/**
 * Initialize camera stream
 * @param facingMode - 'user' for front camera, 'environment' for back camera
 * @returns MediaStream for video preview
 */
export async function initializeCamera(facingMode: 'user' | 'environment' = 'environment'): Promise<MediaStream> {
  try {
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  } catch (error) {
    console.error('Error initializing camera:', error);
    throw new Error('Failed to access camera. Please ensure camera permissions are granted.');
  }
}

/**
 * Stop camera stream and release resources
 */
export function stopCamera(stream: MediaStream): void {
  stream.getTracks().forEach(track => track.stop());
}

/**
 * Capture photo from video stream
 * @param videoElement - Video element with active stream
 * @returns Blob containing captured image
 */
export async function capturePhoto(videoElement: HTMLVideoElement): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to get canvas context');
  }

  // Draw video frame to canvas
  context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to capture photo'));
      }
    }, 'image/jpeg', 0.92);
  });
}

/**
 * Compress image to reduce file size
 * @param blob - Original image blob
 * @param maxWidth - Maximum width in pixels (default 1920)
 * @param quality - JPEG quality 0-1 (default 0.85)
 * @returns Compressed image blob
 */
export async function compressImage(
  blob: Blob, 
  maxWidth: number = 1920, 
  quality: number = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Draw resized image
      context.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (compressedBlob) => {
          if (compressedBlob) {
            resolve(compressedBlob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Convert canvas signature to blob
 * @param canvas - Canvas element with signature
 * @param format - Image format ('png' or 'jpeg')
 * @returns Blob containing signature image
 */
export function signatureToBlob(canvas: HTMLCanvasElement, format: 'png' | 'jpeg' = 'png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    const quality = format === 'jpeg' ? 0.92 : undefined;

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert signature to blob'));
        }
      },
      mimeType,
      quality
    );
  });
}

/**
 * Check if signature canvas has content
 * @param canvas - Canvas element to check
 * @returns True if canvas has been drawn on
 */
export function isCanvasBlank(canvas: HTMLCanvasElement): boolean {
  const context = canvas.getContext('2d');
  if (!context) return true;

  const pixelBuffer = new Uint32Array(
    context.getImageData(0, 0, canvas.width, canvas.height).data.buffer
  );

  return !pixelBuffer.some(color => color !== 0);
}

/**
 * Check if camera is available
 * @returns True if getUserMedia is supported
 */
export function isCameraAvailable(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Get list of available cameras
 * @returns Array of video input devices
 */
export async function getAvailableCameras(): Promise<MediaDeviceInfo[]> {
  if (!isCameraAvailable()) {
    return [];
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'videoinput');
  } catch (error) {
    console.error('Error enumerating devices:', error);
    return [];
  }
}

/**
 * Convert blob to data URL for preview
 * @param blob - Image blob
 * @returns Data URL string
 */
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to data URL'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}


