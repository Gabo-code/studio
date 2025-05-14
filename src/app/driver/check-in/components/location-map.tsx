"use client";

import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import type { LatLngExpression, Map } from 'leaflet';
import 'leaflet/dist/leaflet.css';
// It's common for Leaflet's default icon to have issues with bundlers.
// A common fix is to manually set the icon paths or use a custom icon.
import L from 'leaflet';

// Fix for default marker icon issue with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});


import { getCurrentPosition, isWithinJumboRadius, type Coordinates } from '@/lib/geolocation';
import { JUMBO_LATITUDE, JUMBO_LONGITUDE, MAX_DISTANCE_METERS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LocationMapProps {
  onLocationVerified: (isVerified: boolean) => void;
  onLocationUpdate: (coords: Coordinates | null) => void;
}

const jumboLocation: LatLngExpression = [JUMBO_LATITUDE, JUMBO_LONGITUDE];

function MapEffect({ userLocation, mapRef }: { userLocation: LatLngExpression | null, mapRef: React.MutableRefObject<Map | null> }) {
  const map = useMap();
  mapRef.current = map;

  useEffect(() => {
    if (userLocation && map) {
      map.setView(userLocation, 16); // Zoom level 16 is good for city blocks
    } else if (map) {
      map.setView(jumboLocation, 13); // Default view if user location not available
    }
  }, [userLocation, map]);

  return null;
}


export function LocationMap({ onLocationVerified, onLocationUpdate }: LocationMapProps) {
  const [userLocation, setUserLocation] = useState<LatLngExpression | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { toast } = useToast();
  const mapRef = useRef<Map | null>(null);

  const verifyLocation = async () => {
    setStatus('loading');
    setErrorMsg(null);
    onLocationVerified(false);
    onLocationUpdate(null);

    try {
      const coords = await getCurrentPosition();
      const leafletCoords: LatLngExpression = [coords.latitude, coords.longitude];
      setUserLocation(leafletCoords);
      onLocationUpdate(coords);

      const withinRadius = isWithinJumboRadius(coords);
      onLocationVerified(withinRadius);
      setStatus('success');
      if (withinRadius) {
        toast({ title: "Location Verified", description: "You are within the allowed range." });
      } else {
        toast({ title: "Location Alert", description: "You are outside the 50m radius of the Jumbo store.", variant: "destructive" });
      }
      if (mapRef.current) {
        mapRef.current.setView(leafletCoords, 16);
      }
    } catch (err: any) {
      console.error("Error getting location:", err);
      let message = "Could not get your location. Please ensure location services are enabled.";
      if (err.code === 1) message = "Location permission denied. Please enable it in your browser settings.";
      if (err.code === 2) message = "Location position unavailable. Try again or check your connection.";
      if (err.code === 3) message = "Location request timed out. Please try again.";
      
      setErrorMsg(message);
      toast({ title: "Location Error", description: message, variant: "destructive" });
      setStatus('error');
      onLocationVerified(false);
      onLocationUpdate(null);
      if (mapRef.current) {
        mapRef.current.setView(jumboLocation, 13);
      }
    }
  };

  useEffect(() => {
    // Automatically try to verify location on component mount
    verifyLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount


  return (
    <div className="space-y-3">
      <MapContainer center={jumboLocation} zoom={13} scrollWheelZoom={false} style={{ height: '250px', width: '100%' }} className="rounded-md border shadow-sm">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={jumboLocation}>
          <Popup>Jumbo Store Location</Popup>
        </Marker>
        <Circle center={jumboLocation} radius={MAX_DISTANCE_METERS} pathOptions={{ color: 'hsl(var(--primary))', fillColor: 'hsl(var(--primary))', fillOpacity: 0.2 }} />
        {userLocation && (
          <Marker position={userLocation} icon={L.icon({ iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', iconSize: [25,41], iconAnchor:[12,41], popupAnchor:[1,-34], shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', shadowSize:[41,41]})}>
            <Popup>Your Current Location</Popup>
          </Marker>
        )}
        <MapEffect userLocation={userLocation} mapRef={mapRef} />
      </MapContainer>
      <Button type="button" onClick={verifyLocation} disabled={status === 'loading'} variant="outline" className="w-full">
        {status === 'loading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
        {status === 'loading' ? 'Verifying Location...' : 'Refresh Location'}
      </Button>
      {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
      {status === 'success' && !isWithinJumboRadius(userLocation ? {latitude: (userLocation as number[])[0], longitude: (userLocation as number[])[1]} : {latitude: 0, longitude: 0}) && (
        <p className="text-sm text-destructive font-medium">You are currently outside the 50m check-in radius.</p>
      )}
       {status === 'success' && isWithinJumboRadius(userLocation ? {latitude: (userLocation as number[])[0], longitude: (userLocation as number[])[1]} : {latitude: 0, longitude: 0}) && (
        <p className="text-sm text-green-600 font-medium">Location verified. You are within range.</p>
      )}
    </div>
  );
}
