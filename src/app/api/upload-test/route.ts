import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSelfieBucket } from '@/lib/storage';

export const POST = async (req: NextRequest) => {
  console.log('Recibida solicitud de prueba de subida');
  
  try {
    // Extraer la parte de forma data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { 
          error: 'No se proporcionó ningún archivo' 
        }, 
        { status: 400 }
      );
    }
    
    console.log('Archivo recibido:', file.name, file.size, file.type);
    
    // Crear un ID único para el archivo
    const filePath = `test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.txt`;
    const bucket = getSelfieBucket();
    
    console.log('Intentando subir a:', bucket, filePath);
    
    // 1. Intentar con el cliente Supabase
    try {
      const { data, error } = await supabase
        .storage
        .from(bucket)
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true
        });
        
      if (error) {
        console.error('Error Supabase:', error);
        throw error;
      }
      
      console.log('Subida exitosa con Supabase:', data);
      
      // Obtener URL pública
      const { data: urlData } = supabase
        .storage
        .from(bucket)
        .getPublicUrl(filePath);
      
      return NextResponse.json({
        success: true,
        method: 'supabase',
        filePath,
        publicUrl: urlData.publicUrl,
      });
    } catch (supabaseError) {
      console.error('Excepción con cliente Supabase:', supabaseError);
      
      // 2. Intentar con fetch directo
      try {
        console.log('Intentando con fetch directo...');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Falta configuración de Supabase');
        }
        
        const directUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`;
        
        // Crear un FormData para la solicitud directa
        const directFormData = new FormData();
        directFormData.append('file', file);
        
        const response = await fetch(directUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: directFormData
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error HTTP: ${response.status} - ${response.statusText}. ${errorText}`);
        }
        
        const responseData = await response.json();
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
        
        return NextResponse.json({
          success: true,
          method: 'fetch',
          filePath,
          publicUrl,
          responseData
        });
      } catch (fetchError) {
        console.error('Error con fetch directo:', fetchError);
        // Devolver el error original de Supabase si la alternativa también falla
        throw supabaseError;
      }
    }
  } catch (error) {
    console.error('Error procesando la solicitud:', error);
    
    let errorMessage = 'Error desconocido';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error);
    }
    
    return NextResponse.json(
      { 
        error: 'Error al procesar la subida', 
        details: errorMessage
      }, 
      { status: 500 }
    );
  }
} 