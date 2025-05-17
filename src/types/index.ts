export interface Driver {
  id: string; // Persistent ID
  name: string;
  vehicle_type?: string; // Type of vehicle (auto, moto, etc.)
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
  | 'inactivo'      // No está en servicio
  | null;           // Estado inicial o no definido

export type DispatchStatus =
  | 'pendiente'     // Acaba de hacer check-in, esperando entrar a la cola
  | 'en_fila'       // En la cola de espera
  | 'en_curso'      // Despachado y en ruta
  | 'salida_OK'     // Completó el despacho exitosamente
  | 'cancelado'     // Canceló o abandonó el despacho
  | null;           // Estado inicial o no definido

export interface DriverWithStatus extends Driver {
  status: DriverStatus;
  vehicle_type?: string;
  pid?: string;
}
