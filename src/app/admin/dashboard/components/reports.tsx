"use client";

import { useState, useEffect, useCallback } from 'react';
import { store } from '@/lib/store';
import { subscribe, type DispatchRecord } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download, Filter } from 'lucide-react';
import { Table, TableBody, TableCell, TableCaption, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from 'date-fns';

export function Reports() {
  const [dispatchHistory, setDispatchHistory] = useState<DispatchRecord[]>(store.getDispatchHistory());
  
  const refreshHistory = useCallback(() => {
    setDispatchHistory(store.getDispatchHistory());
  }, []);

  useEffect(() => {
    refreshHistory();
    const unsubscribe = subscribe(refreshHistory);
    return () => unsubscribe();
  }, [refreshHistory]);


  const downloadReport = (format: 'csv' | 'json') => {
    let dataStr;
    let fileName = `dispatch_report_${new Date().toISOString().split('T')[0]}`;

    if (format === 'csv') {
      const headers = "DriverName,PersistentID,CheckInTime,CheckoutTime,Bags,Commune,SelfieTaken,Latitude,Longitude";
      const rows = dispatchHistory.map(r => 
        [
          `"${r.name.replace(/"/g, '""')}"`,
          r.id,
          format(new Date(r.checkInTime), "yyyy-MM-dd HH:mm:ss"),
          format(new Date(r.checkoutTime), "yyyy-MM-dd HH:mm:ss"),
          r.bags,
          `"${String(r.commune).replace(/"/g, '""')}"`,
          r.selfieDataUrl ? 'Yes' : 'No',
          r.location?.latitude || '',
          r.location?.longitude || ''
        ].join(',')
      ).join('\n');
      dataStr = `${headers}\n${rows}`;
      fileName += '.csv';
    } else { // JSON
      dataStr = JSON.stringify(dispatchHistory, null, 2);
      fileName += '.json';
    }

    const blob = new Blob([dataStr], { type: format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json;charset=utf-8;' });
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dispatch Reports</CardTitle>
        <CardDescription>View and download dispatch history.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={() => downloadReport('csv')} variant="outline">
            <Download className="mr-2 h-4 w-4" /> Download CSV
          </Button>
          <Button onClick={() => downloadReport('json')} variant="outline">
            <Download className="mr-2 h-4 w-4" /> Download JSON
          </Button>
          {/* Placeholder for filter button */}
          <Button variant="ghost" disabled>
            <Filter className="mr-2 h-4 w-4" /> Filters (Coming Soon)
          </Button>
        </div>
        
        {dispatchHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No dispatch records found.</p>
        ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableCaption>A list of recent dispatches.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Bags</TableHead>
                <TableHead>Commune</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dispatchHistory.slice(0,10).map((record) => ( // Show recent 10, full list in download
                <TableRow key={record.id + record.checkoutTime}>
                  <TableCell className="font-medium">{record.name}</TableCell>
                  <TableCell>{format(new Date(record.checkInTime), "MMM d, HH:mm")}</TableCell>
                  <TableCell>{format(new Date(record.checkoutTime), "MMM d, HH:mm")}</TableCell>
                  <TableCell>{record.bags}</TableCell>
                  <TableCell>{record.commune}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        )}
      </CardContent>
    </Card>
  );
}
