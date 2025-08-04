# Test spécifique pour "station shell lambayi" vs "Station Shell Lambanyi"
$url1 = "https://nmwnibzgvwltipmtwhzo.supabase.co/rest/v1/adresses_with_coords?select=id,nom,ville,type_lieu,longitude,latitude&actif=eq.true&or=(nom_normalise.ilike.*station%20shell%20lambayi*,nom.ilike.*station%20shell%20lambayi*)&order=nom&limit=10"
$url2 = "https://nmwnibzgvwltipmtwhzo.supabase.co/rest/v1/adresses_with_coords?select=id,nom,ville,type_lieu,longitude,latitude&actif=eq.true&or=(nom_normalise.ilike.*station%20shell%20lambanyi*,nom.ilike.*station%20shell%20lambanyi*)&order=nom&limit=10"

$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U"
}

Write-Host "Test 1: Recherche 'station shell lambayi' (avec i)..."
try {
    $response1 = Invoke-RestMethod -Uri $url1 -Headers $headers -Method GET
    Write-Host "Resultats: $($response1.Count)"
    foreach ($result in $response1) {
        Write-Host "  - $($result.nom)"
    }
} catch {
    Write-Host "Erreur: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "Test 2: Recherche 'station shell lambanyi' (avec y)..."
try {
    $response2 = Invoke-RestMethod -Uri $url2 -Headers $headers -Method GET
    Write-Host "Resultats: $($response2.Count)"
    foreach ($result in $response2) {
        Write-Host "  - $($result.nom)"
    }
} catch {
    Write-Host "Erreur: $($_.Exception.Message)"
}