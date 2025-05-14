'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface DispatchRecord {
  id: string;
  driver_id: string;
  start_time: string;
  end_time: string | null;
  startlatitude: number;
  startlongitude: number;
  endlatitude: number | null;
  endlongitude: number | null;
  status: string;
}

interface Driver {
  id: string;
  name: string;
  vehicle_id: string;
  status: string;
}

export default function DriverCheckOut() {
  const [activeRecords, setActiveRecords] = useState<(DispatchRecord & { driver: Driver })[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<(DispatchRecord & { driver: Driver }) | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Cargar registros activos
  useEffect(() => {
    async function loadActiveRecords() {
      const { data, error } = await supabase
        .from('dispatch_records')
        .select(`
          *,
          driver:driver_id(*)
        `)
        .eq('status', 'en_curso');
      
      if (error) {
        console.error('Error cargando registros activos:', error);
      } else if (data) {
        setActiveRecords(data);
      }
    }
    
    loadActiveRecords();
    
    // Refrescar cada 30 segundos
    const interval = setInterval(loadActiveRecords, 30000);
    return () => clearInterval(interval);
  }, []);

  // Obtener la ubicación actual
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error obteniendo ubicación:', error);
        }
      );
    }
  }, []);

  // Completar un viaje
  const handleCheckOut = async () => {
    if (!selectedRecord) {
      setMessage('Por favor seleccione un registro activo');
      return;
    }

    if (!location) {
      setMessage('Esperando ubicación GPS...');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      // Actualizar el registro en dispatch_records
      const updates = {
        end_time: new Date().toISOString(),
        endlatitude: location.latitude,
        endlongitude: location.longitude,
        status: 'completado'
      };

      const { error } = await supabase
        .from('dispatch_records')
        .update(updates)
        .eq('id', selectedRecord.id);

      if (error) throw error;

      // Actualizar status del conductor a 'disponible'
      await supabase
        .from('drivers')
        .update({ status: 'disponible' })
        .eq('id', selectedRecord.driver_id);

      setMessage(`¡Viaje finalizado para ${selectedRecord.driver.name}!`);
      
      // Actualizar la lista de registros activos
      setActiveRecords(prevRecords => 
        prevRecords.filter(record => record.id !== selectedRecord.id)
      );
      
      setSelectedRecord(null);
    } catch (error) {
      console.error('Error completando viaje:', error);
      setMessage('Error al finalizar el viaje');
    } finally {
      setIsLoading(false);
    }
  };

  // Calcular la duración del viaje
  const calculateDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins} min`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours} h ${mins} min`;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Finalización de Viajes</h2>
      
      {activeRecords.length === 0 ? (
        <div className="p-4 text-center bg-gray-100 rounded">
          No hay viajes activos en este momento
        </div>
      ) : (
        <div className="mb-4">
          <h3 className="mb-2 font-semibold">Viajes en curso:</h3>
          <div className="space-y-2">
            {activeRecords.map(record => (
              <div 
                key={record.id}
                className={`p-3 border rounded cursor-pointer transition-colors ${
                  selectedRecord?.id === record.id ? 'bg-blue-50 border-blue-300' : 'bg-white hover:bg-gray-50'
                }`}
                onClick={() => setSelectedRecord(record)}
              >
                <div className="flex justify-between">
                  <span className="font-medium">{record.driver.name}</span>
                  <span className="text-sm bg-yellow-100 text-yellow-800 px-2 rounded-full">
                    {calculateDuration(record.start_time)}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Vehículo: {record.driver.vehicle_id}
                </div>
                <div className="text-xs text-gray-500">
                  Inicio: {new Date(record.start_time).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {selectedRecord && (
        <div className="mt-4 p-3 border rounded bg-gray-50">
          <h3 className="font-bold">{selectedRecord.driver.name}</h3>
          <p className="text-sm">Vehículo: {selectedRecord.driver.vehicle_id}</p>
          <p className="text-sm">
            Inicio: {new Date(selectedRecord.start_time).toLocaleString()}
          </p>
          <p className="text-sm">
            Duración: {calculateDuration(selectedRecord.start_time)}
          </p>
          <div className="text-xs mt-1 text-gray-600">
            Origen: {selectedRecord.startlatitude.toFixed(6)}, {selectedRecord.startlongitude.toFixed(6)}
          </div>
        </div>
      )}
      
      {location && (
        <div className="mt-2 text-xs text-gray-500">
          GPS actual: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
        </div>
      )}
      
      <button
        onClick={handleCheckOut}
        disabled={!selectedRecord || isLoading}
        className={`mt-4 w-full py-2 rounded ${
          !selectedRecord || isLoading
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700 text-white'
        }`}
      >
        {isLoading ? 'Finalizando...' : 'Finalizar Viaje'}
      </button>
      
      {message && (
        <div className={`mt-4 p-2 rounded ${
          message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
} 