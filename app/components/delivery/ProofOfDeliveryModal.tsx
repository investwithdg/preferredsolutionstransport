'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Separator } from '@/app/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { PhotoCapture } from './PhotoCapture';
import { SignaturePad } from './SignaturePad';
import { Camera, PenTool, FileText, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ProofOfDeliveryModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  customerName?: string;
  onSubmit: (data: {
    photos: Blob[];
    signature: Blob | null;
    notes: string;
    recipientName: string;
  }) => Promise<void>;
}

export function ProofOfDeliveryModal({
  open,
  onClose,
  orderId,
  customerName = '',
  onSubmit
}: ProofOfDeliveryModalProps) {
  const [photos, setPhotos] = useState<Blob[]>([]);
  const [signature, setSignature] = useState<Blob | null>(null);
  const [notes, setNotes] = useState('');
  const [recipientName, setRecipientName] = useState(customerName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('photos');

  const handleSubmit = async () => {
    // Validation
    if (photos.length === 0 && !signature) {
      toast.error('Please provide at least one photo or signature');
      return;
    }

    if (!recipientName.trim()) {
      toast.error('Please enter the recipient name');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        photos,
        signature,
        notes: notes.trim(),
        recipientName: recipientName.trim()
      });

      toast.success('Proof of delivery submitted!', {
        description: 'The order has been marked as delivered'
      });

      // Reset form
      setPhotos([]);
      setSignature(null);
      setNotes('');
      setRecipientName('');
      
      onClose();
    } catch (error) {
      console.error('Failed to submit PoD:', error);
      toast.error('Failed to submit proof of delivery', {
        description: error instanceof Error ? error.message : 'Please try again'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;

    // Warn if data will be lost
    if (photos.length > 0 || signature || notes.trim()) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmed) return;
    }

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-heading-lg flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-accent" />
            Proof of Delivery
          </DialogTitle>
          <DialogDescription>
            Capture photos and signature to confirm delivery for Order #{orderId.slice(0, 8)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Recipient Name */}
          <div className="space-y-2">
            <Label htmlFor="recipient-name" className="text-sm font-medium">
              Recipient Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="recipient-name"
              type="text"
              placeholder="Enter the name of the person who received the delivery"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              disabled={isSubmitting}
              className="rounded-2xl"
            />
          </div>

          <Separator />

          {/* Photos and Signature Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="photos" className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Photos
                {photos.length > 0 && (
                  <span className="ml-1 bg-accent text-accent-foreground rounded-full px-2 py-0.5 text-xs">
                    {photos.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="signature" className="flex items-center gap-2">
                <PenTool className="h-4 w-4" />
                Signature
                {signature && (
                  <span className="ml-1 bg-success text-success-foreground rounded-full px-2 py-0.5 text-xs">
                    ✓
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="photos" className="mt-6">
              <PhotoCapture
                onPhotosChange={setPhotos}
                maxPhotos={3}
              />
            </TabsContent>

            <TabsContent value="signature" className="mt-6">
              <SignaturePad
                onSignature={setSignature}
                onClear={() => setSignature(null)}
                width={600}
                height={300}
              />
              {signature && (
                <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded-2xl">
                  <p className="text-sm text-success-foreground flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Signature captured successfully
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <Separator />

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="delivery-notes" className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Delivery Notes (Optional)
            </Label>
            <textarea
              id="delivery-notes"
              placeholder="Add any additional notes about the delivery (e.g., left at door, handed to security, etc.)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              rows={4}
              className="w-full px-4 py-3 rounded-2xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
            <p className="text-xs text-muted-foreground">
              {notes.length} / 500 characters
            </p>
          </div>

          {/* Summary */}
          <div className="bg-muted/30 rounded-2xl p-4 space-y-2">
            <h4 className="text-sm font-medium text-foreground">Proof of Delivery Summary</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Camera className="h-3 w-3" />
                {photos.length} photo{photos.length !== 1 ? 's' : ''} captured
              </li>
              <li className="flex items-center gap-2">
                <PenTool className="h-3 w-3" />
                {signature ? 'Signature captured' : 'No signature'}
              </li>
              <li className="flex items-center gap-2">
                <FileText className="h-3 w-3" />
                {notes.trim() ? 'Notes added' : 'No notes'}
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="accent"
              onClick={handleSubmit}
              disabled={isSubmitting || (photos.length === 0 && !signature) || !recipientName.trim()}
              className="flex-1"
            >
              {isSubmitting ? (
                'Submitting...'
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit & Mark Delivered
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
