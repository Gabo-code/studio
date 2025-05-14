import { supabase } from './supabase';
import type { Driver, WaitingDriver, DispatchRecord, FraudAlert } from '@/types';

/**
 * Adaptador para la integración de Supabase con la aplicación
 * Basado en la estructura de tablas observada en Supabase:
 * 
 * Tabla drivers:
 * - id (string) - ID persistente del conductor
 * - name (string) - Nombre del conductor
 * 
 * Tabla waiting_drivers:
 * - id (string) - ID persistente del conductor
 * - name (string) - Nombre del conductor
 * - checkInTime (number) - Timestamp de registro
 * - selfieDataUrl (string, opcional) - Imagen en base64
 * - location (json, opcional) - Objeto con latitude y longitude
 * 
 * Tabla dispatch_records:
 * - id (string) - ID persistente del conductor
 * - name (string) - Nombre del conductor
 * - checkInTime (number) - Timestamp de registro
 * - selfieDataUrl (string, opcional) - Imagen en base64
 * - location (json, opcional) - Objeto con latitude y longitude
 * - checkoutTime (number) - Timestamp de finalización
 * - bags (number) - Cantidad de bolsas
 * - commune (string) - Comuna/destino
 * - coordinatorId (string) - ID del coordinador
 * 
 * Tabla fraud_alerts:
 * - id (string) - ID único de la alerta
 * - type (string) - Tipo de alerta (duplicateName, duplicateId, nameMismatchOnId)
 * - message (string) - Mensaje descriptivo
 * - driverName (string) - Nombre del conductor
 * - persistentId (string) - ID persistente
 * - timestamp (number) - Timestamp de la alerta
 */

// Funciones para drivers
export const driversAdapter = {
  getAll: async (): Promise<Driver[]> => {
    const { data, error } = await supabase.from('drivers').select('*');
    if (error) throw error;
    return data || [];
  },
  
  add: async (driver: Driver): Promise<void> => {
    const { error } = await supabase.from('drivers').insert([driver]);
    if (error) throw error;
  },
  
  update: async (driver: Driver): Promise<void> => {
    const { error } = await supabase.from('drivers').update(driver).eq('id', driver.id);
    if (error) throw error;
  },
  
  remove: async (driverId: string): Promise<void> => {
    const { error } = await supabase.from('drivers').delete().eq('id', driverId);
    if (error) throw error;
  }
};

// Funciones para waiting drivers
export const waitingDriversAdapter = {
  getAll: async (): Promise<WaitingDriver[]> => {
    const { data, error } = await supabase.from('waiting_drivers').select('*');
    if (error) throw error;
    return data || [];
  },
  
  add: async (driver: WaitingDriver): Promise<{ success: boolean; alert?: FraudAlert }> => {
    const { error } = await supabase.from('waiting_drivers').insert([driver]);
    if (error) throw error;
    return { success: true };
  },
  
  remove: async (driverId: string): Promise<WaitingDriver | undefined> => {
    // Primero conseguimos el driver
    const { data, error } = await supabase
      .from('waiting_drivers')
      .select('*')
      .eq('id', driverId)
      .limit(1)
      .single();
      
    if (error) throw error;
    
    // Luego lo eliminamos
    const { error: deleteError } = await supabase
      .from('waiting_drivers')
      .delete()
      .eq('id', driverId);
      
    if (deleteError) throw deleteError;
    
    return data;
  }
};

// Funciones para dispatch records
export const dispatchRecordsAdapter = {
  getAll: async (): Promise<DispatchRecord[]> => {
    const { data, error } = await supabase.from('dispatch_records').select('*');
    if (error) throw error;
    return data || [];
  },
  
  add: async (record: DispatchRecord): Promise<void> => {
    const { error } = await supabase.from('dispatch_records').insert([record]);
    if (error) throw error;
  }
};

// Funciones para fraud alerts
export const fraudAlertsAdapter = {
  getAll: async (): Promise<FraudAlert[]> => {
    const { data, error } = await supabase.from('fraud_alerts').select('*');
    if (error) throw error;
    return data || [];
  },
  
  add: async (alert: FraudAlert): Promise<void> => {
    const { error } = await supabase.from('fraud_alerts').insert([alert]);
    if (error) throw error;
  },
  
  clearAll: async (): Promise<void> => {
    const { error } = await supabase.from('fraud_alerts').delete().gte('id', '0');
    if (error) throw error;
  }
}; 