'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DriverService } from '@/services/driver-service';
import type { Driver, DriverStatus } from '@/types';

interface CheckInData {
  driverId: string;
  name: string;
  pid: string;
  startTime: string;
  startLatitude?: number;
  startLongitude?: number;
  selfieUrl: string;
}

export function DriverCheckIn() {
  const [name, setName] = useState('');
  const [pid, setPid] = useState('');
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('No se pudo obtener tu ubicación. Por favor habilita el acceso a la ubicación.');
        }
      );
    } else {
      setError('Tu navegador no soporta geolocalización.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Por favor ingresa tu nombre');
      return;
    }

    if (!pid.trim()) {
      setError('Por favor ingresa tu ID');
      return;
    }

    if (!selfieDataUrl) {
      setError('Por favor toma una selfie');
      return;
    }

    if (!location) {
      setError('Esperando tu ubicación...');
      return;
    }

    setIsLoading(true);

    try {
      const checkInData: CheckInData = {
        driverId: uuidv4(),
        name: name.trim(),
        pid: pid.trim(),
        startTime: new Date().toISOString(),
        startLatitude: location.latitude,
        startLongitude: location.longitude,
        selfieUrl: selfieDataUrl
      };

      await DriverService.checkIn(checkInData);

      // Clear form
      setName('');
      setPid('');
      setSelfieDataUrl(null);
      setError(null);
    } catch (err) {
      console.error('Error during check-in:', err);
      setError(err instanceof Error ? err.message : 'Error durante el check-in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCaptureSelfie = () => {
    // TODO: Implement selfie capture
    setSelfieDataUrl('data:image/jpeg;base64,...');
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Check-In de Conductor</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Nombre
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Tu nombre completo"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="pid" className="block text-sm font-medium text-gray-700">
            ID Persistente
          </label>
          <input
            type="text"
            id="pid"
            value={pid}
            onChange={(e) => setPid(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Tu ID único"
            disabled={isLoading}
          />
        </div>

        <div>
          <button
            type="button"
            onClick={handleCaptureSelfie}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={isLoading}
          >
            Tomar Selfie
          </button>
          {selfieDataUrl && (
            <div className="mt-2">
              <img src={selfieDataUrl} alt="Selfie" className="w-32 h-32 object-cover rounded-lg" />
            </div>
          )}
        </div>

        {location && (
          <div className="text-sm text-gray-500">
            Ubicación: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </div>
        )}

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

        <button
          type="submit"
          className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          disabled={isLoading}
        >
          {isLoading ? 'Procesando...' : 'Check-In'}
        </button>
      </form>
    </div>
  );
} 