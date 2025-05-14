'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export function UploadTester() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Por favor selecciona un archivo primero');
      return;
    }
    
    setIsUploading(true);
    setResult(null);
    setError(null);
    
    try {
      // Crear un FormData para enviar el archivo
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload-test', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error HTTP ${response.status}: ${errorData.error || response.statusText}`);
      }
      
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido al subir el archivo');
      console.error('Error en la prueba de subida:', err);
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Prueba de Subida Directa</CardTitle>
        <CardDescription>
          Prueba la subida de archivos directamente a Supabase Storage
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="upload-test" className="block text-sm font-medium">
              Selecciona un archivo para probar
            </label>
            <input
              id="upload-test"
              type="file"
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/90"
              onChange={handleFileChange}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={!file || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Subiendo...
              </>
            ) : (
              'Probar Subida'
            )}
          </Button>
        </form>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
            <p className="font-bold">Error:</p>
            <p className="break-words">{error}</p>
          </div>
        )}
        
        {result && (
          <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">
            <p className="font-bold">Éxito!</p>
            <p><strong>Método:</strong> {result.method}</p>
            <p><strong>Ruta:</strong> {result.filePath}</p>
            <p className="break-words"><strong>URL:</strong> {result.publicUrl}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 