// Script d'export automatisé
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://nmwnibzgvwltipmtwhzo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzE4NjkwMywiZXhwIjoyMDY4NzYyOTAzfQ._TeinxeQLZKSowSCUswDR54WejQp1c9y_tkn6MLYh_M'
);

async function exportDatabaseStructure() {
  const export_data = {
    timestamp: new Date().toISOString(),
    database_info: {},
    tables: {},
    sample_data: {}
  };

  try {
    console.log('🔍 Starting database structure export...');

    // 1. Get list of tables using direct SQL
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (tablesError) {
      console.log('⚠️ Could not get tables via API, using manual list...');
      // Fallback to known tables
      export_data.tables.list = [
        'sessions', 'conducteurs', 'reservations', 'destinations'
      ];
    } else {
      export_data.tables.list = tables.map(t => t.table_name);
    }

    console.log(`📋 Found tables: ${export_data.tables.list.join(', ')}`);

    // 2. Get sample data from key tables
    const sampleTables = ['sessions', 'conducteurs', 'reservations'];
    
    for (const tableName of sampleTables) {
      try {
        console.log(`📊 Exporting sample data from ${tableName}...`);
        const { data: sample, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(3);
        
        if (!error && sample) {
          export_data.sample_data[tableName] = sample;
          console.log(`✅ ${tableName}: ${sample.length} rows exported`);
        } else {
          console.log(`⚠️ ${tableName}: ${error ? error.message : 'No data'}`);
          export_data.sample_data[tableName] = [];
        }
      } catch (err) {
        console.log(`❌ Error with ${tableName}:`, err.message);
        export_data.sample_data[tableName] = [];
      }
    }

    // 3. Get table counts
    export_data.table_counts = {};
    for (const tableName of sampleTables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          export_data.table_counts[tableName] = count;
        }
      } catch (err) {
        export_data.table_counts[tableName] = 'unknown';
      }
    }

    // 4. Sauvegarde
    const fileName = 'database_structure_export.json';
    fs.writeFileSync(
      fileName,
      JSON.stringify(export_data, null, 2),
      'utf8'
    );

    console.log(`✅ Export completed: ${fileName}`);
    console.log(`📁 File location: ${process.cwd()}\\${fileName}`);
    
    // 5. Display summary
    console.log('\n📊 SUMMARY:');
    console.log(`Tables found: ${export_data.tables.list.length}`);
    Object.entries(export_data.table_counts).forEach(([table, count]) => {
      console.log(`  - ${table}: ${count} rows`);
    });

  } catch (error) {
    console.error('❌ Export failed:', error.message);
  }
}

exportDatabaseStructure();