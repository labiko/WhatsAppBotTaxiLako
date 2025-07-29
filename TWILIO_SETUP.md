# Configuration Twilio pour LokoTaxi - Guide Complet

## Prérequis

- Compte Twilio créé (https://www.twilio.com/try-twilio)
- Fonction Supabase déployée : `https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot`
- Table `reservations` créée dans Supabase

---

## Phase 1 : Tests avec Twilio Sandbox (GRATUIT)

### Étape 1 : Accéder au Sandbox WhatsApp

1. **Connectez-vous** à Twilio Console : https://console.twilio.com
2. **Naviguez vers** : Messaging → Try it out → Send a WhatsApp message
3. Vous verrez l'interface **"WhatsApp Sandbox"**

### Étape 2 : Connecter votre téléphone au Sandbox

1. **Option A - Bouton "Open WhatsApp" (Recommandée)** :
   - Cliquez sur le bouton bleu **"Open WhatsApp"** dans l'interface Twilio
   - WhatsApp s'ouvre automatiquement avec le message pré-rempli
   - Envoyez directement le message

2. **Option B - Connexion manuelle** :
   - Ajoutez le numéro affiché (`+1 415 523 8866`) dans vos contacts WhatsApp
   - Envoyez le message exact affiché (ex: `join organization-leave`)
   - Attendez la confirmation de connexion

⚠️ **Note** : Le QR code ne fonctionne pas toujours depuis l'écran d'ordinateur. Privilégiez les options A ou B.

### Étape 3 : Configurer le Webhook

1. Dans l'interface Sandbox, trouvez **"Sandbox Configuration"**
2. **When a message comes in** :
   ```
   https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot
   ```
3. **HTTP Method** : `POST`
4. **Cliquez sur "Save"**

### Étape 4 : Tester le Chatbot

1. Dans WhatsApp, envoyez `taxi` au numéro Sandbox
2. Le bot répond : *"Quel type de taxi souhaitez-vous ?"*
3. Répondez `moto` ou `voiture`
4. Le bot demande votre localisation
5. Partagez votre position via l'icône 📎 → Localisation
6. Le bot confirme l'enregistrement

### Étape 5 : Vérifier les Données

1. **Supabase Dashboard** → Table Editor → `reservations`
2. Vérifiez qu'une nouvelle ligne apparaît avec :
   - `client_phone` : Votre numéro
   - `vehicle_type` : moto/voiture
   - `pickup_location` : Coordonnées GPS
   - `status` : pending

---

## Phase 2 : Déploiement en Production

### Prérequis Production

1. **Compte Twilio vérifié** avec carte de crédit
2. **WhatsApp Business Account** approuvé
3. **Numéro de téléphone dédié** acheté via Twilio

### Étape 1 : Demander l'Accès WhatsApp Business API

1. **Console Twilio** → Messaging → WhatsApp → Get started
2. **Remplir le formulaire** :
   - Informations sur votre entreprise LokoTaxi
   - Use case : Service de réservation de taxi
   - Volume attendu de messages
3. **Soumettre la demande** (délai : 1-5 jours ouvrables)

### Étape 2 : Acheter un Numéro de Téléphone

1. **Console Twilio** → Phone Numbers → Manage → Buy a number
2. **Choisir le pays** : Guinée (+224) ou pays souhaité
3. **Capacités requises** : SMS et Voice
4. **Acheter le numéro** (coût : ~1$/mois)

### Étape 3 : Configurer le Numéro WhatsApp

1. **Une fois WhatsApp approuvé** :
   - Console Twilio → Messaging → Senders → WhatsApp senders
   - **Add WhatsApp Sender**
   - Associer votre numéro acheté

2. **Configuration du Webhook** :
   - **Webhook URL** : `https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot`
   - **Method** : POST

### Étape 4 : Templates de Messages (Requis pour Production)

WhatsApp Business exige des templates pré-approuvés :

1. **Console Twilio** → Messaging → WhatsApp → Templates
2. **Créer des templates** pour :
   ```
   Nom: taxi_confirmation_moto
   Texte: "Votre demande de taxi moto a été enregistrée. Un chauffeur vous contactera bientôt."
   
   Nom: taxi_confirmation_voiture  
   Texte: "Votre demande de taxi voiture a été enregistrée. Un chauffeur vous contactera bientôt."
   ```

---

## Gestion des Coûts

### Sandbox (Gratuit)
- ✅ Tests illimités
- ❌ Limité à votre numéro uniquement
- ❌ Messages avec préfixe Twilio

### Production
- **Numéro de téléphone** : ~1$/mois
- **Messages WhatsApp** : 
  - Messages entrants : Gratuits
  - Messages sortants : ~0.005$ par message
  - Templates Business : ~0.0025$ par message

### Estimation mensuelle pour 1000 réservations :
- Numéro : 1$
- Messages (~3000 au total) : ~15$
- **Total : ~16$/mois**

---

## Debugging et Logs

### Logs Twilio
1. **Console Twilio** → Monitor → Logs → Messaging
2. Filtrer par votre numéro WhatsApp
3. Vérifier les status codes et erreurs

### Logs Supabase
```bash
# Via CLI (si installé)
supabase functions logs whatsapp-bot --follow

# Via Dashboard
Edge Functions → whatsapp-bot → Logs
```

### Messages d'Erreur Courants

| Erreur | Solution |
|--------|----------|
| `11200: HTTP retrieval failure` | Vérifier l'URL du webhook |
| `63016: The From phone number is not a valid` | Utiliser le bon format de numéro |
| `Function timeout` | Optimiser le code de la fonction |

---

## Sécurité et Bonnes Pratiques

### Validation des Webhooks (Recommandé)

1. **Récupérer votre Auth Token** :
   - Console Twilio → Account → API keys & tokens → Auth Token

2. **Ajouter à Supabase** :
   - Edge Functions → Secrets → Add secret
   - `TWILIO_AUTH_TOKEN` = votre_token

3. **Le code vérifie automatiquement** la signature des webhooks

### Limitations de Débit
- **Sandbox** : 1 message/seconde
- **Production** : Selon votre tier Twilio

### Conformité RGPD/CCPA
- Les numéros de téléphone sont des données personnelles
- Prévoir un système de suppression des données
- Informer les utilisateurs de la collecte de données

---

## Résolution du Problème d'Authentification (Important !)

**Problème** : Edge Functions Supabase retournent erreur 401 "Missing authorization header" pour les webhooks Twilio.

**Solution** : Désactiver la vérification JWT legacy dans Supabase :

1. **Dashboard Supabase** → Settings → API
2. **Cliquez** sur "Go to JWT Keys" 
3. **Désactivez** "Verify JWT with legacy secret"
4. **Attendez** 2-3 minutes pour la prise d'effet

**Alternative** : Si l'option ci-dessus n'existe pas :
- Settings → Authentication → "Enable anonymous sign-ins"
- Settings → API → "Disable JWT verification for Edge Functions"

Cette étape est **cruciale** car Twilio n'envoie pas de headers d'authentification avec ses webhooks.

---

## Support et Ressources

### Documentation Officielle
- **Twilio WhatsApp** : https://www.twilio.com/docs/whatsapp
- **Supabase Edge Functions** : https://supabase.com/docs/guides/functions

### Support Technique
- **Twilio Support** : Console → Help & Support
- **Communauté Twilio** : https://community.twilio.com

### Monitoring Recommandé
- Configurer des alertes pour les erreurs 4xx/5xx
- Surveiller le volume de messages
- Tracker les taux de conversion (taxi → moto/voiture → localisation)

---

## Checklist de Mise en Production

- [ ] Tests complets en Sandbox réussis
- [ ] WhatsApp Business API approuvé par Twilio
- [ ] Numéro de téléphone acheté et configuré
- [ ] Templates de messages approuvés
- [ ] Webhooks de production configurés
- [ ] Monitoring et alertes en place
- [ ] Documentation utilisateur créée
- [ ] Plan de support client défini

---

**🎉 Félicitations ! Votre chatbot LokoTaxi est maintenant opérationnel !**