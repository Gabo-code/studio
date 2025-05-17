"use client";

import React, { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { LOCAL_STORAGE_KEYS } from '@/lib/store';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { Loader2, Camera, MapPin, AlertTriangle, Check, Search } from 'lucide-react';
import dynamic from 'next/dynamic';
import { SelfieCapture } from './selfie-capture';
import { usePersistentId } from '@/hooks/use-persistent-id';
import { generateSelfieFilePath, getSelfieBucket } from '@/lib/storage';
import { DriverService } from '@/services/driver-service';
import type { Driver } from '@/types';

// Dynamically import LocationMap as it uses Leaflet which is client-side only
const LocationMap = dynamic(() => import('./location-map').then(mod => mod.LocationMap), {
  ssr: false,
  loading: () => <div className="h-64 bg-muted rounded-md flex items-center justify-center text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin mr-2" />Loading Map...</div>,
});

// Añadir una función para procesar la dataURL a un formato más fiable
const dataURLtoFile = (dataurl: string, filename: string): File => {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, { type: mime });
};

// Función alternativa que usa fetch directamente para subir al bucket
async function uploadWithFetch(file: File, bucketName: string, filePath: string): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Faltan las variables de entorno de Supabase');
  }
  
  const url = `${supabaseUrl}/storage/v1/object/${bucketName}/${filePath}`;
  
  console.log('Intentando subida directa con fetch a:', url);
  
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: formData
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Respuesta de error completa:', errorText);
    throw new Error(`Error al subir: ${response.status} - ${response.statusText}. ${errorText}`);
  }
  
  // Obtener la URL pública
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`;
  console.log('URL pública generada:', publicUrl);
  
  return publicUrl;
}

interface DriverCheckData {
  id: string;
  status: string;
  bags_balance: number;
}

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
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(true);
  const [open, setOpen] = useState(false);
  const [vehicleType, setVehicleType] = useState<string | null>(null);
  const [isUploadingSelfie, setIsUploadingSelfie] = useState(false);
  const [hasAssociatedPid, setHasAssociatedPid] = useState(false);
  
  const persistentId = usePersistentId();
  const { toast } = useToast();
  const router = useRouter();

  // Verificar si el dispositivo ya está asociado a un conductor
  useEffect(() => {
    async function checkExistingDriver() {
      if (!persistentId) return;
      
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
          setHasAssociatedPid(true);
        }
        
        // Cargar la lista de conductores después de verificar asociación
        loadDrivers(data ? true : false);
      } catch (err) {
        console.error('Error verificando conductor existente:', err);
        // Cargar conductores de todos modos si hay un error
        loadDrivers(false);
      }
    }
    
    if (persistentId) {
      checkExistingDriver();
    }
  }, [persistentId]);
  
  // Cargar la lista de conductores disponibles
  async function loadDrivers(isAssociated: boolean) {
    try {
      setIsLoadingDrivers(true);
      
      // Construir la query base
      const query = supabase
        .from('drivers')
        .select('id, name, vehicle_type, pid');

      // Si hay un persistentId, buscar conductores sin pid O con el pid actual
      if (persistentId) {
        const { data, error } = await query
          .or(`pid.is.null,pid.eq.${persistentId}`)
          .order('name');
          
        if (error) throw error;
        
        if (data) {
          // Ordenar: primero el conductor asociado, luego por nombre
          const sortedDrivers = data.sort((a, b) => {
            if (a.pid === persistentId) return -1;
            if (b.pid === persistentId) return 1;
            return a.name.localeCompare(b.name);
          });
          
          setDrivers(sortedDrivers);
          
          // Debug: mostrar cuántos conductores se encontraron
          console.log(`Encontrados ${data.length} conductores:`, {
            conPid: data.filter(d => d.pid === persistentId).length,
            sinPid: data.filter(d => d.pid === null).length
          });
        }
      } else {
        // Si no hay persistentId, solo mostrar conductores sin pid
        const { data, error } = await query
          .is('pid', null)
          .order('name');
          
        if (error) throw error;
        setDrivers(data || []);
        
        // Debug: mostrar cuántos conductores sin pid se encontraron
        console.log(`Encontrados ${data?.length || 0} conductores sin pid`);
      }
    } catch (err) {
      console.error('Error cargando conductores:', err);
      toast({
        title: "Error",
        description: "Error al cargar la lista de conductores",
        variant: "destructive"
      });
    } finally {
      setIsLoadingDrivers(false);
    }
  }

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
      
      console.log('Iniciando subida de selfie...');
      
      // Crear ruta de archivo usando la utilidad
      const filePath = generateSelfieFilePath(persistentId);
      const bucket = getSelfieBucket();
      console.log('Ruta destino:', bucket, filePath);
      
      // Método alternativo: convertir dataURL directamente a File
      const fileName = filePath.split('/').pop() || 'selfie.jpg';
      const file = dataURLtoFile(dataUrl, fileName);
      console.log('Archivo creado:', file.name, file.size, 'bytes', file.type);
      
      // Verificar acceso al bucket
      try {
        const { data: listData, error: listError } = await supabase.storage.from(bucket).list();
        if (listError) {
          console.error('Error al listar bucket:', listError);
        } else {
          console.log('Bucket accesible, contiene', listData.length, 'archivos');
        }
      } catch (listCheckError) {
        console.error('Error verificando acceso al bucket:', listCheckError);
      }
      
      // INTENTAR AMBOS MÉTODOS DE SUBIDA
      
      let publicUrl = '';
      let uploadError: any = null;
      
      // MÉTODO 1: Cliente Supabase
      try {
        console.log('MÉTODO 1: Intentando subir con cliente Supabase...');
        
        const { data, error } = await supabase
          .storage
          .from(bucket)
          .upload(filePath, file, {
            contentType: file.type,
            upsert: true
          });
        
        if (error) {
          console.error('Error con cliente Supabase:', error);
          uploadError = error;
        } else {
          console.log('Subida exitosa con cliente Supabase:', data);
          
          const urlData = supabase.storage.from(bucket).getPublicUrl(filePath).data;
          publicUrl = urlData.publicUrl;
          console.log('URL obtenida con cliente Supabase:', publicUrl);
        }
      } catch (e) {
        console.error('Excepción con cliente Supabase:', e);
        uploadError = e;
      }
      
      // Si falló el primer método, intentar con fetch directo
      if (!publicUrl) {
        try {
          console.log('MÉTODO 2: Intentando subir con fetch directo...');
          
          publicUrl = await uploadWithFetch(file, bucket, filePath);
          console.log('Subida exitosa con fetch directo');
        } catch (fetchError) {
          console.error('Error con fetch directo:', fetchError);
          // Si ambos métodos fallaron, usar el error original
          if (!uploadError) {
            uploadError = fetchError;
          }
        }
      }
      
      // Si tuvimos éxito con alguno de los métodos
      if (publicUrl) {
        setSelfieStorageUrl(publicUrl);
        toast({
          title: "Selfie guardada",
          description: "Tu selfie se ha guardado correctamente",
        });
      } else {
        // Si ningún método funcionó, mostrar el error
        throw uploadError || new Error('No se pudo subir la imagen por medios alternativos');
      }
    } catch (error) {
      console.error('Error al subir selfie:', error);
      
      // Mostrar información detallada del error
      if (error instanceof Error) {
        console.error('Tipo de error:', error.constructor.name);
        console.error('Mensaje de error:', error.message);
        console.error('Stack trace:', error.stack);
        
        toast({
          title: "Error",
          description: `No se pudo guardar la selfie: ${error.message.substring(0, 100)}${error.message.length > 100 ? '...' : ''}`,
          variant: "destructive"
        });
      } else if (typeof error === 'object' && error !== null) {
        // Para errores de Supabase que no son instancias de Error estándar
        const errorObj = error as any;
        console.error('Error objeto:', JSON.stringify(errorObj, null, 2));
        
        // Intentar extraer mensaje útil
        const errorMessage = errorObj.message || errorObj.error || errorObj.statusText || 'Error desconocido';
        
        toast({
          title: "Error",
          description: `Fallo en Storage: ${errorMessage}`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo guardar la selfie. Intenta de nuevo.",
          variant: "destructive"
        });
      }
    } finally {
      setIsUploadingSelfie(false);
      setShowSelfieCapture(false);
    }
  };

  const handleDriverSelect = (driverName: string) => {
    const selectedDriver = drivers.find(d => d.name === driverName);
    if (selectedDriver) {
      setName(selectedDriver.name);
      // vehicle_type is optional, so we explicitly set it to null if undefined
      const vehicleType = typeof selectedDriver.vehicle_type === 'string' ? selectedDriver.vehicle_type : null;
      setVehicleType(vehicleType);
    }
    setOpen(false);
  };

  const handleCheckIn = async (e: FormEvent) => {
    e.preventDefault();

    if (!name || !isLocationVerified || !selfieStorageUrl || !persistentId) {
      setFormError('Por favor completa todos los campos requeridos');
      return;
    }

    setIsLoading(true);
    setFormError(null);
    
    try {
      // Obtener el estado del conductor y validar
      const driverStatus = await DriverService.checkDriverStatus(name);

      // Realizar el check-in
      await DriverService.checkIn({
        driverId: driverStatus.id,
        name,
        pid: persistentId,
        startTime: new Date().toISOString(),
        startLatitude: currentLocation?.latitude,
        startLongitude: currentLocation?.longitude,
        selfieUrl: selfieStorageUrl
      });

      // Éxito - redirigir al portal de espera
      router.push('/waiting');

    } catch (error: unknown) {
      console.error('Error en el proceso de check-in:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al registrar en la cola';
      setFormError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 5000
      });
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
          ) : drivers.length === 0 && !hasAssociatedPid ? (
            <div className="p-3 border rounded-md bg-amber-50 text-amber-800 text-sm">
              {persistentId 
                ? "No hay conductores disponibles para seleccionar. Esto puede significar que todos los conductores ya están asociados a otros dispositivos, o que no hay conductores registrados en el sistema."
                : "No se pudo generar un ID para este dispositivo. Por favor, intenta recargar la página o contacta a soporte técnico."}
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
              <PopoverContent className="w-[300px] p-0 z-50">
                <Command>
                  <CommandInput placeholder="Buscar conductor..." className="h-9" />
                  <CommandEmpty>
                    {hasAssociatedPid 
                      ? "No se encontraron conductores con ese nombre." 
                      : "No hay conductores disponibles sin asignación previa."}
                  </CommandEmpty>
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
          {!isNameLocked && !isLoadingDrivers && (
            <p className="text-xs text-muted-foreground mt-1">
              Solo puedes seleccionar conductores que no estén asociados a un dispositivo.
            </p>
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
