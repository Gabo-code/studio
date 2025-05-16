"use client";

import { useState, useEffect, type FormEvent, useCallback } from 'react';
import { store, subscribe } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import type { Driver } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  PlusCircle, 
  Edit2, 
  Trash2, 
  UserPlus, 
  XCircle, 
  Search, 
  Users, 
  RefreshCw,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

type DriverStatus = 
  | 'en_espera'     // En la cola esperando ser despachado
  | 'en_reparto'    // Despachado por coordinador, realizando entregas
  | 'turno_terminado' // Ha terminado su turno del día
  | 'inactivo'      // No está en servicio
  | null;           // Estado inicial

interface DriverWithStatus extends Driver {
  status?: DriverStatus;
  vehicle_type?: string;
  pid?: string | null;
}

export function DriverManagement() {
  const [drivers, setDrivers] = useState<DriverWithStatus[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<DriverWithStatus | null>(null);
  const [formData, setFormData] = useState({ id: '', name: '', vehicle_type: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [nameFilter, setNameFilter] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [linkedFilter, setLinkedFilter] = useState('todos');
  const { toast } = useToast();

  // Función para cargar los conductores directamente desde Supabase
  const loadDriversFromDb = useCallback(async () => {
    setIsLoading(true);
    try {
      // Obtener todos los conductores de la base de datos
      const { data, error } = await supabase
        .from('drivers')
        .select('id, name, status, vehicle_type, pid')
        .order('name');
      
      if (error) throw error;
      
      // Actualizar tanto el store local como el estado
      setDrivers(data || []);
      
      // También actualizar el store local (para mantener compatibilidad)
      data?.forEach(driver => {
        store.addMasterDriver({ id: driver.id, name: driver.name });
      });
      
      toast({ 
        title: "Drivers Loaded", 
        description: `${data?.length || 0} drivers loaded from database.` 
      });
    } catch (err) {
      console.error('Error loading drivers:', err);
      toast({ 
        title: "Error", 
        description: "Failed to load drivers from database.", 
        variant: "destructive" 
      });
      
      // Usar la lista local como fallback
      refreshDrivers();
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Función fallback para cargar desde el store local
  const refreshDrivers = useCallback(() => {
    setDrivers(store.getMasterDriverList());
  }, []);

  useEffect(() => {
    // Cargar conductores desde la base de datos al iniciar
    loadDriversFromDb();
    
    // Suscribirse a cambios en el store local como fallback
    const unsubscribe = subscribe(refreshDrivers);
    return () => unsubscribe();
  }, [loadDriversFromDb, refreshDrivers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
        toast({ title: "Validation Error", description: "Driver name cannot be empty.", variant: "destructive"});
        return;
    }
    
    setIsLoading(true);
    
    try {
      if (isEditing) {
        // Actualizar conductor existente
        const { error } = await supabase
          .from('drivers')
          .update({ 
            name: formData.name,
            vehicle_type: formData.vehicle_type || null 
          })
          .eq('id', isEditing.id);
          
        if (error) throw error;
        
        // También actualizar en el store local
        store.updateMasterDriver({ ...isEditing, name: formData.name });
        
        toast({ title: "Driver Updated", description: `Details for ${formData.name} updated.` });
        setIsEditing(null);
      } else {
        // Añadir nuevo conductor
        if (!formData.id.trim()) {
          toast({ title: "Validation Error", description: "Driver ID cannot be empty when adding.", variant: "destructive"});
          return;
        }
        
        // Verificar si ya existe
        const existingDriverById = drivers.find(d => d.id === formData.id);
        const existingDriverByName = drivers.find(d => d.name.toLowerCase() === formData.name.toLowerCase());

        if (existingDriverById) {
          toast({ title: "Error", description: `Driver with ID ${formData.id} already exists.`, variant: "destructive"});
          return;
        }
        if (existingDriverByName) {
          toast({ title: "Error", description: `Driver with name ${formData.name} already exists.`, variant: "destructive"});
          return;
        }
        
        // Insertar en la base de datos
        const { error } = await supabase
          .from('drivers')
          .insert([{ 
            id: formData.id, 
            name: formData.name,
            vehicle_type: formData.vehicle_type || null,
            status: 'inactivo',
            pid: null
          }]);
          
        if (error) throw error;
          
        // También añadir al store local
        store.addMasterDriver({ id: formData.id, name: formData.name });
        
        toast({ title: "Driver Added", description: `${formData.name} added to the master list.` });
        setIsAdding(false);
      }
    } catch (err) {
      console.error('Error saving driver:', err);
      toast({ 
        title: "Error", 
        description: "Failed to save driver to database.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
      setFormData({ id: '', name: '', vehicle_type: '' });
      loadDriversFromDb(); // Recargar la lista
    }
  };

  const handleEdit = (driver: DriverWithStatus) => {
    setIsEditing(driver);
    setFormData({ 
      id: driver.id, 
      name: driver.name,
      vehicle_type: driver.vehicle_type || ''
    });
    setIsAdding(false); // Ensure not in adding mode
  };

  const handleDelete = async (driverId: string) => {
    if (!window.confirm("Are you sure you want to delete this driver? This action cannot be undone.")) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Eliminar de la base de datos
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', driverId);
        
      if (error) throw error;
      
      // También eliminar del store local
      store.removeMasterDriver(driverId);
      
      toast({ title: "Driver Deleted", description: "Driver removed from the system." });
    } catch (err) {
      console.error('Error deleting driver:', err);
      toast({ 
        title: "Error", 
        description: "Failed to delete driver. The driver may have associated records.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
      loadDriversFromDb(); // Recargar la lista
    }
  };

  const resetFormState = () => {
    setIsAdding(false);
    setIsEditing(null);
    setFormData({ id: '', name: '', vehicle_type: '' });
  };
  
  // Filtrar conductores con todos los filtros
  const filteredDrivers = drivers.filter(driver => {
    // Aplicar filtro general de búsqueda
    const matchesSearchTerm = searchTerm ? (
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (driver.vehicle_type && driver.vehicle_type.toLowerCase().includes(searchTerm.toLowerCase()))
    ) : true;
    
    // Aplicar filtro específico de nombre
    const matchesNameFilter = nameFilter ? 
      driver.name.toLowerCase().includes(nameFilter.toLowerCase()) : true;
    
    // Aplicar filtro de tipo de vehículo
    const matchesVehicleType = vehicleTypeFilter === 'todos' ? true :
      (driver.vehicle_type && driver.vehicle_type.toLowerCase() === vehicleTypeFilter.toLowerCase());
    
    // Aplicar filtro de estado
    const matchesStatus = statusFilter === 'todos' ? true :
      driver.status === statusFilter;
    
    // Aplicar filtro de vinculación
    const matchesLinked = linkedFilter === 'todos' ? true :
      (linkedFilter === 'vinculado' ? !!driver.pid : !driver.pid);
    
    return matchesSearchTerm && matchesNameFilter && 
           matchesVehicleType && matchesStatus && matchesLinked;
  });
  
  // Función para renderizar el estado del conductor
  const renderStatusBadge = (status: DriverStatus) => {
    if (!status) return null;
    
    const statusStyles = {
      en_espera: "bg-green-100 text-green-800 hover:bg-green-200",
      en_reparto: "bg-red-100 text-red-800 hover:bg-red-200",
      turno_terminado: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
      inactivo: "bg-gray-100 text-gray-800 hover:bg-gray-200"
    };
    
    return (
      <Badge variant="outline" className={statusStyles[status]}>
        {status}
      </Badge>
    );
  };

  const handleEndShift = async () => {
    setIsLoading(true);
    try {
      // 1. Verificar que no haya registros en cola
      const { data: queueRecords, error: queueError } = await supabase
        .from('dispatch_records')
        .select('id')
        .eq('status', 'en_cola');

      if (queueError) throw queueError;

      if (queueRecords && queueRecords.length > 0) {
        toast({
          title: "Error",
          description: "No se puede cerrar el turno mientras haya conductores en cola de espera.",
          variant: "destructive"
        });
        return;
      }

      // 2. Actualizar todos los conductores en reparto a inactivo
      const { error: driversError } = await supabase
        .from('drivers')
        .update({ status: 'inactivo' })
        .eq('status', 'en_reparto');

      if (driversError) throw driversError;

      toast({
        title: "Turno finalizado",
        description: "Se ha marcado el fin de turno para todos los conductores en reparto.",
        variant: "default"
      });

      // Recargar la lista de conductores
      loadDriversFromDb();
    } catch (error) {
      console.error('Error al finalizar turno:', error);
      toast({
        title: "Error",
        description: "No se pudo finalizar el turno. Intente nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelQueue = async () => {
    if (!window.confirm("¿Estás seguro de que deseas cancelar todos los despachos en cola? Esta acción no se puede deshacer.")) {
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('cancel_pending_dispatches');
      
      if (error) throw error;

      toast({
        title: "Cola cancelada",
        description: "Se han cancelado todos los despachos en cola y los conductores han sido marcados como inactivos.",
        variant: "default"
      });

      // Recargar la lista de conductores
      loadDriversFromDb();
    } catch (error) {
      console.error('Error al cancelar la cola:', error);
      toast({
        title: "Error",
        description: "No se pudo cancelar la cola. Intente nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center">
              <Users className="mr-2 h-5 w-5 text-primary" /> 
              Master Driver List
            </CardTitle>
            <CardDescription>
              Manage the list of registered drivers. Currently {drivers.length} drivers in the system.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {!isAdding && !isEditing && (
              <>
                <Button 
                  onClick={loadDriversFromDb} 
                  variant="outline" 
                  size="sm"
                  disabled={isLoading}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> 
                  Refresh
                </Button>
                <Button 
                  onClick={() => { setIsAdding(true); setFormData({id:'', name:'', vehicle_type:''}); }} 
                  size="sm"
                >
                  <UserPlus className="mr-2 h-4 w-4" /> Add Driver
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleEndShift}
                  disabled={isLoading}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Finalizar Turno
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleCancelQueue}
                  disabled={isLoading}
                  className="bg-orange-500 text-white"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancelar Cola
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Formulario para añadir o editar conductor */}
        {(isAdding || isEditing) && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg space-y-4 bg-muted/50">
            <h3 className="text-lg font-semibold">{isEditing ? 'Edit Driver' : 'Add New Driver'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="driverId">Driver ID</Label>
                <Input 
                  id="driverId" 
                  name="id" 
                  value={formData.id} 
                  onChange={handleInputChange} 
                  placeholder="Unique Driver ID" 
                  required 
                  disabled={!!isEditing} // ID is not editable for existing drivers
                />
                {isAdding && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Este ID debe ser único y se usará para identificar al conductor en el sistema.
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="driverName">Nombre Completo</Label>
                <Input 
                  id="driverName" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  placeholder="Nombre Completo" 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="vehicleType">Tipo de Vehículo</Label>
                <Input 
                  id="vehicleType" 
                  name="vehicle_type" 
                  value={formData.vehicle_type} 
                  onChange={handleInputChange} 
                  placeholder="Auto, Camioneta, Moto, etc." 
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={resetFormState} disabled={isLoading}>
                <XCircle className="mr-2 h-4 w-4" /> Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : isEditing ? (
                  <Edit2 className="mr-2 h-4 w-4" />
                ) : (
                  <PlusCircle className="mr-2 h-4 w-4" />
                )}
                {isEditing ? 'Guardar Cambios' : 'Añadir Conductor'}
              </Button>
            </div>
          </form>
        )}

        {/* Barra de búsqueda general */}
        {!isAdding && !isEditing && (
          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, ID o tipo de vehículo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* Tabla de conductores con filtros específicos por columna */}
        {!isAdding && !isEditing && (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo de Vehículo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Vinculado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
                <TableRow className="bg-muted/40">
                  <TableCell>
                    <Input 
                      placeholder="Buscar nombre..."
                      value={nameFilter}
                      onChange={(e) => setNameFilter(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <select 
                      value={vehicleTypeFilter}
                      onChange={(e) => setVehicleTypeFilter(e.target.value)}
                      className="w-full h-8 text-xs rounded-md border border-input bg-background px-3"
                    >
                      <option value="todos">Todos</option>
                      <option value="auto">Auto</option>
                      <option value="moto">Moto</option>
                    </select>
                  </TableCell>
                  <TableCell>
                    <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full h-8 text-xs rounded-md border border-input bg-background px-3"
                    >
                      <option value="todos">Todos</option>
                      <option value="en_espera">En Espera</option>
                      <option value="en_reparto">En Reparto</option>
                      <option value="turno_terminado">Turno Terminado</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </TableCell>
                  <TableCell>
                    <select 
                      value={linkedFilter}
                      onChange={(e) => setLinkedFilter(e.target.value)}
                      className="w-full h-8 text-xs rounded-md border border-input bg-background px-3"
                    >
                      <option value="todos">Todos</option>
                      <option value="vinculado">Vinculado</option>
                      <option value="no vinculado">No vinculado</option>
                    </select>
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <span className="text-muted-foreground">Cargando conductores...</span>
                    </TableCell>
                  </TableRow>
                ) : filteredDrivers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      {searchTerm || nameFilter || vehicleTypeFilter !== 'todos' || 
                       statusFilter !== 'todos' || linkedFilter !== 'todos' ? (
                        <span className="text-muted-foreground">No se encontraron conductores con los filtros aplicados</span>
                      ) : (
                        <span className="text-muted-foreground">No hay conductores registrados</span>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDrivers.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">{driver.name}</TableCell>
                      <TableCell>{driver.vehicle_type || "-"}</TableCell>
                      <TableCell>{renderStatusBadge(driver.status || null)}</TableCell>
                      <TableCell>
                        {driver.pid ? (
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                            Vinculado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100 text-gray-500">
                            No vinculado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => handleEdit(driver)} 
                            title="Editar conductor"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="icon" 
                            onClick={() => handleDelete(driver.id)} 
                            title="Eliminar conductor"
                            disabled={!!driver.pid}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {!isAdding && !isEditing && (
        <CardFooter className="flex justify-between border-t p-4">
          <div className="text-sm text-muted-foreground">
            {filteredDrivers.length} {filteredDrivers.length === 1 ? 'conductor' : 'conductores'} 
            {(searchTerm || nameFilter || vehicleTypeFilter !== 'todos' || 
              statusFilter !== 'todos' || linkedFilter !== 'todos') && " encontrados con filtros aplicados"}
          </div>
          {(searchTerm || nameFilter || vehicleTypeFilter !== 'todos' || 
            statusFilter !== 'todos' || linkedFilter !== 'todos') && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setSearchTerm('');
                setNameFilter('');
                setVehicleTypeFilter('todos');
                setStatusFilter('todos');
                setLinkedFilter('todos');
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
