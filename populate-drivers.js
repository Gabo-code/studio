const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Configuración de Supabase (usando service_role key en lugar de anon key)
const supabaseUrl = "https://tzjiovkpwkpqckfswfmf.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6amlvdmtwd2twcWNrZnN3Zm1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzE4ODEyMiwiZXhwIjoyMDYyNzY0MTIyfQ.zjR6Odq71l5wOM9dJ1vEJJK6lCEsfZAVF8PU8KSKLAo";

// Crear cliente con permisos de servicio
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Lista de conductores de prueba
const conductores = [
  {
    name: 'Juan Pérez',
    vehicle_type: 'auto',
    status: 'inactivo',
    bags_balance: 0,
    pid: null
  },
  {
    name: 'María González',
    vehicle_type: 'auto',
    status: 'inactivo',
    bags_balance: 0,
    pid: null
  },
  {
    name: 'Carlos Rodríguez',
    vehicle_type: 'moto',
    status: 'inactivo',
    bags_balance: 0,
    pid: null
  },
  {
    name: 'Ana Martínez',
    vehicle_type: 'auto',
    status: 'inactivo',
    bags_balance: 0,
    pid: null
  },
  {
    name: 'Luis Torres',
    vehicle_type: 'moto',
    status: 'inactivo',
    bags_balance: 0,
    pid: null
  }
];

async function poblarConductores() {
  try {
    console.log('Conectando a Supabase con permisos de servicio...');
    
    // Primero, verificar conexión
    const { data: testData, error: testError } = await supabase
      .from('drivers')
      .select('count');
      
    if (testError) {
      console.error('Error de conexión:', testError);
      return;
    }
    
    console.log('Conexión exitosa a Supabase');
    
    // Verificar si ya hay conductores
    const { data: existingDrivers, error: countError } = await supabase
      .from('drivers')
      .select('id');

    if (countError) {
      throw countError;
    }

    if (existingDrivers && existingDrivers.length > 0) {
      console.log(`Ya existen ${existingDrivers.length} conductores en la base de datos.`);
      console.log('¿Deseas continuar y agregar más conductores? (Ctrl+C para cancelar)');
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 segundos para cancelar
    }

    // Insertar los conductores
    console.log('Iniciando inserción de conductores...');
    
    for (const conductor of conductores) {
      const { error } = await supabase
        .from('drivers')
        .insert([{
          id: uuidv4(), // Generar UUID único para cada conductor
          ...conductor
        }]);

      if (error) {
        console.error(`Error al insertar conductor ${conductor.name}:`, error);
      } else {
        console.log(`✓ Conductor agregado: ${conductor.name} (${conductor.vehicle_type})`);
      }
    }

    console.log('\nProceso completado.');
    
    // Verificar conductores finales
    const { data: finalDrivers, error: finalError } = await supabase
      .from('drivers')
      .select('name, vehicle_type, status')
      .order('name');
      
    if (!finalError && finalDrivers) {
      console.log('\nConductores en la base de datos:');
      finalDrivers.forEach((d, i) => {
        console.log(`${i + 1}. ${d.name} (${d.vehicle_type}) - ${d.status}`);
      });
    }
    
  } catch (error) {
    console.error('Error durante la población de datos:', error);
  }
}

// Ejecutar el script
console.log('Iniciando script de población de conductores...\n');
poblarConductores(); // Solo una vez 