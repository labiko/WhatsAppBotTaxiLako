# 📋 GUIDE D'INSTALLATION COMPLET - SYSTÈME DE NOTIFICATIONS

## 🎯 Vue d'ensemble

Ce système permet d'envoyer automatiquement un message WhatsApp au client quand un conducteur accepte sa réservation.

### Flux :
1. **Client** réserve → Statut `pending`
2. **Conducteur** accepte → Statut `accepted`
3. **Trigger PostgreSQL** → Crée une notification
4. **Edge Function** → Envoie le WhatsApp

## 📁 Fichiers à exécuter

### Dans Supabase SQL Editor :
1. `01_create_notifications_table.sql` - Table des notifications
2. `02_create_trigger_system.sql` - Trigger automatique
3. `03_monitoring_views.sql` - Vues de monitoring
4. `04_test_system.sql` - Test du système

### Dans votre terminal :
- Déployer la fonction Edge modifiée

## 🚀 ÉTAPES D'INSTALLATION

### ÉTAPE 1 : Connexion à Supabase
1. Allez sur [app.supabase.com](https://app.supabase.com)
2. Sélectionnez votre projet
3. Cliquez sur **SQL Editor** dans le menu

### ÉTAPE 2 : Créer la table des notifications
1. Ouvrez `01_create_notifications_table.sql`
2. Copiez tout le contenu
3. Collez dans SQL Editor
4. Cliquez sur **RUN** (ou Ctrl+Enter)
5. Vous devez voir : "✅ Table notifications_pending créée avec succès"

### ÉTAPE 3 : Créer le trigger
1. Ouvrez `02_create_trigger_system.sql`
2. Copiez tout le contenu
3. Collez dans SQL Editor
4. Cliquez sur **RUN**
5. Vous devez voir : "✅ Trigger de notification créé avec succès"

### ÉTAPE 4 : Créer les vues de monitoring
1. Ouvrez `03_monitoring_views.sql`
2. Copiez tout le contenu
3. Collez dans SQL Editor
4. Cliquez sur **RUN**
5. Vous devez voir : "✅ Vues et fonctions de monitoring créées avec succès"

### ÉTAPE 5 : Déployer la fonction Edge
Dans votre terminal :
```bash
cd C:\Users\diall\Documents\LokoTaxi
supabase functions deploy whatsapp-bot
```

### ÉTAPE 6 : Configurer l'appel périodique

#### Option A : Cron-job.org (RECOMMANDÉ - GRATUIT)
1. Créez un compte sur [cron-job.org](https://cron-job.org)
2. Cliquez sur "CREATE CRONJOB"
3. Configurez :
   - **Title** : Process WhatsApp Notifications
   - **URL** : 
   ```
   https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot/process-notifications
   ```
   - **Schedule** : 
     - Execution schedule : Every X minutes/hours/days...
     - Sélectionnez : Every 1 minutes
   - **Request Method** : POST
   - **Request Headers** (cliquez sur "Show Advanced"):
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U
   Content-Type: application/json
   ```
4. Cliquez sur "CREATE"

#### Option B : Depuis votre application
Ajoutez ce code dans votre app :
```javascript
// Appeler toutes les 30 secondes
setInterval(async () => {
  try {
    const response = await fetch(
      'https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot/process-notifications',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U',
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Notifications processed:', await response.json());
  } catch (error) {
    console.error('Error processing notifications:', error);
  }
}, 30000); // 30 secondes
```

### ÉTAPE 7 : Tester le système
1. Ouvrez `04_test_system.sql`
2. Exécutez le script complet
3. Suivez les instructions affichées
4. Vérifiez que vous voyez : "✅ Notification créée avec succès !"

## 🔍 VÉRIFICATION

### Vérifier les notifications en attente :
```sql
-- Voir toutes les notifications non traitées
SELECT * FROM v_notifications_pending_full;

-- Voir le tableau de bord
SELECT * FROM v_notifications_dashboard;
```

### Vérifier les logs de la fonction :
```bash
supabase functions logs whatsapp-bot --tail
```

### Tester manuellement l'envoi :
```bash
curl -X POST https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot/process-notifications \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U" \
  -H "Content-Type: application/json"
```

## ⚠️ DÉPANNAGE

### Problème : Notifications non créées
- Vérifiez que le trigger existe :
  ```sql
  SELECT * FROM pg_trigger WHERE tgname = 'trigger_reservation_status_change';
  ```
- Vérifiez que conducteur_id n'est pas NULL

### Problème : Notifications non envoyées
- Vérifiez que le cron job fonctionne
- Regardez les logs : `supabase functions logs whatsapp-bot --tail`
- Testez manuellement avec curl

### Problème : Messages WhatsApp non reçus
- Vérifiez les credentials Twilio dans le code
- Vérifiez que le numéro est au format international (+224...)

## 📊 REQUÊTES UTILES

```sql
-- Statistiques du système
SELECT * FROM get_notification_stats();

-- Forcer le traitement d'une notification
SELECT mark_notification_processed('NOTIFICATION_ID');

-- Nettoyer les vieilles notifications
SELECT clean_old_notifications();
```

## ✅ C'EST TERMINÉ !

Le système est maintenant opérationnel. Quand un conducteur accepte une réservation, le client recevra automatiquement un WhatsApp avec les informations du conducteur.