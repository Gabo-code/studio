"use client";

import { useAuthCheck } from '@/hooks/use-auth-check';
import { Button } from '@/components/ui/button';
import { logout } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Reports } from './reports';
import { Rankings } from './rankings';
import { DriverManagement } from './driver-management';
import { WaitingQueueManager } from './waiting-queue-manager';
import { DriverImporter } from './driver-importer';
import { useState, useEffect } from 'react';

export function AdminDashboardClient() {
  const { isLoading, isAuthenticated, role } = useAuthCheck('admin');
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/admin/login');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading Dashboard...</p>
      </div>
    );
  }

  if (!isAuthenticated || role !== 'admin') {
    return (
        <div className="flex items-center justify-center min-h-[300px]">
            <p className="text-lg text-destructive">Access Denied. Redirecting...</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Gestión del Sistema</h2>
        <Button onClick={handleLogout} variant="outline">
          <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
        </Button>
      </div>

      <Tabs defaultValue="drivers" className="w-full">
        <TabsList className="flex flex-wrap gap-2 w-full">
          <TabsTrigger value="drivers">Gestión de Conductores</TabsTrigger>
          <TabsTrigger value="driverImporter">Importar Conductores</TabsTrigger>
          <TabsTrigger value="waitingQueue">Cola de Espera</TabsTrigger>
          <TabsTrigger value="reports">Reportes</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
        </TabsList>
        <TabsContent value="drivers" className="mt-4 p-4 border rounded-md bg-card shadow">
          <DriverManagement />
        </TabsContent>
        <TabsContent value="driverImporter" className="mt-4 p-4 border rounded-md bg-card shadow">
          <DriverImporter />
        </TabsContent>
        <TabsContent value="waitingQueue" className="mt-4 p-4 border rounded-md bg-card shadow">
          <WaitingQueueManager />
        </TabsContent>
        <TabsContent value="reports" className="mt-4 p-4 border rounded-md bg-card shadow">
          <Reports />
        </TabsContent>
        <TabsContent value="rankings" className="mt-4 p-4 border rounded-md bg-card shadow">
          <Rankings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
