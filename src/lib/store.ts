import type { Driver, DriverWithStatus } from '@/types';
import { DriverService } from '@/services/driver-service';

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

// Subscribers
const subscribers = new Set<() => void>();

// Notify subscribers of state changes
const notify = () => {
  subscribers.forEach(subscriber => subscriber());
};

// Load master driver list from Supabase on initialization
const loadMasterDriverList = async () => {
  try {
    const drivers = await DriverService.getAllDrivers();
    state.masterDriverList = drivers.map(driver => ({
      id: driver.id,
      name: driver.name,
      vehicle_type: driver.vehicle_type
    }));
  } catch (e) {
    console.error("Failed to load master driver list", e);
  }
};

// Initialize store
loadMasterDriverList();

// Simplified store with only the necessary functions
export const store = {
  // Master Driver List functions
  getMasterDriverList: (): Driver[] => [...state.masterDriverList],
  
  addMasterDriver: async (driver: Driver): Promise<void> => {
    if (!state.masterDriverList.find(d => d.id === driver.id || d.name === driver.name)) {
      try {
        const driverWithStatus: DriverWithStatus = {
          ...driver,
          status: 'inactivo'
        };
        
        await DriverService.addDriver(driverWithStatus);
        state.masterDriverList.push(driver);
        notify();
      } catch (e) {
        console.error("Failed to add master driver", e);
      }
    }
  },
  
  updateMasterDriver: async (updatedDriver: Driver): Promise<void> => {
    const index = state.masterDriverList.findIndex(d => d.id === updatedDriver.id);
    if (index !== -1) {
      try {
        const driverWithStatus: DriverWithStatus = {
          ...updatedDriver,
          status: 'inactivo'
        };
        
        await DriverService.updateDriver(driverWithStatus);
        state.masterDriverList[index] = updatedDriver;
        notify();
      } catch (e) {
        console.error("Failed to update master driver", e);
      }
    }
  },
  
  removeMasterDriver: async (driverId: string): Promise<void> => {
    try {
      await DriverService.deleteDriver(driverId);
      
      state.masterDriverList = state.masterDriverList.filter(d => d.id !== driverId);
      notify();
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

// Subscribe to store changes
export const subscribe = (callback: () => void) => {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
};