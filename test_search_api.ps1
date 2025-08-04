# Test rapide PostgREST pour valider la correction
$url = "https://nmwnibzgvwltipmtwhzo.supabase.co/rest/v1/adresses_with_coords?select=id,nom,ville,type_lieu,longitude,latitude,position&actif=eq.true&or=(nom_normalise.ilike.*shell*,nom.ilike.*shell*)&order=nom&limit=10"
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U"
}

Write-Host "Test recherche shell avec syntaxe PostgREST corrigee..."
try {
    $response = Invoke-RestMethod -Uri $url -Headers $headers -Method GET
    Write-Host "Succes! Trouve $($response.Count) resultats:"
    foreach ($result in $response) {
        Write-Host "  - $($result.nom) (ID: $($result.id.Substring(0,8))...)"
    }
} catch {
    Write-Host "Erreur: $($_.Exception.Message)"
}