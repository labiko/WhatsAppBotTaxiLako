# 📋 SYSTÈME DE GESTION DES REFUS CONDUCTEURS - DOCUMENTATION COMPLÈTE V1.3

## 🎯 Vue d'ensemble

Le système de gestion des refus permet de gérer automatiquement les cas où :
1. Un conducteur refuse une réservation → Remise automatique en `pending`
2. Aucun conducteur n'accepte dans les 30 minutes → Annulation automatique

**🔄 Dernière mise à jour :** 2025-07-24 - Système opérationnel avec nettoyage notifications et gestion numéros de test

---

## 🔄 Flux Complet

### **Cas 1 : Refus puis nouveau conducteur**
```
Client demande taxi
    ↓
Réservation créée (statut: pending)
    ↓
Conducteur 1 assigné (statut: accepted)
    ↓
Conducteur 1 refuse → (statut: refused)
    ↓
[TRIGGER AUTOMATIQUE]
    ↓
Statut → pending + Log refus
    ↓
Conducteur 2 accepte → (statut: accepted)
    ↓
Client reçoit infos conducteur 2
```

### **Cas 2 : Annulation automatique après timeout**
```
Client demande taxi
    ↓
Réservation créée (statut: pending)
    ↓
Aucun conducteur n'accepte
    ↓
[TÂCHE PLANIFIÉE] - Toutes les 5 min
    ↓
AutoCancelExpired appelé automatiquement
    ↓
auto_cancel_expired_reservations() exécutée
    ↓
Réservations > 30 min → (statut: auto_canceled)
    ↓
Notification 'auto_cancellation' créée
    ↓
[TÂCHE PLANIFIÉE] - Toutes les 1 min  
    ↓
ProcessWhatsAppNotifications appelé
    ↓
Client reçoit message d'annulation WhatsApp
```

---

## 🗄️ Base de Données

### **1. Modifications Table `reservations`**
- **Nouveaux statuts :** `refused`, `auto_canceled`
- **Nouvelle colonne :** `updated_at` (TIMESTAMP) - mise à jour automatique
- **Trigger automatique :** Met à jour `updated_at` à chaque modification

### **2. Nouvelle Table `reservation_refus`**
```sql
reservation_refus
├── id (UUID PRIMARY KEY)
├── reservation_id → reservations.id (ON DELETE CASCADE)
├── conducteur_id → conducteurs.id
├── raison_refus (TEXT)
└── created_at (TIMESTAMP DEFAULT NOW())
```

**Index créés :**
- `idx_reservation_refus_reservation` sur `reservation_id`
- `idx_reservation_refus_conducteur` sur `conducteur_id`

### **3. Vues de Monitoring**
- `v_reservation_refus_stats` : Statistiques des refus par conducteur
- `v_auto_cancellations` : Statistiques des annulations avec durée d'attente moyenne

---

## ⚙️ Automatismes

### **1. Trigger Général `updated_at`**
- **Nom :** `trigger_update_reservations_updated_at`
- **Action :** Met à jour automatiquement `updated_at` à chaque modification de réservation
- **Fonction :** `update_updated_at_column()`

### **2. Trigger Refus**
- **Nom :** `trigger_reservation_refused`
- **Déclencheur :** BEFORE UPDATE quand statut → `refused`
- **Action automatique :**
  - Enregistre le refus dans `reservation_refus`
  - Remet le statut à `pending`
  - Efface le `conducteur_id`
  - `updated_at` est mis à jour automatiquement par le trigger général

### **3. Fonction SQL d'Annulation `auto_cancel_expired_reservations()`**
- **Nom :** `auto_cancel_expired_reservations()`
- **Appelée par :** Endpoint C# `AutoCancelExpired`
- **Quand :** Via tâche planifiée toutes les 5 minutes
- **Critères d'annulation :**
  - Statut = `pending` (en attente de conducteur)
  - `conducteur_id IS NULL` (aucun conducteur assigné)
  - `created_at < NOW() - INTERVAL '30 minutes'` (créée il y a plus de 30 minutes)
- **Actions automatiques :**
  - Change le statut → `auto_canceled`
  - Met à jour `updated_at` via trigger
  - Crée notification `auto_cancellation` pour WhatsApp
  - Évite les doublons avec `ON CONFLICT (reservation_id, type) DO NOTHING`
