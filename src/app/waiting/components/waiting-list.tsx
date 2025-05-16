"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Car, Bike } from 'lucide-react';

// Interface para los conductores en espera
interface WaitingDriver {
  id: string;
  name: string;
  start_time: string;
  pid: string | null;
  vehicle_type: string | null;
}

interface WaitingListProps {
  drivers: WaitingDriver[];
}

export function WaitingList({ drivers }: WaitingListProps) {
  // Función para obtener el ícono según el tipo de vehículo
  const getVehicleIcon = (type?: string) => {
    if (!type) return null;
    const lowerType = type.toLowerCase();
    if (lowerType === 'auto') return <Car className="h-4 w-4 text-blue-600" />;
    if (lowerType === 'moto') return <Bike className="h-4 w-4 text-green-600" />;
    return null;
  };

  return (
    <div className="space-y-2">
      {drivers.map((driver, index) => (
        <Card key={driver.id} className="shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold mr-4">
                {index + 1}
              </div>
              <div className="text-lg font-medium">{driver.name}</div>
            </div>
            {driver.vehicle_type && (
              <div className="flex items-center gap-2">
                {getVehicleIcon(driver.vehicle_type)}
                <Badge variant="outline" className="capitalize">
                  {driver.vehicle_type}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 