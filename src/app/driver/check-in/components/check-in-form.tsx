"use client";

import React, { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { usePersistentId } from '@/hooks/use-persistent-id';
import { store } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { generateSelfieFilePath, getSelfieBucket } from '@/lib/storage';
import type { WaitingDriver } from '@/types';
import { Loader2, Camera, MapPin, AlertTriangle, Check, Search } from 'lucide-react';
import dynamic from 'next/dynamic';
import { SelfieCapture } from './selfie-capture'; 
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { v4 as uuidv4 } from 'uuid';

// Dynamically import LocationMap as it uses Leaflet which is client-side only
const LocationMap = dynamic(() => import('./location-map').then(mod => mod.LocationMap), {
  ssr: false,
  loading: () => <div className="h-64 bg-muted rounded-md flex items-center justify-center text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin mr-2" />Loading Map...</div>,
});

export function CheckInForm(): React.JSX.Element {
  const [name, setName] = useState('');
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);
  const [selfieStorageUrl, setSelfieStorageUrl] = useState<string | null>(null);
  const [isLocationVerified, setIsLocationVerified] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSelfieCapture, setShowSelfieCapture] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isNameLocked, setIsNameLocked] = useState(false);
  const [drivers, setDrivers] = useState<{id: string, name: string, vehicle_type: string}[]>([]);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(true);
  const [open, setOpen] = useState(false);
  const [vehicleType, setVehicleType] = useState<string | null>(null);
  const [isUploadingSelfie, setIsUploadingSelfie] = useState(false);
  
  const persistentId = usePersistentId();
  const { toast } = useToast();
  const router = useRouter();

  // Cargar la lista de conductores disponibles
  useEffect(() => {
    async function loadDrivers() {
      try {
        setIsLoadingDrivers(true);
        const { data, error } = await supabase
          .from('drivers')
          .select('id, name, vehicle_type')
          .order('name');
        
        if (error) {
          throw error;
        }
        
        if (data) {
          setDrivers(data);
        }
      } catch (err) {
        console.error('Error cargando conductores:', err);
      } finally {
        setIsLoadingDrivers(false);
      }
    }
    
    loadDrivers();
  }, []);

  // Verificar si el dispositivo ya está asociado a un conductor
  useEffect(() => {
    async function checkExistingDriver() {
      if (!persistentId || !drivers.length) return;
      
      try {
        // Buscar si este dispositivo ya está asociado a un conductor
        const { data, error } = await supabase
          .from('drivers')
          .select('name, vehicle_type')
          .eq('pid', persistentId)
          .maybeSingle();
        
        if (error) {
          throw error;
        }
        
        // Si encontramos un conductor asociado, bloqueamos el nombre
        if (data) {
          setName(data.name);
          setVehicleType(data.vehicle_type);
          setIsNameLocked(true);
        }
      } catch (err) {
        console.error('Error verificando conductor existente:', err);
      }
    }
    
    checkExistingDriver();
  }, [persistentId, drivers]);

  const handleSelfieCaptured = async (dataUrl: string | null) => {
    if (!dataUrl) {
      setSelfieDataUrl(null);
      setSelfieStorageUrl(null);
      setShowSelfieCapture(false);
      return;
    }
    
    try {
      setIsUploadingSelfie(true);
      setSelfieDataUrl(dataUrl); // Guardamos la vista previa

      // Convertir dataURL a blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      // Crear ruta de archivo usando la utilidad
      const filePath = generateSelfieFilePath(persistentId);
      const bucket = getSelfieBucket();

      // Subir a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from(bucket)
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase
        .storage
        .from(bucket)
        .getPublicUrl(filePath);

      setSelfieStorageUrl(publicUrl);
      toast({
        title: "Selfie guardada",
        description: "Tu selfie se ha guardado correctamente",
      });
    } catch (error) {
      console.error('Error al subir selfie:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la selfie. Intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsUploadingSelfie(false);
      setShowSelfieCapture(false);
    }
  };

  const handleDriverSelect = (driverName: string) => {
    setName(driverName);
    setOpen(false);
    
    // Obtener el tipo de vehículo del conductor seleccionado
    const selectedDriver = drivers.find(d => d.name === driverName);
    if (selectedDriver) {
      setVehicleType(selectedDriver.vehicle_type);
    }
  };

  const handleCheckIn = async (e: FormEvent) => {
    e.preventDefault();

    if (!name) {
      setFormError('Se requiere un nombre');
      return;
    }

    if (!isLocationVerified) {
      setFormError('Por favor verifica tu ubicación');
      return;
    }

    if (!selfieStorageUrl) {
      setFormError('Por favor toma una selfie');
      return;
    }

    if (!persistentId) {
      toast({
        title: "Error",
        description: "Persistent ID not available. Please refresh.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setFormError(null);
    
    try {
      // Actualizar estado del conductor a "ocupado"
      const { error: driverError } = await supabase
        .from('drivers')
        .update({
          pid: persistentId,
          status: 'ocupado',
        })
        .eq('name', name);

      if (driverError) throw driverError;
      
      // Crear nuevo registro de despacho
      const { error: dispatchError } = await supabase
        .from('dispatch_records')
        .insert({
          driver_name: name,
          driver_id: persistentId,
          latitude: currentLocation?.latitude,
          longitude: currentLocation?.longitude,
          timestamp: new Date().toISOString(),
          selfie_url: selfieStorageUrl, // Usar la URL de Storage en lugar del dataUrl
        });

      if (dispatchError) throw dispatchError;

      // Guardar en store local para uso en la aplicación
      const waitingDriverData: WaitingDriver = {
        id: persistentId,
        name,
        checkInTime: Date.now(),
        selfieDataUrl: selfieStorageUrl,
        location: currentLocation || undefined
      };
      
      // Añadir el conductor a la lista de espera
      const result = store.addWaitingDriver(waitingDriverData);
      
      if (result.success) {
        router.push('/driver/waiting');
      } else {
        setFormError(result.alert?.message || 'Error al registrar el conductor');
      }
      
    } catch (error) {
      console.error('Error during check-in:', error);
      setFormError('Error durante el check-in. Por favor intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form className="space-y-6" onSubmit={handleCheckIn}>
        {formError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="name" className="text-lg font-medium">Tu Nombre</Label>
          {isNameLocked ? (
            <div className="relative">
              <Input
                id="name"
                type="text"
                value={name}
                readOnly
                className="text-base py-3 px-4 bg-gray-100"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Check className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {vehicleType && <span>Vehículo: {vehicleType} | </span>}
                Tu nombre está asociado a este dispositivo y no puede ser cambiado.
              </p>
            </div>
          ) : isLoadingDrivers ? (
            <div className="flex items-center space-x-2">
              <Input
                id="name"
                type="text"
                value="Cargando conductores..."
                disabled
                className="text-base py-3 px-4"
              />
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {name ? name : "Selecciona un conductor..."}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar conductor..." className="h-9" />
                  <CommandEmpty>No se encontraron conductores.</CommandEmpty>
                  <CommandGroup>
                    {drivers.map((driver) => (
                      <CommandItem
                        key={driver.id}
                        value={driver.name}
                        onSelect={() => handleDriverSelect(driver.name)}
                      >
                        <span>{driver.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {driver.vehicle_type}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-lg font-medium flex items-center"><MapPin className="mr-2 h-5 w-5 text-primary" />Verificación de Ubicación</Label>
          <LocationMap onLocationVerified={setIsLocationVerified} onLocationUpdate={setCurrentLocation} />
          {!isLocationVerified && <p className="text-sm text-muted-foreground">Asegúrate de estar dentro de 50 metros de la tienda Jumbo. El mapa indicará el estado.</p>}
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="selfie" className="text-lg font-medium flex items-center">
              <Camera className="mr-2 h-5 w-5 text-primary" />Selfie
            </Label>
            <div className="text-sm text-muted-foreground">
              {selfieDataUrl ? 'Selfie Capturada' : 'Requerida'}
            </div>
          </div>
          
          {showSelfieCapture ? (
            <SelfieCapture 
              onSelfieCaptured={handleSelfieCaptured} 
              onCancel={() => setShowSelfieCapture(false)}
              isUploading={isUploadingSelfie} 
            />
          ) : selfieDataUrl ? (
            <div className="relative h-48 w-48 mx-auto">
              <img
                src={selfieDataUrl}
                alt="Vista previa de selfie"
                className="h-full w-full object-cover rounded-md"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="absolute -top-2 -right-2 h-7 w-7 rounded-full p-0"
                onClick={() => {
                  setSelfieDataUrl(null);
                  setSelfieStorageUrl(null);
                }}
              >
                &times;
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full py-3"
              onClick={() => setShowSelfieCapture(true)}
              disabled={isUploadingSelfie}
            >
              <Camera className="mr-2 h-4 w-4" />
              {isUploadingSelfie ? 'Subiendo selfie...' : 'Tomar Selfie'}
            </Button>
          )}
        </div>

        <Button 
          type="submit" 
          className="w-full text-lg py-4"
          disabled={isLoading || !isLocationVerified || !selfieStorageUrl || !name.trim()}
        >
          {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
          Registrar Asistencia
        </Button>
      </form>
    </div>
  );
}
