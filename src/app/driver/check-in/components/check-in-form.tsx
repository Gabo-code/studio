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
      let query = supabase
        .from('drivers')
        .select('id, name, vehicle_type')
        
      // Si el usuario no está asociado, cargar solo conductores sin pid
      if (!isAssociated) {
        query = query.is('pid', null);
      }
      
      const { data, error } = await query.order('name');
      
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
        variant: "destructive",
        duration: 5000
      });
      return;
    }

    setIsLoading(true);
    setFormError(null);
    
    try {
      // Verificar si el conductor ya está en estado "ocupado"
      const { data: driverStatus, error: driverStatusError } = await supabase
        .from('drivers')
        .select('status')
        .eq('name', name)
        .maybeSingle();
        
      console.log('📱 VERIFICANDO ESTADO:', driverStatus);
      
      if (driverStatusError) {
        throw new Error('Error al verificar el estado del conductor');
      }
      
      if (driverStatus && driverStatus.status === 'ocupado') {
        setFormError('Ya estás registrado y en estado OCUPADO. Espera a que el coordinador marque tu salida.');
        toast({
          title: "Ya estás registrado",
          description: "Tu asistencia ya está registrada y estás en estado OCUPADO. Espera a que el coordinador marque tu salida.",
          variant: "default",
          duration: 6000
        });
        setIsLoading(false);
        return;
      }

      // Continuar con el resto del proceso de check-in
      console.log('📱 PASO 1: Buscando conductor con nombre:', name);
      
      // First, get the driver's actual ID from the database
      const { data: driverData, error: getDriverError } = await supabase
        .from('drivers')
        .select('id')
        .eq('name', name)
        .maybeSingle();
        
      console.log('📱 PASO 2: Resultado búsqueda conductor:', 
                  { conductor: driverData, error: getDriverError });
      
      if (getDriverError) throw getDriverError;
      
      if (!driverData) {
        throw new Error(`No se encontró el conductor con nombre ${name} en la base de datos`);
      }
      
      const driverId = driverData.id;
      console.log('📱 PASO 3: ID encontrado:', driverId);
      
      const { error: driverError } = await supabase
        .from('drivers')
        .update({
          pid: persistentId,
          status: 'ocupado',
        })
        .eq('name', name);

      console.log('📱 PASO 4: Actualización de status a ocupado:', 
                  { resultado: driverError ? 'ERROR' : 'ÉXITO', error: driverError });

      if (driverError) throw driverError;
      
      // Use the actual driver ID from the database for the dispatch record
      const dispatchRecord = {
        id: uuidv4(),
        driver_id: driverId, // Use the actual driver ID from the database
        name: name, // Añadir el nombre del conductor (redundante pero útil)
        pid: persistentId, // Añadir el persistentId del navegador para detectar comportamientos extraños
        start_time: new Date().toISOString(),
        startlatitude: currentLocation?.latitude,
        startlongitude: currentLocation?.longitude,
        status: 'en_curso',
        selfie_url: selfieStorageUrl
      };
      
      console.log('📱 PASO 5: Creando registro de despacho:', dispatchRecord);
      
      const { data: insertData, error: dispatchError } = await supabase
        .from('dispatch_records')
        .insert(dispatchRecord)
        .select();
        
      console.log('📱 PASO 6: Resultado creación:', 
                  { resultado: dispatchError ? 'ERROR' : 'ÉXITO', 
                    datos: insertData, 
                    error: dispatchError });

      if (dispatchError) {
        // Add a special error message if it seems to be a foreign key issue
        if (dispatchError.message && 
            (dispatchError.message.includes('foreign key') || 
             dispatchError.message.includes('violates foreign key constraint'))) {
          throw new Error(`Error de conexión entre tablas. El ID del conductor no coincide entre tablas.`);
        }
        throw dispatchError;
      }

      // Mostrar mensaje de éxito
      toast({
        title: "Registro exitoso",
        variant: "default",
        duration: 6000
      });
        
      // Redirigir después de un breve retraso
      setTimeout(() => {
        router.push('/');
      }, 2000);
      
    } catch (error) {
      console.error('Error during check-in:', error);
      
      // Show more detailed error information in the console
      let errorMessage = 'Error durante el check-in. Por favor intenta nuevamente.';
      
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        // Create a shorter, more readable message for the phone
        const shortMessage = error.message.length > 100 
          ? error.message.substring(0, 100) + '...' 
          : error.message;
        
        errorMessage = `Error: ${shortMessage}`;
        
        // Show toast instead of alert
        toast({
          title: "Error de check-in",
          description: shortMessage,
          variant: "destructive"
        });
      } else if (typeof error === 'object' && error !== null) {
        // For Supabase errors that aren't standard Error instances
        const errorObj = error as any;
        console.error('Error object:', JSON.stringify(errorObj, null, 2));
        
        // Extract a useful message for mobile display
        const supabaseMessage = errorObj.message || errorObj.error || 
                               (errorObj.details ? errorObj.details.substring(0, 100) : 'Error desconocido');
        
        errorMessage = `Error: ${supabaseMessage}`;
        
        // Show toast instead of alert
        toast({
          title: "Error de base de datos",
          description: supabaseMessage,
          variant: "destructive"
        });
      }
      
      setFormError(errorMessage);
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
              No hay conductores disponibles para seleccionar. Todos los conductores ya están asociados a dispositivos.
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