- **Retour :** JSON avec nombre annulées, détails réservations, durées d'attente
- **⚙️ Configuration :** Modifier `INTERVAL '30 minutes'` pour changer la durée avant annulation

---

## 🌐 Endpoints ASP.NET MVC

### **1. ProcessWhatsAppNotifications (amélioré)**
```
URL: /ScheduledTask/ProcessWhatsAppNotifications
Fréquence: Toutes les minutes
Statut: ✅ OPÉRATIONNEL
```
**Gère 2 types de notifications :**
- `reservation_accepted` : Message conducteur assigné → Envoi infos conducteur
- `auto_cancellation` : Message annulation automatique → Envoi excuse + "écrivez taxi"

**Améliorations V1.3 :**
- ✅ **Nettoyage automatique** : Marque les notifications comme `processed_at` après envoi
- ✅ **Gestion numéros de test** : Détecte `TEST_*` et les marque sans envoi Twilio
- ✅ **Normalisation numéros** : Format international pour Twilio (+33, +224)
- ✅ **Logs détaillés** : Diagnostic complet des erreurs et succès
- ✅ **Compteur correct** : Affiche le vrai nombre de notifications traitées

### **2. AutoCancelExpired (nouveau)**
```
URL: /ScheduledTask/AutoCancelExpired  
Fréquence: Toutes les 5 minutes
Appelé par: Tâche planifiée serveur (automatique)
Statut: ✅ OPÉRATIONNEL
```

**Flux d'exécution complet :**
1. **Réception** : Tâche planifiée appelle l'endpoint GET
2. **Connexion** : Se connecte à Supabase avec `service_role` key
3. **Exécution SQL** : POST vers `/rest/v1/rpc/auto_cancel_expired_reservations`
4. **Fonction SQL** : `auto_cancel_expired_reservations()` s'exécute :
   - Trouve réservations `pending` sans conducteur > 30 minutes
   - Les passe en `auto_canceled` avec `updated_at` automatique
   - Crée notifications `auto_cancellation` (évite doublons)
   - Retourne JSON avec détails (count, réservations, durées)
5. **Réponse** : Endpoint retourne le résultat avec durée d'exécution

**⚙️ Configuration durée :** Modifier `INTERVAL '30 minutes'` dans la fonction SQL

---

## 🚀 Déploiement

### **Étape 1 : Base de données**
```bash
# Exécuter le script SQL
psql -U postgres -d votre_base -f 10_gestion_refus_conducteur.sql
```

### **Étape 2 : Déployer le code C#**
Déployez le fichier `ENDPOINT_TACHE_PLANIFIEE.cs` mis à jour

### **Étape 3 : Configurer les tâches planifiées**
1. **Existante :** ProcessWhatsAppNotifications → toutes les minutes
2. **Nouvelle :** AutoCancelExpired → toutes les 5 minutes (ou 1 minute pour tests)

**Configuration exacte des tâches :**
```bash
# Tâche 1 - Traitement notifications WhatsApp
URL: https://votre-site.com/ScheduledTask/ProcessWhatsAppNotifications
Méthode: GET
Intervalle: 1 minute
Action: Traite les notifications et envoie WhatsApp

# Tâche 2 - Annulation automatique des réservations expirées  
URL: https://votre-site.com/ScheduledTask/AutoCancelExpired
Méthode: GET  
Intervalle: 5 minutes (production) ou 1 minute (tests)
Action: Appelle auto_cancel_expired_reservations() et crée notifications
```

---

## 📱 Messages WhatsApp

### **Message d'annulation automatique**
```
❌ RÉSERVATION ANNULÉE AUTOMATIQUEMENT

Aucun conducteur disponible n'a accepté votre demande dans les 30 minutes.

🔄 Pour une nouvelle réservation: écrivez 'taxi'

Nous sommes désolés pour la gêne occasionnée.
```

---

## 🧪 Tests

### **Test 1 : Refus conducteur**
```sql
-- Simuler un refus
UPDATE reservations 
SET statut = 'refused' 
WHERE id = 'xxx' AND statut = 'accepted';

-- Vérifier
SELECT * FROM reservations WHERE id = 'xxx'; -- Doit être 'pending'
SELECT * FROM reservation_refus; -- Doit avoir une ligne
```

