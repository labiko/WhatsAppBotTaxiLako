# LokoTaxi WhatsApp Bot - Documentation Technique Complète

## 🎯 Vue d'ensemble du Projet

LokoTaxi est un système de réservation de taxi via WhatsApp intégrant :
- **Chatbot WhatsApp** (Twilio + Supabase Edge Functions)
- **Application mobile conducteur** (Ionic Angular + Capacitor)
- **Base de données centralisée** (PostgreSQL + PostGIS sur Supabase)

---

## 🏗️ Architecture Technique

### Composants Principaux
```
Client WhatsApp ←→ Twilio ←→ Supabase Edge Function ←→ PostgreSQL
                                      ↕
                            Application Conducteur (Ionic)
```

### Technologies Utilisées
- **Frontend Bot** : Deno + TypeScript (Edge Functions)
- **Frontend App** : Ionic 7 + Angular 16+ + Capacitor
- **Backend** : Supabase (PostgreSQL + PostGIS + Auth + Real-time)
- **API WhatsApp** : Twilio Business API
- **Géolocalisation** : PostGIS + Haversine distance calculation

---

## 📱 Fonctionnalités du Bot WhatsApp

### Flux de Conversation Standard
1. **"taxi"** → Demande type véhicule (moto/voiture)
2. **"moto"** → Demande partage position GPS
3. **GPS partagé** → Demande destination
4. **"gare melun"** → Calcul prix + demande confirmation
5. **"oui"** → Recherche conducteur + assignation automatique

### Commandes Spéciales
- `"annuler"` - Annule la réservation en cours
- `"aide"` - Affiche l'aide contextuelle selon l'état
- `"liste"` - Affiche toutes les destinations disponibles
- `"statut"` - Informations sur la session actuelle

### Gestion d'Erreurs
- Sessions expirées (2h) → Redirection vers nouvelle réservation
- Destination inconnue → Suggestions alternatives
- Aucun conducteur → Message d'attente et retry
- GPS invalide → Demande nouveau partage position

---

## 🗄️ Base de Données (Supabase)

### Tables Principales

#### `conducteurs`
```sql
- id (UUID)
- nom, prenom, telephone
- type_vehicule ('moto'|'voiture')
- marque_vehicule, modele_vehicule, couleur_vehicule, numero_plaque
- position (GEOGRAPHY PostGIS)
- statut ('disponible'|'occupé'|'hors_service'|'inactif')
- note_moyenne, nombre_courses
- created_at, updated_at, derniere_activite
```

#### `sessions`
```sql
- id (UUID) 
- client_phone (TEXT, unique)
- vehicle_type ('moto'|'voiture')
- position_client (GEOGRAPHY)
- destination_nom, destination_id, destination_position
- distance_km, prix_estime, prix_confirme
- conducteur_id (UUID FK)
- etat ('attente_vehicule'|'vehicule_choisi'|'position_recue'|'prix_calcule'|'conducteur_assigne')
- created_at, updated_at, expires_at (NOW() + 2h)
```

#### `reservations`
```sql
- id (UUID)
- client_phone, vehicle_type
- position_depart, position_destination (GEOGRAPHY)
- destination_nom, destination_id, distance_km
- prix_estime, prix_confirme, conducteur_id
- status ('pending'|'accepted'|'completed'|'canceled')
- created_at, updated_at
```

#### `adresses`
```sql
- id (UUID)
- nom (unique), adresse_complete
- position (GEOGRAPHY), latitude, longitude
- type_lieu ('transport'|'shopping'|'administratif'|'santé'|'éducation')
- actif (BOOLEAN)
```

#### `tarifs`
```sql
- id (UUID)
- type_vehicule ('moto'|'voiture') unique
- prix_par_km (INTEGER) -- 3000 GNF moto, 4000 voiture
- prix_minimum (INTEGER)
- actif (BOOLEAN)
```

