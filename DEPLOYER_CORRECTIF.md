# 🚀 GUIDE COMPLET SUPABASE CLI - WhatsApp Bot

## ✅ Configuration initiale

### 1. Définir le token d'accès
```bash
cd C:\Users\diall\Documents\LokoTaxi
set SUPABASE_ACCESS_TOKEN=sbp_e575d860bcd2853936ed8591e3036711d8bf158d
```

## 🚀 Déploiement

### Méthode recommandée (fonctionne à 100%)
```bash
npx supabase functions deploy whatsapp-bot --project-ref nmwnibzgvwltipmtwhzo
```

### Méthodes alternatives
```bash
# Avec supabase CLI installé
supabase functions deploy whatsapp-bot

# Si vous devez vous connecter d'abord
supabase login
supabase functions deploy whatsapp-bot
```

## 📊 Accès aux logs

### Voir les logs en temps réel
```bash
npx supabase functions logs whatsapp-bot --follow --project-ref nmwnibzgvwltipmtwhzo
```

### Voir les derniers logs
```bash
npx supabase functions logs whatsapp-bot --project-ref nmwnibzgvwltipmtwhzo
```

### Logs avec filtre par niveau
```bash
# Seulement les erreurs
npx supabase functions logs whatsapp-bot --level error --project-ref nmwnibzgvwltipmtwhzo

# Seulement les logs d'info
npx supabase functions logs whatsapp-bot --level info --project-ref nmwnibzgvwltipmtwhzo
```

### Logs avec limite de temps
```bash
# Dernières 10 minutes
npx supabase functions logs whatsapp-bot --since 10m --project-ref nmwnibzgvwltipmtwhzo

# Dernière heure
npx supabase functions logs whatsapp-bot --since 1h --project-ref nmwnibzgvwltipmtwhzo
```

## 🔧 Gestion des secrets

### Lister tous les secrets
```bash
npx supabase secrets list --project-ref nmwnibzgvwltipmtwhzo
```

### Définir tous les secrets depuis le fichier .env (RECOMMANDÉ)
```bash
npx supabase secrets set --env-file supabase\functions\.env --project-ref nmwnibzgvwltipmtwhzo
```

### Définir un secret individuellement
```bash
npx supabase secrets set OPENAI_API_KEY=sk-proj-... --project-ref nmwnibzgvwltipmtwhzo
```

### Supprimer un secret
```bash
npx supabase secrets unset OPENAI_API_KEY --project-ref nmwnibzgvwltipmtwhzo
```

## 📱 Tests et debug

### Test local de la fonction
```bash
npx supabase functions serve whatsapp-bot
```

### Statut du projet
```bash
npx supabase status --project-ref nmwnibzgvwltipmtwhzo
```

### Informations sur les fonctions
```bash
npx supabase functions list --project-ref nmwnibzgvwltipmtwhzo
```

## 🧪 Tests après déploiement

### Test texte simple
```bash
curl -X POST "https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "From=whatsapp:+33600000000&Body=taxi"
```

### Test notifications
```bash
curl -X POST "https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "From=whatsapp:+33600000000&Body=notifications"
```

### Test avec GPS
```bash
curl -X POST "https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "From=whatsapp:+33600000000&Latitude=48.8566&Longitude=2.3522"
```

## 🌐 URLs importantes

- **Dashboard Functions :** https://supabase.com/dashboard/project/nmwnibzgvwltipmtwhzo/functions
- **Logs en direct :** https://supabase.com/dashboard/project/nmwnibzgvwltipmtwhzo/functions/whatsapp-bot/logs
- **URL de production :** https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot

## 🎯 Commandes de routine

### Déploiement + logs en temps réel
```bash
cd C:\Users\diall\Documents\LokoTaxi
set SUPABASE_ACCESS_TOKEN=sbp_e575d860bcd2853936ed8591e3036711d8bf158d
npx supabase functions deploy whatsapp-bot --project-ref nmwnibzgvwltipmtwhzo
npx supabase functions logs whatsapp-bot --follow --project-ref nmwnibzgvwltipmtwhzo
```

### Déploiement complet avec secrets
```bash
cd C:\Users\diall\Documents\LokoTaxi
set SUPABASE_ACCESS_TOKEN=sbp_e575d860bcd2853936ed8591e3036711d8bf158d
npx supabase secrets set --env-file supabase\functions\.env --project-ref nmwnibzgvwltipmtwhzo
npx supabase functions deploy whatsapp-bot --project-ref nmwnibzgvwltipmtwhzo
```

### Debug complet
```bash
# 1. Voir le statut
npx supabase status --project-ref nmwnibzgvwltipmtwhzo

# 2. Lister les fonctions
npx supabase functions list --project-ref nmwnibzgvwltipmtwhzo

# 3. Voir les secrets
npx supabase secrets list --project-ref nmwnibzgvwltipmtwhzo

# 4. Voir les logs d'erreur
npx supabase functions logs whatsapp-bot --level error --project-ref nmwnibzgvwltipmtwhzo
```

## ✅ Résultats attendus

- **Test taxi :** Réponse avec choix moto/voiture
- **Test notifications :** Traitement automatique des notifications en attente  
- **Test GPS :** Demande de destination
- **Logs :** Messages de debug détaillés pour chaque étape