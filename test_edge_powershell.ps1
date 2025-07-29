# Test Edge Function avec PowerShell
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.VRD1ipOvBfEQyckN-3wlDkJbdSfANmjU5bnKf66OdZk"
}

$body = @{
    query = "hopital"
    targetCity = "conakry"
    maxResults = 5
} | ConvertTo-Json

Write-Host "🔍 Test Edge Function location-search..."
Write-Host "URL: https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/location-search"
Write-Host "Body: $body"

try {
    $response = Invoke-RestMethod -Uri "https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/location-search" -Method POST -Headers $headers -Body $body
    
    Write-Host "✅ Réponse reçue:"
    Write-Host ($response | ConvertTo-Json -Depth 5)
    
    if ($response.success) {
        Write-Host "🎉 Succès! $($response.results.Count) résultats trouvés"
        if ($response.results.Count -gt 0) {
            Write-Host "📍 Premier résultat: $($response.results[0].nom) ($($response.results[0].ville))"
        }
    } else {
        Write-Host "❌ Erreur: $($response.error)"
    }
    
} catch {
    Write-Host "❌ Exception: $($_.Exception.Message)"
    Write-Host "Response: $($_.Exception.Response)"
}

Write-Host "`n📋 Test terminé!"