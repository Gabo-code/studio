export interface Driver {
  id: string; // Persistent ID
  name: string;
  // Potentially add other master details like contact, vehicle, etc.
}

export interface WaitingDriver extends Driver {
  checkInTime: number; // Timestamp
  selfieDataUrl?: string; // Base64 encoded image
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface DispatchRecord extends WaitingDriver {
  checkoutTime: number; // Timestamp
  bags: number;
  commune: string;
  coordinatorId: string; // ID of the coordinator who checked them out
}

export type FraudAlert = {
  id: string;
  type: 'duplicateName' | 'duplicateId' | 'nameMismatchOnId';
  message: string;
  driverName: string;
  persistentId: string;
  timestamp: number;
};
