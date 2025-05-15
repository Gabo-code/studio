import type { Driver } from '@/types';
import { supabase } from './supabase';

// Simplified store that no longer uses localStorage for the app state
// Only the master driver list is maintained for reference
interface AppState {
  masterDriverList: Driver[];
}

// Initial state
const state: AppState = {
  masterDriverList: [],
};

// Export constants for localStorage keys that should remain
export const LOCAL_STORAGE_KEYS = {
  PID: 'jumboDispatchPID',
  ADMIN_AUTH: 'jumboDispatchAdminAuth',
  COORDINATOR_AUTH: 'jumboDispatchCoordinatorAuth'
};

// Load master driver list from Supabase on initialization
const loadMasterDriverList = async () => {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('id, name');
    
    if (!error && data) {
      state.masterDriverList = data;
    }
  } catch (e) {
    console.error("Failed to load master driver list from Supabase", e);
  }
};

// Initialize the data
loadMasterDriverList();

// Simplified store with only the necessary functions
export const store = {
  // Master Driver List functions
  getMasterDriverList: (): Driver[] => [...state.masterDriverList],
  
  addMasterDriver: async (driver: Driver): Promise<void> => {
    if (!state.masterDriverList.find(d => d.id === driver.id || d.name === driver.name)) {
      try {
        const { error } = await supabase
          .from('drivers')
          .upsert([driver]);
        
        if (!error) {
          state.masterDriverList.push(driver);
          notify();
        }
      } catch (e) {
        console.error("Failed to add master driver", e);
      }
    }
  },
  
  updateMasterDriver: async (updatedDriver: Driver): Promise<void> => {
    const index = state.masterDriverList.findIndex(d => d.id === updatedDriver.id);
    if (index !== -1) {
      try {
        const { error } = await supabase
          .from('drivers')
          .update(updatedDriver)
          .eq('id', updatedDriver.id);
        
        if (!error) {
          state.masterDriverList[index] = updatedDriver;
          notify();
        }
      } catch (e) {
        console.error("Failed to update master driver", e);
      }
    }
  },
  
  removeMasterDriver: async (driverId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', driverId);
      
      if (!error) {
        state.masterDriverList = state.masterDriverList.filter(d => d.id !== driverId);
        notify();
      }
    } catch (e) {
      console.error("Failed to remove master driver", e);
    }
  },

  // Waiting Drivers functions (now just return empty arrays or dummy functions)
  getWaitingDrivers: (): [] => [],
  addWaitingDriver: (driver: any) => ({ success: true }),
  removeWaitingDriver: () => undefined,

  // Dispatch History functions (now just return empty arrays)
  getDispatchHistory: (): [] => [],
  addDispatchRecord: () => {},

  // Fraud Alerts functions (now just return empty arrays or dummy functions)
  getFraudAlerts: (): [] => [],
  clearFraudAlerts: (): void => {},
};

// Setup for reactivity
let listeners: (() => void)[] = [];
export const subscribe = (listener: () => void) => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
};

const notify = () => {
  listeners.forEach(listener => listener());
};