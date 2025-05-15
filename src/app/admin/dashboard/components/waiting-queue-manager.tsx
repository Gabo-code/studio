"use client";

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CalendarClock, AlertTriangle, Check, Upload, Info, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

type DriverStatus = 'pendiente' | 'completado' | 'error';

interface ProcessedDriver {
  id: string;
  name: string;
  status: DriverStatus;
  message: string;
  driverExists: boolean;
  driverId?: string;
}

export function WaitingQueueManager() {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedDrivers, setProcessedDrivers] = useState<ProcessedDriver[]>([]);
  const [hasImported, setHasImported] = useState(false);
  const [queueDate, setQueueDate] = useState<Date>(new Date());
  const { toast } = useToast();

  // Timezone de Santiago de Chile (UTC-4 durante horario de verano, UTC-3 durante horario estándar)
  const getSantiagoTime = () => {
    const now = new Date();
    // Configurar para la zona horaria de Santiago de Chile (America/Santiago)
    return new Date(now.toLocaleString('en-US', { timeZone: 'America/Santiago' }));
  };

  // Procesar el texto pegado y extraer nombres de conductores
  const processDriverList = useCallback(async () => {
    if (!inputText.trim()) {
      toast({
        title: "Error",
        description: "Por favor, ingresa una lista de conductores.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    const driverNames = inputText
      .split('\n')
      .map(line => line.trim())
      .filter(name => name.length > 0);

    if (driverNames.length === 0) {
      toast({
        title: "Error",
        description: "No se detectaron nombres de conductores válidos.",
        variant: "destructive"
      });
      setIsProcessing(false);
      return;
    }

    // Verificar en la base de datos cuáles conductores existen
    const processedList: ProcessedDriver[] = [];
    
    for (const name of driverNames) {
      try {
        // Verificar si el conductor existe en la base de datos
        const { data, error } = await supabase
          .from('drivers')
          .select('id, name')
          .eq('name', name)
          .maybeSingle();

        if (error) {
          processedList.push({
            id: uuidv4(),
            name,
            status: 'error',
            message: `Error al verificar conductor: ${error.message}`,
            driverExists: false
          });
        } else if (data) {
          processedList.push({
            id: uuidv4(),
            name,
            status: 'pendiente',
            message: 'Conductor verificado',
            driverExists: true,
            driverId: data.id
          });
        } else {
          processedList.push({
            id: uuidv4(),
            name,
            status: 'pendiente',
            message: 'Conductor no encontrado en la base de datos',
            driverExists: false
          });
        }
      } catch (err) {
        console.error(`Error procesando conductor ${name}:`, err);
        processedList.push({
          id: uuidv4(),
          name,
          status: 'error',
          message: 'Error interno al procesar',
          driverExists: false
        });
      }
    }

    setProcessedDrivers(processedList);
    setIsProcessing(false);
  }, [inputText, toast]);

  // Crear la cola de espera y registros de despacho para los conductores
  const createWaitingQueue = useCallback(async () => {
    if (processedDrivers.length === 0) {
      toast({
        title: "Error",
        description: "No hay conductores para crear la cola de espera.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    // Configurar la hora para las 8:00 AM en Santiago de Chile para la fecha actual
    const santiagoDate = getSantiagoTime();
    const queueDateTime = new Date(santiagoDate);
    queueDateTime.setHours(8, 0, 0, 0); // 8:00 AM en horario de Chile
    
    // Crear una nueva lista para actualizar el estado durante el procesamiento
    const updatedDrivers = [...processedDrivers];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < updatedDrivers.length; i++) {
      const driver = updatedDrivers[i];
      
      try {
        // Primero verificamos si el conductor ya tiene un registro de despacho pendiente para hoy
        const { data: existingRecord, error: checkError } = await supabase
          .from('dispatch_records')
          .select('id, name')
          .eq('name', driver.name)
          .eq('status', 'pendiente')
          .is('end_time', null)
          .maybeSingle();

        if (checkError) {
          throw new Error(`Error verificando registros existentes: ${checkError.message}`);
        }

        if (existingRecord) {
          updatedDrivers[i] = {
            ...driver,
            status: 'error',
            message: 'El conductor ya tiene un registro pendiente'
          };
          errorCount++;
          continue;
        }

        // Para conductores que no existen, primero debemos crearlos
        let driverId = driver.driverId;
        
        if (!driver.driverExists) {
          // Crear nuevo conductor si no existe
          const newDriverId = uuidv4();
          const { error: driverError } = await supabase
            .from('drivers')
            .insert({
              id: newDriverId,
              name: driver.name,
              status: 'disponible',
              vehicle_type: null, // Se completará después manualmente
              pid: null // No tiene pid todavía
            });
            
          if (driverError) {
            throw new Error(`Error creando nuevo conductor: ${driverError.message}`);
          }
          
          driverId = newDriverId;
        }

        // Calculamos un tiempo separado para cada conductor
        // Añadimos i segundos a las 8:00 AM para mantener el orden exacto de la lista
        const driverTime = new Date(queueDateTime);
        driverTime.setSeconds(driverTime.getSeconds() + i);

        // Ahora crear el registro de despacho
        const dispatchId = uuidv4();
        const { error: dispatchError } = await supabase
          .from('dispatch_records')
          .insert({
            id: dispatchId,
            driver_id: driverId,
            name: driver.name,
            status: 'pendiente',
            // Usamos el timestamp con segundos progresivos para mantener el orden
            start_time: driverTime.toISOString(), // Timestamp con el orden preservado
            end_time: null,
            startlatitude: null,
            startlongitude: null,
            selfie_url: null,
            pid: null
          });

        if (dispatchError) {
          throw new Error(`Error creando registro de despacho: ${dispatchError.message}`);
        }

        // Actualizar el estado del conductor en la lista local
        updatedDrivers[i] = {
          ...driver,
          status: 'completado',
          message: 'Añadido a la cola de espera correctamente'
        };
        successCount++;
      } catch (err) {
        console.error(`Error procesando conductor ${driver.name}:`, err);
        updatedDrivers[i] = {
          ...driver,
          status: 'error',
          message: err instanceof Error ? err.message : 'Error desconocido'
        };
        errorCount++;
      }
    }

    // Actualizar la lista de conductores con su estado final
    setProcessedDrivers(updatedDrivers);
    setHasImported(true);
    setIsProcessing(false);

    // Mostrar notificación con el resultado
    if (successCount > 0) {
      toast({
        title: "Cola de espera creada",
        description: `${successCount} conductores añadidos a la cola de espera para las 8:00 AM.${errorCount > 0 ? ` ${errorCount} errores.` : ''}`,
        variant: successCount > 0 && errorCount === 0 ? "default" : "destructive"
      });
    } else {
      toast({
        title: "Error",
        description: "No se pudo crear la cola de espera. Revisa los errores.",
        variant: "destructive"
      });
    }
  }, [processedDrivers, toast]);

  const resetForm = () => {
    setInputText('');
    setProcessedDrivers([]);
    setHasImported(false);
    setQueueDate(new Date());
  };

  // Formatear la fecha para mostrar en Santiago de Chile
  const formattedDate = format(queueDate, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center">
              <CalendarClock className="mr-2 h-5 w-5 text-primary" /> 
              Gestión de Cola de Espera Diaria
            </CardTitle>
            <CardDescription>
              Configura la lista de conductores programados para las 8:00 AM en Santiago de Chile.
              <div className="mt-1 font-medium text-foreground">
                {capitalizedDate}
              </div>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasImported ? (
          <div className="space-y-4">
            <Alert className="bg-blue-50 text-blue-800 border-blue-200">
              <Info className="h-4 w-4" />
              <AlertTitle>Instrucciones</AlertTitle>
              <AlertDescription>
                Pega aquí una lista de conductores desde Excel. Cada conductor debe estar en una línea separada.
                El orden en que aparecen será el mismo orden en la cola de espera.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label htmlFor="driverList">Lista de conductores:</Label>
              <Textarea 
                id="driverList" 
                placeholder="Pega aquí la lista de conductores (un nombre por línea)" 
                className="min-h-[200px] font-mono"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isProcessing}
              />
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline"
                onClick={resetForm}
                disabled={isProcessing || !inputText}
              >
                <XCircle className="mr-2 h-4 w-4" /> Limpiar
              </Button>
              <Button
                onClick={processDriverList}
                disabled={isProcessing || !inputText.trim()}
              >
                {isProcessing ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Procesar Lista
              </Button>
            </div>
            
            {processedDrivers.length > 0 && (
              <div className="mt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Conductores procesados</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-800">{processedDrivers.length} conductores</Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-800">
                      {processedDrivers.filter(d => d.driverExists).length} existentes
                    </Badge>
                    <Badge variant="outline" className="bg-amber-50 text-amber-800">
                      {processedDrivers.filter(d => !d.driverExists).length} nuevos
                    </Badge>
                  </div>
                </div>
                
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Nombre del Conductor</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Mensaje</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processedDrivers.map((driver, index) => (
                        <TableRow key={driver.id}>
                          <TableCell className="font-mono">{index + 1}</TableCell>
                          <TableCell className="font-medium">{driver.name}</TableCell>
                          <TableCell>
                            {driver.driverExists ? (
                              <Badge variant="outline" className="bg-green-50 text-green-800">Existente</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-50 text-amber-800">Nuevo</Badge>
                            )}
                          </TableCell>
                          <TableCell>{driver.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                <div className="flex justify-end mt-4">
                  <Button 
                    onClick={createWaitingQueue} 
                    className="bg-primary"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    Crear Cola de Espera
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <Alert className="bg-green-50 text-green-800 border-green-200">
              <Check className="h-4 w-4" />
              <AlertTitle>Cola de Espera Creada</AlertTitle>
              <AlertDescription>
                Se ha creado la cola de espera para las 8:00 AM en Santiago de Chile.
                <div className="mt-2">
                  <strong>Fecha:</strong> {capitalizedDate}
                  <br />
                  <strong>Total de conductores:</strong> {processedDrivers.length}
                  <br />
                  <strong>Añadidos correctamente:</strong> {processedDrivers.filter(d => d.status === 'completado').length}
                  <br />
                  <strong>Con errores:</strong> {processedDrivers.filter(d => d.status === 'error').length}
                </div>
              </AlertDescription>
            </Alert>
            
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Nombre del Conductor</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Mensaje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedDrivers.map((driver, index) => (
                    <TableRow key={driver.id} className={driver.status === 'error' ? 'bg-red-50' : ''}>
                      <TableCell className="font-mono">{index + 1}</TableCell>
                      <TableCell className="font-medium">{driver.name}</TableCell>
                      <TableCell>
                        {driver.status === 'completado' ? (
                          <Badge variant="outline" className="bg-green-50 text-green-800">Añadido</Badge>
                        ) : driver.status === 'error' ? (
                          <Badge variant="outline" className="bg-red-50 text-red-800">Error</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-800">Pendiente</Badge>
                        )}
                      </TableCell>
                      <TableCell>{driver.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button 
                onClick={resetForm} 
                variant="outline"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Crear Nueva Cola
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 