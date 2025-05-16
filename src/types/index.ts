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

export type DriverStatus = 
  | 'en_espera'     // En la cola esperando ser despachado
  | 'en_reparto'    // Despachado por coordinador, realizando entregas
  | 'inactivo'      // No está en servicio (incluye fin de turno)
  | null;           // Estado inicial

export type DispatchStatus = 
  | 'pendiente'     // Admin lo agregó pero coord no inicia la cola
  | 'en_cola'       // Conductor anotado en la lista activa
  | 'despachado'    // Viaje completado
  | 'cancelado'     // Cancelado por admin cuando no hay más pedidos
