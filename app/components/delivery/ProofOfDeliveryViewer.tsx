'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Separator } from '@/app/components/ui/separator';
import { LoadingState } from '@/app/components/shared/LoadingState';
import { Camera, PenTool, FileText, User, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ProofOfDeliveryData {
  id: string;
  photo_urls: string[];
  signature_url: string | null;
  notes: string | null;
  recipient_name: string | null;
  delivered_at: string;
  drivers: {
    name: string;
    phone: string | null;
  };
}

interface ProofOfDeliveryViewerProps {
  orderId: string;
  className?: string;
}

export function ProofOfDeliveryViewer({ orderId, className }: ProofOfDeliveryViewerProps) {
  const [pod, setPod] = useState<ProofOfDeliveryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    const fetchPoD = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}/proof-of-delivery`);
        
        if (response.status === 404) {
          // No PoD found
          setPod(null);
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch proof of delivery');
        }

        const data = await response.json();
        setPod(data.pod);
      } catch (error) {
        console.error('Error fetching PoD:', error);
        toast.error('Failed to load proof of delivery');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPoD();
  }, [orderId]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <LoadingState message="Loading proof of delivery..." />
        </CardContent>
      </Card>
    );
  }

  if (!pod) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No proof of delivery has been submitted yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-heading-md flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Proof of Delivery
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Delivery Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Recipient
              </h4>
              <p className="text-sm text-foreground pl-6">
                {pod.recipient_name || 'Not specified'}
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Delivered At
              </h4>
              <p className="text-sm text-foreground pl-6">
                {new Date(pod.delivered_at).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Driver
              </h4>
              <p className="text-sm text-foreground pl-6">
                {pod.drivers.name}
              </p>
            </div>
          </div>

          <Separator />

          {/* Photos */}
          {pod.photo_urls && pod.photo_urls.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Camera className="h-4 w-4 text-muted-foreground" />
                Delivery Photos ({pod.photo_urls.length})
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {pod.photo_urls.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedPhoto(url)}
                    className="relative group cursor-pointer"
                  >
                    <img
                      src={url}
                      alt={`Delivery photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded-xl border-2 border-border group-hover:border-accent transition-colors"
                    />
                    <div className="absolute bottom-2 left-2">
                      <Badge variant="secondary" className="text-xs">
                        {index + 1}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Signature */}
          {pod.signature_url && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <PenTool className="h-4 w-4 text-muted-foreground" />
                  Signature
                </h4>
                <div className="bg-muted/30 rounded-2xl p-4 flex items-center justify-center">
                  <img
                    src={pod.signature_url}
                    alt="Delivery signature"
                    className="max-h-48 w-auto"
                  />
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {pod.notes && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Delivery Notes
                </h4>
                <p className="text-sm text-muted-foreground pl-6 whitespace-pre-wrap">
                  {pod.notes}
                </p>
              </div>
            </>
          )}

          {/* Verification Badge */}
          <div className="bg-success/10 border border-success/20 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-success-foreground">
                  Delivery Verified
                </p>
                <p className="text-xs text-success-foreground/80 mt-1">
                  This proof of delivery was submitted by {pod.drivers.name} on{' '}
                  {new Date(pod.delivered_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl w-full">
            <img
              src={selectedPhoto}
              alt="Delivery photo"
              className="w-full h-auto rounded-2xl"
            />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm text-foreground rounded-full p-2 hover:bg-background transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