### **Test 2 : Annulation automatique**
```sql
-- Créer une vieille réservation pending
INSERT INTO reservations (client_phone, vehicle_type, statut, created_at)
VALUES ('+33612345678', 'moto', 'pending', NOW() - INTERVAL '35 minutes');

-- Lancer l'annulation
SELECT auto_cancel_expired_reservations();

-- Vérifier
SELECT * FROM reservations WHERE client_phone = '+33612345678'; -- Doit être 'auto_canceled'
SELECT * FROM notifications_pending WHERE type = 'auto_cancellation'; -- Doit avoir une notification
```

---

## 📊 Monitoring

### **Voir les refus par conducteur**
```sql
SELECT * FROM v_reservation_refus_stats;
```

### **Voir les annulations automatiques**
```sql
SELECT * FROM v_auto_cancellations;
-- Colonnes disponibles :
-- - date_annulation : Date des annulations
-- - nombre_annulations : Nombre total d'annulations
-- - vehicle_type : Type de véhicule (moto/voiture)
-- - clients_uniques : Nombre de clients différents affectés
-- - duree_moyenne_attente_min : Durée moyenne d'attente avant annulation
```

### **Vérifier les réservations en attente depuis longtemps**
```sql
SELECT id, client_phone, created_at, updated_at,
       EXTRACT(EPOCH FROM (NOW() - created_at))/60 as attente_minutes,
       EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as derniere_modif_minutes
FROM reservations 
WHERE statut = 'pending'
ORDER BY created_at ASC;
```

### **Monitoring des performances**
```sql
-- Vue d'ensemble des délais moyens par type de véhicule
SELECT 
  vehicle_type,
  COUNT(*) as total_reservations,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/60) as duree_moyenne_traitement_min,
  COUNT(CASE WHEN statut = 'auto_canceled' THEN 1 END) as nb_annulations_auto,
  ROUND(COUNT(CASE WHEN statut = 'auto_canceled' THEN 1 END) * 100.0 / COUNT(*), 2) as taux_annulation_pct
FROM reservations
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY vehicle_type;
```

---

## 🔧 Configuration

### **Paramètres modifiables**
- **Délai avant annulation :** 30 minutes (dans `auto_cancel_expired_reservations()`)
  ```sql
  -- Pour modifier la durée d'annulation :
  AND created_at < NOW() - INTERVAL '30 minutes'  -- ✅ MODIFIER ICI
  -- Exemples : '15 minutes', '1 hour', '2 hours'
  ```
- **Fréquence de vérification :** 5 minutes (tâche planifiée AutoCancelExpired)
- **Fréquence notifications :** 1 minute (tâche planifiée ProcessWhatsAppNotifications)

### **Web.config requis**
```xml
<appSettings>
  <add key="Supabase:Url" value="https://..." />
  <add key="Supabase:Key" value="eyJ..." />
  <add key="Twilio:Sid" value="AC..." />
  <add key="Twilio:Token" value="..." />
  <add key="Twilio:Number" value="+14155238886" />
</appSettings>
```

---

## ⚠️ Points d'attention

1. **Performance :** La fonction d'annulation parcourt toutes les réservations pending
2. **Notifications :** S'assurer que ProcessWhatsAppNotifications tourne régulièrement
3. **Logs :** Surveiller les logs pour détecter des annulations trop fréquentes
4. **Conducteurs :** Si trop de refus, investiguer la cause (prix, distance, zone...)

---

## 📈 Évolutions futures possibles

1. **Blacklist temporaire** : Ne pas proposer au conducteur qui vient de refuser
2. **Notification push** : Alerter les conducteurs proches avant annulation
3. **Tarif dynamique** : Augmenter le prix si plusieurs refus
4. **Zones difficiles** : Identifier les zones avec beaucoup d'annulations
5. **SMS de secours** : Si WhatsApp échoue, envoyer SMS

---

## 🆘 Dépannage

