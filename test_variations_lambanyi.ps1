# Test des variations orthographiques de Lambanyi
Write-Host "=== TEST VARIATIONS ORTHOGRAPHIQUES LAMBANYI ==="
Write-Host ""

$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U"
}

$variations = @("lambay", "lambayi", "lambani", "lambanyi")

foreach ($variation in $variations) {
    Write-Host "Test: 'station shell $variation'"
    $url = "https://nmwnibzgvwltipmtwhzo.supabase.co/rest/v1/adresses_with_coords?select=id,nom&actif=eq.true&or=(nom_normalise.ilike.*station%20shell%20$variation*,nom.ilike.*station%20shell%20$variation*)&limit=3"
    
    try {
        $response = Invoke-RestMethod -Uri $url -Headers $headers -Method GET
        Write-Host "  -> $($response.Count) resultat(s) trouve(s)"
        foreach ($res in $response) {
            Write-Host "     - $($res.nom)"
        }
    } catch {
        Write-Host "  -> Erreur: $_"
    }
    Write-Host ""
}