# 🤖 Documentation Technique - LokoTaxi WhatsApp Bot

## 📋 Vue d'ensemble

**LokoTaxi Bot** est un chatbot WhatsApp intelligent qui permet aux clients de réserver des taxis (motos et voitures) à Conakry, Guinée. Le bot utilise Twilio WhatsApp Business API et Supabase Edge Functions pour gérer les réservations en temps réel.

---

## 🎯 Fonctionnalités Principales

### 1. **Réservation de Taxi**
- Réservation via mot-clé "taxi"
- Choix du type de véhicule (moto/voiture)
- Partage de localisation GPS
- Attribution automatique du conducteur le plus proche

### 2. **Géolocalisation Avancée**
- Calcul de distance réelle avec formule Haversine
- Base de données de 6 conducteurs avec positions GPS
- Sélection automatique du conducteur le plus proche
- Temps d'arrivée calculé en temps réel

### 3. **Annulation de Réservation**
- Commande "annuler" pour supprimer une réservation
- Notification automatique du conducteur
- Option de nouvelle réservation

---

## 🔄 Flux de Conversation

### **Étape 1 : Demande Initiale**
```
Client: "taxi" (ou "je veux un taxi")
Bot: "Quel type de taxi souhaitez-vous ? (Répondez par 'moto' ou 'voiture')"
```

### **Étape 2 : Sélection du Véhicule**
```
Client: "moto" ou "voiture"
Bot: "Parfait ! Vous avez choisi: [moto/voiture]
      Maintenant, veuillez partager votre position en cliquant sur l'icône 📎 puis 'Localisation'."
```

### **Étape 3 : Localisation et Confirmation**
```
Client: [Partage GPS]
Bot: "🎉 Réservation confirmée !
      🚗 Conducteur: Mamadou Diallo
      📞 Téléphone: +224621234567
      🚙 Véhicule: Moto Yamaha rouge
      📍 Distance: 1.2 km
      ⏱️ Arrivée: 5 minutes
      
      Le conducteur va vous appeler. Bon voyage ! 🛣️
      
      ❌ Pour annuler, écrivez 'annuler'
      🚕 Nouvelle réservation: écrivez 'taxi'"
```

---

## 🛠️ Règles de Gestion Techniques

### **1. Normalisation des Numéros de Téléphone**
```typescript
const normalizePhone = (phone: string): string => {
  return phone.replace(/^whatsapp:/, '').replace(/\s+/g, '').trim()
}
```
- Supprime le préfixe "whatsapp:"
- Enlève les espaces
- Format final : "+224621234567"

### **2. Calcul de Distance (Formule Haversine)**
```typescript
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371 // Rayon de la Terre en km
  // ... formule mathématique complète
}
```
- **Précision** : Distance réelle en kilomètres
- **Performance** : Calcul instantané
- **Usage** : Sélection du conducteur le plus proche

### **3. Base de Données Conducteurs (Architecture PostgreSQL)**

#### **Table `conducteurs`**
```sql
CREATE TABLE conducteurs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  telephone VARCHAR(20) NOT NULL UNIQUE,
  vehicle_type VARCHAR(10) CHECK (vehicle_type IN ('moto', 'voiture')),
  vehicle_marque VARCHAR(50),
  vehicle_modele VARCHAR(50),
  vehicle_couleur VARCHAR(30),
  vehicle_plaque VARCHAR(20),
  position_actuelle GEOGRAPHY(Point, 4326),
  statut VARCHAR(20) CHECK (statut IN ('disponible', 'occupe', 'hors_service', 'inactif')),
  note_moyenne DECIMAL(3,2) DEFAULT 5.00,
  nombre_courses INTEGER DEFAULT 0,
  date_inscription TIMESTAMP DEFAULT NOW(),
  derniere_activite TIMESTAMP DEFAULT NOW(),
  actif BOOLEAN DEFAULT TRUE
);
```

#### **Conducteurs Motos**
| Prénom | Nom | Téléphone | Véhicule | Plaque | Note | Courses |
|--------|-----|-----------|----------|--------|------|---------|
| Mamadou | Diallo | +224621234567 | Yamaha YBR 125 Rouge | CNK-001-M | 5.0 | 0 |
| Ibrahima | Sow | +224621234568 | Honda CB 125F Bleue | CNK-002-M | 5.0 | 0 |
| Alpha | Barry | +224621234569 | Suzuki GN 125 Noire | CNK-003-M | 5.0 | 0 |

#### **Conducteurs Voitures**
| Prénom | Nom | Téléphone | Véhicule | Plaque | Note | Courses |
|--------|-----|-----------|----------|--------|------|---------|
| Amadou | Bah | +224622345678 | Toyota Corolla Blanche | CNK-101-V | 5.0 | 0 |
| Ousmane | Camara | +224622345679 | Nissan Sentra Grise | CNK-102-V | 5.0 | 0 |
| Thierno | Diagne | +224622345680 | Honda Civic Rouge | CNK-103-V | 5.0 | 0 |

