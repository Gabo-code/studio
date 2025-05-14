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

// Dynamically import LocationMap as it uses Leaflet which is client-side only
const LocationMap = dynamic(() => import('./location-map').then(mod => mod.LocationMap), {
  ssr: false,
  loading: () => <div className="h-64 bg-muted rounded-md flex items-center justify-center text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin mr-2" />Loading Map...</div>,
});

export function CheckInForm(): React.JSX.Element {
  const [name, setName] = useState('');
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);
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

  const handleSelfieCaptured = (dataUrl: string | null) => {
    setSelfieDataUrl(dataUrl);
    setShowSelfieCapture(false); // Hide the selfie capture UI after capture or cancel
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

    try {
      // Verificar que el conductor existe en la lista
      const driverExists = drivers.some(d => d.name === name);
      if (!driverExists) {
        setFormError("El nombre del conductor no está en la lista autorizada.");
        setIsLoading(false);
        return;
      }

      // Verificar si este dispositivo ya está asociado a otro conductor
      const { data: existingDriver } = await supabase
        .from('drivers')
        .select('name')
        .eq('pid', persistentId)
        .not('name', 'eq', name) // Diferente al nombre actual
        .maybeSingle();

      if (existingDriver) {
        toast({
          title: "Error de Acceso",
          description: `Este dispositivo ya está asociado al conductor: ${existingDriver.name}`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Verificar si el conductor ya está asociado a otro dispositivo
      const { data: existingPid } = await supabase
        .from('drivers')
        .select('pid')
        .eq('name', name)
        .not('pid', 'is', null)
        .maybeSingle();

      if (existingPid && existingPid.pid !== persistentId) {
        toast({
          title: "Error de Acceso",
          description: `Este conductor ya está asociado a otro dispositivo.`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Obtener el ID interno del conductor seleccionado
      const { data: driverRecord, error: driverError } = await supabase
        .from('drivers')
        .select('id')
        .eq('name', name)
        .single();

      if (driverError || !driverRecord) {
        throw new Error(`No se pudo obtener el ID del conductor: ${driverError?.message || "Datos no encontrados"}`);
      }

      // Crear un registro en dispatch_records
      const dispatchRecord = {
        driver_id: driverRecord.id, // Usar el ID interno del conductor
        start_time: new Date().toISOString(),
        startlatitude: currentLocation.latitude,
        startlongitude: currentLocation.longitude,
        status: 'en_curso'
      };

      const { error: dispatchError } = await supabase
        .from('dispatch_records')
        .insert([dispatchRecord]);

      if (dispatchError) {
        throw new Error(`Error al crear registro de despacho: ${dispatchError.message}`);
      }

      // Actualizar el PID en la tabla drivers para este conductor
      const { error: updateError } = await supabase
        .from('drivers')
        .update({ 
          pid: persistentId,
          status: 'ocupado' // Actualizar el estado del conductor a ocupado
        })
        .eq('id', driverRecord.id);

      if (updateError) {
        throw updateError;
      }

      // Crear el registro de espera para el store local
      const waitingDriverData: WaitingDriver = {
        id: persistentId,
        name: name.trim(),
        checkInTime: Date.now(),
        selfieDataUrl: selfieDataUrl,
        location: currentLocation,
      };

      const result = store.addWaitingDriver(waitingDriverData);

      if (result.success) {
        toast({
          title: "Check-in Exitoso!",
          description: `Bienvenido, ${name}! Estás en la cola.`,
        });
        
        if(result.alert) { // Fraud alert but still successful check-in
          toast({
            title: "Aviso",
            description: result.alert.message,
            variant: "default",
            duration: 10000,
          });
        }
        
        // Opcional: redirigir o limpiar formulario
        setName('');
        setSelfieDataUrl(null);
        setShowSelfieCapture(false);
        setIsNameLocked(false);
      } else {
        toast({
          title: "Check-in Fallido",
          description: result.alert?.message || "No se pudo agregar a la cola. Es posible que ya estés registrado.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error en el check-in:', error);
      setFormError("Ocurrió un error al procesar el check-in. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
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
        <Label className="text-lg font-medium flex items-center"><Camera className="mr-2 h-5 w-5 text-primary" />Selfie</Label>
        {showSelfieCapture ? (
          <SelfieCapture onSelfieCaptured={handleSelfieCaptured} onCancel={() => setShowSelfieCapture(false)} />
        ) : (
          <Button type="button" variant="outline" onClick={() => setShowSelfieCapture(true)} className="w-full py-3">
            <Camera className="mr-2 h-4 w-4" /> Tomar Selfie
          </Button>
        )}
        {selfieDataUrl && !showSelfieCapture && (
          <div className="mt-2 text-center">
            <img src={selfieDataUrl} alt="Selfie preview" data-ai-hint="driver selfie" className="rounded-md border max-w-xs mx-auto shadow-sm" />
            <Button type="button" variant="link" onClick={() => { setSelfieDataUrl(null); setShowSelfieCapture(true); }} className="mt-1">
              Tomar de nuevo
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
        Registrar Asistencia
      </Button>
    </form>
  );
}
