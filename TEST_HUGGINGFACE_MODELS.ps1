# Test des modèles HuggingFace pour Pular/Fulfulde
$token = "hf_w1InuCOFSsZKCwPUnjObbwQOFvKEtSOJsJ"
$headers = @{
    "Authorization" = "Bearer $token"
}

Write-Host "=== Test de différents modèles MMS pour Pular ===" -ForegroundColor Cyan

# Liste des modèles à tester
$models = @(
    # Modèles MMS possibles
    "facebook/mms-1b-all",
    "facebook/wav2vec2-base-960h",
    "openai/whisper-large-v3",
    "openai/whisper-base",
    
    # Recherche spécifique Fulfulde
    "coqui/XTTS-v2",
    "speechbrain/asr-wav2vec2-commonvoice-fr"
)

foreach ($model in $models) {
    Write-Host "`nTest: $model" -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "https://api-inference.huggingface.co/models/$model" -Method GET -Headers $headers -ErrorAction Stop
        Write-Host "✅ Modèle disponible!" -ForegroundColor Green
        
        # Vérifier si le modèle supporte Fulfulde
        if ($response.languages -contains "ff" -or $response.languages -contains "ful") {
            Write-Host "   ⭐ Supporte Fulfulde/Pular!" -ForegroundColor Magenta
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 404) {
            Write-Host "❌ Modèle non trouvé (404)" -ForegroundColor Red
        } else {
            Write-Host "❌ Erreur $statusCode" -ForegroundColor Red
        }
    }
}

Write-Host "`n=== Alternative: Utiliser Whisper uniquement ===" -ForegroundColor Cyan
Write-Host @"
Pour contourner le problème HuggingFace:
1. Désactiver HuggingFace MMS dans le code
2. Utiliser seulement OpenAI Whisper qui fonctionne déjà
3. Whisper peut transcrire le Pular avec le bon prompt
"@ -ForegroundColor Yellow