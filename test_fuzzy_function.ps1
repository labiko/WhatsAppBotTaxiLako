# Test de la fonction fuzzy search avec RPC
$url = "https://nmwnibzgvwltipmtwhzo.supabase.co/rest/v1/rpc/search_adresse_fuzzy"
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U"
    "Content-Type" = "application/json"
}

$body = @{
    search_query = "station shell lambayi"
    similarity_threshold = 0.3
    limit_results = 10
} | ConvertTo-Json

Write-Host "Test fonction fuzzy search avec 'station shell lambayi'..."
try {
    $response = Invoke-RestMethod -Uri $url -Headers $headers -Method POST -Body $body
    Write-Host "Succes! Trouve $($response.Count) resultats:"
    foreach ($result in $response) {
        Write-Host "  - $($result.nom) (Score: $($result.score))"
    }
} catch {
    Write-Host "Erreur: $($_.Exception.Message)"
    Write-Host "Reponse: $($_.Exception.Response)"
}