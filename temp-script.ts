import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tzjiovkpwkpqckfswfmf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6amlvdmtwd2twcWNrZnN3Zm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxODgxMjIsImV4cCI6MjA2Mjc2NDEyMn0.l6ktBaHuP8CEV3mwSaRLh2JU9Xw_Xl3RK93qEG8dKGQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getTableStructure() {
  console.log('Inspecting table structures...');
  
  // Tables to inspect
  const tables = ['drivers', 'waiting_drivers', 'dispatch_records', 'fraud_alerts'];
  
  for (const table of tables) {
    console.log(`\n===== ${table} =====`);
    
    // Get table data to see structure
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
      
    if (error) {
      console.error(`Error inspecting ${table}:`, error);
    } else if (data && data.length > 0) {
      console.log('Columns:', Object.keys(data[0]).join(', '));
      console.log('Sample row:', JSON.stringify(data[0], null, 2));
    } else {
      console.log('Table exists but is empty - fetching any records to see structure');
      
      // Try to get any records to see structure
      const { data: allData, error: allError } = await supabase
        .from(table)
        .select('*')
        .limit(5);
        
      if (allError) {
        console.error(`Error getting records from ${table}:`, allError);
      } else if (allData && allData.length > 0) {
        console.log('Columns:', Object.keys(allData[0]).join(', '));
      } else {
        console.log('No records found in table');
      }
    }
  }
}

getTableStructure()
  .catch(console.error)
  .finally(() => console.log('Done inspecting tables')); 