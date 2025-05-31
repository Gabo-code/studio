// @ts-nocheck
"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { TileLayer, Marker, Popup, Circle } from 'react-leaflet';
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
        map.setView(userLocation, 17);
      } else {
        map.setView(jumboLocation, 16);
      }
    }
  }, [userLocation, map]);

  return null;
}


export function LocationMap({ onLocationVerified, onLocationUpdate }: LocationMapProps) {
  const [userLocation, setUserLocation] = useState<LatLngExpression | null>(null);
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { toast } = useToast();
  const mapRef = useRef<LeafletMap | null>(null);
  const [isClient, setIsClient] = useState(false);

  const mapStyle = useMemo(() => ({ height: '350px', width: '100%' }), []);

  useEffect(() => {
    // Initialize the map only once on the client side
    if (isClient && !mapRef.current) {
      const map = L.map('map-container', {
        center: jumboLocation,
        zoom: 16,
        scrollWheelZoom: false,
        // Other map options can be added here
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      L.marker(jumboLocation).addTo(map)
        .bindPopup('Ubicación de la tienda SLR')
        .openPopup();

      L.circle(jumboLocation, {
        radius: MAX_DISTANCE_METERS,
        color: 'hsl(var(--primary))',
        fillColor: 'hsl(var(--primary))',
        fillOpacity: 0.3
      }).addTo(map);

      mapRef.current = map;
      setIsMapInitialized(true);

      // Cleanup function to remove the map on component unmount
      return () => {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
          setIsMapInitialized(false);
        }
      };
    }
    // Set isClient state
    setIsClient(true);
  }, [isClient]); // Dependency on isClient to ensure it runs after client state is true

  useEffect(() => {
    // Update user location marker if map is initialized and user location is available
    if (isMapInitialized && userLocation) {
      // Remove existing user marker if any
      mapRef.current.eachLayer((layer) => {
        if (layer instanceof L.Marker && layer.getPopup()?.getContent() === 'Your Current Location') {
          mapRef.current.removeLayer(layer);
        }
      });
      L.marker(userLocation, {
        icon: L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          shadowSize: [41, 41]
        })
      }).addTo(mapRef.current)
        .bindPopup('Your Current Location');
        mapRef.current.setView(userLocation, 17);
    } else if (isMapInitialized && !userLocation) {
       // If user location is null, set view back to jumbo location
       mapRef.current.setView(jumboLocation, 16);
    }
  }, [isMapInitialized, userLocation]);

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
        toast({ title: "Ubicación verificada", description: "Estás dentro del rango permitido." });
      } else {
        toast({ title: "Alerta de ubicación", description: "Actualmente estás fuera del radio de 50m para el check-in.", variant: "destructive" });
      }
    } catch (err: any) {
      console.error("Error getting location:", err);
      let message = "No se pudo obtener tu ubicación. Asegúrate de que los servicios de ubicación estén habilitados.";
      if (err.code === 1) message = "Permiso de ubicación denegado. Actívalo en la configuración de tu navegador.";
      if (err.code === 2) message = "Ubicación no disponible. Intenta de nuevo o revisa tu conexión.";
      if (err.code === 3) message = "La solicitud de ubicación expiró. Intenta de nuevo.";
      
      setErrorMsg(message);
      toast({ title: "Error de ubicación", description: message, variant: "destructive" });
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
      <Loader2 className="h-8 w-8 animate-spin mr-2" />Cargando mapa...
    </div>
  );

  return (
    <div className="space-y-3">
      {/* The div that will contain the Leaflet map */}
      {isClient ? (
        <div id="map-container" style={mapStyle} className="rounded-md border shadow-sm relative z-0"></div>
      ) : (
        <MapPlaceholder />
      )}

      <Button type="button" onClick={verifyLocation} disabled={status === 'loading' || !isClient} variant="outline" className="w-full">
        {status === 'loading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
        {status === 'loading' ? 'Verificando ubicación...' : 'Actualizar ubicación'}
      </Button>
      {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
      
      {status === 'success' && userLocation && !isWithinJumboRadius({ latitude: (userLocation as [number, number])[0], longitude: (userLocation as [number, number])[1] }) && (
        <p className="text-sm text-destructive font-medium">Actualmente estás fuera del radio de 50m para el check-in.</p>
      )}
      {status === 'success' && userLocation && isWithinJumboRadius({ latitude: (userLocation as [number, number])[0], longitude: (userLocation as [number, number])[1] }) && (
        <p className="text-sm text-green-600 font-medium">Ubicación verificada. Estás dentro del rango.</p>
      )}
      {status === 'success' && !userLocation && (
        <p className="text-sm text-muted-foreground">Could not determine your exact position for radius check.</p>
       )}
    </div>
  );
}
