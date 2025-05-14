const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tzjiovkpwkpqckfswfmf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6amlvdmtwd2twcWNrZnN3Zm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxODgxMjIsImV4cCI6MjA2Mjc2NDEyMn0.l6ktBaHuP8CEV3mwSaRLh2JU9Xw_Xl3RK93qEG8dKGQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getTableColumns(tableName) {
  // Query PostgreSQL's information_schema to get column details
  const { data, error } = await supabase
    .rpc('get_table_columns', { table_name: tableName });

  if (error) {
    console.error(`Error getting columns for ${tableName}:`, error);
    
    // Alternative approach: Query using raw SQL
    const { data: columns, error: sqlError } = await supabase
      .from('_tables_schema')
      .select('*')
      .eq('table_name', tableName);
    
    if (sqlError) {
      console.error(`SQL Error getting columns for ${tableName}:`, sqlError);
      return null;
    }
    
    return columns;
  }
  
  return data;
}

async function getTableStructure() {
  console.log('Inspecting table structures...');
  
  // Tables to inspect
  const tables = ['drivers', 'waiting_drivers', 'dispatch_records', 'fraud_alerts'];
  
  // Try direct SQL to get table info from information_schema
  const query = `
    SELECT 
      table_name,
      column_name, 
      data_type,
      is_nullable
    FROM 
      information_schema.columns
    WHERE 
      table_schema = 'public' 
      AND table_name IN ('drivers', 'waiting_drivers', 'dispatch_records', 'fraud_alerts')
    ORDER BY 
      table_name, ordinal_position
  `;

  const { data: schemaData, error: schemaError } = await supabase.rpc('exec_sql', { query });
  
  if (schemaError) {
    console.error('Error querying information_schema:', schemaError);
    
    // Fallback to select * from each table
    for (const table of tables) {
      console.log(`\n===== ${table} =====`);
      const { error } = await supabase.from(table).select('*').limit(1);
      
      if (error) {
        console.error(`Error accessing ${table}:`, error);
      } else {
        // Try to describe the table
        const { data, error: descError } = await supabase.rpc('describe_table', { table_name: table });
        if (descError) {
          console.error(`Error describing ${table}:`, descError);
        } else {
          console.log('Table description:', data);
        }
      }
    }
  } else {
    // Process and display schema information
    const tableColumns = {};
    
    // Group columns by table
    for (const row of schemaData) {
      if (!tableColumns[row.table_name]) {
        tableColumns[row.table_name] = [];
      }
      
      tableColumns[row.table_name].push({
        column_name: row.column_name,
        data_type: row.data_type,
        is_nullable: row.is_nullable
      });
    }
    
    // Display table structures
    for (const tableName in tableColumns) {
      console.log(`\n===== ${tableName} =====`);
      console.log('Columns:');
      tableColumns[tableName].forEach(col => {
        console.log(`  ${col.column_name} (${col.data_type})${col.is_nullable === 'YES' ? ' NULL' : ' NOT NULL'}`);
      });
    }
  }
}

getTableStructure()
  .catch(console.error)
  .finally(() => console.log('Done inspecting tables'));

// Attempt to test connection
async function testConnection() {
  const { data, error } = await supabase.from('_tables').select('*').limit(1);
  if (error) console.error('Connection error:', error);
  else console.log('Connection successful');
}

testConnection(); 