"use client";

import { useAuthCheck } from '@/hooks/use-auth-check';
import { DriverQueue, type DriverRecord } from './driver-queue';
import { BagsManager } from './bags-manager';
import { Button } from '@/components/ui/button';
import { logout, extendSession } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut, Package, Plus, Minus } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';

interface BagsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  driverName: string;
}

function BagsDialog({ isOpen, onClose, onConfirm, driverName }: BagsDialogProps) {
  const [amount, setAmount] = useState(0);

  const handleConfirm = () => {
    onConfirm(amount);
    setAmount(0); // Reset para la próxima vez
  };

  const incrementAmount = () => setAmount(prev => prev + 1);
  const decrementAmount = () => setAmount(prev => prev > 0 ? prev - 1 : 0);

  return (
    <Dialog open={isOpen} onOpenChange={() => {
      onClose();
      setAmount(0); // Reset al cerrar
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Package className="mr-2 h-5 w-5" />
            Entrega de Bolsos
          </DialogTitle>
          <DialogDescription>
            Ingresa la cantidad de bolsos que se llevan para {driverName}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center gap-4 py-6">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={decrementAmount}
            disabled={amount === 0}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <div className="flex-1 max-w-[100px]">
            <Input
              type="number"
              value={amount}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 0) {
                  setAmount(value);
                }
              }}
              className="text-center text-lg"
              min="0"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={incrementAmount}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={amount < 0}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CoordinatorDashboardClient() {
  const { isLoading: authLoading, isAuthenticated, role } = useAuthCheck('coordinator');
  const router = useRouter();
  const { toast } = useToast();

  const [activeDrivers, setActiveDrivers] = useState<DriverRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [vehicleFilter, setVehicleFilter] = useState<'todos' | 'auto' | 'moto'>('todos');
  const [activeTab, setActiveTab] = useState('cola');
  const [showBagsDialog, setShowBagsDialog] = useState(false);
  const [checkoutData, setCheckoutData] = useState<{
    recordId: string;
    recordData: any;
    driverName: string;
  } | null>(null);
  const [hasPendingRecords, setHasPendingRecords] = useState(false);
  const [hasQueueRecords, setHasQueueRecords] = useState(false);

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

  // Nueva función para verificar los estados de los registros
  const checkRecordsStatus = useCallback(async () => {
    try {
      // Verificar registros pendientes
      const { data: pendingData, error: pendingError } = await supabase
        .from('dispatch_records')
        .select('id')
        .eq('status', 'pendiente');
      
      if (pendingError) throw pendingError;
      setHasPendingRecords(pendingData && pendingData.length > 0);

      // Verificar registros en cola
      const { data: queueData, error: queueError } = await supabase
        .from('dispatch_records')
        .select('id')
        .eq('status', 'en_cola');
      
      if (queueError) throw queueError;
      setHasQueueRecords(queueData && queueData.length > 0);
    } catch (error) {
      console.error('Error verificando estados:', error);
    }
  }, []);

  // Actualizar el useEffect existente para incluir la verificación
  useEffect(() => {
    loadActiveDrivers();
    checkRecordsStatus();
    
    const interval = setInterval(() => {
      loadActiveDrivers();
      checkRecordsStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadActiveDrivers, checkRecordsStatus]);

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

      // 2. Mostrar el diálogo de bolsos
      setCheckoutData({
        recordId,
        recordData,
        driverName: recordData.name
      });
      setShowBagsDialog(true);
      setIsLoading(false);
      
    } catch (error) {
      console.error('Error al preparar despacho:', error);
      toast({
        title: "Error",
        description: "Error al preparar el despacho del conductor. Intente nuevamente.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  // Nueva función para procesar la confirmación de bolsos
  const handleBagsConfirmed = async (bagsCount: number) => {
    if (!checkoutData) return;
    
    setIsLoading(true);
    try {
      const { recordId, recordData } = checkoutData;

      // 1. Actualizar el registro de despacho con los bolsos entregados
      const { error: updateError } = await supabase
        .from('dispatch_records')
        .update({
          status: 'despachado',
          bags_taken: bagsCount
        })
        .eq('id', recordId);
      
      if (updateError) throw updateError;
      
      // 2. Actualizar el estado del conductor
      if (recordData && recordData.name) {
        const { error: driverError } = await supabase
          .from('drivers')
          .update({ 
            status: 'en_reparto',
            bags_balance: recordData.drivers?.bags_balance + bagsCount
          })
          .eq('name', recordData.name);
        
        if (driverError) throw driverError;

        // Mostrar mensaje de éxito con información de bolsos
        if (bagsCount > 0) {
          toast({
            title: "Conductor despachado",
            description: `Se han entregado ${bagsCount} bolso${bagsCount === 1 ? '' : 's'}. Saldo actual: ${recordData.drivers?.bags_balance + bagsCount} bolso${recordData.drivers?.bags_balance + bagsCount === 1 ? '' : 's'}.`,
            variant: "default"
          });
        } else {
          toast({
            title: "Conductor despachado",
            description: "No se entregaron bolsos en este despacho.",
            variant: "default"
          });
        }
      }
      
      // 3. Recargar la lista actualizada
      await loadActiveDrivers();
      
    } catch (error) {
      console.error('Error al despachar conductor:', error);
      toast({
        title: "Error",
        description: "Error al despachar al conductor. Intente nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setShowBagsDialog(false);
      setCheckoutData(null);
    }
  };

  // Nueva función: pasar todos los pendientes a en_cola
  const handleStartAllPending = async () => {
    setIsLoading(true);
    try {
      // 1. Actualizar los registros de despacho de pendiente a en_cola
      const { error } = await supabase
        .from('dispatch_records')
        .update({ status: 'en_cola' })
        .eq('status', 'pendiente');
      if (error) throw error;

      // 2. Actualizar el estado de los conductores a en_espera
      // Nota: Ya no necesitamos distinguir entre turno_terminado e inactivo
      const { error: driversError } = await supabase
        .from('drivers')
        .update({ status: 'en_espera' })
        .in('status', ['inactivo']);  // Incluye tanto inactivo como los que terminaron turno
      if (driversError) throw driversError;

      toast({
        title: 'Cola iniciada',
        description: 'Todos los conductores pendientes han sido añadidos a la cola de espera.',
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
            showStartAllButton={hasPendingRecords && !hasQueueRecords}
          />
        </TabsContent>

        <TabsContent value="bolsos">
          <BagsManager />
        </TabsContent>
      </Tabs>

      {checkoutData && (
        <BagsDialog
          isOpen={showBagsDialog}
          onClose={() => {
            setShowBagsDialog(false);
            setCheckoutData(null);
          }}
          onConfirm={handleBagsConfirmed}
          driverName={checkoutData.driverName}
        />
      )}
    </div>
  );
}
