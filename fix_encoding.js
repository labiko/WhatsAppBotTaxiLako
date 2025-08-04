const fs = require('fs');
const path = require('path');

console.log('🔧 Correction d\'encodage du fichier SQL...');

const inputFile = 'conakry_google_grid_2025-07-30T15-23-17-434Z.sql';
const outputFile = 'conakry_google_grid_2025-07-30T15-23-17-434Z_UTF8.sql';

try {
    // Lire le fichier avec l'encodage Windows-1252
    let content = fs.readFileSync(inputFile, 'latin1');
    
    console.log(`📄 Fichier lu: ${inputFile}`);
    console.log(`📊 Taille originale: ${content.length} caractères`);
    
    // Remplacer les caractères problématiques
    content = content
        // Remplacer les caractères Windows-1252 problématiques
        .replace(/\x8f/g, '') // Caractère 0x8f -> supprimer
        .replace(/\x9f/g, '') // Caractère 0x9f -> supprimer  
        .replace(/\x80/g, '€') // Euro symbol
        .replace(/\x82/g, ',') // Virgule spéciale
        .replace(/\x84/g, '„') // Guillemet double bas
        .replace(/\x85/g, '…') // Points de suspension
        .replace(/\x88/g, '^') // Accent circonflexe
        .replace(/\x8a/g, 'Š') // S caron majuscule
        .replace(/\x8b/g, '‹') // Guillemet simple gauche
        .replace(/\x8c/g, 'Œ') // OE majuscule
        .replace(/\x8e/g, 'Ž') // Z caron majuscule
        .replace(/\x91/g, "'") // Apostrophe courbe gauche
        .replace(/\x92/g, "'") // Apostrophe courbe droite
        .replace(/\x93/g, '"') // Guillemet double gauche
        .replace(/\x94/g, '"') // Guillemet double droite
        .replace(/\x95/g, '•') // Puce
        .replace(/\x96/g, '–') // Tiret moyen
        .replace(/\x97/g, '—') // Tiret long
        .replace(/\x98/g, '~') // Tilde
        .replace(/\x99/g, '™') // Marque déposée
        .replace(/\x9a/g, 'š') // s caron minuscule
        .replace(/\x9b/g, '›') // Guillemet simple droite
        .replace(/\x9c/g, 'œ') // oe minuscule
        .replace(/\x9e/g, 'ž') // z caron minuscule
        .replace(/\x9f/g, 'Ÿ'); // Y tréma majuscule
    
    // Nettoyer les noms de lieux problématiques
    content = content
        .replace(/'/g, "''") // Échapper les apostrophes pour SQL
        .replace(/"/g, '""') // Échapper les guillemets pour SQL
        .replace(/\r\n/g, '\n') // Normaliser les fins de ligne
        .replace(/\r/g, '\n'); // Normaliser les fins de ligne
    
    console.log(`🔧 Caractères nettoyés`);
    console.log(`📊 Taille après nettoyage: ${content.length} caractères`);
    
    // Écrire le fichier corrigé en UTF-8
    fs.writeFileSync(outputFile, content, 'utf8');
    
    console.log(`✅ Fichier corrigé créé: ${outputFile}`);
    console.log(`🎯 Utilisez maintenant ce fichier pour l'injection`);
    
    // Afficher quelques statistiques
    const lines = content.split('\n').length;
    const insertCount = (content.match(/INSERT INTO adresses/g) || []).length;
    
    console.log(`📈 Statistiques:`);
    console.log(`   - Lignes: ${lines}`);
    console.log(`   - Instructions INSERT: ${insertCount}`);
    
} catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
}

console.log('\n🚀 Prochaine étape:');
console.log(`psql "postgresql://postgres:kZlDbxjn6zGgiuGm@db.nmwnibzgvwltipmtwhzo.supabase.co:5432/postgres" -f ${outputFile}`);