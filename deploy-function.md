# Guide de déploiement de l'Edge Function

## Prérequis

1. Supabase CLI installé (voir instructions ci-dessous)
2. Être connecté à Supabase (`supabase login`)
3. Avoir configuré la base de données (voir `setup-database.md`)

### Installation de Supabase CLI sur Windows

**Option 1 : Via Scoop (recommandé)**
```bash
# Installer Scoop si vous ne l'avez pas
# PowerShell en tant qu'administrateur :
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Installer Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Option 2 : Téléchargement direct**
1. Allez sur https://github.com/supabase/cli/releases
2. Téléchargez `supabase_windows_amd64.tar.gz`
3. Extrayez le fichier
4. Ajoutez le dossier au PATH Windows

## Étapes de déploiement

### 1. Initialiser le projet Supabase (si pas déjà fait)

```bash
cd C:\Users\diall\Documents\LokoTaxi
supabase init
```

### 2. Lier votre projet

```bash
supabase link --project-ref nmwnibzgvwltipmtwhzo
```

### 3. Déployer la fonction

```bash
supabase functions deploy whatsapp-bot
```

### 4. Configurer les secrets (optionnel)

Si vous avez un token Twilio pour la validation des webhooks :

```bash
supabase secrets set TWILIO_AUTH_TOKEN=votre_token_twilio
```

## URL de votre fonction

Une fois déployée, votre fonction sera accessible à :
```
https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot
```

## Configuration dans Twilio

1. Connectez-vous à [Twilio Console](https://console.twilio.com)

2. Pour les tests (Sandbox) :
   - Messaging → Try it out → Send a WhatsApp message
   - Dans "Sandbox Configuration"
   - **When a message comes in:** `https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot`
   - **Method:** POST
   - Cliquez sur **Save**

3. Pour la production :
   - Phone Numbers → Manage → Active Numbers
   - Sélectionnez votre numéro WhatsApp
   - Dans "Messaging Configuration"
   - Configurez le même webhook

## Test de la fonction

### Via WhatsApp :
1. Envoyez le message de connexion au sandbox (ex: `join word-word`)
2. Envoyez `taxi` pour démarrer une réservation
3. Suivez les instructions du bot

### Via curl (test direct) :
```bash
curl -X POST https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+224622000111&Body=taxi"
```

## Logs et débogage

Pour voir les logs de votre fonction :
```bash
supabase functions logs whatsapp-bot
```

Pour suivre les logs en temps réel :
```bash
supabase functions logs whatsapp-bot --follow
```

## Mise à jour de la fonction

Après avoir modifié le code :
```bash
supabase functions deploy whatsapp-bot
```