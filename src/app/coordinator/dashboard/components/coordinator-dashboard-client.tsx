"use client";

import { useAuthCheck } from '@/hooks/use-auth-check';
import { DriverQueue } from './driver-queue';
import { Button } from '@/components/ui/button';
import { logout } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut, AlertTriangle } from 'lucide-react';
import { store } from '@/lib/store';
import type { WaitingDriver, DispatchRecord, FraudAlert } from '@/types';
import { useState, useEffect, useCallback } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export function CoordinatorDashboardClient() {
  const { subscribe } = store; // Import subscribe explicitly
  const { isLoading, isAuthenticated, role } = useAuthCheck('coordinator');
  const router = useRouter();

  const [waitingDrivers, setWaitingDrivers] = useState<WaitingDriver[]>(store.getWaitingDrivers());
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>(store.getFraudAlerts());

  const refreshData = useCallback(() => {
    setWaitingDrivers(store.getWaitingDrivers());
    setFraudAlerts(store.getFraudAlerts());
  }, []);
  
  useEffect(() => {
    refreshData(); // Initial load
    const unsubscribe = subscribe(refreshData); // Use the imported subscribe function
    return () => unsubscribe();
  }, [refreshData]);


  const handleLogout = () => {
    logout();
    router.replace('/coordinator/login');
  };

  const handleCheckoutDriver = (driverId: string, bags: number, commune: string) => {
    const driverToCheckout = store.getWaitingDrivers().find(d => d.id === driverId);
    if (driverToCheckout) {
      const dispatchRecord: DispatchRecord = {
        ...driverToCheckout,
        checkoutTime: Date.now(),
        bags,
        commune,
        coordinatorId: 'coord001', // Replace with actual coordinator ID if available
      };
      store.addDispatchRecord(dispatchRecord);
      store.removeWaitingDriver(driverId);
      refreshData(); // Update UI
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading Dashboard...</p>
      </div>
    );
  }

  if (!isAuthenticated || role !== 'coordinator') {
    // Auth check hook handles redirection, but this is a fallback or for explicit content hiding.
    return (
        <div className="flex items-center justify-center min-h-[300px]">
            <p className="text-lg text-destructive">Access Denied. Redirecting...</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Driver Queue</h2>
        <Button onClick={handleLogout} variant="outline">
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
      </div>

      {fraudAlerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-destructive">Fraud Alerts</h3>
          {fraudAlerts.map(alert => (
            <Alert key={alert.id} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Potential Fraud Detected</AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
           <Button onClick={() => { store.clearFraudAlerts(); refreshData(); }} variant="outline" size="sm">Clear Alerts</Button>
        </div>
      )}

      <DriverQueue 
        drivers={waitingDrivers} 
        onCheckoutDriver={handleCheckoutDriver} 
      />
    </div>
  );
}
