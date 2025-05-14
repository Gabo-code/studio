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
import { store } from '@/lib/store';
import type { FraudAlert } from '@/types';
import { useState, useEffect, useCallback } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';


export function AdminDashboardClient() {
  const { isLoading, isAuthenticated, role } = useAuthCheck('admin');
  const router = useRouter();

  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>(store.getFraudAlerts());

  const refreshAlerts = useCallback(() => {
    setFraudAlerts(store.getFraudAlerts());
  }, []);

  useEffect(() => {
    refreshAlerts(); // Initial load
    const unsubscribe = store.subscribe(refreshAlerts); // Subscribe to store changes
    return () => unsubscribe(); // Cleanup subscription
  }, [refreshAlerts]);

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
        <h2 className="text-2xl font-semibold">System Management</h2>
        <Button onClick={handleLogout} variant="outline">
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
      </div>

      {fraudAlerts.length > 0 && (
        <div className="space-y-2 my-6 p-4 border border-destructive/50 rounded-lg bg-destructive/10">
          <h3 className="text-xl font-semibold text-destructive">Active Fraud Alerts</h3>
          {fraudAlerts.map(alert => (
            <Alert key={alert.id} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Potential Fraud Detected</AlertTitle>
              <AlertDescription>{alert.message} (Driver: {alert.driverName}, ID: {alert.persistentId})</AlertDescription>
            </Alert>
          ))}
           <Button onClick={() => { store.clearFraudAlerts(); refreshAlerts(); }} variant="outline" size="sm" className="mt-2 border-destructive text-destructive hover:bg-destructive/20">Clear All Alerts</Button>
        </div>
      )}

      <Tabs defaultValue="drivers" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="drivers">Driver Management</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
        </TabsList>
        <TabsContent value="drivers" className="mt-4 p-4 border rounded-md bg-card shadow">
          <DriverManagement />
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
