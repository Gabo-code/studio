"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, User, AlertCircle, Check } from 'lucide-react';
import { WaitingList } from '.';
import { usePersistentId } from '@/hooks/use-persistent-id';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Interface para los conductores en espera (simplificada)
interface WaitingDriver {
  id: string;
  name: string;
  start_time: string;
  pid: string | null;
  vehicle_type: string | null;
}

interface DriverWithVehicle {
  id: string;
  name: string;
  start_time: string;
  pid: string | null;
  drivers: {
    vehicle_type: string | null;
  };
}

export function WaitingPortalClient() {
  const [waitingDrivers, setWaitingDrivers] = useState<WaitingDriver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userPosition, setUserPosition] = useState<number | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [showTomorrowList, setShowTomorrowList] = useState(false);
  const [tomorrowDrivers, setTomorrowDrivers] = useState<WaitingDriver[]>([]);
  const [isLoadingTomorrow, setIsLoadingTomorrow] = useState(false);
  const [tomorrowError, setTomorrowError] = useState<string | null>(null);
  const [vehicleFilter, setVehicleFilter] = useState<'todos' | 'auto' | 'moto'>('todos');
  
  const persistentId = usePersistentId();

  // Cargar conductores en espera directamente de Supabase
  const loadWaitingDrivers = useCallback(async () => {
    setIsLoading(true);
    try {
      // Obtener los registros de despacho con el tipo de vehículo en una sola consulta
      const { data: driversWithVehicleType, error: dispatchError } = await supabase
        .from('dispatch_records')
        .select(`
          id,
          name,
          start_time,
          pid,
          drivers!left (
            vehicle_type
          )
        `)
        .eq('status', 'en_curso')
        .order('start_time', { ascending: true }) as { data: DriverWithVehicle[] | null, error: any };
      
      if (dispatchError) {
        console.error('Error cargando conductores en espera:', dispatchError);
        return;
      }

      // Transformar los datos al formato esperado
      const formattedDrivers = (driversWithVehicleType || []).map(record => ({
        id: record.id,
        name: record.name,
        start_time: record.start_time,
        pid: record.pid,
        vehicle_type: record.drivers?.vehicle_type || null
      }));

      setWaitingDrivers(formattedDrivers);
      
      // Verificar si el usuario está en la lista de espera
      if (persistentId) {
        const userDriverIndex = formattedDrivers?.findIndex(driver => driver.pid === persistentId) ?? -1;
        if (userDriverIndex !== -1) {
          setUserPosition(userDriverIndex + 1); // +1 porque el índice empieza en 0
          setUserName(formattedDrivers?.[userDriverIndex].name || null);
        } else {
          setUserPosition(null);
          setUserName(null);
        }
      }
    } catch (err) {
      console.error('Error al cargar datos:', err);
    } finally {
      setIsLoading(false);
    }
  }, [persistentId]);

  // Cargar datos inicialmente y luego cada 30 segundos
  useEffect(() => {
    loadWaitingDrivers();
    
    const interval = setInterval(loadWaitingDrivers, 30000);
    return () => clearInterval(interval);
  }, [loadWaitingDrivers]);

  // Función para obtener la lista de mañana a las 8AM
  const loadTomorrowDrivers = async () => {
    setIsLoadingTomorrow(true);
    setTomorrowError(null);
    try {
      // Calcular la fecha de mañana a las 8:00 AM en Santiago
      const now = new Date();
      const santiagoNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Santiago' }));
      const tomorrow = new Date(santiagoNow);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(8, 0, 0, 0);
      const startOfTomorrow = new Date(tomorrow);
      startOfTomorrow.setHours(8, 0, 0, 0);
      const endOfTomorrow = new Date(tomorrow);
      endOfTomorrow.setHours(8, 0, 59, 999); // hasta 59 segundos después

      const { data, error } = await supabase
        .from('dispatch_records')
        .select(`
          id,
          name,
          start_time,
          pid,
          drivers!inner (
            vehicle_type
          )
        `)
        .eq('status', 'pendiente')
        .gte('start_time', startOfTomorrow.toISOString())
        .lte('start_time', endOfTomorrow.toISOString())
        .order('start_time', { ascending: true }) as { data: DriverWithVehicle[] | null, error: any };

      if (error) {
        setTomorrowError('Error al cargar la lista de mañana.');
        setTomorrowDrivers([]);
      } else if (data && data.length > 0) {
        // Transformar los datos al formato esperado
        const formattedDrivers = data.map(record => ({
          id: record.id,
          name: record.name,
          start_time: record.start_time,
          pid: record.pid,
          vehicle_type: record.drivers?.vehicle_type || null
        }));
        setTomorrowDrivers(formattedDrivers);
      } else {
        setTomorrowDrivers([]);
        setTomorrowError('No hay lista de espera programada para mañana a las 8:00 AM.');
      }
    } catch (err) {
      setTomorrowError('Error inesperado al cargar la lista de mañana.');
      setTomorrowDrivers([]);
    } finally {
      setIsLoadingTomorrow(false);
    }
  };

  // Filtrar conductores según el tipo de vehículo seleccionado
  const filteredDrivers = waitingDrivers.filter(driver => 
    vehicleFilter === 'todos' ? true : 
    driver.vehicle_type?.toLowerCase() === vehicleFilter
  );

  // Total de conductores filtrados
  const totalDrivers = filteredDrivers.length;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-2" />
        <p className="text-lg text-muted-foreground">Cargando lista de espera...</p>
        <p className="text-sm text-muted-foreground">Por favor espere</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botón de lista de mañana */}
      <div className="flex justify-start">
        <Button
          variant="outline"
          onClick={async () => {
            setShowTomorrowList(true);
            await loadTomorrowDrivers();
          }}
        >
          Ver lista de mañana 8AM
        </Button>
      </div>

      {/* Contador de conductores y filtro de vehículos */}
      <div className="flex justify-between items-center">
        <span className="text-lg bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
          {totalDrivers} {totalDrivers === 1 ? 'conductor' : 'conductores'}
        </span>
      </div>
      
      {/* Indicador de posición del usuario en la lista */}
      {persistentId && (
        <Card className={`p-4 ${userPosition ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center">
            {userPosition ? (
              <>
                <Check className="h-6 w-6 text-green-600 mr-3" />
                <div>
                  <p className="font-medium text-green-800">
                    {userName}, estás en el puesto {userPosition} de la lista de espera.
                  </p>
                  {userPosition === 1 && (
                    <p className="text-sm text-green-700 mt-1">¡Eres el siguiente! Prepárate para ser llamado.</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-6 w-6 text-amber-600 mr-3" />
                <p className="font-medium text-amber-800">
                  No estás en la lista de espera.
                </p>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Filtro de vehículos */}
      <select
        value={vehicleFilter}
        onChange={(e) => setVehicleFilter(e.target.value as 'todos' | 'auto' | 'moto')}
        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="todos">Todos los vehículos</option>
        <option value="auto">Solo autos</option>
        <option value="moto">Solo motos</option>
      </select>

      {totalDrivers === 0 ? (
        <Card className="text-center shadow-sm">
          <CardContent className="p-10">
            <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">
              {vehicleFilter === 'todos' 
                ? 'No hay conductores en la lista de espera.'
                : `No hay conductores de ${vehicleFilter === 'auto' ? 'auto' : 'moto'} en la lista de espera.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <WaitingList drivers={filteredDrivers} />
      )}

      {/* Modal para la lista de mañana */}
      <Dialog open={showTomorrowList} onOpenChange={setShowTomorrowList}>
        <DialogContent className="max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Lista de espera para mañana 8:00 AM</DialogTitle>
            <DialogDescription>
              {format(new Date(Date.now() + 24*60*60*1000), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
            </DialogDescription>
          </DialogHeader>
          {isLoadingTomorrow ? (
            <div className="flex flex-col items-center justify-center min-h-[100px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-muted-foreground">Cargando lista de mañana...</p>
            </div>
          ) : tomorrowDrivers.length > 0 ? (
            <div className="mt-2 flex-1 overflow-y-auto" style={{ maxHeight: '50vh' }}>
              <ul className="space-y-2">
                {tomorrowDrivers.map((driver, idx) => (
                  <li key={driver.id} className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{idx + 1}</span>
                    <span className="font-medium">{driver.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-4">
              {tomorrowError || 'No hay lista de espera programada para mañana a las 8:00 AM.'}
            </div>
          )}
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setShowTomorrowList(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 