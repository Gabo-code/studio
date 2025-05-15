"use client";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { User, Clock, Check, Truck, Eye } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [selectedSelfie, setSelectedSelfie] = useState<string | null>(null);

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
    <>
      <div className="space-y-4">
        {drivers.map((driver, index) => (
          <Card key={driver.id} className="shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                {index + 1}
              </div>
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
              <div className="flex gap-2">
                {driver.selfie_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSelfie(driver.selfie_url!)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Foto
                  </Button>
                )}
                <Button 
                  onClick={() => onCheckoutDriver(driver.id)} 
                  variant="default"
                >
                  <Check className="mr-2 h-4 w-4" /> Marcar Salida
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedSelfie} onOpenChange={() => setSelectedSelfie(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Foto del Conductor</DialogTitle>
          </DialogHeader>
          {selectedSelfie && (
            <div className="relative w-full h-[500px]">
              <img
                src={selectedSelfie}
                alt="Foto del conductor"
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
