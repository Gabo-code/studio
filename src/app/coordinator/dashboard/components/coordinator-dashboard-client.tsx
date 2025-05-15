"use client";

import { useAuthCheck } from '@/hooks/use-auth-check';
import { DriverQueue } from './driver-queue';
import { Button } from '@/components/ui/button';
import { logout, extendSession } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

// Interfaces para mapear los datos de Supabase
interface DriverRecord {
  id: string;
  driver_id: string;
  name: string;
  start_time: string;
  status: string;
  selfie_url?: string;
  pid?: string;
  vehicle_type?: string;
}

export function CoordinatorDashboardClient() {
  const { isLoading: authLoading, isAuthenticated, role } = useAuthCheck('coordinator');
  const router = useRouter();
  const { toast } = useToast();

  const [activeDrivers, setActiveDrivers] = useState<DriverRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar conductores activos desde Supabase
  const loadActiveDrivers = useCallback(async () => {
    setIsLoading(true);
    try {
      // Primero obtenemos los registros activos
      const { data: dispatchRecords, error: dispatchError } = await supabase
        .from('dispatch_records')
        .select(`
          id,
          driver_id,
          name,
          start_time,
          status,
          selfie_url,
          pid
        `)
        .eq('status', 'en_curso')
        .order('start_time', { ascending: true });
      
      if (dispatchError) {
        console.error('Error cargando registros activos:', dispatchError);
        setActiveDrivers([]);
        setIsLoading(false);
        return;
      }
      
      // Si no hay registros, terminamos
      if (!dispatchRecords || dispatchRecords.length === 0) {
        setActiveDrivers([]);
        setIsLoading(false);
        return;
      }
      
      // Para cada registro, obtenemos el tipo de vehículo del conductor
      const recordsWithVehicleType = await Promise.all(
        dispatchRecords.map(async (record) => {
          // Buscamos el conductor por nombre
          const { data: driverData, error: driverError } = await supabase
            .from('drivers')
            .select('vehicle_type')
            .eq('name', record.name)
            .maybeSingle();
          
          // Si no hay error y encontramos el tipo de vehículo, lo añadimos al registro
          if (!driverError && driverData && driverData.vehicle_type) {
            return { ...record, vehicle_type: driverData.vehicle_type };
          }
          
          // Si hay error o no encontramos el tipo de vehículo, devolvemos el registro original
          return record;
        })
      );
      
      setActiveDrivers(recordsWithVehicleType);
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setActiveDrivers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cargar datos al inicio y refrescar cada 30 segundos
  useEffect(() => {
    loadActiveDrivers();
    
    const interval = setInterval(loadActiveDrivers, 30000);
    return () => clearInterval(interval);
  }, [loadActiveDrivers]);

  // Extender la sesión solo una vez al cargar el dashboard
  useEffect(() => {
    if (isAuthenticated && role === 'coordinator') {
      extendSession();
    }
  }, [isAuthenticated, role]);

  const handleLogout = () => {
    logout();
    router.replace('/coordinator/login');
  };

  // Manejar la marcación de salida de un conductor
  const handleCheckoutDriver = async (recordId: string) => {
    setIsLoading(true);
    try {
      // Extender la sesión solo cuando se marca la salida de un conductor
      if (isAuthenticated && role === 'coordinator') {
        extendSession();
      }
      
      // 1. Obtener el registro actual para tener los datos del conductor
      const { data: recordData, error: recordError } = await supabase
        .from('dispatch_records')
        .select('*')
        .eq('id', recordId)
        .single();
      
      if (recordError) throw recordError;
      
      // 2. Actualizar el registro de despacho
      const { error: updateError } = await supabase
        .from('dispatch_records')
        .update({
          end_time: new Date().toISOString(),
          status: 'completado'
        })
        .eq('id', recordId);
      
      if (updateError) throw updateError;
      
      // 3. Actualizar el estado del conductor a 'disponible'
      if (recordData && recordData.name) {
        const { error: driverError } = await supabase
          .from('drivers')
          .update({ status: 'disponible' })
          .eq('name', recordData.name);
        
        if (driverError) throw driverError;
      }
      
      // 4. Recargar la lista actualizada
      await loadActiveDrivers();
      
    } catch (error) {
      console.error('Error al marcar salida:', error);
      alert('Error al marcar la salida del conductor. Intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Nueva función: pasar todos los pendientes a en_curso
  const handleStartAllPending = async () => {
    setIsLoading(true);
    try {
      const { error, count } = await supabase
        .from('dispatch_records')
        .update({ status: 'en_curso' })
        .eq('status', 'pendiente');
      if (error) throw error;
      toast({
        title: 'Cola iniciada',
        description: 'Todos los registros pendientes han pasado a "en curso".',
        variant: 'default',
      });
      await loadActiveDrivers();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'No se pudo iniciar la cola de espera.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-2" />
        <p className="text-lg text-muted-foreground">Cargando conductores activos...</p>
        <p className="text-sm text-muted-foreground">Por favor espere</p>
      </div>
    );
  }

  if (!isAuthenticated || role !== 'coordinator') {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <p className="text-lg text-destructive">Acceso denegado. Redirigiendo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">
          Cola de Conductores
          <span className="text-lg ml-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
            {activeDrivers.length} {activeDrivers.length === 1 ? 'conductor' : 'conductores'}
          </span>
        </h2>
        <div className="flex gap-2">
          <Button onClick={handleStartAllPending} variant="secondary">
            Iniciar todos los pendientes
          </Button>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
          </Button>
        </div>
      </div>

      <DriverQueue 
        drivers={activeDrivers} 
        onCheckoutDriver={handleCheckoutDriver} 
      />
    </div>
  );
}
