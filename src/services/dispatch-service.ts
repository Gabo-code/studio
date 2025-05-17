import { supabase } from '@/lib/supabase';
import type { DispatchStatus } from '@/types';

interface DispatchRecord {
  id: string;
  driver_id: string;
  name: string;
  start_time: string | null;
  end_time: string | null;
  startlatitude: number | null;
  startlongitude: number | null;
  selfie_url: string | null;
  pid: string | null;
  status: DispatchStatus;
  bags_taken?: number;
}

export class DispatchService {
  static async getActiveDispatches(): Promise<DispatchRecord[]> {
    const { data, error } = await supabase
      .from('dispatch_records')
      .select('*')
      .in('status', ['en_cola', 'pendiente'])
      .order('start_time');

    if (error) throw error;
    return data || [];
  }

  static async startAllPending(): Promise<void> {
    const { error: transactionError } = await supabase.rpc('begin_transaction');
    if (transactionError) throw transactionError;

    try {
      // 1. Update dispatch records from pending to en_cola
      const { error: dispatchError } = await supabase
        .from('dispatch_records')
        .update({ status: 'en_cola' })
        .eq('status', 'pendiente');

      if (dispatchError) throw dispatchError;

      // 2. Update drivers to en_espera
      const { error: driversError } = await supabase
        .from('drivers')
        .update({ status: 'en_espera' })
        .in('status', ['inactivo']);

      if (driversError) throw driversError;

      // Commit transaction
      await supabase.rpc('commit_transaction');
    } catch (error) {
      // Rollback on error
      await supabase.rpc('rollback_transaction');
      throw error;
    }
  }

  static async endShift(): Promise<void> {
    // 1. Check for active queue
    const { data: queueRecords, error: queueError } = await supabase
      .from('dispatch_records')
      .select('id')
      .eq('status', 'en_cola');

    if (queueError) throw queueError;

    if (queueRecords && queueRecords.length > 0) {
      throw new Error('No se puede cerrar el turno mientras haya conductores en cola de espera.');
    }

    // 2. Update all drivers in delivery to inactive
    const { error: driversError } = await supabase
      .from('drivers')
      .update({ status: 'inactivo' })
      .eq('status', 'en_reparto');

    if (driversError) throw driversError;
  }

  static async getDispatchRecords(startDate: string, endDate: string): Promise<DispatchRecord[]> {
    const { data, error } = await supabase
      .from('dispatch_records')
      .select('*')
      .gte('start_time', startDate)
      .lte('start_time', endDate)
      .order('start_time', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async updateDispatchStatus(
    dispatchId: string,
    status: DispatchStatus,
    endTime?: string
  ): Promise<void> {
    const updates: any = { status };
    if (endTime) {
      updates.end_time = endTime;
    }

    const { error } = await supabase
      .from('dispatch_records')
      .update(updates)
      .eq('id', dispatchId);

    if (error) throw error;
  }
} 