### **Problème : Les réservations ne repassent pas en pending**
```sql
-- Vérifier que les triggers sont actifs
SELECT * FROM pg_trigger WHERE tgname IN ('trigger_reservation_refused', 'trigger_update_reservations_updated_at');

-- Tester manuellement
UPDATE reservations SET statut = 'refused' WHERE id = 'xxx';
SELECT * FROM reservations WHERE id = 'xxx'; -- Doit être 'pending'
SELECT * FROM reservation_refus ORDER BY created_at DESC LIMIT 1; -- Doit avoir une entrée
```

### **Problème : updated_at ne se met pas à jour**
```sql
-- Vérifier le trigger updated_at
SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_reservations_updated_at';

-- Tester manuellement
UPDATE reservations SET statut = 'accepted' WHERE id = 'xxx';
SELECT id, statut, created_at, updated_at FROM reservations WHERE id = 'xxx';
-- updated_at doit être récent
```

### **Problème : Pas d'annulation automatique**
- Vérifier la tâche planifiée AutoCancelExpired (toutes les 5 min)
- Tester la fonction : `SELECT auto_cancel_expired_reservations();`
- Vérifier les logs : `/ScheduledTask/CheckStatus`

### **Problème : Client ne reçoit pas le message d'annulation**
- Vérifier ProcessWhatsAppNotifications (toutes les minutes)
- Vérifier les crédits Twilio
- Tester avec : `/ScheduledTask/TestWhatsApp?reservationId=xxx`
- Vérifier les notifications : `SELECT * FROM notifications_pending WHERE type = 'auto_cancellation';`

### **Problème : Client reçoit le message d'annulation en boucle (RÉSOLU V1.2)**
```sql
-- Vérifier si les notifications d'annulation sont marquées comme traitées
SELECT id, reservation_id, type, created_at, processed_at 
FROM notifications_pending 
WHERE type = 'auto_cancellation' 
ORDER BY created_at DESC LIMIT 5;

-- processed_at ne doit PAS être NULL après envoi réussi
-- Si processed_at = NULL, le bug persiste
```

**Cause :** Notification pas marquée comme traitée après envoi  
**Solution :** Mise à jour V1.2 avec marquage automatique `processed_at`

---

---

## 📝 Changelog

### **V1.3 - 2025-07-24 (CURRENT - OPÉRATIONNEL)**
- 🎉 **Système 100% opérationnel** : Nettoyage notifications + gestion numéros
- ✅ **Fonction `NormalizePhoneNumber`** : Support +33, +224, formats locaux
- ✅ **Gestion numéros de test** : Détection `TEST_*` et marquage automatique
- ✅ **Durée rétablie** : 30 minutes (production) au lieu de 2 minutes (test)
- ✅ **Logs ultra-détaillés** : Diagnostic complet Twilio, Supabase, marquage
- ✅ **Compteur corrigé** : `processedCount++` après succès réel
- 🐛 **Bug fix** : Erreur Twilio 21211 "Invalid 'To' Phone Number"

### **V1.2 - 2025-07-24**
- 🐛 **Bug fix critique :** Messages d'annulation envoyés en boucle
- ✅ Ajout marquage notification comme traitée après envoi d'annulation
- ✅ Durée d'expiration réduite à 2 minutes pour tests
- ✅ Logs améliorés avec codes de statut HTTP

### **V1.1 - 2025-07-24**
- ✅ Ajout colonne `updated_at` dans table `reservations`
- ✅ Trigger automatique `trigger_update_reservations_updated_at`
- ✅ Vue `v_auto_cancellations` enrichie avec durée moyenne d'attente
- ✅ Index de performance sur `reservation_refus`
- ✅ Requêtes de monitoring avancées
- ✅ Section dépannage enrichie

### **V1.0 - 2025-07-24**
- ✅ Création du système de gestion des refus
- ✅ Nouveaux statuts `refused` et `auto_canceled`
- ✅ Table `reservation_refus` pour historique
- ✅ Trigger automatique refus → pending
- ✅ Fonction d'annulation après 30 minutes
- ✅ Intégration WhatsApp et endpoints C#

---

**Version :** 1.3  
**Dernière mise à jour :** 2025-07-24 - Système 100% opérationnel  
**Statut :** ✅ PRODUCTION READY  
**Configuration :** Annulation automatique après 30 minutes  
**Auteur :** Système LokoTaxi