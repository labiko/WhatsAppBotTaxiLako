#!/usr/bin/env pwsh

# Script pour déployer et tester la fonction WhatsApp

Write-Host "🚀 Déploiement de la fonction whatsapp-bot..." -ForegroundColor Green

# Déployer la fonction
try {
    supabase functions deploy whatsapp-bot
    Write-Host "✅ Déploiement réussi!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors du déploiement: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "🔄 Test de l'endpoint avec action=process-notifications..." -ForegroundColor Yellow

# Tester l'endpoint
$response = Invoke-RestMethod -Uri "https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot?action=process-notifications" `
    -Method POST `
    -Headers @{
        "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U"
        "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U"
        "Content-Type" = "application/json"
    } `
    -Body "{}"

Write-Host "📋 Réponse: $response" -ForegroundColor Cyan

Write-Host "🔍 Vérification des notifications traitées..." -ForegroundColor Yellow

# Vérifier les notifications
$notifications = Invoke-RestMethod -Uri "https://nmwnibzgvwltipmtwhzo.supabase.co/rest/v1/notifications_pending?select=*" `
    -Headers @{
        "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U"
        "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U"
    }

Write-Host "📊 Notifications en attente: $($notifications.Count)" -ForegroundColor Cyan
$notifications | ForEach-Object {
    $status = if ($_.processed_at) { "✅ Traitée" } else { "⏳ En attente" }
    Write-Host "  - $($_.reservation_id): $status" -ForegroundColor Gray
}

Write-Host "🎉 Test terminé!" -ForegroundColor Green