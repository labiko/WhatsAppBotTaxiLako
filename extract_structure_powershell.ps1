# ========================================
# EXTRACTION STRUCTURE BASE LOKOTAXI VIA POWERSHELL
# ========================================
# Description: Alternative PowerShell pour extraire la structure
# Usage: Modifier les paramètres et exécuter dans PowerShell
# ========================================

Write-Host "========================================" -ForegroundColor Green
Write-Host "EXTRACTION STRUCTURE BASE LOKOTAXI" -ForegroundColor Green  
Write-Host "========================================" -ForegroundColor Green

# Configuration Supabase (À MODIFIER)
$dbHost = "nmwnibzgvwltipmtwhzo.supabase.co"
$dbPort = "5432"
$dbName = "postgres"
$dbUser = "postgres"
$dbPassword = "ZJEDz4SiszotA1ml"

# Fichiers de sortie
$outputFile = "lokotaxi_structure_dump.sql"
$logFile = "extraction_log.txt"

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "Host: $dbHost"
Write-Host "Database: $dbName" 
Write-Host "Output: $outputFile"
Write-Host ""

# Test si pg_dump est disponible
try {
    $pgDumpVersion = & pg_dump --version 2>$null
    Write-Host "✅ pg_dump trouvé: $pgDumpVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ pg_dump non trouvé dans le PATH" -ForegroundColor Red
    Write-Host "Alternatives:" -ForegroundColor Yellow
    Write-Host "1. Installer PostgreSQL client tools"
    Write-Host "2. Utiliser l'interface Supabase Dashboard"
    Write-Host "3. Utiliser un client comme pgAdmin"
    exit 1
}

# Définir le mot de passe via variable d'environnement
$env:PGPASSWORD = $dbPassword

Write-Host "Extraction de la structure en cours..." -ForegroundColor Yellow

try {
    # Commande pg_dump
    & pg_dump `
        --host=$dbHost `
        --port=$dbPort `
        --username=$dbUser `
        --dbname=$dbName `
        --schema-only `
        --no-owner `
        --no-privileges `
        --clean `
        --if-exists `
        --file=$outputFile 2>$logFile

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "EXTRACTION TERMINÉE AVEC SUCCÈS" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        
        # Informations sur le fichier généré
        $fileInfo = Get-Item $outputFile -ErrorAction SilentlyContinue
        if ($fileInfo) {
            Write-Host "Fichier généré: $outputFile"
            Write-Host "Taille: $([math]::Round($fileInfo.Length / 1KB, 2)) KB"
            Write-Host "Créé le: $($fileInfo.CreationTime)"
            
            # Analyser le contenu
            $content = Get-Content $outputFile
            $tableCount = ($content | Select-String "CREATE TABLE").Count
            $viewCount = ($content | Select-String "CREATE VIEW").Count
            $functionCount = ($content | Select-String "CREATE FUNCTION").Count
            $indexCount = ($content | Select-String "CREATE INDEX").Count
            
            Write-Host ""
            Write-Host "Contenu extrait:" -ForegroundColor Cyan
            Write-Host "- Tables: $tableCount"
            Write-Host "- Vues: $viewCount" 
            Write-Host "- Fonctions: $functionCount"
            Write-Host "- Index: $indexCount"
            
            Write-Host ""
            Write-Host "Le fichier $outputFile contient maintenant:" -ForegroundColor Yellow
            Write-Host "✓ Structure complète des tables"
            Write-Host "✓ Contraintes et relations"
            Write-Host "✓ Index et optimisations"
            Write-Host "✓ Vues et fonctions"
            Write-Host "✓ Extensions PostgreSQL"
        }
    } else {
        throw "pg_dump a échoué avec le code: $LASTEXITCODE"
    }
} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "ERREUR LORS DE L'EXTRACTION" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
    
    # Afficher les logs d'erreur
    if (Test-Path $logFile) {
        Write-Host ""
        Write-Host "Logs d'erreur:" -ForegroundColor Yellow
        Get-Content $logFile | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    }
    
    Write-Host ""
    Write-Host "Solutions possibles:" -ForegroundColor Yellow
    Write-Host "1. Vérifier le mot de passe Supabase"
    Write-Host "2. Vérifier la connexion réseau" 
    Write-Host "3. Utiliser la méthode alternative via Dashboard Supabase"
    Write-Host "4. Vérifier les paramètres de connexion"
}

# Nettoyer
Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Appuyez sur une touche pour continuer..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")