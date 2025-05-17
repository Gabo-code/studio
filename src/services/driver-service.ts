import { supabase } from '@/lib/supabase';
import type { Driver, DriverStatus, DispatchStatus } from '@/types';

interface CheckInData {
  driverId: string;
  name: string;
  pid: string;
  startTime: string;
  startLatitude?: number;
  startLongitude?: number;
  selfieUrl: string;
}

interface DriverWithStatus extends Driver {
  status: DriverStatus;
  vehicle_type?: string;
  pid?: string;
}

interface DriverStats {
  driver_id: string;
  name: string;
  trip_count: number;
}

export class DriverService {
  static async checkDriverStatus(name: string): Promise<{
    id: string;
    status: DriverStatus;
    bagsBalance: number;
  }> {
    // Obtener el conductor por nombre
    const { data: driver, error } = await supabase
      .from('drivers')
      .select('id, status, bags_balance')
      .eq('name', name)
      .maybeSingle();

    if (error) throw new Error('Error al verificar el estado del conductor');
    if (!driver) throw new Error(`No se encontró el conductor con nombre ${name}`);

    // Validación simple: solo conductores inactivos pueden hacer check-in
    if (driver.status !== 'inactivo') {
      throw new Error('No puedes hacer check-in mientras estés en espera o en reparto');
    }

    return {
      id: driver.id,
      status: driver.status,
      bagsBalance: driver.bags_balance
    };
  }

  static async checkIn(data: CheckInData): Promise<void> {
    try {
      // 1. Actualizar estado del conductor y asociar dispositivo
      const { error: driverError } = await supabase
        .from('drivers')
        .update({ 
          status: 'en_espera',
          pid: data.pid
        })
        .eq('id', data.driverId);

      if (driverError) throw driverError;

      // 2. Crear registro de despacho
      const { error: dispatchError } = await supabase
        .from('dispatch_records')
        .insert([{
          driver_id: data.driverId,
          name: data.name,
          start_time: data.startTime,
          startlatitude: data.startLatitude,
          startlongitude: data.startLongitude,
          selfie_url: data.selfieUrl,
          pid: data.pid,
          status: 'pendiente'
        }]);

      if (dispatchError) throw dispatchError;

    } catch (error) {
      throw error;
    }
  }

  static async getActiveDrivers(): Promise<Driver[]> {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .in('status', ['en_espera', 'en_reparto']);

    if (error) throw error;
    return data || [];
  }

  static async updateDriverStatus(
    driverId: string, 
    status: DriverStatus, 
    bagsBalance?: number
  ): Promise<void> {
    const updates: any = { status };
    if (typeof bagsBalance === 'number') {
      updates.bags_balance = bagsBalance;
    }

    const { error } = await supabase
      .from('drivers')
      .update(updates)
      .eq('id', driverId);

    if (error) throw error;
  }

  static async getAllDrivers(): Promise<DriverWithStatus[]> {
    const { data, error } = await supabase
      .from('drivers')
      .select('id, name, status, vehicle_type, pid')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  static async cancelPendingDispatches(driverId: string): Promise<void> {
    const { error } = await supabase
      .from('dispatch_records')
      .update({ status: 'cancelado' })
      .eq('driver_id', driverId)
      .in('status', ['en_cola', 'pendiente']);

    if (error) throw new Error('Error al cancelar despachos pendientes');
  }

  static async cancelAllPendingDispatches(): Promise<void> {
    const { error: transactionError } = await supabase.rpc('begin_transaction');
    if (transactionError) throw transactionError;

    try {
      // 1. Cancelar todos los despachos pendientes y en cola
      const { error: dispatchError } = await supabase
        .from('dispatch_records')
        .update({ status: 'cancelado' })
        .in('status', ['en_cola', 'pendiente']);

      if (dispatchError) throw dispatchError;

      // 2. Marcar conductores como inactivos
      const { error: driverError } = await supabase
        .from('drivers')
        .update({ status: 'inactivo' })
        .in('status', ['en_espera']);

      if (driverError) throw driverError;

      // Confirmar transacción
      await supabase.rpc('commit_transaction');
    } catch (error) {
      // Revertir transacción en caso de error
      await supabase.rpc('rollback_transaction');
      throw error;
    }
  }

  static async getDriverRankings(startDate: string, endDate: string, limit: number = 20): Promise<{
    driver_id: string;
    name: string;
    trip_count: number;
  }[]> {
    const { data, error } = await supabase
      .from('dispatch_records')
      .select('driver_id, name')
      .gte('start_time', startDate)
      .lte('start_time', endDate)
      .eq('status', 'despachado')
      .order('start_time', { ascending: false });

    if (error) throw error;

    // Count trips per driver
    const driverCounts = (data || []).reduce((acc: { [key: string]: { name: string; count: number } }, record) => {
      if (!acc[record.driver_id]) {
        acc[record.driver_id] = { name: record.name, count: 0 };
      }
      acc[record.driver_id].count++;
      return acc;
    }, {});

    // Convert to array and sort by count
    const rankings = Object.entries(driverCounts)
      .map(([driver_id, { name, count }]) => ({
        driver_id,
        name,
        trip_count: count
      }))
      .sort((a, b) => b.trip_count - a.trip_count)
      .slice(0, limit);

    return rankings;
  }

  static async addDriver(driver: DriverWithStatus): Promise<void> {
    const { error } = await supabase
      .from('drivers')
      .insert([driver]);

    if (error) throw error;
  }

  static async updateDriver(driver: DriverWithStatus): Promise<void> {
    const { error } = await supabase
      .from('drivers')
      .update(driver)
      .eq('id', driver.id);

    if (error) throw error;
  }

  static async deleteDriver(driverId: string): Promise<void> {
    const { error } = await supabase
      .from('drivers')
      .delete()
      .eq('id', driverId);

    if (error) throw error;
  }
} 