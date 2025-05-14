'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface Driver {
  id: string;
  name: string;
  vehicle_id: string;
  status: string;
}

export default function DriverCheckIn() {
  const [searchTerm, setSearchTerm] = useState('');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Cargar la lista de conductores disponibles
  useEffect(() => {
    async function loadDrivers() {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error cargando conductores:', error);
      } else if (data) {
        setDrivers(data);
      }
    }
    
    loadDrivers();
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

  // Filtrar conductores basado en el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredDrivers([]);
      return;
    }
    
    const filtered = drivers.filter(driver => 
      driver.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredDrivers(filtered);
  }, [searchTerm, drivers]);

  // Manejar selección de conductor
  const handleSelectDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    setSearchTerm(driver.name);
    setShowDropdown(false);
  };

  // Registrar asistencia
  const handleCheckIn = async () => {
    if (!selectedDriver) {
      setMessage('Por favor seleccione un conductor');
      return;
    }

    if (!location) {
      setMessage('Esperando ubicación GPS...');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      // Crear registro en dispatch_records
      const dispatchRecord = {
        id: uuidv4(),
        driver_id: selectedDriver.id,
        start_time: new Date().toISOString(),
        startlatitude: location.latitude,
        startlongitude: location.longitude,
        status: 'en_curso'
      };

      const { error } = await supabase
        .from('dispatch_records')
        .insert([dispatchRecord]);

      if (error) throw error;

      // Actualizar status del conductor a 'ocupado'
      await supabase
        .from('drivers')
        .update({ status: 'ocupado' })
        .eq('id', selectedDriver.id);

      setMessage(`¡Asistencia registrada para ${selectedDriver.name}!`);
      setSelectedDriver(null);
      setSearchTerm('');
    } catch (error) {
      console.error('Error registrando asistencia:', error);
      setMessage('Error al registrar asistencia');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Registro de Asistencia</h2>
      
      <div className="relative">
        <input
          type="text"
          className="w-full p-2 border rounded mb-2"
          placeholder="Buscar conductor..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
        />
        
        {showDropdown && filteredDrivers.length > 0 && (
          <ul className="absolute z-10 w-full bg-white border rounded shadow-lg">
            {filteredDrivers.map((driver) => (
              <li 
                key={driver.id}
                className={`p-2 cursor-pointer hover:bg-gray-100 ${driver.status !== 'disponible' ? 'text-gray-400' : ''}`}
                onClick={() => handleSelectDriver(driver)}
              >
                <div className="flex justify-between">
                  <span>{driver.name}</span>
                  <span className={`text-sm ${
                    driver.status === 'disponible' ? 'text-green-500' : 
                    driver.status === 'ocupado' ? 'text-red-500' : 
                    driver.status === 'descanso' ? 'text-yellow-500' : 'text-gray-500'
                  }`}>
                    {driver.status}
                  </span>
                </div>
                {driver.vehicle_id && <div className="text-xs text-gray-500">Vehículo: {driver.vehicle_id}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {selectedDriver && (
        <div className="mt-4 p-3 border rounded bg-gray-50">
          <h3 className="font-bold">{selectedDriver.name}</h3>
          <p className="text-sm">Vehículo: {selectedDriver.vehicle_id}</p>
          <p className="text-sm">Estado: {selectedDriver.status}</p>
        </div>
      )}
      
      {location && (
        <div className="mt-2 text-xs text-gray-500">
          GPS: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
        </div>
      )}
      
      <button
        onClick={handleCheckIn}
        disabled={!selectedDriver || isLoading || selectedDriver?.status !== 'disponible'}
        className={`mt-4 w-full py-2 rounded ${
          !selectedDriver || isLoading || selectedDriver?.status !== 'disponible'
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isLoading ? 'Registrando...' : 'Registrar Asistencia'}
      </button>
      
      {message && (
        <div className={`mt-4 p-2 rounded ${
          message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}
      
      <div className="mt-4">
        <p className="text-sm text-gray-500">
          Nota: Solo se pueden registrar conductores con estado "disponible".
        </p>
      </div>
    </div>
  );
} 