'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X } from 'lucide-react';

// Tipo para un registro de error
export type ErrorLogEntry = {
  id: string;
  timestamp: number;
  message: string;
  context?: string;
  details?: any;
};

// Store para los errores
class ErrorLogger {
  private static instance: ErrorLogger;
  private logs: ErrorLogEntry[] = [];
  private listeners: ((logs: ErrorLogEntry[]) => void)[] = [];
  
  private constructor() {
    // Singleton
  }
  
  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }
  
  public addLog(error: Omit<ErrorLogEntry, 'id' | 'timestamp'>): void {
    const entry: ErrorLogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      ...error
    };
    
    this.logs = [entry, ...this.logs].slice(0, 20); // Mantener solo los últimos 20
    this.notifyListeners();
  }
  
  public getLogs(): ErrorLogEntry[] {
    return [...this.logs];
  }
  
  public clearLogs(): void {
    this.logs = [];
    this.notifyListeners();
  }
  
  public subscribe(listener: (logs: ErrorLogEntry[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener([...this.logs]);
    }
  }
}

// Exportar singleton
export const errorLogger = ErrorLogger.getInstance();

export function ErrorLogViewer() {
  const [logs, setLogs] = useState<ErrorLogEntry[]>([]);
  const [expanded, setExpanded] = useState(false);
  
  useEffect(() => {
    const unsubscribe = errorLogger.subscribe(setLogs);
    return unsubscribe;
  }, []);
  
  if (logs.length === 0) {
    return null;
  }
  
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };
  
  return (
    <div className={`fixed bottom-0 right-0 z-50 transition-all duration-200 ${expanded ? 'w-full md:w-96 h-80' : 'w-14 h-14'}`}>
      {expanded ? (
        <Card className="w-full h-full flex flex-col">
          <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Registro de Errores</CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => errorLogger.clearLogs()}>
                Limpiar
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpanded(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full p-3">
              {logs.map(log => (
                <div key={log.id} className="mb-3 border-b pb-2 last:border-0">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{formatTime(log.timestamp)}</span>
                    {log.context && <span>{log.context}</span>}
                  </div>
                  <p className="text-sm">{log.message}</p>
                  {log.details && (
                    <pre className="text-xs bg-muted p-2 mt-1 rounded overflow-x-auto">
                      {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <Button 
          onClick={() => setExpanded(true)}
          className="h-14 w-14 rounded-full shadow-lg"
          variant={logs.length > 0 ? "destructive" : "default"}
        >
          {logs.length}
        </Button>
      )}
    </div>
  );
} 