const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://tzjiovkpwkpqckfswfmf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6amlvdmtwd2twcWNrZnN3Zm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxODgxMjIsImV4cCI6MjA2Mjc2NDEyMn0.l6ktBaHuP8CEV3mwSaRLh2JU9Xw_Xl3RK93qEG8dKGQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Función auxiliar para eliminar todos los registros de una tabla de manera segura
async function deleteAllFromTable(tableName) {
  try {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .not('id', 'is', null);
      
    if (error) {
      console.log(`No se pudo limpiar ${tableName}: ${error.message}`);
      return false;
    }
    return true;
  } catch (err) {
    console.log(`Error al limpiar ${tableName}: ${err.message}`);
    return false;
  }
}

// Función para crear una versión limpia de los conductores, manteniendo solo los nombres
async function resetDriverIds() {
  try {
    console.log('Obteniendo conductores existentes...');
    
    // Paso 1: Obtener todos los conductores existentes para mantener sus nombres
    const { data: existingDrivers, error } = await supabase
      .from('drivers')
      .select('name');
    
    if (error) throw error;
    
    if (!existingDrivers || existingDrivers.length === 0) {
      console.log('No se encontraron conductores para restablecer.');
      return;
    }
    
    console.log(`Se encontraron ${existingDrivers.length} conductores.`);
    
    // Paso 2: Eliminar todos los registros existentes en varias tablas
    console.log('Limpiando todas las tablas...');
    
    // Primero limpiamos las tablas dependientes
    await deleteAllFromTable('waiting_drivers');
    await deleteAllFromTable('dispatch_records');
    await deleteAllFromTable('fraud_alerts');
    
    // Luego limpiamos la tabla principal de conductores
    const driversDeleted = await deleteAllFromTable('drivers');
    if (!driversDeleted) {
      throw new Error('No se pudieron eliminar los conductores existentes');
    }
    
    console.log('Tablas limpiadas correctamente.');
    
    // Paso 3: Crear entradas con solo los nombres en la tabla drivers
    console.log('Creando entradas limpias en la tabla drivers...');
    
    const cleanDrivers = existingDrivers.map(driver => ({
      name: driver.name,
      // No incluimos ID para que el sistema genere uno nuevo o lo asigne desde el dispositivo
    }));
    
    const { error: insertError } = await supabase
      .from('drivers')
      .insert(cleanDrivers);
    
    if (insertError) throw insertError;
    
    console.log(`Operación completada. ${cleanDrivers.length} conductores fueron restablecidos.`);
    console.log('Ahora los conductores no tienen IDs asignados y se asociarán');
    console.log('con el primer dispositivo donde ingresen su nombre.');
    
  } catch (error) {
    console.error('Error al restablecer conductores:', error);
  }
}

// Ejecutar la función
resetDriverIds(); 