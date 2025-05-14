'use client';

import { useState } from 'react';
import DriverCheckIn from '@/components/DriverCheckIn';
import DriverCheckOut from '@/components/DriverCheckOut';

export default function DispatchPage() {
  const [activeTab, setActiveTab] = useState<'check-in' | 'check-out'>('check-in');

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">Gestión de Viajes</h1>
      
      <div className="flex mb-6 border-b">
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'check-in'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('check-in')}
        >
          Iniciar Viaje
        </button>
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'check-out'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('check-out')}
        >
          Finalizar Viaje
        </button>
      </div>
      
      <div className="mt-6">
        {activeTab === 'check-in' ? <DriverCheckIn /> : <DriverCheckOut />}
      </div>
    </div>
  )
} 