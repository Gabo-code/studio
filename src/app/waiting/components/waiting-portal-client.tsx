"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, User } from 'lucide-react';
import { WaitingList } from './waiting-list';

// Interface para los conductores en espera (simplificada)
interface WaitingDriver {
  id: string;
  name: string;
  start_time: string;
}

export function WaitingPortalClient() {
  const [waitingDrivers, setWaitingDrivers] = useState<WaitingDriver[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar conductores en espera directamente de Supabase
  const loadWaitingDrivers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('dispatch_records')
        .select('id, name, start_time')
        .eq('status', 'en_curso')
        .order('start_time', { ascending: true });
      
      if (error) {
        console.error('Error cargando conductores en espera:', error);
      } else {
        setWaitingDrivers(data || []);
      }
    } catch (err) {
      console.error('Error al cargar datos:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

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