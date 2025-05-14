import { supabase } from './supabase';

const SELFIE_BUCKET = 'selfies';

export const initializeStorage = async (): Promise<void> => {
  try {
    // Verificar si podemos acceder al bucket
    const { data, error } = await supabase.storage.from(SELFIE_BUCKET).list();
    
    if (error) {
      console.error('Error accediendo al bucket de selfies:', error.message);
      console.error('Error completo:', error);

      // Mostrar información sobre la sesión y URL de Supabase
      console.log('URL de Supabase (desde env):', process.env.NEXT_PUBLIC_SUPABASE_URL);
      const session = await supabase.auth.getSession();
      console.log('Sesión de autenticación:', session ? 'Disponible' : 'No disponible');
    } else {
      console.log(`Bucket "${SELFIE_BUCKET}" accesible correctamente. Contiene ${data.length} archivos.`);
      
      // Intentar una subida de prueba para verificar permisos de escritura
      await testBucketWritePermission();
    }
  } catch (error) {
    console.error('Error al inicializar el almacenamiento:', error);
  }
};

// Función para probar si tenemos permisos de escritura
export const testBucketWritePermission = async (): Promise<boolean> => {
  try {
    // Crear un pequeño archivo de texto para probar
    const testContent = new Blob(['test'], { type: 'text/plain' });
    const testPath = `test-${Date.now()}.txt`;
    
    console.log('Intentando subida de prueba al bucket:', SELFIE_BUCKET);
    
    const { data, error } = await supabase
      .storage
      .from(SELFIE_BUCKET)
      .upload(testPath, testContent, { upsert: true });
      
    if (error) {
      console.error('Error en prueba de escritura:', error);
      return false;
    }
    
    console.log('Prueba de escritura exitosa:', data);
    
    // Eliminar el archivo de prueba
    try {
      await supabase.storage.from(SELFIE_BUCKET).remove([testPath]);
      console.log('Archivo de prueba eliminado');
    } catch (removeError) {
      console.error('No se pudo eliminar el archivo de prueba:', removeError);
    }
    
    return true;
  } catch (error) {
    console.error('Error en prueba de escritura:', error);
    return false;
  }
};

export const getSelfieBucket = (): string => {
  return SELFIE_BUCKET;
};

// Helper function to generate a unique file path for selfies
export const generateSelfieFilePath = (persistentId: string | null): string => {
  const timestamp = new Date().getTime();
  const randomString = Math.random().toString(36).substring(2, 8);
  const fileName = `selfie_${timestamp}_${randomString}.jpg`;
  
  return `${persistentId || 'anonymous'}/${fileName}`;
}; 