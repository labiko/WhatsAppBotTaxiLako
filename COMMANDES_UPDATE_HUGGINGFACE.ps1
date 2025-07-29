# Commandes PowerShell pour mettre à jour la clé HuggingFace

# 1. D'abord, définir le nouveau token HuggingFace
$env:HUGGINGFACE_API_KEY = "hf_w1InuCOFSsZKCwPUnjObbwQOFvKEtSOJsJ"

# 2. Tester la nouvelle clé avec PowerShell
Write-Host "Test de la nouvelle clé HuggingFace..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer hf_w1InuCOFSsZKCwPUnjObbwQOFvKEtSOJsJ"
}

# Test du modèle MMS correct pour Fulfulde/Pular
try {
    # Modèle correct pour Fulfulde (langue Pular)
    $response = Invoke-RestMethod -Uri "https://api-inference.huggingface.co/models/facebook/wav2vec2-large-mms-1b-fulfulde" -Method GET -Headers $headers
    Write-Host "✅ Clé HuggingFace valide! Modèle Fulfulde/Pular trouvé" -ForegroundColor Green
    $response
} catch {
    Write-Host "❌ Erreur avec la clé HuggingFace: $_" -ForegroundColor Red
    
    # Test alternatif avec modèle générique
    try {
        $response2 = Invoke-RestMethod -Uri "https://api-inference.huggingface.co/models/openai/whisper-large-v2" -Method GET -Headers $headers
        Write-Host "✅ Clé valide avec modèle alternatif" -ForegroundColor Yellow
    } catch {
        Write-Host "❌ Clé invalide ou problème de connexion" -ForegroundColor Red
    }
}

# 3. Mettre à jour dans Supabase
Write-Host "`nMise à jour dans Supabase..." -ForegroundColor Yellow
cd "C:\Users\diall\Documents\LokoTaxi"

# Option 1: Via Supabase CLI (si installé)
# supabase secrets set HUGGINGFACE_API_KEY="hf_w1InuCOFSsZKCwPUnjObbwQOFvKEtSOJsJ"

# Option 2: Via Dashboard Supabase
Write-Host @"

Pour mettre à jour dans Supabase Dashboard:
1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet
3. Settings → Edge Functions → Secrets
4. Cliquez sur HUGGINGFACE_API_KEY
5. Remplacez par: hf_w1InuCOFSsZKCwPUnjObbwQOFvKEtSOJsJ
6. Sauvegardez

"@ -ForegroundColor Cyan

# 4. Déployer la fonction
Write-Host "Déploiement de la fonction..." -ForegroundColor Yellow
# supabase functions deploy whatsapp-bot-pular