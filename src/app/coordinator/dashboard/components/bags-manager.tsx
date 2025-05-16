"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Package } from 'lucide-react';

interface DriverWithBags {
  id: string;
  name: string;
  bags_balance: number;
}

export function BagsManager() {
  const [drivers, setDrivers] = useState<DriverWithBags[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Cargar conductores con saldo de bolsos
  const loadDriversWithBags = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('id, name, bags_balance')
        .gt('bags_balance', 0)
        .order('name');

      if (error) throw error;
      setDrivers(data || []);
    } catch (err) {
      console.error('Error cargando conductores:', err);
      toast({
        title: "Error",
        description: "No se pudieron cargar los conductores con saldo de bolsos.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDriversWithBags();
  }, []);

  // Manejar la devolución de bolsos
  const handleReturnBags = async (driverId: string, currentBalance: number) => {
    const returnAmount = window.prompt(`¿Cuántos bolsos devuelve? (máximo ${currentBalance})`);
    if (!returnAmount) return;

    const amount = parseInt(returnAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Por favor ingresa un número válido mayor a 0.",
        variant: "destructive"
      });
      return;
    }

    if (amount > currentBalance) {
      toast({
        title: "Error",
        description: `No se pueden devolver más bolsos de los que debe (${currentBalance}).`,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('drivers')
        .update({ bags_balance: currentBalance - amount })
        .eq('id', driverId);

      if (error) throw error;

      toast({
        title: "Devolución registrada",
        description: `Se han registrado ${amount} bolso${amount === 1 ? '' : 's'} devuelto${amount === 1 ? '' : 's'}.`,
      });

      // Recargar la lista
      await loadDriversWithBags();
    } catch (err) {
      console.error('Error actualizando saldo:', err);
      toast({
        title: "Error",
        description: "No se pudo registrar la devolución.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar conductores según búsqueda
  const filteredDrivers = drivers.filter(driver =>
    driver.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-bold flex items-center">
            <Package className="mr-2 h-5 w-5 text-primary" />
            Control de Bolsos
            <span className="text-lg ml-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
              {drivers.length} conductor{drivers.length === 1 ? '' : 'es'} con saldo
            </span>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conductor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredDrivers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conductor</TableHead>
                  <TableHead className="text-center">Bolsos pendientes</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrivers.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">{driver.name}</TableCell>
                    <TableCell className="text-center">
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                        {driver.bags_balance}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReturnBags(driver.id, driver.bags_balance)}
                      >
                        Registrar devolución
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? "No se encontraron conductores que coincidan con la búsqueda."
                : "No hay conductores con saldo de bolsos pendiente."}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 