### Vues Optimisées
- `conducteurs_with_coords` - Coordonnées GPS extraites
- `conducteurs_disponibles` - Filtrage statut disponible
- `sessions_with_coordinates` - Sessions avec lat/lng extraites
- `tarifs_actifs` - Configuration prix active

---

## ⚙️ Configuration Technique

### Supabase
```typescript
const SUPABASE_URL = 'https://nmwnibzgvwltipmtwhzo.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGci...' // Service role
const SUPABASE_ANON_KEY = 'eyJhbGci...'     // Public anon
```

### Twilio WhatsApp
- **Webhook URL** : `https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot`
- **Méthode** : POST
- **Content-Type** : application/x-www-form-urlencoded
- **Sandbox** : join <code> pour activer

### Edge Function (Deno)
- **Runtime** : Deno 1.32+
- **Déploiement** : `supabase functions deploy whatsapp-bot`
- **Logs** : Dashboard Supabase → Edge Functions → Logs

---

## 🧮 Calculs et Algorithmes

### Distance Haversine
```javascript
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Rayon terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c; // Distance en kilomètres
}
```

### Calcul de Prix
```
Prix = Distance (km) × Tarif par km
- Moto : 3 000 GNF/km
- Voiture : 4 000 GNF/km
```

### Temps d'Arrivée Conducteur
```
Temps = Distance × 3 minutes/km (minimum 5 minutes)
```

### Recherche d'Adresses (Levenshtein)
```sql
SELECT * FROM adresses 
WHERE levenshtein(LOWER(nom), LOWER('gare melun')) <= 3
ORDER BY levenshtein ASC
```

---

## 🔄 États et Sessions

### Cycle de Vie Session
```
init → attente_vehicule → vehicule_choisi → position_recue → prix_calcule → conducteur_assigne
```

### Transitions d'États
1. **"taxi"** → `attente_vehicule`
2. **"moto"/"voiture"** → `vehicule_choisi`
3. **GPS coordinates** → `position_recue`
4. **destination valide** → `prix_calcule`
5. **"oui" confirmation** → `conducteur_assigne`

### Nettoyage Automatique
- Sessions expirées après 2 heures
- Fonction `clean_expired_sessions()` appelée régulièrement
- Reset complet avec commande "taxi" (priorité absolue)

---

## 🚗 Gestion des Conducteurs

### Sélection Automatique
1. **Filtrage** : Conducteurs disponibles du bon type véhicule
2. **Calcul distance** : Haversine depuis position client
3. **Tri** : Par distance croissante
4. **Sélection** : Le plus proche
5. **Mise à jour** : Statut → "occupé"

### Base de Données Fallback
- 13 conducteurs Paris pré-enregistrés
- 5 motos + 8 voitures avec positions GPS réelles
- Utilisation si base de données indisponible
- Coordonnées autour des monuments parisiens

---

## 🔧 Fonctions SQL Importantes

### Extraction Coordonnées PostGIS
```sql
CREATE FUNCTION extract_coordinates_from_session(phone_number TEXT)
RETURNS TABLE (latitude FLOAT, longitude FLOAT)
```

### Calcul Prix Course
```sql  
CREATE FUNCTION calculer_prix_course(type_vehicule TEXT, distance_km DECIMAL)
RETURNS TABLE (prix_total INTEGER, prix_par_km INTEGER)
```

### Recherche Adresse Floue
```sql
CREATE FUNCTION search_adresse(search_term TEXT)
RETURNS TABLE (id UUID, nom VARCHAR, distance_levenshtein INT)
```

### Nettoyage Sessions
```sql
CREATE FUNCTION clean_expired_sessions()
RETURNS INTEGER -- Nombre de sessions supprimées
```

---

## 📊 Monitoring et Logs

### Logs Automatiques Bot
```typescript
console.log('🎯 Recherche conducteur moto près de', lat, lon);
console.log('💰 Calcul prix:', vehicleType, distanceKm + 'km');
console.log('🔍 Extraction coordonnées pour session:', phone);  
console.log('✅ Réservation confirmée pour', client);
```

