"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { User, Clock, Check, Car, Bike, Eye } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  onCheckout: (recordId: string) => void;
  onStartAll: () => void;
  vehicleFilter: 'todos' | 'auto' | 'moto';
  onVehicleFilterChange: (filter: 'todos' | 'auto' | 'moto') => void;
}

export function DriverQueue({ 
  drivers, 
  onCheckout, 
  onStartAll,
  vehicleFilter,
  onVehicleFilterChange 
}: DriverQueueProps) {
  const [selectedSelfie, setSelectedSelfie] = useState<string | null>(null);

  // Formatear fecha/hora para mostrar
  const formatDateTime = (dateTimeStr: string) => {
    try {
      return format(new Date(dateTimeStr), 'dd/MM/yyyy HH:mm');
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  // Función para obtener el ícono según el tipo de vehículo
  const getVehicleIcon = (type?: string) => {
    if (!type) return null;
    const lowerType = type.toLowerCase();
    if (lowerType === 'auto') return <Car className="h-4 w-4 text-blue-600" />;
    if (lowerType === 'moto') return <Bike className="h-4 w-4 text-green-600" />;
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full sm:w-auto space-y-2 sm:space-y-0 sm:space-x-4">
          <h2 className="text-xl sm:text-2xl font-semibold flex flex-wrap items-center gap-2">
            Cola de Conductores
            <span className="text-sm sm:text-lg bg-blue-100 text-blue-800 px-2 sm:px-3 py-1 rounded-full">
              {drivers.length} {drivers.length === 1 ? 'conductor' : 'conductores'}
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <Select
              value={vehicleFilter}
              onValueChange={(value) => onVehicleFilterChange(value as 'todos' | 'auto' | 'moto')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de vehículo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los vehículos</SelectItem>
                <SelectItem value="auto">Solo autos</SelectItem>
                <SelectItem value="moto">Solo motos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button 
          onClick={onStartAll} 
          variant="secondary"
          className="w-full sm:w-auto whitespace-nowrap"
        >
          Iniciar todos los pendientes
        </Button>
      </div>

      {drivers.length === 0 ? (
        <Card className="text-center">
          <CardContent className="py-8 px-4">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay conductores en la cola.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {drivers.map((driver, index) => (
            <Card key={driver.id} className="hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm sm:text-base flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-grow min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold truncate">{driver.name}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        {driver.vehicle_type && (
                          <span className="flex items-center text-xs sm:text-sm bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            {getVehicleIcon(driver.vehicle_type)}
                            <span className="ml-1">{driver.vehicle_type}</span>
                          </span>
                        )}
                        <span className="flex items-center text-xs sm:text-sm text-gray-500">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDateTime(driver.start_time)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end mt-3 sm:mt-0">
                    {driver.selfie_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSelfie(driver.selfie_url!)}
                        className="flex-1 sm:flex-none"
                      >
                        <Eye className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Ver Foto</span>
                      </Button>
                    )}
                    <Button 
                      onClick={() => onCheckout(driver.id)}
                      variant="default"
                      className="flex-1 sm:flex-none"
                    >
                      <Check className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Marcar Salida</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedSelfie} onOpenChange={() => setSelectedSelfie(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Foto del Conductor</DialogTitle>
          </DialogHeader>
          {selectedSelfie && (
            <div className="relative w-full h-[300px] sm:h-[500px]">
              <img
                src={selectedSelfie}
                alt="Foto del conductor"
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
