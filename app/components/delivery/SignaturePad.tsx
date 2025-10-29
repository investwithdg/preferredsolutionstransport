'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { RotateCcw, Check } from 'lucide-react';

interface SignaturePadProps {
  onSignature: (blob: Blob) => void;
  onClear?: () => void;
  width?: number;
  height?: number;
  className?: string;
}

export function SignaturePad({
  onSignature,
  onClear,
  width = 600,
  height = 300,
  className
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Configure drawing style
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    setContext(ctx);
  }, [width, height]);

  // Get coordinates relative to canvas
  const getCoordinates = useCallback((event: MouseEvent | TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in event && event.touches.length > 0) {
      // Touch event
      const touch = event.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      };
    } else if ('clientX' in event) {
      // Mouse event
      return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY
      };
    }

    return null;
  }, []);

  // Start drawing
  const startDrawing = useCallback((event: MouseEvent | TouchEvent) => {
    event.preventDefault();
    const coords = getCoordinates(event);
    if (!context || !coords) return;

    setIsDrawing(true);
    context.beginPath();
    context.moveTo(coords.x, coords.y);
  }, [context, getCoordinates]);

  // Draw
  const draw = useCallback((event: MouseEvent | TouchEvent) => {
    event.preventDefault();
    if (!isDrawing || !context) return;

    const coords = getCoordinates(event);
    if (!coords) return;

    context.lineTo(coords.x, coords.y);
    context.stroke();
    setHasSignature(true);
  }, [isDrawing, context, getCoordinates]);

  // Stop drawing
  const stopDrawing = useCallback((event: MouseEvent | TouchEvent) => {
    event.preventDefault();
    if (!isDrawing) return;

    setIsDrawing(false);
    if (context) {
      context.closePath();
    }
  }, [isDrawing, context]);

  // Set up event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Mouse events
    canvas.addEventListener('mousedown', startDrawing as any);
    canvas.addEventListener('mousemove', draw as any);
    canvas.addEventListener('mouseup', stopDrawing as any);
    canvas.addEventListener('mouseleave', stopDrawing as any);

    // Touch events
    canvas.addEventListener('touchstart', startDrawing as any);
    canvas.addEventListener('touchmove', draw as any);
    canvas.addEventListener('touchend', stopDrawing as any);
    canvas.addEventListener('touchcancel', stopDrawing as any);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing as any);
      canvas.removeEventListener('mousemove', draw as any);
      canvas.removeEventListener('mouseup', stopDrawing as any);
      canvas.removeEventListener('mouseleave', stopDrawing as any);
      canvas.removeEventListener('touchstart', startDrawing as any);
      canvas.removeEventListener('touchmove', draw as any);
      canvas.removeEventListener('touchend', stopDrawing as any);
      canvas.removeEventListener('touchcancel', stopDrawing as any);
    };
  }, [startDrawing, draw, stopDrawing]);

  // Clear signature
  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onClear?.();
  }, [context, onClear]);

  // Save signature
  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    canvas.toBlob((blob) => {
      if (blob) {
        onSignature(blob);
      }
    }, 'image/png');
  }, [hasSignature, onSignature]);

  return (
    <div className={className}>
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Canvas container */}
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="border-2 border-dashed border-border rounded-2xl touch-none w-full cursor-crosshair bg-background"
                style={{ maxWidth: '100%', height: 'auto', aspectRatio: `${width}/${height}` }}
              />
              {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-muted-foreground text-sm">
                    Sign here with your finger or mouse
                  </p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                disabled={!hasSignature}
                className="flex-1"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Button
                type="button"
                variant="accent"
                onClick={handleSave}
                disabled={!hasSignature}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Confirm Signature
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

