"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Download, Calendar, CalendarRange, Loader2, BarChart2, Filter, FileSpreadsheet } from 'lucide-react';
import { Table, TableBody, TableCell, TableCaption, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { format as dateFormat, startOfWeek, endOfWeek, startOfDay, endOfDay, subDays, addDays, parseISO, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { DispatchService } from '@/services/dispatch-service';

interface DispatchRecord {
  id: string;
  driver_id: string;
  name: string;
  start_time: string | null;
  end_time: string | null;
  startlatitude: number | null;
  startlongitude: number | null;
  selfie_url: string | null;
  pid: string | null;
  status: string;
}

// Componente DatePicker personalizado
const DatePicker = ({ date, onDateChange }: { date?: Date, onDateChange: (date: Date | undefined) => void }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal">
          <Calendar className="mr-2 h-4 w-4" />
          {date ? dateFormat(date, "PPP") : "Seleccionar fecha"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <CalendarComponent
          mode="single"
          selected={date}
          onSelect={onDateChange}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};

export function Reports() {
  const [records, setRecords] = useState<DispatchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date())
  });

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const records = await DispatchService.getDispatchRecords(
        dateRange.from.toISOString(),
        dateRange.to.toISOString()
      );
      setRecords(records);
    } catch (err) {
      console.error('Error loading dispatch records:', err);
      setError('Error al cargar los registros de despacho');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleDateSelect = (range: DateRange | undefined) => {
    if (!range?.from) return;
    
    setDateRange({
      from: startOfDay(range.from),
      to: endOfDay(range.to || range.from)
    });
  };

  const handleQuickSelect = (period: 'today' | 'week' | 'month') => {
    const now = new Date();
    let from: Date, to: Date;

    switch (period) {
      case 'today':
        from = startOfDay(now);
        to = endOfDay(now);
        break;
      case 'week':
        from = startOfWeek(now, { weekStartsOn: 1 });
        to = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
    }

    setDateRange({ from, to });
  };

  const downloadReport = () => {
    // TODO: Implement report download
    console.log('Downloading report...');
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-primary" />
            <CardTitle>Reportes de Despacho</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadRecords}
              disabled={isLoading}
            >
              <Loader2 className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={downloadReport}
              disabled={isLoading || records.length === 0}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>
        <CardDescription>
          Historial de despachos y estadísticas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Date Range Selector */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label>Rango de Fechas</Label>
              <div className="flex items-center gap-2 mt-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateFormat(dateRange.from, "d 'de' MMMM", { locale: es })}
                      {' - '}
                      {dateFormat(dateRange.to, "d 'de' MMMM", { locale: es })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={{
                        from: dateRange.from,
                        to: dateRange.to,
                      }}
                      onSelect={handleDateSelect}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex-1">
              <Label>Período Predefinido</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSelect('today')}
                >
                  Hoy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSelect('week')}
                >
                  Esta Semana
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSelect('month')}
                >
                  Este Mes
                </Button>
              </div>
            </div>
          </div>

          {/* Records Table */}
          {error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Cargando registros...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay registros de despacho para el período seleccionado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conductor</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.name}</TableCell>
                    <TableCell>
                      {record.start_time && dateFormat(parseISO(record.start_time), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      {record.end_time && dateFormat(parseISO(record.end_time), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        record.status === 'despachado' ? 'bg-green-100 text-green-800' :
                        record.status === 'cancelado' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {record.id}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
