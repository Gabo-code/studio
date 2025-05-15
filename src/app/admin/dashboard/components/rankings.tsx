"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Trophy, RefreshCcw, Calendar, CalendarRange, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DriverStats {
  driver_id: string;
  name: string;
  trip_count: number;
}

interface QueryResultItem {
  driver_id: string;
  name: string;
  count: string; // Supabase returns count as string
}

export function Rankings() {
  const [dailyStats, setDailyStats] = useState<DriverStats[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<DriverStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const loadRankingData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const now = new Date();
      
      // Daily range (today)
      const todayStart = startOfDay(now).toISOString();
      const todayEnd = endOfDay(now).toISOString();
      
      // Weekly range (current week: Monday to Sunday)
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString(); // Monday as first day
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString(); // Sunday as last day
      
      // Using raw SQL queries for aggregations
      const dailyQuery = await supabase.rpc('get_driver_rankings', { 
        start_date: todayStart,
        end_date: todayEnd,
        limit_count: 20
      });
      
      const weeklyQuery = await supabase.rpc('get_driver_rankings', {
        start_date: weekStart,
        end_date: weekEnd,
        limit_count: 20
      });
      
      if (dailyQuery.error) {
        console.error('Error en consulta diaria:', dailyQuery.error);
        // Fallback to direct query approach
        await loadWithDirectQuery(todayStart, todayEnd, weekStart, weekEnd);
        return;
      }
      
      if (weeklyQuery.error) {
        console.error('Error en consulta semanal:', weeklyQuery.error);
        // Fallback to direct query approach
        await loadWithDirectQuery(todayStart, todayEnd, weekStart, weekEnd);
        return;
      }
      
      // Process results
      setDailyStats(dailyQuery.data || []);
      setWeeklyStats(weeklyQuery.data || []);
    } catch (err) {
      console.error('Error loading ranking data:', err);
      setError('Error al cargar los datos de ranking.');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Fallback function that uses direct SQL query when RPC function isn't available
  const loadWithDirectQuery = async (todayStart: string, todayEnd: string, weekStart: string, weekEnd: string) => {
    try {
      // Direct SQL query for daily stats
      const dailyQueryRaw = await supabase.from('dispatch_records')
        .select('driver_id, name')
        .gte('start_time', todayStart)
        .lte('start_time', todayEnd);
        
      // Direct SQL query for weekly stats  
      const weeklyQueryRaw = await supabase.from('dispatch_records')
        .select('driver_id, name')
        .gte('start_time', weekStart)
        .lte('start_time', weekEnd);
        
      if (dailyQueryRaw.error) {
        throw dailyQueryRaw.error;
      }
      
      if (weeklyQueryRaw.error) {
        throw weeklyQueryRaw.error;
      }
      
      // Process daily results manually by counting occurrences
      const dailyCounts = new Map<string, { name: string, count: number }>();
      dailyQueryRaw.data.forEach(record => {
        const existing = dailyCounts.get(record.driver_id);
        if (existing) {
          existing.count++;
        } else {
          dailyCounts.set(record.driver_id, { name: record.name, count: 1 });
        }
      });
      
      // Process weekly results manually
      const weeklyCounts = new Map<string, { name: string, count: number }>();
      weeklyQueryRaw.data.forEach(record => {
        const existing = weeklyCounts.get(record.driver_id);
        if (existing) {
          existing.count++;
        } else {
          weeklyCounts.set(record.driver_id, { name: record.name, count: 1 });
        }
      });
      
      // Convert to arrays and sort
      const dailyStats: DriverStats[] = Array.from(dailyCounts.entries())
        .map(([driver_id, data]) => ({
          driver_id,
          name: data.name,
          trip_count: data.count
        }))
        .filter(item => item.trip_count > 0)
        .sort((a, b) => b.trip_count - a.trip_count)
        .slice(0, 20);
        
      const weeklyStats: DriverStats[] = Array.from(weeklyCounts.entries())
        .map(([driver_id, data]) => ({
          driver_id,
          name: data.name,
          trip_count: data.count
        }))
        .filter(item => item.trip_count > 0)
        .sort((a, b) => b.trip_count - a.trip_count)
        .slice(0, 20);
      
      setDailyStats(dailyStats);
      setWeeklyStats(weeklyStats);
    } catch (err) {
      console.error('Error with direct query fallback:', err);
      setError('Error al cargar los datos de ranking.');
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadRankingData();
    
    // Set up interval to refresh data every 5 minutes
    const refreshInterval = setInterval(loadRankingData, 5 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, [loadRankingData]);

  const renderRankingTable = (stats: DriverStats[], period: string) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
          <p>Cargando datos de ranking...</p>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="text-destructive text-center py-8">
          {error}
        </div>
      );
    }
    
    if (stats.length === 0) {
      return (
        <div className="text-muted-foreground text-center py-8">
          <p>No hay conductores con salidas en este período.</p>
          <p className="text-sm mt-2">Solo se muestran conductores con al menos 1 salida.</p>
        </div>
      );
    }
    
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Puesto</TableHead>
            <TableHead>Conductor</TableHead>
            <TableHead className="text-right">Salidas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats.map((stat, index) => (
            <TableRow key={stat.driver_id}>
              <TableCell className="font-medium">
                {index === 0 && <Trophy className="h-5 w-5 text-yellow-500 inline mr-1" />}
                {index === 1 && <Trophy className="h-5 w-5 text-gray-400 inline mr-1" />}
                {index === 2 && <Trophy className="h-5 w-5 text-orange-400 inline mr-1" />}
                {index + 1}
              </TableCell>
              <TableCell>{stat.name}</TableCell>
              <TableCell className="text-right">
                <Badge variant="secondary">{stat.trip_count}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const formatDateRange = (periodType: 'daily' | 'weekly') => {
    const now = new Date();
    
    if (periodType === 'daily') {
      return format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
    } else {
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      return `Lunes ${format(weekStart, "d")} al Domingo ${format(weekEnd, "d 'de' MMMM 'de' yyyy", { locale: es })}`;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl font-bold flex items-center">
            <BarChart className="mr-2 h-5 w-5 text-primary" /> 
            Ranking de Conductores
          </CardTitle>
          <CardDescription>
            Conductores con más salidas del día y de la semana
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadRankingData}
          disabled={isLoading}
        >
          {isLoading ? 
            <Loader2 className="h-4 w-4 animate-spin mr-1" /> : 
            <RefreshCcw className="h-4 w-4 mr-1" />}
          Actualizar
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="daily" className="flex items-center">
              <Calendar className="mr-2 h-4 w-4" />
              Ranking Diario
            </TabsTrigger>
            <TabsTrigger value="weekly" className="flex items-center">
              <CalendarRange className="mr-2 h-4 w-4" />
              Ranking Semanal
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="daily" className="mt-4">
            <div className="mb-4 text-sm text-muted-foreground">
              {formatDateRange('daily')}
            </div>
            {renderRankingTable(dailyStats, "diario")}
          </TabsContent>
          
          <TabsContent value="weekly" className="mt-4">
            <div className="mb-4 text-sm text-muted-foreground">
              {formatDateRange('weekly')}
            </div>
            {renderRankingTable(weeklyStats, "semanal")}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
