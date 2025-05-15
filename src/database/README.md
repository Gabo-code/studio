# Database Functions

Este directorio contiene funciones SQL que se deben ejecutar en la base de datos Supabase para habilitar ciertas funcionalidades del sistema.

## Instrucciones para la instalación de funciones

### Función de Rankings de Conductores

La función `get_driver_rankings` permite obtener un ranking de conductores según la cantidad de salidas en un rango de fechas.

Para instalar:

1. Ve al Dashboard de Supabase
2. Navega a "SQL Editor"
3. Crea una nueva consulta
4. Pega el contenido del archivo `driver_rankings.sql`
5. Ejecuta la consulta

### Prueba de la función

Puedes probar la función con la siguiente consulta:

```sql
-- Rankings del día actual
SELECT * FROM get_driver_rankings(
  (CURRENT_DATE)::text, 
  (CURRENT_DATE + interval '1 day')::text, 
  20
);

-- Rankings de la semana actual (Lunes a Domingo)
SELECT * FROM get_driver_rankings(
  (date_trunc('week', CURRENT_DATE) + interval '1 day')::text, 
  (date_trunc('week', CURRENT_DATE) + interval '8 day')::text,
  20
);
```

## Referencia de Parámetros

La función `get_driver_rankings` acepta los siguientes parámetros:

- `start_date`: Fecha inicial del rango (formato ISO)
- `end_date`: Fecha final del rango (formato ISO)
- `limit_count`: Número máximo de conductores a devolver (predeterminado: 20)

## Output

La función devuelve una tabla con los siguientes campos:

- `driver_id`: ID del conductor
- `name`: Nombre del conductor
- `trip_count`: Cantidad de salidas en el período 