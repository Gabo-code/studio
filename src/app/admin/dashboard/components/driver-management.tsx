"use client";

import { useState, useEffect, type FormEvent, useCallback } from 'react';
import { store, subscribe } from '@/lib/store';
import type { Driver } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit2, Trash2, UserPlus, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function DriverManagement() {
  const [drivers, setDrivers] = useState<Driver[]>(store.getMasterDriverList());
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({ id: '', name: '' });
  const { toast } = useToast();

  const refreshDrivers = useCallback(() => {
    setDrivers(store.getMasterDriverList());
  }, []);

  useEffect(() => {
    refreshDrivers();
    const unsubscribe = subscribe(refreshDrivers);
    return () => unsubscribe();
  }, [refreshDrivers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
        toast({ title: "Validation Error", description: "Driver name cannot be empty.", variant: "destructive"});
        return;
    }

    if (isEditing) {
      // ID should not be editable for an existing driver usually, but persistentId is key here
      store.updateMasterDriver({ ...isEditing, name: formData.name });
      toast({ title: "Driver Updated", description: `Details for ${formData.name} updated.` });
      setIsEditing(null);
    } else {
      // For adding new, ID could be auto-generated or manually entered if it's the persistentID
      // For this system, persistentID is generated on client, so admin adds name and *known* ID
      if (!formData.id.trim()) {
        toast({ title: "Validation Error", description: "Driver ID (Persistent ID) cannot be empty when adding.", variant: "destructive"});
        return;
      }
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

      store.addMasterDriver({ id: formData.id, name: formData.name });
      toast({ title: "Driver Added", description: `${formData.name} added to the master list.` });
      setIsAdding(false);
    }
    setFormData({ id: '', name: '' });
    refreshDrivers();
  };

  const handleEdit = (driver: Driver) => {
    setIsEditing(driver);
    setFormData({ id: driver.id, name: driver.name });
    setIsAdding(false); // Ensure not in adding mode
  };

  const handleDelete = (driverId: string) => {
    if (window.confirm("Are you sure you want to delete this driver? This action cannot be undone.")) {
        // Check if driver is in waiting queue or has dispatch history before deleting.
        // For this example, direct deletion.
        store.removeMasterDriver(driverId);
        toast({ title: "Driver Deleted", description: "Driver removed from the master list." });
        refreshDrivers();
    }
  };

  const resetFormState = () => {
    setIsAdding(false);
    setIsEditing(null);
    setFormData({ id: '', name: '' });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle>Master Driver List</CardTitle>
            {!isAdding && !isEditing && (
                <Button onClick={() => { setIsAdding(true); setFormData({id:'', name:''}); }} size="sm">
                    <UserPlus className="mr-2 h-4 w-4" /> Add New Driver
                </Button>
            )}
        </div>
        <CardDescription>Manage the list of registered drivers.</CardDescription>
      </CardHeader>
      <CardContent>
        {(isAdding || isEditing) && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg space-y-4 bg-muted/50">
            <h3 className="text-lg font-semibold">{isEditing ? 'Edit Driver' : 'Add New Driver'}</h3>
            <div>
              <Label htmlFor="driverId">Driver ID (Persistent ID)</Label>
              <Input 
                id="driverId" 
                name="id" 
                value={formData.id} 
                onChange={handleInputChange} 
                placeholder="Unique Persistent ID" 
                required 
                disabled={!!isEditing} // ID is not editable for existing drivers
              />
               {isAdding && <p className="text-xs text-muted-foreground mt-1">This ID should match the driver's device persistent ID.</p>}
            </div>
            <div>
              <Label htmlFor="driverName">Driver Name</Label>
              <Input id="driverName" name="name" value={formData.name} onChange={handleInputChange} placeholder="Full Name" required />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                {isEditing ? 'Save Changes' : 'Add Driver'}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={resetFormState}>
                <XCircle className="mr-2 h-4 w-4" /> Cancel
              </Button>
            </div>
          </form>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Persistent ID</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No drivers in the master list.</TableCell></TableRow>
            )}
            {drivers.map((driver) => (
              <TableRow key={driver.id}>
                <TableCell className="font-medium">{driver.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{driver.id}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="icon" onClick={() => handleEdit(driver)} title="Edit driver">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => handleDelete(driver.id)} title="Delete driver">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
