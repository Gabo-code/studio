"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, User, AlertCircle, Check } from 'lucide-react';
import { WaitingList } from '.';
import { usePersistentId } from '@/hooks/use-persistent-id';

// Interface para los conductores en espera (simplificada)
interface WaitingDriver {
  id: string;
  name: string;
  start_time: string;
  pid?: string;
}

export function WaitingPortalClient() {
  const [waitingDrivers, setWaitingDrivers] = useState<WaitingDriver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userPosition, setUserPosition] = useState<number | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  
  const persistentId = usePersistentId();

  // Cargar conductores en espera directamente de Supabase
  const loadWaitingDrivers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('dispatch_records')
        .select('id, name, start_time, pid')
        .eq('status', 'en_curso')
        .order('start_time', { ascending: true });
      
      if (error) {
        console.error('Error cargando conductores en espera:', error);
      } else {
        setWaitingDrivers(data || []);
        
        // Verificar si el usuario está en la lista de espera
        if (persistentId) {
          const userDriverIndex = data?.findIndex(driver => driver.pid === persistentId) ?? -1;
          if (userDriverIndex !== -1) {
            setUserPosition(userDriverIndex + 1); // +1 porque el índice empieza en 0
            setUserName(data?.[userDriverIndex].name || null);
          } else {
            setUserPosition(null);
            setUserName(null);
          }
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-2" />
        <p className="text-lg text-muted-foreground">Cargando lista de espera...</p>
        <p className="text-sm text-muted-foreground">Por favor espere</p>
      </div>
    );
  }

  // Total de conductores en espera
  const totalDrivers = waitingDrivers.length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">
          Lista de Espera 
          <span className="text-lg ml-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
            {totalDrivers} {totalDrivers === 1 ? 'conductor' : 'conductores'}
          </span>
        </h2>
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

      {totalDrivers === 0 ? (
        <Card className="text-center shadow-sm">
          <CardContent className="p-10">
            <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No hay conductores en la lista de espera.</p>
          </CardContent>
        </Card>
      ) : (
        <WaitingList drivers={waitingDrivers} />
      )}
    </div>
  );
} 