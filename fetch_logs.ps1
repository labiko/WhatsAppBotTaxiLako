# Script PowerShell pour récupérer les logs Supabase

Write-Host "🧹 Vidage du fichier de logs..." -ForegroundColor Yellow
Set-Content -Path "C:\Users\diall\Documents\LABICOTAXI\NewMaquettes\logSupabase\log.json" -Value "[]"

Write-Host "📥 Récupération des logs des 2 dernières minutes..." -ForegroundColor Green
$logs = supabase functions log whatsapp-bot --filter "timestamp > (now() - interval '2 minutes')" --json

# Sauvegarder les logs
$logs | Out-File -FilePath "C:\Users\diall\Documents\LABICOTAXI\NewMaquettes\logSupabase\log.json" -Encoding UTF8

Write-Host "✅ Logs sauvegardés dans log.json" -ForegroundColor Green
Write-Host ""