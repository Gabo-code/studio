"use client";

import { useState, useEffect, useCallback } from 'react';
import { store } from '@/lib/store';
import { subscribe } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Download, Calendar, CalendarRange, Loader2, BarChart2, Filter, FileSpreadsheet } from 'lucide-react';
import { Table, TableBody, TableCell, TableCaption, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { format as dateFormat, startOfWeek, endOfWeek, startOfDay, endOfDay, subDays, addDays, parseISO, isWithinInterval } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { es } from 'date-fns/locale';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

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
  const [dispatchRecords, setDispatchRecords] = useState<DispatchRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<DispatchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [filterType, setFilterType] = useState<'day' | 'week'>('day');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');

  // Cargar registros desde Supabase
  const loadDispatchRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('dispatch_records')
        .select('*')
        .order('start_time', { ascending: false });
        
      if (error) throw error;
      
      setDispatchRecords(data || []);
      
      // Aplicar filtros iniciales
      applyFilters(data || [], filterType, startDate, endDate, statusFilter);
    } catch (err) {
      console.error('Error cargando registros:', err);
      setError('Error al cargar los registros de despacho.');
      setDispatchRecords([]);
      setFilteredRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [filterType, startDate, endDate, statusFilter]);

  // Aplicar filtros a los registros
  const applyFilters = useCallback((records: DispatchRecord[], type: 'day' | 'week', start?: Date, end?: Date, status: 'all' | 'completed' | 'pending' = 'all') => {
    if (!records.length || !start) {
      setFilteredRecords([]);
      return;
    }

    let filteredByDate: DispatchRecord[];
    
    if (type === 'day' && start) {
      // Filtrar por día
      const dayStart = startOfDay(start);
      const dayEnd = endOfDay(start);
      
      filteredByDate = records.filter(record => {
        // Solo considerar registros con start_time
        if (!record.start_time) return false;
        
        const recordDate = parseISO(record.start_time);
        return isWithinInterval(recordDate, { start: dayStart, end: dayEnd });
      });
    } else if (type === 'week' && start) {
      // Usar start como referencia para la semana
      const weekStart = startOfWeek(start, { weekStartsOn: 1 }); // Lunes como inicio de semana
      const weekEnd = endOfWeek(start, { weekStartsOn: 1 }); // Domingo como fin de semana
      
      filteredByDate = records.filter(record => {
        if (!record.start_time) return false;
        
        const recordDate = parseISO(record.start_time);
        return isWithinInterval(recordDate, { start: weekStart, end: weekEnd });
      });
    } else {
      // Si hay un rango personalizado
      if (start && end) {
        const rangeStart = startOfDay(start);
        const rangeEnd = endOfDay(end);
        
        filteredByDate = records.filter(record => {
          if (!record.start_time) return false;
          
          const recordDate = parseISO(record.start_time);
          return isWithinInterval(recordDate, { start: rangeStart, end: rangeEnd });
        });
      } else {
        filteredByDate = records;
      }
    }

    // Aplicar filtro por estado
    let result = filteredByDate;
    if (status === 'completed') {
      result = filteredByDate.filter(record => record.status === 'despachado');
    } else if (status === 'pending') {
      result = filteredByDate.filter(record => 
        record.status === 'pendiente' || 
        record.status === 'en_cola'
      );
    }

    setFilteredRecords(result);
  }, []);

  // Efecto para cargar registros al inicio
  useEffect(() => {
    loadDispatchRecords();
  }, [loadDispatchRecords]);

  // Actualizar filtros
  const handleFilterTypeChange = (type: 'day' | 'week') => {
    setFilterType(type);
    
    // Si cambiamos a filtro diario, mantener solo el primer día
    if (type === 'day' && startDate) {
      setEndDate(startDate);
    }
    
    // Actualizar registros filtrados
    applyFilters(dispatchRecords, type, startDate, type === 'day' ? startDate : endDate, statusFilter);
  };

  const handleDateChange = (date: Date | undefined, isStartDate: boolean): void => {
    if (isStartDate) {
      setStartDate(date);
      
      // Si es filtro diario, establecer la fecha de fin igual a la de inicio
      if (filterType === 'day') {
        setEndDate(date);
      }
      
      applyFilters(dispatchRecords, filterType, date, filterType === 'day' ? date : endDate, statusFilter);
    } else {
      setEndDate(date);
      applyFilters(dispatchRecords, filterType, startDate, date, statusFilter);
    }
  };

  const handleStatusFilterChange = (status: 'all' | 'completed' | 'pending') => {
    setStatusFilter(status);
    applyFilters(dispatchRecords, filterType, startDate, endDate, status);
  };

  // Establecer fechas preestablecidas
  const setToday = () => {
    const today = new Date();
    setStartDate(today);
    setEndDate(today);
    setFilterType('day');
    applyFilters(dispatchRecords, 'day', today, today, statusFilter);
  };

  const setThisWeek = () => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Lunes
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Domingo
    setStartDate(weekStart);
    setEndDate(weekEnd);
    setFilterType('week');
    applyFilters(dispatchRecords, 'week', weekStart, weekEnd, statusFilter);
  };

  // Descargar reportes
  const downloadReport = (format: 'csv' | 'json' | 'excel') => {
    if (!filteredRecords.length) {
      alert('No hay registros para descargar con los filtros actuales.');
      return;
    }

    let dataStr;
    let fileName;
    
    // Generar nombre de archivo según el filtro
    if (filterType === 'day' && startDate) {
      fileName = `despachos_${dateFormat(startDate, 'yyyy-MM-dd')}`;
    } else if (filterType === 'week' && startDate) {
      const weekStart = startOfWeek(startDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(startDate, { weekStartsOn: 1 });
      fileName = `despachos_semana_${dateFormat(weekStart, 'yyyy-MM-dd')}_al_${dateFormat(weekEnd, 'yyyy-MM-dd')}`;
    } else if (startDate && endDate) {
      fileName = `despachos_${dateFormat(startDate, 'yyyy-MM-dd')}_al_${dateFormat(endDate, 'yyyy-MM-dd')}`;
    } else {
      fileName = `despachos_${dateFormat(new Date(), 'yyyy-MM-dd')}`;
    }

    // Añadir filtro de estado al nombre
    if (statusFilter !== 'all') {
      fileName += `_${statusFilter === 'completed' ? 'despachados' : 'pendientes'}`;
    }

    if (format === 'csv') {
      const headers = "Conductor,ID_Conductor,Inicio,Fin,Estado,Latitud,Longitud,Selfie,PID";
      const rows = filteredRecords.map(r => 
        [
          `"${r.name ? r.name.replace(/"/g, '""') : ''}"`,
          r.driver_id || '',
          r.start_time ? dateFormat(parseISO(r.start_time), "yyyy-MM-dd HH:mm:ss") : '',
          r.end_time ? dateFormat(parseISO(r.end_time), "yyyy-MM-dd HH:mm:ss") : '',
          r.status || '',
          r.startlatitude || '',
          r.startlongitude || '',
          r.selfie_url ? 'Sí' : 'No',
          r.pid || ''
        ].join(',')
      ).join('\n');
      dataStr = `${headers}\n${rows}`;
      fileName += '.csv';
    } else if (format === 'excel') {
      // Para Excel, generamos un archivo CSV con BOM que Excel reconocerá automáticamente
      const BOM = '\uFEFF'; // BOM para que Excel interprete correctamente los caracteres UTF-8
      const headers = "Conductor,ID_Conductor,Inicio,Fin,Estado,Latitud,Longitud,Selfie,PID";
      const rows = filteredRecords.map(r => 
        [
          `"${r.name ? r.name.replace(/"/g, '""') : ''}"`,
          r.driver_id || '',
          r.start_time ? dateFormat(parseISO(r.start_time), "yyyy-MM-dd HH:mm:ss") : '',
          r.end_time ? dateFormat(parseISO(r.end_time), "yyyy-MM-dd HH:mm:ss") : '',
          r.status || '',
          r.startlatitude || '',
          r.startlongitude || '',
          r.selfie_url ? 'Sí' : 'No',
          r.pid || ''
        ].join(',')
      ).join('\n');
      dataStr = BOM + `${headers}\n${rows}`;
      fileName += '.xlsx';
    } else { // JSON
      // Asegurarnos de que los datos JSON incluyan todos los campos necesarios
      const jsonData = filteredRecords.map(r => ({
        conductor: r.name || '',
        id_conductor: r.driver_id || '',
        inicio: r.start_time ? dateFormat(parseISO(r.start_time), "yyyy-MM-dd HH:mm:ss") : '',
        fin: r.end_time ? dateFormat(parseISO(r.end_time), "yyyy-MM-dd HH:mm:ss") : '',
        estado: r.status || '',
        latitud: r.startlatitude || '',
        longitud: r.startlongitude || '',
        selfie: r.selfie_url ? 'Sí' : 'No',
        pid: r.pid || ''
      }));
      dataStr = JSON.stringify(jsonData, null, 2);
      fileName += '.json';
    }

    const blob = new Blob(
      [dataStr], 
      { 
        type: format === 'csv' 
          ? 'text/csv;charset=utf-8;' 
          : format === 'excel' 
            ? 'application/vnd.ms-excel;charset=utf-8;' 
            : 'application/json;charset=utf-8;' 
      }
    );
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Formatear fecha para mostrar
  const formatDateRange = () => {
    if (!startDate) return '';
    
    if (filterType === 'day') {
      return dateFormat(startDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
    } else if (filterType === 'week' && startDate) {
      const weekStart = startOfWeek(startDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(startDate, { weekStartsOn: 1 });
      return `Lunes ${dateFormat(weekStart, "d")} al Domingo ${dateFormat(weekEnd, "d 'de' MMMM 'de' yyyy", { locale: es })}`;
    } else if (startDate && endDate) {
      return `${dateFormat(startDate, "d 'de' MMMM", { locale: es })} al ${dateFormat(endDate, "d 'de' MMMM 'de' yyyy", { locale: es })}`;
    }
    
    return '';
  };

  // Helper function to get the label for the current filter
  const getFilterLabel = () => {
    if (filterType === 'day') {
      return 'Reporte diario';
    } else {
      return 'Reporte semanal (Lunes a Domingo)';
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-center">
          <BarChart2 className="mr-2 h-5 w-5 text-primary" /> 
          Reportes de Despachos
        </CardTitle>
        <CardDescription>
          Genera y descarga reportes de despachos por día o semana
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="bg-blue-50 text-blue-800 border-blue-200">
          <Info className="h-4 w-4" />
          <AlertTitle>Filtrar Despachos</AlertTitle>
          <AlertDescription>
            Selecciona el tipo de reporte y el rango de fechas para generar el informe.
          </AlertDescription>
        </Alert>
        
        {/* Opciones de filtrado */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="w-full md:w-auto">
              <Label htmlFor="filter-type" className="block mb-2">Tipo de Reporte</Label>
              <Tabs value={filterType} onValueChange={(value) => handleFilterTypeChange(value as 'day' | 'week')} className="w-full md:w-auto">
                <TabsList className="w-full">
                  <TabsTrigger value="day" className="flex-1">
                    <Calendar className="mr-2 h-4 w-4" /> Diario
                  </TabsTrigger>
                  <TabsTrigger value="week" className="flex-1">
                    <CalendarRange className="mr-2 h-4 w-4" /> Semanal
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="w-full md:w-auto">
              <Label htmlFor="status-filter" className="block mb-2">Estado</Label>
              <Select value={statusFilter} onValueChange={(value) => handleStatusFilterChange(value as 'all' | 'completed' | 'pending')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="completed">Completados</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full md:w-auto">
              <Label className="block mb-2">Fecha inicial</Label>
              <DatePicker
                date={startDate}
                onDateChange={(date) => handleDateChange(date, true)}
              />
            </div>
            
            {filterType === 'week' && (
              <div className="w-full md:w-auto">
                <Label className="block mb-2">Fecha final</Label>
                <DatePicker
                  date={endDate}
                  onDateChange={(date) => handleDateChange(date, false)}
                />
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={setToday}>
              <Calendar className="mr-2 h-4 w-4" /> Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={setThisWeek}>
              <CalendarRange className="mr-2 h-4 w-4" /> Esta semana
            </Button>
            <Button variant="outline" size="sm" onClick={loadDispatchRecords} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Filter className="mr-2 h-4 w-4" />}
              Actualizar datos
            </Button>
          </div>
        </div>
        
        {/* Resumen */}
        <div className="bg-muted/40 p-4 rounded-md">
          <div className="flex flex-col md:flex-row justify-between mb-4">
            <h3 className="text-lg font-medium">
              Registros: {filterType === 'day' ? 'Día' : 'Semana'} - {formatDateRange()}
            </h3>
            <div className="flex items-center gap-2 mt-2 md:mt-0">
              <Badge variant="outline" className="bg-blue-50 text-blue-800">
                {filteredRecords.length} {filteredRecords.length === 1 ? 'registro' : 'registros'}
              </Badge>
              <Badge variant="outline" className="bg-green-50 text-green-800">
                {filteredRecords.filter(r => r.status === 'despachado').length} despachados
              </Badge>
              <Badge variant="outline" className="bg-amber-50 text-amber-800">
                {filteredRecords.filter(r => r.status === 'pendiente' || r.status === 'en_cola').length} pendientes
              </Badge>
              <Badge variant="outline" className="bg-red-50 text-red-800">
                {filteredRecords.filter(r => r.status === 'cancelado').length} cancelados
              </Badge>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => downloadReport('csv')} variant="outline" size="sm" disabled={!filteredRecords.length}>
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button onClick={() => downloadReport('json')} variant="outline" size="sm" disabled={!filteredRecords.length}>
              <Download className="mr-2 h-4 w-4" /> JSON
            </Button>
            <Button onClick={() => downloadReport('excel')} variant="outline" size="sm" disabled={!filteredRecords.length}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
            </Button>
          </div>
        </div>
        
        {/* Tabla de resultados */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
            <p>Cargando registros...</p>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No se encontraron registros con los filtros aplicados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableCaption>Registros de despacho</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Conductor</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.slice(0, 20).map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.name || 'Sin nombre'}</TableCell>
                    <TableCell>
                      {record.start_time ? dateFormat(parseISO(record.start_time), "dd MMM, HH:mm", { locale: es }) : '-'}
                    </TableCell>
                    <TableCell>
                      {record.end_time ? dateFormat(parseISO(record.end_time), "dd MMM, HH:mm", { locale: es }) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={
                          record.status === 'despachado' ? "bg-green-50 text-green-800" :
                          (record.status === 'pendiente' || record.status === 'en_cola') ? "bg-amber-50 text-amber-800" :
                          record.status === 'cancelado' ? "bg-red-50 text-red-800" :
                          "bg-gray-100 text-gray-800"
                        }
                      >
                        {record.status === 'despachado' && 'Despachado'}
                        {(record.status === 'pendiente' || record.status === 'en_cola') && 'Pendiente'}
                        {record.status === 'cancelado' && 'Cancelado'}
                        {!['despachado', 'pendiente', 'en_cola', 'cancelado'].includes(record.status) && record.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredRecords.length > 20 && (
              <div className="text-center text-sm text-muted-foreground mt-2">
                Mostrando 20 de {filteredRecords.length} registros. Descarga el reporte para ver todos.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
