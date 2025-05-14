"use client";

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { usePersistentId } from '@/hooks/use-persistent-id';
import { store } from '@/lib/store';
import type { WaitingDriver } from '@/types';
import { Loader2, Camera, MapPin, AlertTriangle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { SelfieCapture } from './selfie-capture'; 
import { Alert, AlertDescription } from '@/components/ui/alert';

// Dynamically import LocationMap as it uses Leaflet which is client-side only
const LocationMap = dynamic(() => import('./location-map').then(mod => mod.LocationMap), {
  ssr: false,
  loading: () => <div className="h-64 bg-muted rounded-md flex items-center justify-center text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin mr-2" />Loading Map...</div>,
});

export function CheckInForm() {
  const [name, setName] = useState('');
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);
  const [isLocationVerified, setIsLocationVerified] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSelfieCapture, setShowSelfieCapture] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const persistentId = usePersistentId();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    // Attempt to pre-fill name if a driver with this persistent ID has checked in before
    if (persistentId) {
      const masterList = store.getMasterDriverList();
      const existingDriver = masterList.find(d => d.id === persistentId);
      if (existingDriver) {
        setName(existingDriver.name);
      }
    }
  }, [persistentId]);

  const handleSelfieCaptured = (dataUrl: string | null) => {
    setSelfieDataUrl(dataUrl);
    setShowSelfieCapture(false); // Hide the selfie capture UI after capture or cancel
  };

  const handleCheckIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!persistentId) {
      toast({ title: "Error", description: "Persistent ID not available. Please refresh.", variant: "destructive" });
      return;
    }
    if (!name.trim()) {
      setFormError("Please enter your name.");
      return;
    }
    if (!isLocationVerified || !currentLocation) {
      setFormError("Location not verified or not within range. Please enable location services and ensure you are near Jumbo.");
      return;
    }
    if (!selfieDataUrl) {
      setFormError("Please take a selfie.");
      return;
    }
    setFormError(null);
    setIsLoading(true);

    const driverData: WaitingDriver = {
      id: persistentId,
      name: name.trim(),
      checkInTime: Date.now(),
      selfieDataUrl: selfieDataUrl,
      location: currentLocation,
    };

    const result = store.addWaitingDriver(driverData);

    if (result.success) {
      toast({
        title: "Check-in Successful!",
        description: `Welcome, ${driverData.name}! You're in the queue.`,
      });
      if(result.alert) { // Fraud alert but still successful check-in
        toast({
          title: "Heads up!",
          description: result.alert.message,
          variant: "default", // Not destructive as check-in is allowed
          duration: 10000,
        });
      }
      // Optionally redirect or clear form
      setName('');
      setSelfieDataUrl(null);
      setShowSelfieCapture(false);
      // router.push('/some-status-page'); // Or just stay
    } else {
      toast({
        title: "Check-in Failed",
        description: result.alert?.message || "Could not add to queue. You might already be checked in.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleCheckIn} className="space-y-6">
      {formError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="name" className="text-lg font-medium">Your Name</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your full name"
          required
          className="text-base py-3 px-4"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-lg font-medium flex items-center"><MapPin className="mr-2 h-5 w-5 text-primary" />Location Verification</Label>
        <LocationMap onLocationVerified={setIsLocationVerified} onLocationUpdate={setCurrentLocation} />
        {!isLocationVerified && <p className="text-sm text-muted-foreground">Please ensure you are within 50 meters of the Jumbo store. Map will indicate status.</p>}
      </div>
      
      <div className="space-y-2">
        <Label className="text-lg font-medium flex items-center"><Camera className="mr-2 h-5 w-5 text-primary" />Selfie</Label>
        {showSelfieCapture ? (
          <SelfieCapture onSelfieCaptured={handleSelfieCaptured} onCancel={() => setShowSelfieCapture(false)} />
        ) : (
          <Button type="button" variant="outline" onClick={() => setShowSelfieCapture(true)} className="w-full py-3">
            <Camera className="mr-2 h-4 w-4" /> Take Selfie
          </Button>
        )}
        {selfieDataUrl && !showSelfieCapture && (
          <div className="mt-2 text-center">
            <img src={selfieDataUrl} alt="Selfie preview" data-ai-hint="driver selfie" className="rounded-md border max-w-xs mx-auto shadow-sm" />
            <Button type="button" variant="link" onClick={() => { setSelfieDataUrl(null); setShowSelfieCapture(true); }} className="mt-1">
              Retake Selfie
            </Button>
          </div>
        )}
      </div>

      <Button 
        type="submit" 
        className="w-full text-lg py-4"
        disabled={isLoading || !isLocationVerified || !selfieDataUrl || !name.trim()}
      >
        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
        Check In
      </Button>
    </form>
  );
}