### Métriques Clés
- Taux de conversion : Sessions → Réservations confirmées
- Temps de réponse moyen du bot
- Répartition moto vs voiture
- Destinations les plus demandées
- Erreurs fréquentes et résolutions

### Alertes Importantes
- Coordonnées (0,0) → Problème extraction PostGIS
- Distance > 100km → Bug calcul coordonnées  
- Aucun conducteur disponible → Vérifier statuts
- Erreur 401 → Problème clés API Supabase

---

## 🛠️ Déploiement et Maintenance

### Déploiement Edge Function
```bash
# Déployer la fonction
supabase functions deploy whatsapp-bot

# Vérifier le déploiement  
supabase functions list

# Voir les logs en temps réel
supabase functions logs whatsapp-bot --follow
```

### Tests de Bout en Bout
1. **Test complet** : taxi → moto → GPS → destination → confirmation
2. **Vérification logs** : Coordonnées correctes, prix cohérent
3. **Test conducteur** : Assignation et temps d'arrivée réaliste
4. **Test erreurs** : Sessions expirées, destinations inconnues

### Maintenance Préventive
- Nettoyage sessions expirées (automatique)
- Mise à jour positions conducteurs temps réel
- Sauvegarde base de données quotidienne
- Tests fonctionnels scénarios complets

---

## 🐛 Bugs Résolus et Solutions

### Bug Temps d'Arrivée 16272 Minutes (07/2025)
**Problème** : Temps d'arrivée irréaliste (11 jours)
**Cause** : Coordonnées extraites (0,0) au lieu des vraies GPS
**Solution** : `getClientCoordinates(normalizePhone(from))` ligne 763

### Bug Distance 5401.9 km (07/2025)  
**Problème** : Distance énorme au lieu de 12 km réels
**Cause** : Format PostGIS binaire mal parsé
**Solution** : Fonction `extract_coordinates_from_session()` avec ST_X/ST_Y

### Erreur 401 Clés API (07/2025)
**Problème** : "Legacy API keys disabled"
**Solution** : Architecture fallback automatique service_role + anon

---

## 🔮 Évolutions Futures

### Fonctionnalités Planifiées
- **Application mobile conducteur** (Ionic Angular)
- **Notifications push** temps réel pour nouvelles courses
- **Paiement intégré** (Orange Money, Wave)
- **Tracking GPS** position conducteur en direct
- **Évaluations** système de notes bidirectionnel
- **Messages vocaux** transcription automatique
- **Multi-langues** français, anglais, langues locales

### Améliorations Techniques
- **IA conversationnelle** meilleure compréhension langage naturel
- **Optimisation routes** algorithmes de routage avancés  
- **Analytics avancées** tableaux de bord et prédictions
- **API publique** intégration applications tierces
- **Géofencing** services limités par zones géographiques

---

## 📞 Support et Ressources

### Documentation de Référence
- `CLAUDE.md` - Contexte complet et historique du projet
- `REGLES_GESTION.md` - Règles métier détaillées
- `sql/` - Scripts base de données complets
- `README.md` - Instructions de déploiement

### Ressources Externes
- **Supabase Dashboard** : https://app.supabase.com/project/nmwnibzgvwltipmtwhzo
- **Twilio Console** : Configuration webhook WhatsApp
- **Repository GitHub** : https://github.com/labiko/LokoTaxiBotWhatsapp (branche dev)

### Commandes Utiles
```bash
# Logs Supabase en temps réel
supabase functions logs whatsapp-bot --follow

# Test webhook local
curl -X POST webhook-url -d "test-payload"

# Backup base de données
pg_dump -h host -U user -d db > backup.sql
```

---

*Documentation générée le 23 juillet 2025*  
*LokoTaxi WhatsApp Bot - Révolution du transport urbain en Afrique* 🚗📱✨