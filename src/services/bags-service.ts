import { supabase } from '@/lib/supabase';

interface DriverWithBags {
  id: string;
  name: string;
  bags_balance: number;
}

export class BagsService {
  static async getDriversWithBags(): Promise<DriverWithBags[]> {
    const { data, error } = await supabase
      .from('drivers')
      .select('id, name, bags_balance')
      .gt('bags_balance', 0)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  static async updateBagsBalance(driverId: string, bagsBalance: number): Promise<void> {
    const { error } = await supabase
      .from('drivers')
      .update({ bags_balance: bagsBalance })
      .eq('id', driverId);

    if (error) throw error;
  }

  static async addBags(driverId: string, bagsToAdd: number): Promise<void> {
    // Get current balance
    const { data, error: getError } = await supabase
      .from('drivers')
      .select('bags_balance')
      .eq('id', driverId)
      .single();

    if (getError) throw getError;

    const currentBalance = data?.bags_balance || 0;
    const newBalance = currentBalance + bagsToAdd;

    // Update balance
    const { error: updateError } = await supabase
      .from('drivers')
      .update({ bags_balance: newBalance })
      .eq('id', driverId);

    if (updateError) throw updateError;
  }

  static async returnBags(driverId: string, bagsToReturn: number): Promise<void> {
    // Get current balance
    const { data, error: getError } = await supabase
      .from('drivers')
      .select('bags_balance')
      .eq('id', driverId)
      .single();

    if (getError) throw getError;

    const currentBalance = data?.bags_balance || 0;
    if (bagsToReturn > currentBalance) {
      throw new Error('No se pueden devolver más bolsos de los que tiene el conductor');
    }

    const newBalance = currentBalance - bagsToReturn;

    // Update balance
    const { error: updateError } = await supabase
      .from('drivers')
      .update({ bags_balance: newBalance })
      .eq('id', driverId);

    if (updateError) throw updateError;
  }
} 