"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, UserPlus, Edit, Trash2, Filter } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { DriverService } from '@/services/driver-service';
import type { DriverWithStatus } from '@/types';

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

  const loadDriversFromDb = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await DriverService.getAllDrivers();
      setDrivers(data);
      
      toast({ 
        title: "Drivers Loaded", 
        description: `${data.length} drivers loaded from database.` 
      });
    } catch (err) {
      console.error('Error loading drivers:', err);
      toast({ 
        title: "Error", 
        description: "Failed to load drivers from database.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDriversFromDb();
  }, [loadDriversFromDb]);

  const handleAddDriver = async () => {
    if (!formData.name || !formData.vehicle_type) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const newDriver: DriverWithStatus = {
        id: formData.id || crypto.randomUUID(),
        name: formData.name,
        vehicle_type: formData.vehicle_type,
        status: 'inactivo'
      };

      await DriverService.addDriver(newDriver);
      
      toast({
        title: "Success",
        description: "Driver added successfully."
      });

      setIsAdding(false);
      setFormData({ id: '', name: '', vehicle_type: '' });
      loadDriversFromDb();
    } catch (err) {
      console.error('Error adding driver:', err);
      toast({
        title: "Error",
        description: "Failed to add driver.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditDriver = async () => {
    if (!isEditing || !formData.name || !formData.vehicle_type) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const updatedDriver: DriverWithStatus = {
        ...isEditing,
        name: formData.name,
        vehicle_type: formData.vehicle_type
      };

      await DriverService.updateDriver(updatedDriver);
      
      toast({
        title: "Success",
        description: "Driver updated successfully."
      });

      setIsEditing(null);
      setFormData({ id: '', name: '', vehicle_type: '' });
      loadDriversFromDb();
    } catch (err) {
      console.error('Error updating driver:', err);
      toast({
        title: "Error",
        description: "Failed to update driver.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDriver = async (driver: DriverWithStatus) => {
    if (!window.confirm(`Are you sure you want to delete ${driver.name}?`)) {
      return;
    }

    setIsLoading(true);
    try {
      await DriverService.deleteDriver(driver.id);
      
      toast({
        title: "Success",
        description: "Driver deleted successfully."
      });

      loadDriversFromDb();
    } catch (err) {
      console.error('Error deleting driver:', err);
      toast({
        title: "Error",
        description: "Failed to delete driver.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDrivers = drivers.filter(driver => {
    const matchesName = driver.name.toLowerCase().includes(nameFilter.toLowerCase());
    const matchesVehicleType = vehicleTypeFilter === 'todos' || driver.vehicle_type === vehicleTypeFilter;
    const matchesStatus = statusFilter === 'todos' || driver.status === statusFilter;
    const matchesLinked = linkedFilter === 'todos' || 
      (linkedFilter === 'linked' && driver.pid) || 
      (linkedFilter === 'unlinked' && !driver.pid);
    
    return matchesName && matchesVehicleType && matchesStatus && matchesLinked;
  });

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            <CardTitle>Gestión de Conductores</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadDriversFromDb}
              disabled={isLoading}
            >
              <Loader2 className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setIsAdding(true);
                setFormData({ id: '', name: '', vehicle_type: '' });
              }}
              disabled={isLoading}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Nuevo Conductor
            </Button>
          </div>
        </div>
        <CardDescription>
          Administra los conductores registrados en el sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label>Buscar por Nombre</Label>
              <div className="flex items-center gap-2 mt-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nombre del conductor..."
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Tipo de Vehículo</Label>
              <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="moto">Moto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                  <SelectItem value="en_espera">En Espera</SelectItem>
                  <SelectItem value="en_reparto">En Reparto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vinculación</Label>
              <Select value={linkedFilter} onValueChange={setLinkedFilter}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Estado de vinculación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="linked">Vinculados</SelectItem>
                  <SelectItem value="unlinked">No Vinculados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Drivers Table */}
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Cargando conductores...</p>
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron conductores que coincidan con los filtros.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>ID Persistente</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrivers.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell>{driver.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {driver.vehicle_type === 'auto' ? 'Auto' : 'Moto'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        driver.status === 'en_reparto' ? 'bg-green-100 text-green-800' :
                        driver.status === 'en_espera' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {driver.status === 'en_reparto' ? 'En Reparto' :
                         driver.status === 'en_espera' ? 'En Espera' :
                         'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {driver.pid || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setIsEditing(driver);
                            setFormData({
                              id: driver.id,
                              name: driver.name,
                              vehicle_type: driver.vehicle_type || ''
                            });
                          }}
                          title="Editar conductor"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteDriver(driver)}
                          title="Eliminar conductor"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>

      {/* Add/Edit Driver Dialog */}
      <Dialog open={isAdding || isEditing !== null} onOpenChange={(open) => {
        if (!open) {
          setIsAdding(false);
          setIsEditing(null);
          setFormData({ id: '', name: '', vehicle_type: '' });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Conductor' : 'Nuevo Conductor'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Modifica los datos del conductor' : 'Ingresa los datos del nuevo conductor'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre del conductor"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vehicle-type">Tipo de Vehículo</Label>
              <Select
                value={formData.vehicle_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, vehicle_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo de vehículo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="moto">Moto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAdding(false);
                setIsEditing(null);
                setFormData({ id: '', name: '', vehicle_type: '' });
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={isEditing ? handleEditDriver : handleAddDriver}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Guardar Cambios' : 'Agregar Conductor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
