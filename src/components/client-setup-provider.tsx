'use client';

import { useEffect, ReactNode } from 'react';
import { initializeStorage } from '@/lib/storage';

interface ClientSetupProviderProps {
  children: ReactNode;
}

export function ClientSetupProvider({ children }: ClientSetupProviderProps) {
  useEffect(() => {
    // Inicializar servicios del lado del cliente
    const initializeServices = async () => {
      try {
        // Verificar acceso al bucket de Supabase Storage
        await initializeStorage();
      } catch (error) {
        console.error('Error inicializando servicios:', error);
      }
    };

    initializeServices();
  }, []);

  // Este componente no renderiza nada adicional, solo ejecuta código al montarse
  return <>{children}</>;
} 