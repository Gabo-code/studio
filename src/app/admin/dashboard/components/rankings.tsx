"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Trophy, RefreshCcw, Calendar, CalendarRange, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DriverService } from '@/services/driver-service';

interface DriverStats {
  driver_id: string;
  name: string;
  trip_count: number;
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
      
      // Get rankings using DriverService
      const [dailyRankings, weeklyRankings] = await Promise.all([
        DriverService.getDriverRankings(todayStart, todayEnd, 20),
        DriverService.getDriverRankings(weekStart, weekEnd, 20)
      ]);
      
      setDailyStats(dailyRankings);
      setWeeklyStats(weeklyRankings);
    } catch (err) {
      console.error('Error loading ranking data:', err);
      setError('Error al cargar los datos de ranking.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRankingData();
  }, [loadRankingData]);

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            <CardTitle>Rankings de Conductores</CardTitle>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadRankingData}
            disabled={isLoading}
          >
            <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
        <CardDescription>
          Estadísticas de despachos por conductor
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="daily">
          <TabsList className="mb-4">
            <TabsTrigger value="daily" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Hoy
            </TabsTrigger>
            <TabsTrigger value="weekly" className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4" />
              Esta Semana
            </TabsTrigger>
          </TabsList>
          
          {error ? (
            <div className="text-center py-8 text-destructive">
              <p>{error}</p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Cargando rankings...</p>
            </div>
          ) : (
            <>
              <TabsContent value="daily">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">
                      Rankings del Día
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
                    </span>
                  </div>
                  <RankingTable stats={dailyStats} />
                </div>
              </TabsContent>
              
              <TabsContent value="weekly">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">
                      Rankings de la Semana
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      {format(startOfWeek(new Date(), { weekStartsOn: 1 }), "d 'de' MMMM", { locale: es })} 
                      {' - '}
                      {format(endOfWeek(new Date(), { weekStartsOn: 1 }), "d 'de' MMMM", { locale: es })}
                    </span>
                  </div>
                  <RankingTable stats={weeklyStats} />
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function RankingTable({ stats }: { stats: DriverStats[] }) {
  if (stats.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay datos de despachos para mostrar en este período.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12 text-center">#</TableHead>
          <TableHead>Conductor</TableHead>
          <TableHead className="text-right">Despachos</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {stats.map((stat, index) => (
          <TableRow key={stat.driver_id}>
            <TableCell className="text-center font-medium">
              {index + 1}
            </TableCell>
            <TableCell>{stat.name}</TableCell>
            <TableCell className="text-right">
              <Badge variant="secondary">
                {stat.trip_count} {stat.trip_count === 1 ? 'despacho' : 'despachos'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
