'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X } from 'lucide-react';

// Definimos un tipo más específico para nuestros resultados
type DiagnosticResult = {
  envVars?: boolean;
  supabaseUrl?: string | null;
  dbConnection?: boolean;
  bucketsListable?: boolean;
  bucketsCount?: number;
  bucketExists?: boolean;
  bucketAccessible?: boolean;
  filesCount?: number;
  uploadTest?: boolean;
  publicUrl?: string;
  storageError?: boolean;
};

export function StorageDiagnostics() {
  const [isChecking, setIsChecking] = useState(false);
  const [checkResults, setCheckResults] = useState<DiagnosticResult>({});
  const [error, setError] = useState<string | null>(null);
  
  const runDiagnostics = async () => {
    setIsChecking(true);
    setError(null);
    const results: DiagnosticResult = {};
    
    try {
      // Comprobar variables de entorno
      results.envVars = !!process.env.NEXT_PUBLIC_SUPABASE_URL && 
                       !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      results.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || null;
      
      // Comprobar conexión a Supabase
      try {
        const { data, error: pingError } = await supabase.from('drivers').select('count').limit(1);
        results.dbConnection = !pingError;
      } catch (e) {
        results.dbConnection = false;
      }
      
      // Comprobar acceso al Storage API
      const bucketName = 'selfies';
      try {
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        results.bucketsListable = !bucketsError;
        
        if (buckets) {
          results.bucketsCount = buckets.length;
          const bucketExists = buckets.some(b => b.name === bucketName);
          results.bucketExists = bucketExists;
          
          if (bucketExists) {
            // Intentar listar archivos en el bucket
            const { data: files, error: listError } = await supabase.storage.from(bucketName).list();
            results.bucketAccessible = !listError;
            
            if (files) {
              results.filesCount = files.length;
            }
            
            // Intentar subir un archivo de prueba
            const testContent = new Blob(['test'], { type: 'text/plain' });
            const testPath = `diagnostics-test-${Date.now()}.txt`;
            
            const { data: uploadData, error: uploadError } = await supabase
              .storage
              .from(bucketName)
              .upload(testPath, testContent, { upsert: true });
              
            results.uploadTest = !uploadError;
            
            if (!uploadError && uploadData) {
              // Obtener URL pública
              const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(testPath);
              results.publicUrl = urlData.publicUrl;
              
              // Limpiar el archivo de prueba
              await supabase.storage.from(bucketName).remove([testPath]);
            }
          }
        }
      } catch (storageError) {
        console.error('Error diagnosticando storage:', storageError);
        setError(storageError instanceof Error ? storageError.message : 'Error desconocido');
        results.storageError = true;
      }
      
    } catch (e) {
      console.error('Error ejecutando diagnósticos:', e);
      setError(e instanceof Error ? e.message : 'Error desconocido durante diagnóstico');
    } finally {
      setIsChecking(false);
      setCheckResults(results);
    }
  };
  
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Diagnóstico de Storage</CardTitle>
        <CardDescription>
          Verifica la conexión y permisos para Supabase Storage
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isChecking ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="animate-spin h-8 w-8 mr-2" />
            <p>Ejecutando diagnósticos...</p>
          </div>
        ) : Object.keys(checkResults).length > 0 ? (
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Resultados:</h3>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="font-medium">Variables de entorno:</div>
              <div className="flex items-center">
                {checkResults.envVars ? 
                  <Badge variant="outline" className="bg-green-50"><Check className="h-3 w-3 mr-1" /> OK</Badge> : 
                  <Badge variant="outline" className="bg-red-50"><X className="h-3 w-3 mr-1" /> Fallo</Badge>}
              </div>
              
              <div className="font-medium">URL de Supabase:</div>
              <div>{checkResults.supabaseUrl || 'No disponible'}</div>
              
              <div className="font-medium">Conexión a base de datos:</div>
              <div className="flex items-center">
                {checkResults.dbConnection ? 
                  <Badge variant="outline" className="bg-green-50"><Check className="h-3 w-3 mr-1" /> OK</Badge> : 
                  <Badge variant="outline" className="bg-red-50"><X className="h-3 w-3 mr-1" /> Fallo</Badge>}
              </div>
              
              <div className="font-medium">Buckets listables:</div>
              <div className="flex items-center">
                {checkResults.bucketsListable ? 
                  <Badge variant="outline" className="bg-green-50"><Check className="h-3 w-3 mr-1" /> OK ({checkResults.bucketsCount} buckets)</Badge> : 
                  <Badge variant="outline" className="bg-red-50"><X className="h-3 w-3 mr-1" /> Fallo</Badge>}
              </div>
              
              <div className="font-medium">Bucket 'selfies' existe:</div>
              <div className="flex items-center">
                {checkResults.bucketExists ? 
                  <Badge variant="outline" className="bg-green-50"><Check className="h-3 w-3 mr-1" /> OK</Badge> : 
                  <Badge variant="outline" className="bg-red-50"><X className="h-3 w-3 mr-1" /> No existe</Badge>}
              </div>
              
              {checkResults.bucketExists && (
                <>
                  <div className="font-medium">Acceso al bucket:</div>
                  <div className="flex items-center">
                    {checkResults.bucketAccessible ? 
                      <Badge variant="outline" className="bg-green-50"><Check className="h-3 w-3 mr-1" /> OK ({checkResults.filesCount} archivos)</Badge> : 
                      <Badge variant="outline" className="bg-red-50"><X className="h-3 w-3 mr-1" /> No accesible</Badge>}
                  </div>
                  
                  <div className="font-medium">Prueba de subida:</div>
                  <div className="flex items-center">
                    {checkResults.uploadTest ? 
                      <Badge variant="outline" className="bg-green-50"><Check className="h-3 w-3 mr-1" /> OK</Badge> : 
                      <Badge variant="outline" className="bg-red-50"><X className="h-3 w-3 mr-1" /> Fallo</Badge>}
                  </div>
                  
                  {checkResults.publicUrl && (
                    <>
                      <div className="font-medium">URL pública generada:</div>
                      <div className="text-xs break-all">{checkResults.publicUrl}</div>
                    </>
                  )}
                </>
              )}
            </div>
            
            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={runDiagnostics} 
          disabled={isChecking}
          className="w-full"
        >
          {isChecking ? (
            <>
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
              Comprobando...
            </>
          ) : (
            'Ejecutar diagnóstico'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 