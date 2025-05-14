const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://tzjiovkpwkpqckfswfmf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6amlvdmtwd2twcWNrZnN3Zm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxODgxMjIsImV4cCI6MjA2Mjc2NDEyMn0.l6ktBaHuP8CEV3mwSaRLh2JU9Xw_Xl3RK93qEG8dKGQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Lista de nombres y apellidos en español
const nombres = [
  'Juan', 'Carlos', 'Miguel', 'José', 'Antonio', 'Francisco', 'Luis', 'Javier',
  'Manuel', 'Rafael', 'Pedro', 'Fernando', 'David', 'Alberto', 'Santiago',
  'María', 'Ana', 'Carmen', 'Laura', 'Isabel', 'Patricia', 'Elena', 'Cristina'
];

const apellidos = [
  'García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 
  'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Álvarez',
  'Torres', 'Vázquez', 'Serrano', 'Moreno', 'Muñoz', 'Alonso', 'Romero', 'Ortega'
];

// Tipos de vehículos
const tiposVehiculos = ['Auto', 'Moto'];

// Estados posibles para los conductores
const estados = ['disponible', 'ocupado', 'descanso', 'fuera de servicio'];

// Función para generar un nombre completo aleatorio
function generarNombre() {
  const nombre = nombres[Math.floor(Math.random() * nombres.length)];
  const apellido1 = apellidos[Math.floor(Math.random() * apellidos.length)];
  const apellido2 = apellidos[Math.floor(Math.random() * apellidos.length)];
  
  return `${nombre} ${apellido1} ${apellido2}`;
}

// Función para generar nombres únicos
function generarNombresUnicos(cantidad) {
  const nombresGenerados = new Set();
  
  while (nombresGenerados.size < cantidad) {
    nombresGenerados.add(generarNombre());
  }
  
  return Array.from(nombresGenerados);
}

async function limpiarTabla() {
  try {
    console.log('Limpiando tabla de conductores...');
    
    // Eliminar todos los registros existentes
    const { error } = await supabase
      .from('drivers')
      .delete()
      .not('id', 'is', null);
      
    if (error) throw error;
    
    console.log('Tabla limpiada exitosamente.');
  } catch (error) {
    console.error('Error al limpiar la tabla:', error);
    throw error;
  }
}

async function poblarConductores() {
  try {
    // Primero limpiar la tabla
    await limpiarTabla();
    
    console.log('Generando nombres aleatorios...');
    
    // Generar nombres aleatorios únicos (18 en vez de 20, ya que añadiremos 2 específicos)
    const cantidadConductores = 18;
    const nombresUnicos = generarNombresUnicos(cantidadConductores);
    
    console.log(`Se generaron ${nombresUnicos.length} nombres únicos`);
    
    // Crear objetos de conductor con nombre y tipo de vehículo
    const conductores = nombresUnicos.map(nombre => {
      const tipoVehiculo = tiposVehiculos[Math.floor(Math.random() * tiposVehiculos.length)];
      const estado = estados[0]; // Por defecto 'disponible'
      
      return {
        pid: null, // Será asignado cuando el conductor haga check-in
        name: nombre,
        vehicle_type: tipoVehiculo,
        status: estado
      };
    });
    
    // Añadir a Gabriel Maturana y Alejandro Maturana en las posiciones 19 y 20
    conductores.push({
      pid: null,
      name: "Gabriel Maturana",
      vehicle_type: "Auto",
      status: estados[0]
    });
    
    conductores.push({
      pid: null,
      name: "Alejandro Maturana",
      vehicle_type: "Auto",
      status: estados[0]
    });
    
    console.log('Insertando conductores en la base de datos...');
    
    const { data, error } = await supabase
      .from('drivers')
      .insert(conductores)
      .select();
      
    if (error) {
      throw error;
    }
    
    console.log(`Se insertaron ${data.length} conductores exitosamente:`);
    data.forEach((conductor, index) => {
      console.log(`${index + 1}. ${conductor.name} - ${conductor.vehicle_type} - ${conductor.status}`);
    });
    
  } catch (error) {
    console.error('Error al poblar la tabla de conductores:', error);
  }
}

// Ejecutar la función
poblarConductores(); 