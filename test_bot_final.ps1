# Test final pour vérifier que le bot trouve maintenant Station Shell Lambanyi

Write-Host "=== TEST BOT V2 - RECHERCHE CORRIGEE ==="
Write-Host ""

# Test 1 : Recherche simple "shell"
Write-Host "Test 1: Recherche 'shell' (doit trouver 10 stations)"
$url1 = "https://nmwnibzgvwltipmtwhzo.supabase.co/rest/v1/adresses_with_coords?select=id,nom&actif=eq.true&or=(nom_normalise.ilike.*shell*,nom.ilike.*shell*)&limit=5"

# Test 2 : Recherche problématique "station shell lambayi" 
Write-Host ""
Write-Host "Test 2: Recherche 'station shell lambayi' (avec i)"
$url2 = "https://nmwnibzgvwltipmtwhzo.supabase.co/rest/v1/adresses_with_coords?select=id,nom&actif=eq.true&or=(nom_normalise.ilike.*station%20shell%20lambayi*,nom.ilike.*station%20shell%20lambayi*)&limit=5"

# Test 3 : Recherche avec variante "station shell lambanyi"
Write-Host ""
Write-Host "Test 3: Recherche 'station shell lambanyi' (avec y) - fallback du bot"
$url3 = "https://nmwnibzgvwltipmtwhzo.supabase.co/rest/v1/adresses_with_coords?select=id,nom&actif=eq.true&or=(nom_normalise.ilike.*station%20shell%20lambanyi*,nom.ilike.*station%20shell%20lambanyi*)&limit=5"

$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U"
}

# Exécuter les tests
try {
    $res1 = Invoke-RestMethod -Uri $url1 -Headers $headers -Method GET
    Write-Host "  -> $($res1.Count) resultats trouves"
    
    $res2 = Invoke-RestMethod -Uri $url2 -Headers $headers -Method GET
    Write-Host "  -> $($res2.Count) resultats (normal si 0, le bot fera le fallback)"
    
    $res3 = Invoke-RestMethod -Uri $url3 -Headers $headers -Method GET
    Write-Host "  -> $($res3.Count) resultat(s) trouves"
    if ($res3.Count -gt 0) {
        Write-Host "  -> TROUVE: $($res3[0].nom)"
        Write-Host ""
        Write-Host "SUCCES! Le bot trouvera 'Station Shell Lambanyi' grace au fallback"
    }
} catch {
    Write-Host "Erreur: $_"
}