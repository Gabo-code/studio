"use client";

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Check, Upload, XCircle, RefreshCw, User, CarFront } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

type DriverStatus = 'pendiente' | 'creado' | 'error' | 'actualizado';

interface ProcessedDriver {
  id: string;
  name: string;
  vehicleType: string;
  status: DriverStatus;
  message: string;
  exists: boolean;
}

export function DriverImporter() {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedDrivers, setProcessedDrivers] = useState<ProcessedDriver[]>([]);
  const [hasImported, setHasImported] = useState(false);
  const { toast } = useToast();

  // Procesar el texto pegado y extraer nombres y tipos de vehículo
  const processDriverList = useCallback(async () => {
    if (!inputText.trim()) {
      toast({
        title: "Error",
        description: "Por favor, ingresa datos de conductores.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProcessedDrivers([]);
    
    // Dividir por líneas y procesar cada una
    const lines = inputText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) {
      toast({
        title: "Error",
        description: "No se detectaron datos válidos.",
        variant: "destructive"
      });
      setIsProcessing(false);
      return;
    }

    const processedList: ProcessedDriver[] = [];
    
    for (const line of lines) {
      // Dividir por tabulación (o múltiples espacios si vienen de Excel)
      const parts = line.split(/\t+|\s{2,}/);
      
      // Si hay al menos dos columnas, tomamos la primera como nombre y la segunda como tipo de vehículo
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const vehicleType = parts[1].trim();
        
        if (name && vehicleType) {
          try {
            // Verificar si el conductor ya existe
            const { data, error } = await supabase
              .from('drivers')
              .select('id, name, vehicle_type, pid, status')
              .eq('name', name)
              .maybeSingle();

            if (error) {
              processedList.push({
                id: uuidv4(),
                name,
                vehicleType,
                status: 'error',
                message: `Error al verificar conductor: ${error.message}`,
                exists: false
              });
            } else if (data) {
              // El conductor existe, lo marcamos para actualización
              processedList.push({
                id: data.id,
                name,
                vehicleType,
                status: 'pendiente',
                message: `Se actualizará tipo de vehículo de "${data.vehicle_type || 'No definido'}" a "${vehicleType}"`,
                exists: true
              });
            } else {
              // Conductor nuevo
              processedList.push({
                id: uuidv4(),
                name,
                vehicleType,
                status: 'pendiente',
                message: 'Nuevo conductor a crear',
                exists: false
              });
            }
          } catch (err) {
            processedList.push({
              id: uuidv4(),
              name,
              vehicleType,
              status: 'error',
              message: 'Error interno al procesar',
              exists: false
            });
          }
        } else {
          // Datos incompletos
          processedList.push({
            id: uuidv4(),
            name: name || '(nombre vacío)',
            vehicleType: vehicleType || '(tipo vacío)',
            status: 'error',
            message: 'Datos incompletos o mal formateados',
            exists: false
          });
        }
      } else {
        // Línea mal formateada
        processedList.push({
          id: uuidv4(),
          name: line,
          vehicleType: '',
          status: 'error',
          message: 'Formato incorrecto. Se esperan dos columnas (nombre y tipo de vehículo)',
          exists: false
        });
      }
    }

    setProcessedDrivers(processedList);
    setIsProcessing(false);
  }, [inputText, toast]);

  // Importar o actualizar conductores en la base de datos
  const importDrivers = useCallback(async () => {
    if (processedDrivers.length === 0) {
      toast({
        title: "Error",
        description: "No hay conductores para importar.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    // Crear una copia para actualizar estados
    const updatedDrivers = [...processedDrivers];
    let newCount = 0;
    let updateCount = 0;
    let errorCount = 0;

    for (let i = 0; i < updatedDrivers.length; i++) {
      const driver = updatedDrivers[i];
      
      // Saltamos los que ya están en error
      if (driver.status === 'error') {
        errorCount++;
        continue;
      }
      
      try {
        if (driver.exists) {
          // Actualizar conductor existente (solo el tipo de vehículo)
          const { error } = await supabase
            .from('drivers')
            .update({ vehicle_type: driver.vehicleType })
            .eq('id', driver.id);
            
          if (error) throw error;
          
          updatedDrivers[i] = {
            ...driver,
            status: 'actualizado',
            message: 'Tipo de vehículo actualizado correctamente'
          };
          updateCount++;
        } else {
          // Crear nuevo conductor
          const { error } = await supabase
            .from('drivers')
            .insert({
              id: driver.id,
              name: driver.name,
              vehicle_type: driver.vehicleType,
              status: 'inactivo',
              pid: null
            });
            
          if (error) throw error;
          
          updatedDrivers[i] = {
            ...driver,
            status: 'creado',
            message: 'Conductor creado correctamente'
          };
          newCount++;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        updatedDrivers[i] = {
          ...driver,
          status: 'error',
          message: `Error: ${errorMessage}`
        };
        errorCount++;
      }
    }

    setProcessedDrivers(updatedDrivers);
    setHasImported(true);
    setIsProcessing(false);

    // Mostrar notificación con resultado
    const totalSuccess = newCount + updateCount;
    if (totalSuccess > 0) {
      toast({
        title: "Importación completada",
        description: `${newCount} conductores nuevos, ${updateCount} actualizados${errorCount > 0 ? `, ${errorCount} errores` : ''}`,
        variant: errorCount > 0 ? "destructive" : "default"
      });
    } else {
      toast({
        title: "Error",
        description: "No se pudo importar ningún conductor. Verifica los errores.",
        variant: "destructive"
      });
    }
  }, [processedDrivers, toast]);

  const resetForm = () => {
    setInputText('');
    setProcessedDrivers([]);
    setHasImported(false);
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-center">
          <User className="mr-2 h-5 w-5 text-primary" /> 
          Importador de Conductores
        </CardTitle>
        <CardDescription>
          Importa conductores y sus tipos de vehículo desde Excel
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasImported ? (
          <div className="space-y-4">
            <Alert className="bg-blue-50 text-blue-800 border-blue-200">
              <Info className="h-4 w-4" />
              <AlertTitle>Instrucciones</AlertTitle>
              <AlertDescription>
                <p>Copia desde Excel dos columnas: <strong>Nombre del Conductor</strong> y <strong>Tipo de Vehículo</strong>.</p>
                <p className="mt-1">Si el conductor ya existe, solo se actualizará el tipo de vehículo manteniendo su ID y otras propiedades.</p>
                <p className="mt-1">Si es nuevo, se creará con estado "inactivo" y sin PID asignado.</p>
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label htmlFor="driverData">Datos de conductores:</Label>
              <Textarea 
                id="driverData" 
                placeholder="Pega aquí los datos copiados desde Excel (dos columnas: Nombre y Tipo de Vehículo)" 
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
                Procesar Datos
              </Button>
            </div>
            
            {processedDrivers.length > 0 && (
              <div className="mt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Conductores procesados</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-800">{processedDrivers.length} conductores</Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-800">
                      {processedDrivers.filter(d => d.exists).length} a actualizar
                    </Badge>
                    <Badge variant="outline" className="bg-amber-50 text-amber-800">
                      {processedDrivers.filter(d => !d.exists && d.status !== 'error').length} nuevos
                    </Badge>
                    <Badge variant="outline" className="bg-red-50 text-red-800">
                      {processedDrivers.filter(d => d.status === 'error').length} con errores
                    </Badge>
                  </div>
                </div>
                
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Tipo de Vehículo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Mensaje</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processedDrivers.map((driver) => (
                        <TableRow key={driver.id} className={driver.status === 'error' ? 'bg-red-50' : ''}>
                          <TableCell className="font-medium">{driver.name}</TableCell>
                          <TableCell>{driver.vehicleType}</TableCell>
                          <TableCell>
                            {driver.exists ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-800">Actualización</Badge>
                            ) : driver.status !== 'error' ? (
                              <Badge variant="outline" className="bg-green-50 text-green-800">Nuevo</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-50 text-red-800">Error</Badge>
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
                    onClick={importDrivers} 
                    className="bg-primary"
                    disabled={isProcessing || processedDrivers.every(d => d.status === 'error')}
                  >
                    {isProcessing ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CarFront className="mr-2 h-4 w-4" />
                    )}
                    Importar Conductores
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <Alert className="bg-green-50 text-green-800 border-green-200">
              <Check className="h-4 w-4" />
              <AlertTitle>Importación Completada</AlertTitle>
              <AlertDescription>
                <div className="mt-2">
                  <p><strong>Total de conductores:</strong> {processedDrivers.length}</p>
                  <p><strong>Nuevos:</strong> {processedDrivers.filter(d => d.status === 'creado').length}</p>
                  <p><strong>Actualizados:</strong> {processedDrivers.filter(d => d.status === 'actualizado').length}</p>
                  <p><strong>Con errores:</strong> {processedDrivers.filter(d => d.status === 'error').length}</p>
                </div>
              </AlertDescription>
            </Alert>
            
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo de Vehículo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Mensaje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedDrivers.map((driver) => (
                    <TableRow key={driver.id} className={driver.status === 'error' ? 'bg-red-50' : (driver.status === 'actualizado' ? 'bg-blue-50' : '')}>
                      <TableCell className="font-medium">{driver.name}</TableCell>
                      <TableCell>{driver.vehicleType}</TableCell>
                      <TableCell>
                        {driver.status === 'creado' ? (
                          <Badge variant="outline" className="bg-green-50 text-green-800">Creado</Badge>
                        ) : driver.status === 'actualizado' ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-800">Actualizado</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-800">Error</Badge>
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
                Importar Más Conductores
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 