#### **Vue `conducteurs_disponibles`**
```sql
CREATE VIEW conducteurs_disponibles AS
SELECT 
  id, nom, prenom, telephone, vehicle_type,
  CONCAT(vehicle_marque, ' ', vehicle_modele, ' ', vehicle_couleur) as vehicule_complet,
  vehicle_plaque, position_actuelle, note_moyenne, nombre_courses
FROM conducteurs 
WHERE actif = TRUE AND statut = 'disponible'
ORDER BY note_moyenne DESC, nombre_courses ASC;
```

### **4. Algorithme de Sélection de Conducteur (Base de Données)**
```typescript
async function findNearestDriver(vehicleType: string, clientLat: number, clientLng: number) {
  // 1. Requête SQL via vue conducteurs_disponibles
  const drivers = await getAvailableDrivers(vehicleType)
  
  // 2. Extraction coordonnées PostGIS (GEOGRAPHY → lat/lng)
  const driversWithCoords = drivers.map(d => ({
    ...d,
    lat: extractLatFromPostGIS(d.position_actuelle),
    lng: extractLngFromPostGIS(d.position_actuelle)
  }))
  
  // 3. Calcul distance Haversine pour chaque conducteur
  // 4. Sélection du plus proche + calcul ETA
  // 5. Mise à jour statut conducteur → 'occupe'
}
```

#### **Fonctions de Base de Données**
```typescript
// Récupération conducteurs disponibles
async function getAvailableDrivers(vehicleType: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/conducteurs_disponibles?vehicle_type=eq.${vehicleType}`)
  return await response.json()
}

