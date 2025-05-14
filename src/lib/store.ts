import type { WaitingDriver, DispatchRecord, Driver, FraudAlert } from '@/types';

// This is a very simple in-memory store, ideally backed by localStorage for some persistence or Zustand for better state management.
// For a real app, this would be Firebase.

interface AppState {
  masterDriverList: Driver[];
  waitingDrivers: WaitingDriver[];
  dispatchHistory: DispatchRecord[];
  fraudAlerts: FraudAlert[];
}

// Initial state with some mock data
const state: AppState = {
  masterDriverList: [
    { id: 'pid_master_1', name: 'Juan Perez' },
    { id: 'pid_master_2', name: 'Ana Gomez' },
  ],
  waitingDrivers: [],
  dispatchHistory: [],
  fraudAlerts: [],
};

// Ensure state is loaded from localStorage if available (simple persistence)
const loadState = () => {
  if (typeof window !== 'undefined') {
    const storedState = localStorage.getItem('jumboDispatchAppState');
    if (storedState) {
      try {
        const parsedState = JSON.parse(storedState);
        // Basic validation, can be more thorough
        if (parsedState.masterDriverList && parsedState.waitingDrivers && parsedState.dispatchHistory && parsedState.fraudAlerts) {
           Object.assign(state, parsedState);
        }
      } catch (e) {
        console.error("Failed to load state from localStorage", e);
      }
    }
  }
};

let saveState = () => { // Changed const to let
  if (typeof window !== 'undefined') {
    localStorage.setItem('jumboDispatchAppState', JSON.stringify(state));
  }
};

loadState(); // Load state when module is initialized

export const store = {
  // Master Driver List
  getMasterDriverList: (): Driver[] => [...state.masterDriverList],
  addMasterDriver: (driver: Driver): void => {
    if (!state.masterDriverList.find(d => d.id === driver.id || d.name === driver.name)) {
      state.masterDriverList.push(driver);
      saveState();
    }
  },
  updateMasterDriver: (updatedDriver: Driver): void => {
    const index = state.masterDriverList.findIndex(d => d.id === updatedDriver.id);
    if (index !== -1) {
      state.masterDriverList[index] = updatedDriver;
      saveState();
    }
  },
  removeMasterDriver: (driverId: string): void => {
    state.masterDriverList = state.masterDriverList.filter(d => d.id !== driverId);
    saveState();
  },

  // Waiting Drivers
  getWaitingDrivers: (): WaitingDriver[] => [...state.waitingDrivers],
  addWaitingDriver: (driver: WaitingDriver): { success: boolean; alert?: FraudAlert } => {
    // Fraud detection
    const existingByName = state.masterDriverList.find(d => d.name === driver.name);
    const existingById = state.masterDriverList.find(d => d.id === driver.id);

    let generatedAlert: FraudAlert | undefined = undefined;

    if (existingByName && existingByName.id !== driver.id) {
      generatedAlert = { id: Date.now().toString(), type: 'duplicateName', message: `Driver name '${driver.name}' exists with a different ID. Original ID: ${existingByName.id}. New ID: ${driver.id}.`, driverName: driver.name, persistentId: driver.id, timestamp: Date.now() };
      state.fraudAlerts.push(generatedAlert);
      // Allow check-in but flag it
    }
    if (existingById && existingById.name !== driver.name) {
      generatedAlert = { id: Date.now().toString(), type: 'nameMismatchOnId', message: `Persistent ID '${driver.id}' is registered to '${existingById.name}', but current check-in is for '${driver.name}'.`, driverName: driver.name, persistentId: driver.id, timestamp: Date.now() };
      state.fraudAlerts.push(generatedAlert);
      // Allow check-in but flag it
    }
    
    // Add to master list if new, or update name if ID matches and name changed (and flagged above)
    if (!existingById) {
        store.addMasterDriver({id: driver.id, name: driver.name });
    } else if (existingById.name !== driver.name) {
        // Name changed for existing ID, update master list (already flagged)
        store.updateMasterDriver({id: driver.id, name: driver.name });
    }


    if (state.waitingDrivers.find(d => d.id === driver.id)) {
      const existingAlert: FraudAlert = {id: Date.now().toString(), type: "duplicateId", message: "Driver already in waiting list.", driverName: driver.name, persistentId: driver.id, timestamp: Date.now()};
      // If a fraud alert was already generated, prefer that one.
      return { success: false, alert: generatedAlert || existingAlert }; 
    }
    state.waitingDrivers.push(driver);
    state.waitingDrivers.sort((a, b) => a.checkInTime - b.checkInTime); // Keep sorted by check-in time
    saveState();
    return { success: true, alert: generatedAlert };
  },
  removeWaitingDriver: (driverId: string): WaitingDriver | undefined => {
    const index = state.waitingDrivers.findIndex(d => d.id === driverId);
    if (index !== -1) {
      const [removedDriver] = state.waitingDrivers.splice(index, 1);
      saveState();
      return removedDriver;
    }
    return undefined;
  },

  // Dispatch History
  getDispatchHistory: (): DispatchRecord[] => [...state.dispatchHistory],
  addDispatchRecord: (record: DispatchRecord): void => {
    state.dispatchHistory.unshift(record); // Add to beginning for recent first
    saveState();
  },

  // Fraud Alerts
  getFraudAlerts: (): FraudAlert[] => [...state.fraudAlerts],
  clearFraudAlerts: (): void => {
    state.fraudAlerts = [];
    saveState();
  },
};

// Example of how to subscribe to changes (basic)
// In a real app, use Zustand, Redux, or React Context with useReducer for proper reactivity.
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

// Wrap saveState with notify
const originalSaveState = saveState;
saveState = () => {
  originalSaveState();
  notify();
};
