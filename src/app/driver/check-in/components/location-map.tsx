// @ts-nocheck
"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import type { LatLngExpression, Map as LeafletMap } from 'leaflet'; // Renamed Map to LeafletMap to avoid conflict
import 'leaflet/dist/leaflet.css';
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

function MapEffect({ userLocation, mapRef }: { userLocation: LatLngExpression | null, mapRef: React.MutableRefObject<LeafletMap | null> }) {
  const map = mapRef.current;

  useEffect(() => {
    if (map) {
      if (userLocation) {
        map.setView(userLocation, 16); 
      } else {
        map.setView(jumboLocation, 13); 
      }
    }
  }, [userLocation, map]);

  return null;
}


export function LocationMap({ onLocationVerified, onLocationUpdate }: LocationMapProps) {
  const [userLocation, setUserLocation] = useState<LatLngExpression | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { toast } = useToast();
  const mapRef = useRef<LeafletMap | null>(null);
  const [isClient, setIsClient] = useState(false);

  const mapStyle = useMemo(() => ({ height: '250px', width: '100%' }), []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const verifyLocation = useCallback(async () => {
    if(!isClient) return;

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
      setUserLocation(null); 
    }
  }, [isClient, onLocationVerified, onLocationUpdate, toast]);

  useEffect(() => {
    if (isClient) {
      verifyLocation();
    }
  }, [isClient, verifyLocation]);


  const MapPlaceholder = () => (
    <div style={mapStyle} className="rounded-md border shadow-sm flex items-center justify-center bg-muted text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin mr-2" />Loading Map...
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Conditional rendering to ensure MapContainer is only rendered on the client */}
      {isClient && (
        <MapContainer 
          center={jumboLocation} 
          zoom={13} 
          whenCreated={(mapInstance) => {
            // Store the map instance in the ref when created
            mapRef.current = mapInstance;
          }}
          scrollWheelZoom={false} 
          style={mapStyle} 
          className="rounded-md border shadow-sm"
        >
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
      )}      
      <Button type="button" onClick={verifyLocation} disabled={status === 'loading' || !isClient} variant="outline" className="w-full">
        {status === 'loading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
        {status === 'loading' ? 'Verifying Location...' : 'Refresh Location'}
      </Button>
      {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
      
      {status === 'success' && userLocation && !isWithinJumboRadius({ latitude: (userLocation as [number, number])[0], longitude: (userLocation as [number, number])[1] }) && (
        <p className="text-sm text-destructive font-medium">You are currently outside the 50m check-in radius.</p>
      )}
      {status === 'success' && userLocation && isWithinJumboRadius({ latitude: (userLocation as [number, number])[0], longitude: (userLocation as [number, number])[1] }) && (
        <p className="text-sm text-green-600 font-medium">Location verified. You are within range.</p>
      )}
      {status === 'success' && !userLocation && (
        <p className="text-sm text-muted-foreground">Could not determine your exact position for radius check.</p>
       )}
    </div>
  );
}
