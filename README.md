# LokoTaxi Conducteur - Application Mobile

Application mobile Ionic Angular pour les conducteurs de taxi LokoTaxi, permettant d'accepter et de gérer les réservations provenant du chatbot WhatsApp.

---

## 🔗 Liens avec le Projet Principal

### Bot WhatsApp LokoTaxi
- **Repository** : https://github.com/labiko/LokoTaxiBotWhatsapp
- **Branche** : `dev`
- **Supabase** : https://nmwnibzgvwltipmtwhzo.supabase.co
- **Webhook Twilio** : `https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot`

### Documentation de Référence
- `CLAUDE.md` - Contexte complet du projet et historique
- `REGLES_GESTION.md` - Règles métier détaillées du système
- `sql/` - Scripts de base de données (tables, fonctions, vues)

---

## 🎯 Objectif de l'Application

Cette application permet aux conducteurs de :
1. **Recevoir les réservations** en temps réel
2. **Accepter ou refuser** les courses proposées
3. **Mettre à jour leur statut** (disponible, occupé, hors service)
4. **Gérer leur profil** et informations véhicule
5. **Consulter l'historique** des courses effectuées

---

## 🏗️ Architecture Technique

### Frontend
- **Framework** : Ionic 7 + Angular 16+
- **UI** : Ionic Components
- **Mobile** : Capacitor (iOS/Android)
- **Géolocalisation** : Capacitor Geolocation
- **Notifications** : Push notifications temps réel

### Backend
- **Base de données** : Supabase (PostgreSQL + PostGIS)
- **API** : Supabase REST API + Real-time subscriptions
- **Authentification** : Supabase Auth
- **Edge Functions** : Deno runtime

---

## 📊 Base de Données Partagée

### Tables Principales
- `conducteurs` - Profils des conducteurs avec positions GPS
- `reservations` - Réservations clients (pending → accepted → completed)
- `sessions` - Sessions WhatsApp actives des clients
- `adresses` - Destinations disponibles (14 lieux prédéfinis)
- `tarifs` - Configuration des prix (3000 GNF/km moto, 4000 voiture)

### Statuts Conducteur
- `disponible` - Prêt à accepter une course
- `occupé` - En course actuelle
- `hors_service` - Indisponible temporairement
- `inactif` - Compte désactivé

---

## 🔄 Flux de Réservation

### Côté Client WhatsApp
1. Client écrit "taxi" → Bot demande type véhicule
2. Client choisit "moto"/"voiture" → Bot demande GPS
3. Client partage position → Bot demande destination
4. Client écrit destination → Bot calcule prix et demande confirmation
5. Client confirme "oui" → **Bot recherche conducteur disponible**

### Côté Application Conducteur
6. **Notification push** : Nouvelle course disponible
7. **Écran de réservation** : Détails client, destination, prix, distance
8. **Conducteur accepte** → Statut devient "occupé"
9. **Informations envoyées** au client via bot WhatsApp
10. **Course terminée** → Conducteur redevient "disponible"

---

## 📱 Écrans de l'Application

### 1. Connexion / Authentification
- Login conducteur avec téléphone/email
- Vérification statut compte actif

### 2. Tableau de Bord
- Statut actuel (disponible/occupé/hors service)
- Statistiques : courses du jour, revenus, note moyenne
- Bouton disponibilité ON/OFF

### 3. Réservations en Attente
- Liste des courses disponibles selon le type de véhicule
- Détails : client, départ, destination, prix, distance
- Boutons "Accepter" / "Refuser"

### 4. Course en Cours
- Informations client (nom, téléphone)
- Itinéraire GPS vers point de prise en charge
- Puis itinéraire vers destination
- Bouton "Course terminée"

### 5. Historique
- Liste des courses effectuées
- Détails : date, client, trajet, prix, évaluation
- Statistiques mensuelles

### 6. Profil
- Informations personnelles
- Détails véhicule (marque, modèle, plaque)
- Position GPS actuelle
- Paramètres notifications

---

## 🛠️ Installation et Développement

### Prérequis
```bash
node -v  # v18+
npm -v   # v9+
ionic -v # v7+
```

### Installation
```bash
cd LokoTaxiConducteur
npm install
ionic capacitor add ios
ionic capacitor add android
```

### Développement
```bash
ionic serve          # Web browser
ionic cap run ios     # iOS simulator
ionic cap run android # Android emulator
```

### Configuration Supabase
```typescript
// src/app/services/supabase.service.ts
const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co'
const supabaseKey = 'eyJhbGci...' // Clé anon publique
```

---

## 🔔 Notifications Push

### Configuration
- **Service** : Capacitor Push Notifications
- **Triggers** : Nouvelle réservation disponible
- **Contenu** : "Nouvelle course - Moto - 12.5 km - 37500 GNF"

### Abonnements Real-time
```typescript
// Écouter les nouvelles réservations
supabase
  .channel('reservations')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'reservations',
    filter: `status=eq.pending`
  }, handleNewReservation)
  .subscribe()
```

---

## 🗺️ Géolocalisation

### Suivi Position Conducteur
- Mise à jour automatique toutes les 30 secondes (en service)
- Stockage en format PostGIS dans table `conducteurs`
- Calcul distance avec formule Haversine pour attribution

### Navigation GPS
- Intégration Google Maps / Apple Maps
- Itinéraire optimisé vers client puis destination
- Partage ETA avec le client via bot

---

## 🔐 Sécurité et Permissions

### Authentification
- Login sécurisé via Supabase Auth
- Vérification statut conducteur actif
- Token JWT pour API calls

### Permissions Requises
- **Géolocalisation** : Localisation en arrière-plan
- **Notifications** : Push notifications
- **Téléphone** : Appel client si nécessaire
- **Appareil photo** : Photos de fin de course (futur)

---

## 📈 Intégration Future

### Fonctionnalités Planifiées
- **Évaluations** : Système de notes clients ↔ conducteurs
- **Paiement mobile** : Intégration Orange Money, Wave
- **Chat intégré** : Communication directe avec client
- **Analytics** : Tableaux de bord performance
- **Planning** : Réservations programmées à l'avance

### API Extensions
- **Tracking temps réel** : Position visible par le client
- **Optimisation routes** : Algorithmes de routage avancés
- **Multi-langues** : Français, Anglais, Langues locales

---

## 🐛 Débogage et Support

### Logs de Debug
- Supabase Dashboard → Edge Functions → Logs
- Analyse des erreurs API et webhooks Twilio
- Monitoring des sessions et réservations

### Fichiers de Configuration
- Clés API Supabase dans `CLAUDE.md`
- Scripts SQL dans `sql/`
- Documentation complète dans `REGLES_GESTION.md`

---

## 📞 Contact et Support

### Développement
- **Projet principal** : LokoTaxi WhatsApp Bot
- **Documentation** : Voir `CLAUDE.md` pour historique complet
- **Base de données** : Scripts SQL disponibles dans `sql/`

### Ressources
- **Supabase Dashboard** : https://app.supabase.com/project/nmwnibzgvwltipmtwhzo
- **Twilio Console** : Configuration webhook WhatsApp
- **Ionic Documentation** : https://ionicframework.com/docs

---

*Application générée le 23 juillet 2025*  
*LokoTaxi Conducteur - Révolution du transport urbain en Afrique* 🚗📱✨