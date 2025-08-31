#!/usr/bin/env node
/**
 * 🛡️ SCRIPT SYNCHRONISATION INTELLIGENTE V2→V3
 * 
 * GARANTIE : Préserve les zones IA lors de la synchronisation
 * USAGE : node sync-v2-to-v3-safe.js
 */

const fs = require('fs');
const path = require('path');

// Chemins des fichiers
const V2_FILE = './supabase/functions/whatsapp-bot-v2/index.ts';
const V3_FILE = './supabase/functions/whatsapp-bot-v3/index.ts';
const BACKUP_DIR = './supabase/functions/whatsapp-bot-v3/backups';

// Marqueurs de zones protégées
const ZONE_START = '// 🛡️ ZONE IA V3 - NE PAS ÉCRASER LORS SYNCHRO V2→V3';
const ZONE_END = '// 🛡️ FIN ZONE IA V3 - PROTÉGÉE CONTRE ÉCRASEMENT';

/**
 * Extraire les zones protégées du V3 actuel
 */
function extractProtectedZones(v3Content) {
  const zones = [];
  let startIndex = 0;
  
  while (true) {
    const zoneStart = v3Content.indexOf(ZONE_START, startIndex);
    if (zoneStart === -1) break;
    
    const zoneEnd = v3Content.indexOf(ZONE_END, zoneStart);
    if (zoneEnd === -1) {
      console.error('❌ Zone protégée non fermée détectée !');
      break;
    }
    
    const zone = v3Content.substring(zoneStart, zoneEnd + ZONE_END.length);
    zones.push({
      content: zone,
      start: zoneStart,
      end: zoneEnd + ZONE_END.length
    });
    
    startIndex = zoneEnd + ZONE_END.length;
  }
  
  console.log(`🛡️ ${zones.length} zones protégées détectées`);
  return zones;
}

/**
 * Créer un backup horodaté
 */
function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupFile = path.join(BACKUP_DIR, `backup_v3_before_sync_${timestamp}.ts`);
  
  // Créer le dossier backup s'il n'existe pas
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  fs.copyFileSync(V3_FILE, backupFile);
  console.log(`💾 Backup créé: ${backupFile}`);
  return backupFile;
}

/**
 * Synchronisation intelligente avec préservation des zones IA
 */
function syncWithProtection() {
  try {
    console.log('🔄 Début synchronisation intelligente V2→V3...');
    
    // 1. Créer backup
    const backupFile = createBackup();
    
    // 2. Lire les fichiers
    const v2Content = fs.readFileSync(V2_FILE, 'utf8');
    const v3Content = fs.readFileSync(V3_FILE, 'utf8');
    
    // 3. Extraire zones protégées
    const protectedZones = extractProtectedZones(v3Content);
    
    if (protectedZones.length === 0) {
      console.log('⚠️ Aucune zone protégée trouvée, synchronisation standard');
      fs.writeFileSync(V3_FILE, v2Content);
      console.log('✅ Synchronisation complète terminée');
      return;
    }
    
    // 4. Préparer le nouveau contenu V3
    let newV3Content = v2Content;
    
    // 5. Réinjecter les zones protégées aux bons endroits
    // Pour cette version, on insère toutes les zones au début du fichier
    const importSection = newV3Content.indexOf('// =================================================================');
    
    if (importSection === -1) {
      console.error('❌ Structure attendue non trouvée dans V2');
      return;
    }
    
    // Insérer toutes les zones protégées après les imports
    let zonesContent = protectedZones.map(zone => zone.content).join('\n\n');
    newV3Content = newV3Content.slice(0, importSection) + 
                   zonesContent + '\n\n' + 
                   newV3Content.slice(importSection);
    
    // 6. Écrire le nouveau V3
    fs.writeFileSync(V3_FILE, newV3Content);
    
    console.log('✅ Synchronisation intelligente terminée avec succès !');
    console.log(`📊 ${protectedZones.length} zones IA préservées`);
    console.log(`💾 Backup disponible: ${backupFile}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation:', error.message);
    process.exit(1);
  }
}

/**
 * Validation avant synchronisation
 */
function validateFiles() {
  if (!fs.existsSync(V2_FILE)) {
    console.error(`❌ Fichier V2 non trouvé: ${V2_FILE}`);
    return false;
  }
  
  if (!fs.existsSync(V3_FILE)) {
    console.error(`❌ Fichier V3 non trouvé: ${V3_FILE}`);
    return false;
  }
  
  return true;
}

// Exécution principale
if (require.main === module) {
  console.log('🛡️ SCRIPT SYNCHRONISATION INTELLIGENTE V2→V3');
  console.log('═══════════════════════════════════════════════');
  
  if (!validateFiles()) {
    process.exit(1);
  }
  
  syncWithProtection();
}

module.exports = { syncWithProtection, extractProtectedZones, createBackup };