// Mise à jour statut conducteur
async function updateConducteurStatut(conducteurId: string, nouveauStatut: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/conducteurs?id=eq.${conducteurId}`, {
    method: 'PATCH',
    body: JSON.stringify({ statut: nouveauStatut, derniere_activite: new Date().toISOString() })
  })
}

// Extraction coordonnées PostGIS
function extractLatFromPostGIS(geom: any): number {
  return geom?.coordinates?.[1] || 9.537 // Fallback Conakry
}
```

### **5. Calcul du Temps d'Arrivée**
- **Formule** : `Math.max(3, Math.round(distance * 3))` minutes
- **Minimum** : 3 minutes (même si très proche)
- **Ratio** : 3 minutes par kilomètre
- **Exemple** : 2.5 km = 8 minutes

### **6. Gestion des Statuts Conducteurs**

#### **États Possibles**
| Statut | Description | Action Bot |
|--------|-------------|------------|
| `disponible` | Conducteur libre, peut accepter course | ✅ Visible dans sélection |
| `occupe` | En course avec un client | ❌ Exclu de la sélection |
| `hors_service` | Pause, maintenance, etc. | ❌ Exclu de la sélection |
| `inactif` | Hors ligne, non connecté | ❌ Exclu de la sélection |

#### **Transitions Automatiques**
```typescript
// Lors d'une réservation confirmée
await updateConducteurStatut(conducteurId, 'occupe')

// Lors de fin de course (à implémenter)
await updateConducteurStatut(conducteurId, 'disponible')
```

### **7. Données PostGIS et Géolocalisation**

#### **Format des Coordonnées**
```sql
-- Insertion avec coordonnées GPS
INSERT INTO conducteurs (position_actuelle) VALUES 
(ST_GeomFromText('POINT(-13.6785 9.5370)', 4326));

-- Format retourné par l'API REST
{
  "type": "Point",
  "coordinates": [-13.6785, 9.5370]  // [longitude, latitude]
}
```

#### **Extraction TypeScript**
```typescript
function extractLatFromPostGIS(geom: any): number {
  if (!geom || !geom.coordinates) return 9.537 // Fallback Conakry
  return geom.coordinates[1] // latitude = coordonnée Y
}

function extractLngFromPostGIS(geom: any): number {
  if (!geom || !geom.coordinates) return -13.678 // Fallback Conakry  
  return geom.coordinates[0] // longitude = coordonnée X
}
```

---

## 📨 Gestion des Messages

### **Messages Reconnus**
| Mot-clé | Action | Réponse |
|---------|--------|---------|
| "taxi" | Démarrer réservation | Demande type véhicule |
| "moto" | Sélectionner moto | Demande localisation |
| "voiture" | Sélectionner voiture | Demande localisation |
| GPS reçu | Finaliser réservation | Confirmation avec conducteur |
| "annuler" | Annuler réservation | Confirmation annulation |
| Autre | Message d'aide | Instructions d'utilisation |

### **Messages d'Aide Contextuels**
- **Accueil** : Instructions complètes pour démarrer
- **Après choix véhicule** : Guide pour partager GPS
- **Après annulation** : Option nouvelle réservation

---

## 🔧 Architecture Technique

### **1. Architecture Avec Base de Données**
- **Données persistantes** : Conducteurs et réservations en PostgreSQL
- **Statuts temps réel** : Mise à jour automatique des conducteurs
- **Optimisations SQL** : Index géographiques et vues pré-calculées  
- **Robustesse** : Fallback intelligent si base indisponible

### **2. Edge Function (Deno Runtime)**
```typescript
serve(async (req: Request): Promise<Response> => {
  // 1. Parse du webhook Twilio
  // 2. Extraction des données (From, Body, Latitude, Longitude)
  // 3. Logique de conversation
  // 4. Réponse TwiML
})
```

### **3. Webhook Twilio**
- **URL** : `https://[project].supabase.co/functions/v1/whatsapp-bot`
- **Méthode** : POST
- **Format** : `application/x-www-form-urlencoded`
- **Données** : From, Body, Latitude, Longitude, MessageType

### **4. Réponse TwiML**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Votre message de réponse</Message>
</Response>
```

---

## 🚨 Gestion d'Erreurs

### **1. Erreurs Réseau**
```typescript
catch (error) {
  console.error('💥 Erreur globale:', error)
  return errorTwimlResponse("Service indisponible. Écrivez 'taxi' pour réessayer.")
}
```

### **2. Données GPS Invalides**
- **Validation** : `parseFloat(latitude)` et `parseFloat(longitude)`
- **Fallback** : Conducteur par défaut si calcul impossible

### **3. Aucun Conducteur Disponible**
```typescript
// Fallback si aucun conducteur trouvé
return {
  name: 'Conducteur LokoTaxi',
  phone: '+224600000000',
  vehicle: 'Véhicule disponible',
  distance: '1.0 km',
  eta: '5 minutes'
}
```

---

## 📊 Logging et Monitoring

### **Logs Principaux**
```typescript
console.log(`📱 ${clientPhone} | 💬 "${body}" | 📍 ${latitude ? `${latitude},${longitude}` : 'non'}`)
console.log('🆕 Demande taxi')
console.log(`🚗 Véhicule: ${messageText}`)
console.log(`✅ Réservation - Conducteur: ${driver.name} à ${driver.distance}`)
console.log('❌ Annulation demandée')
```

### **Métriques Importantes**
- Nombre de réservations par jour
- Temps de réponse moyen
- Taux d'annulation
- Conducteurs les plus sollicités

---

## 🔐 Sécurité

### **1. Validation des Entrées**
- Nettoyage des numéros de téléphone
- Validation des coordonnées GPS
- Échappement des caractères XML dans TwiML

### **2. CORS Headers**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
}
```

### **3. Pas de Données Sensibles**
- Aucun stockage de mots de passe
- Numéros de téléphone uniquement pour identification
- Pas de données de paiement

---

## 🚀 Déploiement et Maintenance

### **1. Déploiement**
```bash
# Via Supabase CLI
supabase functions deploy whatsapp-bot

# Via Dashboard Supabase
# Copy/paste du code dans l'éditeur en ligne
```

### **2. Configuration Twilio**
- **Webhook URL** : URL de l'Edge Function
- **HTTP Method** : POST
- **Content-Type** : application/x-www-form-urlencoded

### **3. Tests**
- **Sandbox Twilio** : `join <code>` pour activer
- **Messages test** : "taxi" → "moto" → partage GPS
- **Vérification logs** : Console Supabase Functions

---

## 📈 Évolutions Futures

### **1. Base de Données Réelle**
- Migration vers table `reservations` en base
- Historique des courses
- Gestion des statuts de réservation

### **2. Conducteurs Dynamiques**
- API de mise à jour des positions
- Statut disponible/occupé
- Gestion des équipes

### **3. Fonctionnalités Avancées**
- Estimation du prix
- Suivi de course en temps réel
- Évaluation conducteur
- Paiement intégré

### **4. Intelligence Artificielle**
- Transcription de messages vocaux
- Compréhension de langage naturel
- Prédiction de demande

---

## 🔧 Maintenance et Support

### **Version Actuelle**
- **Date** : 2025-07-22 17:34:43
- **Version** : Base de Données Conducteurs
- **Fichier** : `index_20250722_173443_database_conducteurs.ts`
- **Architecture** : PostgreSQL + PostGIS + Vue SQL optimisée

### **Contact Support**
- **GitHub** : https://github.com/labiko/LokoTaxiBotWhatsapp
- **Documentation** : CLAUDE.md
- **Logs** : Supabase Dashboard → Functions → Logs