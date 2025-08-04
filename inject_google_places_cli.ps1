# 🚀 INJECTION GOOGLE PLACES VIA SUPABASE CLI (PowerShell)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 INJECTION GOOGLE PLACES VIA SUPABASE CLI" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host

# Vérifier Supabase CLI
try {
    $version = supabase --version 2>$null
    Write-Host "✅ Supabase CLI détecté: $version" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur: Supabase CLI non installé" -ForegroundColor Red
    Write-Host "💡 Installez avec: scoop install supabase" -ForegroundColor Yellow
    Read-Host "Appuyez sur Entrée pour continuer"
    exit 1
}

# Changer de répertoire
Set-Location "C:\Users\diall\Documents\LokoTaxi"
Write-Host "📂 Répertoire: $(Get-Location)" -ForegroundColor Blue
Write-Host

# Vérifier fichier SQL
$sqlFile = "conakry_google_grid_2025-07-30T15-23-17-434Z.sql"
if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ Erreur: Fichier SQL non trouvé" -ForegroundColor Red
    Write-Host "Recherche: $sqlFile" -ForegroundColor Yellow
    Read-Host "Appuyez sur Entrée"
    exit 1
}

$fileSize = (Get-Item $sqlFile).Length / 1MB
Write-Host "✅ Fichier SQL trouvé" -ForegroundColor Green
Write-Host "📊 Taille: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Blue
Write-Host

# Avertissement
Write-Host "⚠️  ATTENTION: Cette opération va:" -ForegroundColor Yellow
Write-Host "   1. Supprimer les anciennes données Google Places" -ForegroundColor White
Write-Host "   2. Injecter 2,877 nouveaux lieux" -ForegroundColor White
Write-Host "   3. Utiliser une TRANSACTION (rollback automatique si erreur)" -ForegroundColor White
Write-Host

$confirm = Read-Host "Continuer? (oui/non)"
if ($confirm -notlike "oui*" -and $confirm -notlike "y*") {
    Write-Host "❌ Opération annulée" -ForegroundColor Yellow
    exit 0
}

Write-Host
Write-Host "🔄 Début de l'injection..." -ForegroundColor Cyan

# Option 1: Via psql direct (plus fiable pour gros fichiers)
try {
    Write-Host "📡 Connexion à Supabase..." -ForegroundColor Blue
    
    # Récupérer les variables d'environnement ou demander
    $dbUrl = $env:SUPABASE_DB_URL
    if (-not $dbUrl) {
        Write-Host "💡 Variables d'environnement:" -ForegroundColor Yellow
        Write-Host "   SUPABASE_DB_URL non trouvée" -ForegroundColor White
        Write-Host "   Format: postgresql://postgres:[password]@[host]:5432/postgres" -ForegroundColor Gray
        $dbUrl = Read-Host "Entrez l'URL de connexion Supabase"
    }
    
    # Exécuter via psql
    Write-Host "💾 Injection en cours..." -ForegroundColor Blue
    $result = psql $dbUrl -f $sqlFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ INJECTION RÉUSSIE!" -ForegroundColor Green
    } else {
        throw "Erreur psql: $result"
    }
    
} catch {
    Write-Host "❌ Erreur avec psql, tentative via Supabase CLI..." -ForegroundColor Yellow
    
    # Option 2: Via Supabase CLI
    try {
        supabase db reset --db-url $dbUrl
        supabase db push --db-url $dbUrl --include-all
        Write-Host "✅ Injection via CLI réussie!" -ForegroundColor Green
    } catch {
        Write-Host "❌ ERREUR: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "💡 Solutions:" -ForegroundColor Yellow
        Write-Host "   1. Vérifier la connexion Supabase" -ForegroundColor White
        Write-Host "   2. Découper le fichier en lots plus petits" -ForegroundColor White
        Write-Host "   3. Utiliser pgAdmin ou DBeaver" -ForegroundColor White
        Read-Host "Appuyez sur Entrée"
        exit 1
    }
}

Write-Host
Write-Host "🔍 Vérifications post-injection..." -ForegroundColor Cyan

# Vérifications
$verifyScript = @"
SELECT 
    'Total Google Places' as type,
    COUNT(*) as count
FROM adresses 
WHERE source_donnees = 'google_places_grid_search'
UNION ALL
SELECT 
    '2LK Restaurant' as type,
    COUNT(*) as count
FROM adresses 
WHERE nom ILIKE '%2LK%'
UNION ALL
SELECT 
    'Total adresses' as type,
    COUNT(*) as count
FROM adresses;
"@

$verifyScript | Out-File -FilePath "verify.sql" -Encoding UTF8

try {
    $verifyResult = psql $dbUrl -f "verify.sql" 2>&1
    Write-Host "📊 Résultats:" -ForegroundColor Blue
    Write-Host $verifyResult -ForegroundColor White
} catch {
    Write-Host "⚠️ Impossible de vérifier automatiquement" -ForegroundColor Yellow
}

# Nettoyer
Remove-Item "verify.sql" -ErrorAction SilentlyContinue

Write-Host
Write-Host "🎉 PROCESSUS TERMINÉ!" -ForegroundColor Green
Write-Host
Write-Host "📋 Étapes suivantes:" -ForegroundColor Yellow
Write-Host "   1. Vérifier dans Supabase Dashboard" -ForegroundColor White
Write-Host "   2. Tester le bot WhatsApp avec '2LK'" -ForegroundColor White
Write-Host "   3. Vérifier les suggestions enrichies" -ForegroundColor White

Read-Host "Appuyez sur Entrée pour terminer"