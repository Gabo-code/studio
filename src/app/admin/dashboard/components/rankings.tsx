"use client";

import { useState, useEffect, useCallback } from 'react';
import { store } from '@/lib/store';
import type { DispatchRecord, Driver } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Trophy } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface DriverStats {
  driverId: string;
  name: string;
  dispatchCount: number;
  totalBags: number;
}

export function Rankings() {
  const [dailyStats, setDailyStats] = useState<DriverStats[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<DriverStats[]>([]);
  
  const calculateRankings = useCallback(() => {
    const history = store.getDispatchHistory();
    const masterList = store.getMasterDriverList();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay())).setHours(0,0,0,0); // Start of current week (Sunday)

    const aggregateStats = (records: DispatchRecord[]): DriverStats[] => {
        const statsMap: Map<string, { count: number; bags: number }> = new Map();
        records.forEach(record => {
            const current = statsMap.get(record.id) || { count: 0, bags: 0 };
            current.count += 1;
            current.bags += record.bags;
            statsMap.set(record.id, current);
        });

        return Array.from(statsMap.entries()).map(([driverId, data]) => {
            const driverInfo = masterList.find(d => d.id === driverId);
            return {
                driverId,
                name: driverInfo?.name || 'Unknown Driver',
                dispatchCount: data.count,
                totalBags: data.bags
            };
        }).sort((a, b) => b.dispatchCount - a.dispatchCount || b.totalBags - a.totalBags); // Sort by dispatches, then bags
    };
    
    const dailyRecords = history.filter(r => r.checkoutTime >= todayStart);
    setDailyStats(aggregateStats(dailyRecords));

    const weeklyRecords = history.filter(r => r.checkoutTime >= weekStart);
    setWeeklyStats(aggregateStats(weeklyRecords));

  }, []);

  useEffect(() => {
    calculateRankings();
    const unsubscribe = store.subscribe(calculateRankings);
    return () => unsubscribe();
  }, [calculateRankings]);

  const renderRankingTable = (stats: DriverStats[], period: string) => {
    if (stats.length === 0) {
        return <p className="text-muted-foreground text-center py-8">No data for {period} rankings yet.</p>;
    }
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead className="text-right">Dispatches</TableHead>
                    <TableHead className="text-right">Total Bags</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {stats.map((stat, index) => (
                    <TableRow key={stat.driverId}>
                        <TableCell className="font-medium w-16">
                            {index === 0 && <Trophy className="h-5 w-5 text-yellow-500 inline mr-1" />}
                            {index === 1 && <Trophy className="h-5 w-5 text-gray-400 inline mr-1" />}
                            {index === 2 && <Trophy className="h-5 w-5 text-orange-400 inline mr-1" />}
                            {index + 1}
                        </TableCell>
                        <TableCell>{stat.name}</TableCell>
                        <TableCell className="text-right">{stat.dispatchCount}</TableCell>
                        <TableCell className="text-right">{stat.totalBags}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Driver Rankings</CardTitle>
        <CardDescription>View top performing drivers based on dispatches and bags delivered.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="daily">Daily Rankings</TabsTrigger>
                <TabsTrigger value="weekly">Weekly Rankings</TabsTrigger>
            </TabsList>
            <TabsContent value="daily" className="mt-4">
                {renderRankingTable(dailyStats, "daily")}
            </TabsContent>
            <TabsContent value="weekly" className="mt-4">
                {renderRankingTable(weeklyStats, "weekly")}
            </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
