"use client";

import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useWebcam } from '@/hooks/use-webcam';
import { Camera, RefreshCcw, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SelfieCaptureProps {
  onSelfieCaptured: (dataUrl: string | null) => void;
  onCancel?: () => void;
  isUploading?: boolean;
}

export function SelfieCapture({ onSelfieCaptured, onCancel, isUploading = false }: SelfieCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isStreaming, error: webcamError, startStream, stopStream, capturePhoto } = useWebcam({ videoRef, canvasRef });
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!capturedImage) { // Only start stream if no image is captured yet or if retaking
        startStream();
    }
    return () => {
      // Stop stream if component unmounts or if an image is captured and confirmed
      // This logic is tricky: if we stop stream on capture, retake won't work without restart.
      // So, manage stream start/stop based on user actions (Take/Retake/Confirm/Cancel).
    };
  }, [startStream, capturedImage]);

  const handleCapture = () => {
    const photoDataUrl = capturePhoto();
    if (photoDataUrl) {
      setCapturedImage(photoDataUrl);
      // Don't stop stream here, allow retake
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    onSelfieCaptured(null); // Clear previously captured image from parent
    startStream(); // Ensure stream is running for retake
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onSelfieCaptured(capturedImage);
      stopStream(); // Stop stream after confirming
    }
  };
  
  const handleCancelAndStopStream = () => {
    stopStream();
    if (onCancel) onCancel();
  };


  if (webcamError) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {webcamError} Por favor verifica los permisos de tu navegador e intenta nuevamente.
        </AlertDescription>
         {onCancel && (
          <Button onClick={onCancel} variant="outline" size="sm" className="mt-2">
            Cerrar Cámara
          </Button>
        )}
      </Alert>
    );
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg shadow-sm bg-card">
      <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
        <video ref={videoRef} playsInline autoPlay className={`w-full h-full object-cover ${capturedImage ? 'hidden' : 'block'}`} aria-label="Webcam feed"></video>
        {capturedImage && (
          <Image src={capturedImage} alt="Selfie capturada" layout="fill" objectFit="cover" data-ai-hint="selfie preview" />
        )}
        {!isStreaming && !capturedImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <Camera className="h-12 w-12 mb-2" />
            <p>La cámara está apagada o cargando...</p>
            <Button onClick={startStream} variant="outline" size="sm" className="mt-2">Activar Cámara</Button>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden"></canvas>
      
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        {!capturedImage && isStreaming && (
          <Button onClick={handleCapture} className="flex-1">
            <Camera className="mr-2 h-4 w-4" /> Tomar Foto
          </Button>
        )}
        {capturedImage && (
          <>
            <Button onClick={handleRetake} variant="outline" className="flex-1" disabled={isUploading}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Volver a tomar
            </Button>
            <Button onClick={handleConfirm} className="flex-1" disabled={isUploading}>
              {isUploading ? 
                <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Subiendo... </> : 
                <> <CheckCircle className="mr-2 h-4 w-4" /> Confirmar Selfie </>
              }
            </Button>
          </>
        )}
      </div>
       {onCancel && (
        <Button onClick={handleCancelAndStopStream} variant="ghost" size="sm" className="w-full mt-2 text-muted-foreground" disabled={isUploading}>
          Cancelar
        </Button>
      )}
    </div>
  );
}
