# ==============================
# INSTALLATION SUPABASE CLI - POWERSHELL
# ==============================

Write-Host ""
Write-Host "🚀 INSTALLATION SUPABASE CLI - POWERSHELL" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
Write-Host ""

# Vérifier si on est admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  Redémarrage en tant qu'administrateur..." -ForegroundColor Yellow
    Start-Process PowerShell -Verb RunAs -ArgumentList "-File `"$PSCommandPath`""
    exit
}

Write-Host "✅ Exécution en tant qu'administrateur" -ForegroundColor Green
Write-Host ""

# Créer le dossier Supabase
$supabaseDir = "C:\supabase"
if (!(Test-Path $supabaseDir)) {
    Write-Host "📁 Création du dossier $supabaseDir..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $supabaseDir -Force | Out-Null
}

# Télécharger la dernière version
Write-Host "📥 Téléchargement de Supabase CLI..." -ForegroundColor Cyan
$downloadUrl = "https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.zip"
$zipPath = "$supabaseDir\supabase.zip"

try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing
    Write-Host "✅ Téléchargement terminé" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur téléchargement: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour continuer"
    exit 1
}

# Extraire l'archive
Write-Host "📦 Extraction de l'archive..." -ForegroundColor Cyan
try {
    Expand-Archive -Path $zipPath -DestinationPath $supabaseDir -Force
    Remove-Item $zipPath  # Supprimer le zip
    Write-Host "✅ Extraction terminée" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur extraction: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour continuer"
    exit 1
}

# Ajouter au PATH système
Write-Host "🔧 Ajout au PATH système..." -ForegroundColor Cyan
$currentPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
if ($currentPath -notlike "*$supabaseDir*") {
    $newPath = $currentPath + ";" + $supabaseDir
    [Environment]::SetEnvironmentVariable("PATH", $newPath, "Machine")
    Write-Host "✅ PATH mis à jour" -ForegroundColor Green
} else {
    Write-Host "✅ PATH déjà configuré" -ForegroundColor Green
}

# Mettre à jour le PATH de la session courante
$env:PATH = $env:PATH + ";" + $supabaseDir

# Tester l'installation
Write-Host ""
Write-Host "🧪 Test de l'installation..." -ForegroundColor Cyan
try {
    $version = & "$supabaseDir\supabase.exe" --version
    Write-Host "✅ Supabase CLI installé : $version" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur test installation" -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour continuer"
    exit 1
}

Write-Host ""
Write-Host "🎉 INSTALLATION RÉUSSIE !" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 PROCHAINES ÉTAPES :" -ForegroundColor Yellow
Write-Host "1. Redémarrez votre terminal/PowerShell"
Write-Host "2. Testez : supabase --version"
Write-Host "3. Connectez-vous : supabase login"
Write-Host "4. Liez le projet : supabase link --project-ref nmwnibzgvwltipmtwhzo"
Write-Host "5. Exécutez : DEPLOYER_V2_HUGGINGFACE.cmd"
Write-Host ""

Read-Host "Appuyez sur Entrée pour continuer"