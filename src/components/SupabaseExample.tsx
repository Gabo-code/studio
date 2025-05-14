'use client';

import { useState, useEffect } from 'react';
import { 
  driversAdapter, 
  waitingDriversAdapter, 
  dispatchRecordsAdapter, 
  fraudAlertsAdapter 
} from '@/lib/supabase-adapter';
import { Driver, WaitingDriver, DispatchRecord, FraudAlert } from '@/types';

export default function SupabaseExample() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [waitingDrivers, setWaitingDrivers] = useState<WaitingDriver[]>([]);
  const [dispatchRecords, setDispatchRecords] = useState<DispatchRecord[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [loading, setLoading] = useState({
    drivers: true,
    waitingDrivers: true,
    dispatchRecords: true,
    fraudAlerts: true,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch drivers
        setLoading(prev => ({ ...prev, drivers: true }));
        const fetchedDrivers = await driversAdapter.getAll();
        setDrivers(fetchedDrivers);
        setLoading(prev => ({ ...prev, drivers: false }));

        // Fetch waiting drivers
        setLoading(prev => ({ ...prev, waitingDrivers: true }));
        const fetchedWaitingDrivers = await waitingDriversAdapter.getAll();
        setWaitingDrivers(fetchedWaitingDrivers);
        setLoading(prev => ({ ...prev, waitingDrivers: false }));

        // Fetch dispatch records
        setLoading(prev => ({ ...prev, dispatchRecords: true }));
        const fetchedDispatchRecords = await dispatchRecordsAdapter.getAll();
        setDispatchRecords(fetchedDispatchRecords);
        setLoading(prev => ({ ...prev, dispatchRecords: false }));

        // Fetch fraud alerts
        setLoading(prev => ({ ...prev, fraudAlerts: true }));
        const fetchedFraudAlerts = await fraudAlertsAdapter.getAll();
        setFraudAlerts(fetchedFraudAlerts);
        setLoading(prev => ({ ...prev, fraudAlerts: false }));
      } catch (e) {
        setError(`Error fetching data: ${e instanceof Error ? e.message : String(e)}`);
        setLoading({
          drivers: false,
          waitingDrivers: false,
          dispatchRecords: false,
          fraudAlerts: false,
        });
      }
    }

    fetchData();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Supabase Database Structure</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Drivers Table */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">drivers</h2>
          {loading.drivers ? (
            <p>Loading...</p>
          ) : (
            <div>
              <p className="mb-2"><strong>Columns:</strong> id (string), name (string)</p>
              <p className="mb-2"><strong>Records:</strong> {drivers.length}</p>
              {drivers.length > 0 && (
                <pre className="bg-gray-100 p-2 rounded text-xs">
                  {JSON.stringify(drivers[0], null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
        
        {/* Waiting Drivers Table */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">waiting_drivers</h2>
          {loading.waitingDrivers ? (
            <p>Loading...</p>
          ) : (
            <div>
              <p className="mb-2">
                <strong>Columns:</strong> id (string), name (string), checkInTime (number), 
                selfieDataUrl (string, optional), location (json, optional)
              </p>
              <p className="mb-2"><strong>Records:</strong> {waitingDrivers.length}</p>
              {waitingDrivers.length > 0 && (
                <pre className="bg-gray-100 p-2 rounded text-xs">
                  {JSON.stringify(waitingDrivers[0], null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
        
        {/* Dispatch Records Table */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">dispatch_records</h2>
          {loading.dispatchRecords ? (
            <p>Loading...</p>
          ) : (
            <div>
              <p className="mb-2">
                <strong>Columns:</strong> id (string), name (string), checkInTime (number), 
                selfieDataUrl (string, optional), location (json, optional), 
                checkoutTime (number), bags (number), commune (string), 
                coordinatorId (string)
              </p>
              <p className="mb-2"><strong>Records:</strong> {dispatchRecords.length}</p>
              {dispatchRecords.length > 0 && (
                <pre className="bg-gray-100 p-2 rounded text-xs">
                  {JSON.stringify(dispatchRecords[0], null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
        
        {/* Fraud Alerts Table */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">fraud_alerts</h2>
          {loading.fraudAlerts ? (
            <p>Loading...</p>
          ) : (
            <div>
              <p className="mb-2">
                <strong>Columns:</strong> id (string), type (string), message (string), 
                driverName (string), persistentId (string), timestamp (number)
              </p>
              <p className="mb-2"><strong>Records:</strong> {fraudAlerts.length}</p>
              {fraudAlerts.length > 0 && (
                <pre className="bg-gray-100 p-2 rounded text-xs">
                  {JSON.stringify(fraudAlerts[0], null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 