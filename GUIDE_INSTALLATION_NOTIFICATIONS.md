# 🚀 GUIDE COMPLET D'INSTALLATION - SYSTÈME DE NOTIFICATIONS WHATSAPP

## 📋 Vue d'ensemble
Ce guide vous permet d'installer le système de notifications automatiques qui envoie un WhatsApp au client quand un conducteur accepte sa réservation.

### 🔄 Fonctionnement :
1. **Client** réserve → Statut `pending`
2. **Conducteur** accepte → App met à jour statut `accepted`
3. **Trigger PostgreSQL** → Détecte automatiquement le changement
4. **WhatsApp** → Envoyé immédiatement au client

**✅ AUCUN CRON OU SERVICE EXTERNE NÉCESSAIRE !**

---

## ⚡ ÉTAPES D'INSTALLATION

### ÉTAPE 1 : Créer la table des notifications

#### 📂 Fichier à exécuter :
[C:\Users\diall\Documents\LokoTaxi\supabase\sql\01_create_notifications_table.sql](file:///C:/Users/diall/Documents/LokoTaxi/supabase/sql/01_create_notifications_table.sql)

#### 🎯 Actions :
1. **Cliquez** sur le lien ci-dessus pour ouvrir le fichier
2. **Sélectionnez tout** le contenu (Ctrl+A)
3. **Copiez** (Ctrl+C)
4. **Allez** sur [app.supabase.com](https://app.supabase.com) → Votre projet → **SQL Editor**
5. **Collez** le code (Ctrl+V)
6. **Cliquez** sur **RUN** (ou Ctrl+Enter)

#### ✅ Résultat attendu :
```
✅ Table notifications_pending créée avec succès
```

---

### ÉTAPE 2 : Créer le trigger automatique

#### 📂 Fichier à exécuter :
[C:\Users\diall\Documents\LokoTaxi\supabase\sql\02_create_trigger_system.sql](file:///C:/Users/diall/Documents/LokoTaxi/supabase/sql/02_create_trigger_system.sql)

#### 🎯 Actions :
1. **Cliquez** sur le lien ci-dessus pour ouvrir le fichier
2. **Sélectionnez tout** le contenu (Ctrl+A)
3. **Copiez** (Ctrl+C)
4. **Dans Supabase SQL Editor**, **collez** le code (Ctrl+V)
5. **Cliquez** sur **RUN** (ou Ctrl+Enter)

#### ✅ Résultat attendu :
```
✅ Trigger de notification créé avec succès
```

---

### ÉTAPE 3 : Créer les vues de monitoring

#### 📂 Fichier à exécuter :
[C:\Users\diall\Documents\LokoTaxi\supabase\sql\03_monitoring_views.sql](file:///C:/Users/diall/Documents/LokoTaxi/supabase/sql/03_monitoring_views.sql)

#### 🎯 Actions :
1. **Cliquez** sur le lien ci-dessus pour ouvrir le fichier
2. **Sélectionnez tout** le contenu (Ctrl+A)
3. **Copiez** (Ctrl+C)
4. **Dans Supabase SQL Editor**, **collez** le code (Ctrl+V)
5. **Cliquez** sur **RUN** (ou Ctrl+Enter)

#### ✅ Résultat attendu :
```
✅ Vues et fonctions de monitoring créées avec succès
```

---

### ÉTAPE 4 : Déployer la fonction Edge modifiée

#### 📂 Fichier source :
[C:\Users\diall\Documents\LokoTaxi\supabase\functions\whatsapp-bot\index.ts](file:///C:/Users/diall/Documents/LokoTaxi/supabase/functions/whatsapp-bot/index.ts)

#### 🎯 Actions :
1. **Ouvrez** votre terminal (CMD ou PowerShell)
2. **Naviguez** vers le dossier du projet :
   ```bash
   cd C:\Users\diall\Documents\LokoTaxi
   ```
3. **Déployez** la fonction :
   ```bash
   supabase functions deploy whatsapp-bot
   ```

#### ✅ Résultat attendu :
```
Function whatsapp-bot deployed successfully
```

---

### ÉTAPE 5 : Tester le système

#### 📂 Fichier de test :
[C:\Users\diall\Documents\LokoTaxi\supabase\sql\04_test_system.sql](file:///C:/Users/diall/Documents/LokoTaxi/supabase/sql/04_test_system.sql)

#### 🎯 Actions :
1. **Cliquez** sur le lien ci-dessus pour ouvrir le fichier
2. **Sélectionnez tout** le contenu (Ctrl+A)
3. **Copiez** (Ctrl+C)
4. **Dans Supabase SQL Editor**, **collez** le code (Ctrl+V)
5. **Cliquez** sur **RUN** (ou Ctrl+Enter)

#### ✅ Résultat attendu :
```
✅ Notification créée avec succès !
=== TEST TERMINÉ ===
Si vous voyez une notification en attente, le système fonctionne !
```

---

## 🔍 VÉRIFICATION DU FONCTIONNEMENT

### Vérifier les notifications en attente :
**Dans Supabase SQL Editor**, exécutez :
```sql
SELECT * FROM v_notifications_dashboard;
```

### Vérifier les logs :
**Dans votre terminal** :
```bash
supabase functions logs whatsapp-bot --tail
```

---

## 📊 MONITORING QUOTIDIEN

### Requêtes utiles à exécuter dans SQL Editor :

#### Tableau de bord :
```sql
SELECT * FROM v_notifications_dashboard;
```

#### Notifications en attente avec détails :
```sql
SELECT * FROM v_notifications_pending_full;
```

#### Statistiques :
```sql
SELECT * FROM get_notification_stats();
```

---

## ⚠️ DÉPANNAGE

### Si aucune notification n'est créée :
**Dans SQL Editor**, vérifiez :
```sql
SELECT * FROM pg_trigger WHERE tgname = 'trigger_reservation_status_change';
```

### Si le trigger ne fonctionne pas :
**Dans SQL Editor**, vérifiez les logs :
```sql
-- Voir les logs PostgreSQL
SELECT * FROM pg_stat_activity WHERE query LIKE '%notification%';

-- Tester manuellement le trigger
UPDATE reservations 
SET statut = 'accepted', 
    conducteur_id = (SELECT id FROM conducteurs LIMIT 1)
WHERE id = 'VOTRE_RESERVATION_ID';
```

---

## ✅ INSTALLATION TERMINÉE !

Une fois toutes ces étapes réalisées, le système fonctionnera automatiquement :
1. **Conducteur** accepte une réservation → App met à jour statut `accepted`
2. **Trigger PostgreSQL** → Détecte le changement et appelle l'Edge Function
3. **Edge Function** → Envoie immédiatement le WhatsApp au client

🎉 **Le client recevra instantanément les infos du conducteur !**

### 🚀 AVANTAGES DE CETTE SOLUTION :
- ⚡ **Instantané** : Pas d'attente de 1 minute
- 🔒 **Fiable** : Aucune dépendance externe
- 💰 **Gratuit** : Pas de service cron payant
- 🎯 **Simple** : Tout se passe dans Supabase