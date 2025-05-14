"use client";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { User, Clock, Check, Truck } from 'lucide-react';

// Nueva interfaz para los conductores activos
interface DriverRecord {
  id: string;
  driver_id: string;
  name: string;
  start_time: string;
  status: string;
  selfie_url?: string;
  pid?: string;
  vehicle_type?: string;
}

interface DriverQueueProps {
  drivers: DriverRecord[];
  onCheckoutDriver: (recordId: string) => void;
}

export function DriverQueue({ drivers, onCheckoutDriver }: DriverQueueProps) {
  // Formatear fecha/hora para mostrar
  const formatDateTime = (dateTimeStr: string) => {
    try {
      return format(new Date(dateTimeStr), 'dd/MM/yyyy HH:mm');
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  if (drivers.length === 0) {
    return (
      <Card className="text-center shadow-sm">
        <CardContent className="p-10">
          <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">No hay conductores en la cola.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {drivers.map((driver, index) => (
        <Card key={driver.id} className="shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
              {index + 1}
            </div>
            <Avatar className="h-16 w-16">
              {driver.selfie_url ? (
                <AvatarImage src={driver.selfie_url} alt={`Selfie de ${driver.name}`} />
              ) : (
                <AvatarFallback>{driver.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              )}
            </Avatar>
            <div className="flex-grow">
              <CardTitle className="text-xl">{driver.name}</CardTitle>
              {driver.vehicle_type && (
                <div className="text-sm mt-1 flex items-center">
                  <Truck className="h-3 w-3 mr-1 text-blue-500" />
                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                    {driver.vehicle_type}
                  </span>
                </div>
              )}
              <div className="flex flex-col mt-2 text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" /> 
                  <span>Ingreso: {formatDateTime(driver.start_time)}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <span>Salida: --:--</span>
                </div>
              </div>
            </div>
            <Button 
              onClick={() => onCheckoutDriver(driver.id)} 
              variant="default"
              className="ml-auto"
            >
              <Check className="mr-2 h-4 w-4" /> Marcar Salida
            </Button>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
