# Guide de démarrage rapide - LokoTaxi

## 1. Configuration de la base de données (5 minutes)

1. **Ouvrez votre projet Supabase** :
   https://app.supabase.com/project/nmwnibzgvwltipmtwhzo

2. **Créez la table** :
   - Cliquez sur **SQL Editor** dans le menu à gauche
   - Cliquez sur **New Query**
   - Copiez-collez tout le contenu du fichier `sql/create_reservations.sql`
   - Cliquez sur **Run** (ou appuyez sur Ctrl+Enter)
   - Vous devriez voir "Success. No rows returned"

3. **Vérifiez** :
   - Allez dans **Table Editor** dans le menu
   - Vous devriez voir la table `reservations`

## 2. Déploiement de la fonction (10 minutes)

### Option A : Via le Dashboard (Recommandé - Sans CLI)

1. **Dans votre projet Supabase** :
   - Allez dans **Edge Functions** dans le menu
   - Cliquez sur **Create Function**
   - Nom : `whatsapp-bot`
   - Copiez-collez le contenu de `supabase/functions/whatsapp-bot/index.ts`
   - Cliquez sur **Deploy**

2. **Ajoutez le fichier CORS** :
   - Créez un nouveau fichier `_shared/cors.ts`
   - Collez le contenu de `supabase/functions/_shared/cors.ts`

### Option B : Téléchargement direct du CLI

1. **Téléchargez Supabase CLI** :
   - https://github.com/supabase/cli/releases/latest
   - Cherchez `supabase_windows_amd64.zip`
   - Téléchargez et extrayez dans un dossier (ex: `C:\supabase-cli`)

2. **Utilisez le CLI** :
   ```cmd
   cd C:\Users\diall\Documents\LokoTaxi
   C:\supabase-cli\supabase login
   C:\supabase-cli\supabase link --project-ref nmwnibzgvwltipmtwhzo
   C:\supabase-cli\supabase functions deploy whatsapp-bot
   ```

## 3. URL de votre fonction

Votre fonction sera accessible à :
```
https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot
```

## 4. Configuration Twilio (5 minutes)

1. **Connectez-vous à Twilio** : https://console.twilio.com

2. **Pour tester (Sandbox)** :
   - Allez dans : Messaging → Try it out → Send a WhatsApp message
   - Scannez le QR code avec WhatsApp
   - Envoyez le message de connexion (ex: `join word-word`)
   - Dans "Sandbox Configuration" :
     - **When a message comes in** : `https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot`
     - **Method** : POST
   - Cliquez sur **Save**

## 5. Test

1. Dans WhatsApp, envoyez `taxi` au numéro Twilio
2. Le bot devrait répondre : "Quel type de taxi souhaitez-vous ?"
3. Répondez `moto` ou `voiture`
4. Partagez votre localisation
5. Vérifiez dans Supabase Table Editor que la réservation est créée

## Problèmes courants

- **"Function not found"** : Attendez 1-2 minutes après le déploiement
- **Pas de réponse** : Vérifiez l'URL dans Twilio (attention aux espaces)
- **Erreur PostGIS** : Normal, Supabase gère automatiquement

## Support

- Logs de la fonction : Edge Functions → Logs
- Table des réservations : Table Editor → reservations