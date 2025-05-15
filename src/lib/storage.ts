import { supabase } from './supabase';

const SELFIE_BUCKET = 'selfies';

export const initializeStorage = async (): Promise<void> => {
  try {
    // Verificar si podemos acceder al bucket
    const { error } = await supabase.storage.from(SELFIE_BUCKET).list();
    
    if (error) {
      console.error('Error accediendo al bucket de selfies:', error.message);
    }
  } catch (error) {
    console.error('Error al inicializar el almacenamiento:', error);
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