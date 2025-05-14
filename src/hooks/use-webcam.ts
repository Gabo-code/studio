"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

interface WebcamHookProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export function useWebcam({ videoRef, canvasRef }: WebcamHookProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startStream = useCallback(async () => {
    setError(null);
    if (isStreaming || !videoRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      streamRef.current = stream;
      setIsStreaming(true);
    } catch (err) {
      console.error("Error accessing webcam:", err);
      setError("Could not access webcam. Please ensure permissions are granted.");
      setIsStreaming(false);
    }
  }, [isStreaming, videoRef]);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    streamRef.current = null;
    setIsStreaming(false);
  }, [videoRef]);

  const capturePhoto = useCallback((): string | null => {
    if (!isStreaming || !videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video to avoid stretching
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (context) {
      // Flip the image horizontally for a mirror effect if desired (common for selfies)
      // context.translate(canvas.width, 0);
      // context.scale(-1, 1);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      // context.scale(-1, 1); // Flip back if other operations need normal coordinates
      // context.translate(-canvas.width, 0);
      return canvas.toDataURL('image/jpeg');
    }
    return null;
  }, [isStreaming, videoRef, canvasRef]);

  useEffect(() => {
    // Cleanup stream on component unmount
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return { isStreaming, error, startStream, stopStream, capturePhoto };
}
