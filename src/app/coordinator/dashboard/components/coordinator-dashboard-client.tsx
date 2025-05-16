"use client";

import { useAuthCheck } from '@/hooks/use-auth-check';
import { DriverQueue } from './driver-queue';
import { BagsManager } from './bags-manager';
import { Button } from '@/components/ui/button';
import { logout, extendSession } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [vehicleFilter, setVehicleFilter] = useState<'todos' | 'auto' | 'moto'>('todos');
  const [activeTab, setActiveTab] = useState('cola');

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
        .select('*, drivers!inner(bags_balance)')
        .eq('id', recordId)
        .single();
      
      if (recordError) throw recordError;

      // 2. Preguntar por los bolsos entregados
      const bagsTaken = window.prompt('¿Cuántos bolsos se llevan?', '0');
      if (bagsTaken === null) {
        setIsLoading(false);
        return;
      }

      const bagsCount = parseInt(bagsTaken);
      if (isNaN(bagsCount) || bagsCount < 0) {
        toast({
          title: "Error",
          description: "Por favor ingresa un número válido de bolsos (0 o más).",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // 3. Actualizar el registro de despacho con los bolsos entregados
      const { error: updateError } = await supabase
        .from('dispatch_records')
        .update({
          end_time: new Date().toISOString(),
          status: 'completado',
          bags_taken: bagsCount
        })
        .eq('id', recordId);
      
      if (updateError) throw updateError;
      
      // 4. Actualizar el saldo de bolsos del conductor
      if (recordData && recordData.name) {
        const currentBalance = recordData.drivers?.bags_balance || 0;
        const { error: driverError } = await supabase
          .from('drivers')
          .update({ 
            status: 'disponible',
            bags_balance: currentBalance + bagsCount
          })
          .eq('name', recordData.name);
        
        if (driverError) throw driverError;

        // Mostrar mensaje de éxito con información de bolsos
        if (bagsCount > 0) {
          toast({
            title: "Salida registrada",
            description: `Se han entregado ${bagsCount} bolso${bagsCount === 1 ? '' : 's'}. Saldo actual: ${currentBalance + bagsCount} bolso${currentBalance + bagsCount === 1 ? '' : 's'}.`,
            variant: "default"
          });
        } else {
          toast({
            title: "Salida registrada",
            description: "No se entregaron bolsos en este despacho.",
            variant: "default"
          });
        }
      }
      
      // 5. Recargar la lista actualizada
      await loadActiveDrivers();
      
    } catch (error) {
      console.error('Error al marcar salida:', error);
      toast({
        title: "Error",
        description: "Error al marcar la salida del conductor. Intente nuevamente.",
        variant: "destructive"
      });
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

  // Filtrar conductores según el tipo de vehículo seleccionado
  const filteredDrivers = activeDrivers.filter(driver => 
    vehicleFilter === 'todos' ? true : 
    driver.vehicle_type?.toLowerCase() === vehicleFilter
  );

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="mt-2 text-sm text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!isAuthenticated || role !== 'coordinator') {
    router.replace('/coordinator/login');
    return null;
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Panel del Coordinador</h1>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="cola">Cola de Conductores</TabsTrigger>
          <TabsTrigger value="bolsos">Control de Bolsos</TabsTrigger>
        </TabsList>

        <TabsContent value="cola" className="space-y-4">
          <DriverQueue
            drivers={filteredDrivers}
            onCheckout={handleCheckoutDriver}
            onStartAll={handleStartAllPending}
            vehicleFilter={vehicleFilter}
            onVehicleFilterChange={setVehicleFilter}
          />
        </TabsContent>

        <TabsContent value="bolsos">
          <BagsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
