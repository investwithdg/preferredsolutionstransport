'use client';

import { useRef, useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Camera, X, RotateCcw, Upload } from 'lucide-react';
import { initializeCamera, stopCamera, capturePhoto, compressImage, blobToDataURL } from '@/lib/proof-of-delivery/capture';
import { toast } from 'sonner';

interface PhotoCaptureProps {
  onPhotosChange: (photos: Blob[]) => void;
  maxPhotos?: number;
  className?: string;
}

export function PhotoCapture({ onPhotosChange, maxPhotos = 3, className }: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [photos, setPhotos] = useState<{ blob: Blob; url: string }[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  // Initialize camera
  const startCamera = async () => {
    try {
      const mediaStream = await initializeCamera(facingMode);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      setIsCameraActive(true);
    } catch (error) {
      console.error('Failed to start camera:', error);
      toast.error('Camera access denied', {
        description: 'Please allow camera access to take photos'
      });
    }
  };

  // Stop camera
  const handleStopCamera = () => {
    if (stream) {
      stopCamera(stream);
      setStream(null);
    }
    setIsCameraActive(false);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stopCamera(stream);
      }
    };
  }, [stream]);

  // Capture photo from camera
  const handleCapture = async () => {
    if (!videoRef.current || photos.length >= maxPhotos) return;

    setIsCapturing(true);
    try {
      const photoBlob = await capturePhoto(videoRef.current);
      const compressedBlob = await compressImage(photoBlob, 1920, 0.85);
      const dataUrl = await blobToDataURL(compressedBlob);

      const newPhotos = [...photos, { blob: compressedBlob, url: dataUrl }];
      setPhotos(newPhotos);
      onPhotosChange(newPhotos.map(p => p.blob));

      toast.success('Photo captured!');

      // Stop camera if max photos reached
      if (newPhotos.length >= maxPhotos) {
        handleStopCamera();
      }
    } catch (error) {
      console.error('Failed to capture photo:', error);
      toast.error('Failed to capture photo');
    } finally {
      setIsCapturing(false);
    }
  };

  // Handle file upload (fallback)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxPhotos - photos.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    try {
      const newPhotosData = await Promise.all(
        filesToProcess.map(async (file) => {
          const compressedBlob = await compressImage(file, 1920, 0.85);
          const dataUrl = await blobToDataURL(compressedBlob);
          return { blob: compressedBlob, url: dataUrl };
        })
      );

      const updatedPhotos = [...photos, ...newPhotosData];
      setPhotos(updatedPhotos);
      onPhotosChange(updatedPhotos.map(p => p.blob));

      toast.success(`${newPhotosData.length} photo(s) added!`);
    } catch (error) {
      console.error('Failed to process uploaded photos:', error);
      toast.error('Failed to process photos');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove photo
  const handleRemovePhoto = (index: number) => {
    const updatedPhotos = photos.filter((_, i) => i !== index);
    setPhotos(updatedPhotos);
    onPhotosChange(updatedPhotos.map(p => p.blob));
    toast.success('Photo removed');
  };

  // Toggle camera facing mode
  const toggleCamera = async () => {
    handleStopCamera();
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    // Camera will be restarted when user clicks start again
  };

  return (
    <div className={className}>
      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Camera controls */}
            {!isCameraActive ? (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="accent"
                    onClick={startCamera}
                    disabled={photos.length >= maxPhotos}
                    className="flex-1"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Start Camera
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={photos.length >= maxPhotos}
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photo
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Video preview */}
                <div className="relative rounded-2xl overflow-hidden bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-auto"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                      {photos.length} / {maxPhotos}
                    </Badge>
                  </div>
                </div>

                {/* Camera controls */}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={toggleCamera}
                    className="flex-1"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Flip Camera
                  </Button>
                  <Button
                    type="button"
                    variant="accent"
                    onClick={handleCapture}
                    disabled={isCapturing || photos.length >= maxPhotos}
                    className="flex-1"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {isCapturing ? 'Capturing...' : 'Capture Photo'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleStopCamera}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Photo preview grid */}
            {photos.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">
                  Captured Photos ({photos.length})
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo.url}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-24 object-cover rounded-xl border-2 border-border"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-1 left-1">
                        <Badge variant="secondary" className="text-xs">
                          {index + 1}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Help text */}
            <p className="text-xs text-muted-foreground">
              Take up to {maxPhotos} photos of the delivered package. Photos will be compressed automatically.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

