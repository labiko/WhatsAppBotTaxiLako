const fs = require('fs');

console.log('🔧 Division du fichier SQL en segments plus petits...');

const inputFile = 'conakry_google_grid_2025-07-30T15-23-17-434Z_UTF8.sql';

try {
    // Lire le fichier corrigé
    const content = fs.readFileSync(inputFile, 'utf8');
    console.log(`📄 Fichier lu: ${inputFile}`);
    
    // Diviser en lignes
    const lines = content.split('\n');
    console.log(`📊 Total lignes: ${lines.length}`);
    
    // Identifier les sections
    let headerSection = [];
    let insertStatements = [];
    let footerSection = [];
    
    let currentSection = 'header';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.startsWith('INSERT INTO adresses')) {
            currentSection = 'inserts';
            insertStatements.push(line);
        } else if (currentSection === 'inserts' && line.startsWith('--')) {
            currentSection = 'footer';
            footerSection.push(line);
        } else if (currentSection === 'header') {
            headerSection.push(line);
        } else if (currentSection === 'inserts') {
            insertStatements.push(line);
        } else {
            footerSection.push(line);
        }
    }
    
    console.log(`📋 Header: ${headerSection.length} lignes`);
    console.log(`📋 Inserts: ${insertStatements.length} lignes`);
    console.log(`📋 Footer: ${footerSection.length} lignes`);
    
    // Créer des fichiers par batch de 500 INSERT
    const batchSize = 500;
    const numBatches = Math.ceil(insertStatements.length / batchSize);
    
    console.log(`🔄 Création de ${numBatches} fichiers batch...`);
    
    for (let batch = 0; batch < numBatches; batch++) {
        const startIdx = batch * batchSize;
        const endIdx = Math.min(startIdx + batchSize, insertStatements.length);
        const batchInserts = insertStatements.slice(startIdx, endIdx);
        
        const filename = `batch_${batch + 1}_of_${numBatches}.sql`;
        
        let batchContent = '';
        
        // Header pour chaque batch
        batchContent += `-- BATCH ${batch + 1}/${numBatches} - Google Places Conakry\n`;
        batchContent += `-- Lignes ${startIdx + 1} à ${endIdx}\n`;
        batchContent += `-- Date: ${new Date().toISOString()}\n\n`;
        batchContent += `BEGIN;\n\n`;
        
        // Si c'est le premier batch, inclure la préparation
        if (batch === 0) {
            batchContent += `-- Nettoyage des anciennes données Google Places\n`;
            batchContent += `DELETE FROM adresses WHERE source_donnees = 'google_places_grid_search';\n\n`;
            batchContent += `-- Ajout colonne metadata si nécessaire\n`;
            batchContent += `ALTER TABLE adresses ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';\n\n`;
        }
        
        // Ajouter les INSERT de ce batch
        batchContent += batchInserts.join('\n');
        batchContent += '\n\n';
        
        // Footer pour chaque batch
        batchContent += `COMMIT;\n\n`;
        batchContent += `-- BATCH ${batch + 1} TERMINÉ\n`;
        
        fs.writeFileSync(filename, batchContent, 'utf8');
        console.log(`✅ Créé: ${filename} (${batchInserts.length} INSERT)`);
    }
    
    // Créer un script d'exécution
    let executeScript = '@echo off\n';
    executeScript += 'echo ========================================\n';
    executeScript += 'echo INJECTION GOOGLE PLACES PAR BATCH\n';
    executeScript += 'echo ========================================\n';
    executeScript += 'echo.\n\n';
    executeScript += 'cd "C:\\Users\\diall\\Documents\\LokoTaxi"\n\n';
    executeScript += 'set "DB_URL=postgresql://postgres:kZlDbxjn6zGgiuGm@db.nmwnibzgvwltipmtwhzo.supabase.co:5432/postgres"\n\n';
    
    for (let batch = 0; batch < numBatches; batch++) {
        const filename = `batch_${batch + 1}_of_${numBatches}.sql`;
        executeScript += `echo Execution batch ${batch + 1}/${numBatches}...\n`;
        executeScript += `psql "%DB_URL%" -f ${filename}\n`;
        executeScript += `if errorlevel 1 (\n`;
        executeScript += `    echo ERREUR dans batch ${batch + 1}\n`;
        executeScript += `    pause\n`;
        executeScript += `    exit /b 1\n`;
        executeScript += `)\n`;
        executeScript += `echo Batch ${batch + 1} OK\n`;
        executeScript += `echo.\n\n`;
    }
    
    executeScript += 'echo ========================================\n';
    executeScript += 'echo INJECTION TERMINEE!\n';
    executeScript += 'echo ========================================\n';
    executeScript += 'pause\n';
    
    fs.writeFileSync('execute_all_batches.bat', executeScript);
    
    console.log('\n🎯 FICHIERS CRÉÉS:');
    console.log(`   - ${numBatches} fichiers batch (batch_1_of_${numBatches}.sql ... batch_${numBatches}_of_${numBatches}.sql)`);
    console.log(`   - 1 script d'exécution (execute_all_batches.bat)`);
    
    console.log('\n🚀 PROCHAINE ÉTAPE:');
    console.log('execute_all_batches.bat');
    
} catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
}