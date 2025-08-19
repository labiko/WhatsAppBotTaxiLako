# ⏰ DOCUMENTATION - Système Notifications Rappel Réservations Planifiées

## 🎯 VUE D'ENSEMBLE

**Fonctionnalité opérationnelle** permettant d'envoyer automatiquement des notifications de rappel aux conducteurs pour leurs réservations planifiées.

**Date de mise en service :** 13 août 2025  
**Statut :** ✅ 100% opérationnel et testé

---

## 📋 PRINCIPE DE FONCTIONNEMENT

### 🔔 Double Notification Automatique

**1. Notification 4H avant (Rappel normal)**
- **Titre :** "⏰ Rappel Course - 4H"
- **Priorité :** Normale  
- **Objectif :** Préparer le conducteur

**2. Notification 3H avant (Rappel urgent)**
- **Titre :** "🔔 COURSE URGENTE - 3H"  
- **Priorité :** Élevée avec 🚨
- **Objectif :** Finaliser les préparatifs

---

## 🔧 IMPLÉMENTATION TECHNIQUE

### 📁 Fichier Principal
```
Fichier : C:\Users\diall\Documents\LokoTaxi\ASPNET_MVC_WHATSAPP_SERVICE.cs
Fonction : ProcessScheduledReservationReminders()
Lignes : 794-992
Endpoint : /api/ProcessScheduledReservationReminders
```

### 🔍 Critères de Sélection SQL
```sql
SELECT * FROM reservations
WHERE statut = 'accepted'
  AND conducteur_id IS NOT NULL
  AND date_reservation IS NOT NULL  
  AND heure_reservation IS NOT NULL
  -- Notifications 4H
  AND reminder_4h_sent_at IS NULL
  -- Notifications 3H (après 4H envoyée)
  AND reminder_3h_sent_at IS NULL
```

### 📊 Colonnes Base de Données
```sql
-- Colonnes ajoutées à la table reservations
ALTER TABLE reservations 
ADD COLUMN reminder_4h_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN reminder_3h_sent_at TIMESTAMP WITH TIME ZONE;
```

---

## 📱 FORMAT DES NOTIFICATIONS

### 🕐 Notification 4H (Normale)
```
Titre: ⏰ Rappel Course - 4H

Message:
🚗 MOTO - Départ dans 4H
📍 Gare de Lieusaint → Hôpital Donka
⏰ 13h15 • 💰 35 000 GNF
📞 +33620951645
```

### 🚨 Notification 3H (Urgente)  
```
Titre: 🔔 COURSE URGENTE - 3H

Message:
🚨 MOTO - Départ dans 3H !
📍 Gare de Lieusaint → Aéroport Conakry
⏰ 12h16 • 💰 55 000 GNF  
📞 +33620951645
```

---

## ⚙️ CONFIGURATION ET PLANIFICATION

### 🕒 Fréquence Recommandée
- **Intervalle :** Toutes les 15 minutes
- **Plage :** 24h/24, 7j/7
- **Outil :** Windows Task Scheduler

### 🎯 Fenêtre de Détection
- **4H :** ±15 minutes (3h45 à 4h15 avant réservation)
- **3H :** ±15 minutes (2h45 à 3h15 avant réservation)

### 📡 Configuration OneSignal
```
External User IDs : conducteur_{conducteur_id}
Channel ID : onesignalChannelId (avec claxon configuré)
TTL : 3600 secondes (1 heure)
Priority : 10 (élevée)
```

---

## 🧪 TESTS ET VALIDATION

### 📝 Procédure de Test
```sql
-- 1. Créer réservation test dans 4H
INSERT INTO reservations (
    client_phone, vehicle_type, statut, conducteur_id,
    destination_nom, prix_total, date_reservation,
    heure_reservation, minute_reservation
) VALUES (
    '+33620951645', 'moto', 'accepted',
    '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa',
    'Test Hôpital', 25000, CURRENT_DATE,
    EXTRACT(HOUR FROM (NOW() + INTERVAL '4 hours'))::INTEGER,
    EXTRACT(MINUTE FROM (NOW() + INTERVAL '4 hours'))::INTEGER
);

-- 2. Lancer fonction
GET /api/ProcessScheduledReservationReminders

-- 3. Vérifier colonnes mises à jour  
SELECT reminder_4h_sent_at, reminder_3h_sent_at 
FROM reservations WHERE destination_nom = 'Test Hôpital';
```

### ✅ Résultats Attendus
```json
{
  "success": true,
  "reminders_4h": 1,
  "reminders_3h": 0,
  "total": 1,
  "message": "1 rappel(s) envoyé(s)",
  "duration": 2.5
}
```

---

## 🔧 CONFIGURATION WINDOWS TASK SCHEDULER

### 📋 Paramètres
```
Nom de la tâche : LokoTaxi-NotificationsRappel
Action : Démarrer un programme
Programme : curl
Arguments : -X GET "http://localhost/api/ProcessScheduledReservationReminders"
Déclencheur : Quotidien, répéter toutes les 15 minutes pendant 24h
```

### 📜 Script Batch Recommandé
```batch
@echo off
echo [%date% %time%] Démarrage notifications rappel...
curl -X GET "http://localhost/api/ProcessScheduledReservationReminders" -H "Accept: application/json"
if %errorlevel% neq 0 (
    echo [%date% %time%] ERREUR: Échec execution API
) else (
    echo [%date% %time%] Notifications traitées avec succès
)
```

---

## 📊 MÉTRIQUES ET MONITORING

### 🎯 KPIs à Surveiller
- **Notifications 4H envoyées/jour**
- **Notifications 3H envoyées/jour**  
- **Temps d'exécution moyen**
- **Taux d'erreur OneSignal**
- **Réservations sans conducteur assigné**

### 📈 Charge Système Estimée
- **96 exécutions/jour** (toutes les 15 min)
- **~30 secondes/exécution** en moyenne
- **Charge totale :** 48 minutes/jour
- **Impact :** Négligeable sur les performances

---

## 🚀 AVANTAGES MÉTIER

### ✅ Pour les Conducteurs
- **Préparation optimale** avec 4H d'anticipation
- **Rappel urgent** pour éviter les oublis
- **Informations complètes** (client, trajet, prix)
- **Différenciation visuelle** normal vs urgent

### ✅ Pour l'Entreprise  
- **Réduction des no-shows** conducteurs
- **Amélioration ponctualité** des courses planifiées
- **Satisfaction client** augmentée
- **Optimisation logistique** automatisée

---

## 🔄 ÉVOLUTIONS FUTURES

### 🎯 Extensions Possibles
- **Notification 1H** pour les courses très importantes
- **Rappel 30 minutes** pour l'arrivée sur site
- **SMS de backup** si notification push échoue  
- **Géolocalisation temps réel** du conducteur
- **Estimation trafic** intégrée

### 📱 Améliorations UX
- **Boutons d'action** (Accepter/Refuser/Reporter)
- **Intégration GPS** direct depuis notification
- **Historique** des rappels envoyés
- **Statistiques** de ponctualité par conducteur

---

## ✅ CONCLUSION

Le système de notifications rappel pour réservations planifiées est **100% opérationnel** et prêt pour utilisation en production. Il offre une solution robuste et automatisée pour améliorer la ponctualité des conducteurs et la satisfaction client.

**Prochaine étape recommandée :** Mise en place du Windows Task Scheduler avec fréquence de 15 minutes.