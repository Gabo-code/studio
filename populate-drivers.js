const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

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

// Estados posibles para los conductores
const estados = ['disponible', 'ocupado', 'descanso', 'fuera de servicio'];

// Función para generar un nombre completo aleatorio
function generarNombre() {
  const nombre = nombres[Math.floor(Math.random() * nombres.length)];
  const apellido1 = apellidos[Math.floor(Math.random() * apellidos.length)];
  const apellido2 = apellidos[Math.floor(Math.random() * apellidos.length)];
  
  return `${nombre} ${apellido1} ${apellido2}`;
}

// Función para generar un ID de vehículo aleatorio
function generarVehiculoId() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const letra1 = letras[Math.floor(Math.random() * letras.length)];
  const letra2 = letras[Math.floor(Math.random() * letras.length)];
  const numeros = Math.floor(1000 + Math.random() * 9000); // 4 dígitos
  
  return `${letra1}${letra2}-${numeros}`;
}

// Función para generar un estado aleatorio
function generarEstado() {
  return estados[Math.floor(Math.random() * estados.length)];
}

// Función para generar los conductores e insertarlos
async function poblarTablaDrivers(cantidad = 20) {
  console.log(`Generando ${cantidad} conductores aleatorios...`);
  
  const conductores = [];
  
  for (let i = 0; i < cantidad; i++) {
    const conductor = {
      id: uuidv4(),
      name: generarNombre(),
      vehicle_id: generarVehiculoId(),
      status: generarEstado()
    };
    
    conductores.push(conductor);
  }
  
  console.log('Insertando conductores en la base de datos...');
  const { data, error } = await supabase
    .from('drivers')
    .insert(conductores);
    
  if (error) {
    console.error('Error al insertar los conductores:', error);
    return false;
  }
  
  console.log(`¡${cantidad} conductores insertados con éxito!`);
  console.log('Conductores generados:');
  conductores.forEach((conductor, index) => {
    console.log(`${index + 1}. ${conductor.name} (${conductor.vehicle_id}) - ${conductor.status}`);
  });
  
  return true;
}

// Ejecutar la función
poblarTablaDrivers()
  .catch(console.error); 