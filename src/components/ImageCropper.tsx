import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface ImageCropperProps {
  imageFile: File;
  isOpen: boolean;
  onClose: () => void;
  onCrop: (croppedFile: File) => void;
}

export const ImageCropper = ({ imageFile, isOpen, onClose, onCrop }: ImageCropperProps) => {
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  // Load image when file changes
  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      
      // Create a new image element if needed
      if (!imageRef.current) {
        imageRef.current = new Image();
      }
      
      imageRef.current.onload = () => {
        setImageLoaded(true);
        // Reset position and scale when new image loads
        setPosition({ x: 0, y: 0 });
        setScale(1);
        // Center the image after a small delay to ensure canvas is ready
        setTimeout(() => {
          centerImage();
        }, 100);
      };
      imageRef.current.onerror = (error) => {
        console.error('Failed to load image', error);
        setImageLoaded(false);
      };
      imageRef.current.src = url;
      
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [imageFile]);

  const centerImage = useCallback(() => {
    if (!imageRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const img = imageRef.current;
    const cropSize = Math.min(canvas.width, canvas.height) * 0.8;
    
    // Calculate scale to fit image in crop area while maintaining aspect ratio
    const scaleX = cropSize / img.naturalWidth;
    const scaleY = cropSize / img.naturalHeight;
    // Use the smaller scale to ensure the entire crop area is filled
    const scaleToFit = Math.max(scaleX, scaleY);
    
    setScale(scaleToFit);
    setPosition({ x: 0, y: 0 });
  }, []);

  const drawCanvas = useCallback(() => {
    if (!canvasRef.current || !imageRef.current || !imageLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;
    
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Save context for transformations
    ctx.save();
    
    // Move to center and apply transformations
    ctx.translate(canvas.width / 2 + position.x, canvas.height / 2 + position.y);
    ctx.scale(scale, scale);
    
    // Draw image centered
    ctx.drawImage(
      img,
      -img.naturalWidth / 2,
      -img.naturalHeight / 2,
      img.naturalWidth,
      img.naturalHeight
    );
    
    ctx.restore();
    
    // Draw crop overlay
    const cropSize = Math.min(canvas.width, canvas.height) * 0.8;
    const cropX = (canvas.width - cropSize) / 2;
    const cropY = (canvas.height - cropSize) / 2;
    
    // Draw dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Clear crop area
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, cropSize / 2, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw crop circle border with a thicker, more prominent outline
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, cropSize / 2, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Add an inner shadow for better visibility
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, cropSize / 2 - 2, 0, 2 * Math.PI);
    ctx.stroke();
  }, [imageLoaded, scale, position]);

  // Redraw canvas when parameters change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCrop = () => {
    if (!canvasRef.current || !imageRef.current || !imageLoaded) return;

    const canvas = canvasRef.current;
    const img = imageRef.current;
    
    // Create a new canvas for the cropped image
    const cropCanvas = document.createElement('canvas');
    const outputSize = 400; // Final crop size
    cropCanvas.width = outputSize;
    cropCanvas.height = outputSize;
    const cropCtx = cropCanvas.getContext('2d');
    
    if (!cropCtx) return;

    // Calculate the crop circle area
    const canvasCropRadius = Math.min(canvas.width, canvas.height) * 0.4; // 0.8 diameter = 0.4 radius
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Calculate the area of the original image that corresponds to the crop circle
    // We need to reverse the transformations applied when drawing
    const imgCenterX = img.naturalWidth / 2;
    const imgCenterY = img.naturalHeight / 2;
    
    // The crop radius in image coordinates
    const imgCropRadius = canvasCropRadius / scale;
    
    // The offset from image center in image coordinates
    const imgOffsetX = -position.x / scale;
    const imgOffsetY = -position.y / scale;
    
    // Calculate the source rectangle in image coordinates
    const srcX = imgCenterX + imgOffsetX - imgCropRadius;
    const srcY = imgCenterY + imgOffsetY - imgCropRadius;
    const srcSize = imgCropRadius * 2;
    
    // Create a circular clipping path
    cropCtx.save();
    cropCtx.beginPath();
    cropCtx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, 2 * Math.PI);
    cropCtx.clip();
    
    // Fill background with white
    cropCtx.fillStyle = '#ffffff';
    cropCtx.fillRect(0, 0, outputSize, outputSize);
    
    // Draw the cropped image
    cropCtx.drawImage(
      img,
      srcX, srcY, srcSize, srcSize, // Source rectangle
      0, 0, outputSize, outputSize  // Destination rectangle
    );
    
    cropCtx.restore();

    // Convert to blob and call onCrop
    cropCanvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'cropped-avatar.jpg', { type: 'image/jpeg' });
        onCrop(file);
      }
    }, 'image/jpeg', 0.9);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md [&>button]:hidden" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader className="sr-only">
          <DialogTitle>Crop Profile Picture</DialogTitle>
          <DialogDescription>Drag to reposition and use the Save button to crop your image</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            Drag to reposition • Scroll to zoom
          </div>
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              className="w-full h-auto border rounded-lg cursor-move"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={(e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? 0.9 : 1.1;
                setScale(prev => Math.max(0.1, Math.min(5, prev * delta)));
              }}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleCrop} className="flex-1" disabled={!imageLoaded}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};