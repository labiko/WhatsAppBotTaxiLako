# Projet Taximoto - MVP Chatbot WhatsApp

## Contexte
Je veux créer un **chatbot WhatsApp** (via **Twilio + WhatsApp Business API**) qui permet aux clients de **réserver un taxi (moto ou voiture)** à Conakry.  
Les réservations doivent être **stockées dans Supabase**, en utilisant des **Edge Functions (Deno)** pour gérer les webhooks Twilio.  
Je n'utilise **pas de backend ASP.NET Core** pour aller plus vite.

---

## Objectifs du MVP
1. **Réservation via mot-clé :**
   - Si le client envoie `"taxi"` ou `"je veux un taxi"`, le bot répond :  
     *"Quel type de taxi souhaitez-vous ? (Répondez par 'moto' ou 'voiture')"*
2. **Choix du véhicule :**
   - Si le client répond `"moto"` ou `"voiture"`, le bot demande :  
     *"Merci. Veuillez partager votre position en cliquant sur l'icône (📎) puis 'Localisation'."*
3. **Localisation :**
   - Quand le client partage sa position, Twilio envoie un webhook avec :
     - `From` (numéro du client),
     - `Latitude` et `Longitude` (coordonnées GPS).
   - L'Edge Function insère une réservation dans Supabase avec :  
     **client_phone**, **vehicle_type**, **pickup_location**, **status = pending**, **created_at**.
4. **Confirmation :**
   - Le bot répond :  
     *"Votre demande de taxi [moto/voiture] a été enregistrée."*

---

## Base de données (Supabase)

### Table `reservations`
```sql
create table reservations (
  id uuid primary key default uuid_generate_v4(),
  client_phone text not null,
  vehicle_type text check (vehicle_type in ('moto', 'voiture')),
  pickup_location geography(Point, 4326),
  status text check (status in ('pending', 'accepted', 'completed', 'canceled')) default 'pending',
  created_at timestamp default now()
);
```

**Exemple de ligne insérée :**
```sql
insert into reservations (client_phone, vehicle_type, pickup_location, status)
values ('+224622000111', 'moto', 'POINT(-13.5784 9.6412)', 'pending');
```

---

## Edge Function : `/supabase/functions/whatsapp-bot`

### **Tâches principales :**
- Parse le payload Twilio (`From`, `Body`, `Latitude`, `Longitude`).
- Gérer **3 états principaux** :
  1. **Demande de taxi (mot-clé "taxi")** → demander le type de véhicule.
  2. **Réponse "moto" ou "voiture"** → stocker le type et demander la localisation.
  3. **Réception de la localisation** → insérer la réservation (avec `client_phone`) et confirmer.

- Prévoir une **gestion future des vocaux** :  
  - Si le webhook contient `MediaUrl0`, il suffit d'appeler plus tard une API de transcription IA (optionnel pour le moment).

---

### **Pseudo-code de l'Edge Function**
```javascript
if (body.includes("taxi")) {
  saveSession(from, { vehicle_type: null });
  reply("Quel type de taxi souhaitez-vous ? (Répondez par 'moto' ou 'voiture')");
}
else if (body === "moto" || body === "voiture") {
  updateSession(from, { vehicle_type: body });
  reply("Merci. Veuillez partager votre position.");
}
else if (latitude && longitude) {
  const session = getSession(from);
  insertReservation(from, session.vehicle_type, latitude, longitude);
  reply(`Votre demande de taxi ${session.vehicle_type} a été enregistrée.`);
}
else {
  reply("Bienvenue ! Pour réserver, écrivez 'taxi'.");
}
```

---

## Exemple de Payload Twilio (position)
```json
{
  "From": "whatsapp:+224622000111",
  "Latitude": "9.6412",
  "Longitude": "-13.5784",
  "Body": ""
}
```

---

## README.md attendu
- **Instructions pour déployer la fonction :**  
  ```bash
  supabase functions deploy whatsapp-bot
  ```
- **Configurer le webhook Twilio** vers l'URL publique de l'Edge Function.  
- **Tester via Twilio Sandbox** (envoyer "join <code>" pour activer le sandbox).  
- **Vérifier les insertions dans Supabase** (table `reservations`).

---

## Demande finale à Claude Code
Claude, génère-moi :
1. **Le code complet de l'Edge Function** `/supabase/functions/whatsapp-bot/index.ts`  
   - Avec la logique mot-clé `"taxi"` → choix `"moto/voiture"` → insertion localisation (avec `client_phone`).
2. **Le script SQL** `sql/create_reservations.sql`.  
3. **Un README.md clair** expliquant comment tester avec Twilio Sandbox et Supabase.

---

## Extension future (IA + vocaux)
- Ajouter un hook pour **`MediaUrl0`** afin de gérer les messages vocaux.  
- Transcrire l'audio via une API (Whisper, Azure Speech-to-Text).  
- Passer la transcription dans la même logique (mot-clé taxi → réservation).

---

## Analyse des Logs Automatique

**Analyse automatique** : Toujours analyser le fichier `C:\Users\diall\Documents\LABICOTAXI\NewMaquettes\logSupabase\log.json` pour diagnostiquer les problèmes.

**Analyse conversation WhatsApp** : Analyser `C:\Users\diall\Documents\LABICOTAXI\NewMaquettes\wt1.png` pour voir l'état de la conversation.

---

## Problème Identifié via Logs

**❌ PROBLÈME MAJEUR DÉTECTÉ :**

**Lignes 59, 171, 283** des logs : 
```
"Legacy API keys are disabled"
"Your legacy API keys (anon, service_role) were disabled on 2025-07-22T14:16:02.327891+00:00"
"Re-enable them in the Supabase dashboard, or use the new publishable and secret API keys"
```

**Cause** : Les clés API legacy ont été **automatiquement désactivées** par Supabase.

**Solution** : Dans Dashboard Supabase → Settings → API :
1. **Réactivez les clés legacy** temporairement 
2. **OU** utilisez les nouvelles clés publishable/secret

**État actuel de la conversation (wt1.png)** :
- ✅ "taxi" → Demande type de véhicule 
- ✅ "moto" → Demande localisation
- ✅ Partage GPS → "Position reçue ! (Fonction de réservation en test)"

**Flux fonctionne** mais **sessions non persistantes** à cause des clés API désactivées.

---

## Historique des Versions du Bot

### Version 2025-07-22 17:26:50 - Géolocalisation + Annulation
**Fichier:** `index_20250722_172650_geolocalisation_annulation.ts`

**🆕 Nouvelles fonctionnalités:**
- ✅ **Calcul de distance réelle** avec formule Haversine
- ✅ **Base de données de 6 conducteurs** avec positions GPS à Conakry:
  - **Motos:** Mamadou Diallo, Ibrahima Sow, Alpha Barry
  - **Voitures:** Amadou Bah, Ousmane Camara, Thierno Diagne
- ✅ **Sélection automatique** du conducteur le plus proche
- ✅ **Temps d'arrivée calculé** basé sur la distance réelle (3 min/km minimum)
- ✅ **Option d'annulation** - tapez "annuler" pour supprimer la réservation
- ✅ **Sessions en mémoire** (pas de dépendance base de données)

**🔧 Améliorations techniques:**
- Fonction `calculateDistance()` avec formule Haversine
- Fonction `getAvailableDrivers()` avec positions GPS réelles
- Fonction `findNearestDriver()` qui compare toutes les distances
- Gestion de l'annulation avec message de confirmation

**📍 Positions GPS des conducteurs (Conakry):**
- Zone autour de 9.537°N, -13.678°E
- Répartition réaliste dans la ville

### Version 2025-07-22 17:34:43 - Base de Données Conducteurs
**Fichier:** `index_20250722_173443_database_conducteurs.ts`

**🆕 Nouvelles fonctionnalités:**
- ✅ **Table `conducteurs` complète** avec informations détaillées
- ✅ **Vue `conducteurs_disponibles`** pour sélection optimisée
- ✅ **Liaison réservations ↔ conducteurs** via clé étrangère
- ✅ **Gestion des statuts** (disponible, occupé, hors_service, inactif)
- ✅ **Notes et historique** des conducteurs (note moyenne, nombre de courses)
- ✅ **Mise à jour automatique** du statut conducteur lors de réservation
- ✅ **Extraction coordonnées PostGIS** pour calculs de distance

**🔧 Améliorations techniques:**
- Table `conducteurs` avec contraintes et index optimisés
- Fonction `getAvailableDrivers()` utilisant la vue SQL
- Fonction `updateConducteurStatut()` pour gestion temps réel
- Gestion robuste des données PostGIS (geometry → lat/lng)
- Fallback intelligent si aucun conducteur disponible

### Version 2025-07-22 17:41:31 - Paris + Fallback Conducteurs
**Fichier:** `index_20250722_174131_paris_conducteurs.ts`

**🆕 Nouvelles fonctionnalités:**
- ✅ **Conducteurs à Paris** avec positions GPS réelles (Louvre, Opéra, Champs-Élysées, etc.)
- ✅ **Double sécurité** : Base de données + conducteurs fallback en dur
- ✅ **13 conducteurs Paris** (5 motos + 8 voitures) avec plaques françaises
- ✅ **Calcul adapté Paris** (4 min/km au lieu de 3 pour la circulation)
- ✅ **Messages localisés** "Paris" et émojis France 🇫🇷
- ✅ **Numéros français** (+33) au lieu de guinéens (+224)

**🔧 Améliorations techniques:**
- Fonction `getFallbackDrivers()` avec données en dur si base vide
- Coordonnées Paris centre (48.8566, 2.3522) en fallback
- Double vérification : base d'abord, puis fallback, puis générique
- Messages d'erreur plus précis avec comptage des conducteurs

**📂 IMPORTANT - Fichier de déploiement :**
- **Fichier principal à déployer :** `supabase/functions/whatsapp-bot/index.ts`
- **Version actuelle :** Paris + Fallback Conducteurs (2025-07-22 17:41:31)
- **Repository :** https://github.com/labiko/LokoTaxiBotWhatsapp.git (branche `dev`)

---

## États de Session - Documentation Technique

### Gestion des États et Sessions
Le bot utilise un système d'états pour suivre le processus de réservation de chaque client :

#### 1. États possibles
- `"attente_vehicule"` : Client a dit "taxi", on attend moto/voiture
- `"vehicule_choisi"` : Type choisi, on attend la géolocalisation
- `"position_recue"` : GPS reçu, on demande la destination
- `"prix_calcule"` : Prix affiché, on attend confirmation
- `"conducteur_assigne"` : Réservation confirmée

#### 2. Structure de Session
```json
{
  "client_phone": "+33620951645",
  "vehicleType": "moto",
  "position_client": "POINT(2.5891464 48.6276735)",
  "destination_nom": "Gare de Melun",
  "destination_id": "uuid",
  "distance_km": 12.24,
  "prix_estime": 36600,
  "etat": "prix_calcule",
  "created_at": "2025-07-23T09:48:00Z",
  "expires_at": "2025-07-23T11:48:00Z"
}
```

#### 3. Flux de Données
1. **"taxi"** → Création session `attente_vehicule`
2. **"moto"/"voiture"** → État `vehicule_choisi` + demande GPS
3. **Géolocalisation** → État `position_recue` + demande destination
4. **Destination** → Calcul prix + état `prix_calcule`
5. **"oui"** → Recherche conducteur + état `conducteur_assigne`

#### 4. Gestion des Erreurs
- Session expirée (2h) → Recommencer avec "taxi"
- Commande "annuler" → Suppression session
- Commande "taxi" → Reset complet (priorité absolue)

#### 5. Base de Données
- **Table :** `sessions`
- **Clé :** `client_phone` (normalisé sans "whatsapp:")
- **Position :** Format PostGIS `GEOGRAPHY(POINT, 4326)`
- **Nettoyage :** Automatique après expiration

---

## Calcul de Prix et Distance

### Formule de Prix
```
Prix = Distance (km) × Tarif par km
```

### Tarifs par Type
- **Moto :** 3 000 GNF/km
- **Voiture :** 4 000 GNF/km

### Calcul de Distance - Formule Haversine
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

### Recherche d'Adresses
- **Algorithme :** Distance de Levenshtein
- **Tolérance :** ≤ 3 caractères de différence
- **Fallback :** Liste complète si aucune correspondance

---

## Gestion des Conducteurs

### Base de Données
- **Table :** `conducteurs`
- **Statuts :** disponible, occupé, hors_service, inactif
- **Position :** GPS temps réel avec PostGIS

### Sélection Automatique
1. Filtrage par type véhicule + statut disponible
2. Calcul distance Haversine depuis position client
3. Sélection du plus proche
4. Mise à jour statut → "occupé"

### Temps d'Arrivée
```
Temps = Distance × 3 minutes/km (minimum 5 minutes)
```

---

## Configuration Supabase

### URL et Clés API
```javascript
const SUPABASE_URL = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGci...'; // Service role
const SUPABASE_ANON_KEY = 'eyJhbGci...'; // Public anon
```

### Tables Principales
1. **sessions** - États des conversations
2. **conducteurs** - Informations conducteurs  
3. **reservations** - Réservations confirmées
4. **adresses** - Destinations disponibles
5. **tarifs** - Configuration des prix

### Edge Function
- **Endpoint :** `/functions/v1/whatsapp-bot`
- **Runtime :** Deno
- **Webhook Twilio** configuré sur cette URL

---

## Scripts SQL Disponibles

### Tables de Base
- `sql/create_reservations.sql` - Table réservations
- `sql/create_conducteurs.sql` - Table conducteurs
- `sql/create_adresses_table.sql` - Table destinations
- `sql/create_tarifs_table.sql` - Configuration prix

### Fonctions SQL
- `sql/create_extract_coordinates_function.sql` - Extraction GPS PostGIS
- `sql/deploy_extract_coordinates_function.sql` - Déploiement fonction

### Sauvegardes
- `sql/backup_complete_database.sql` - Sauvegarde complète
- `sql/backup_simple.sql` - Export JSON simple

---

## Test et Débogage

### Logs Automatiques
Le bot génère des logs détaillés pour chaque étape :
```
🎯 Recherche conducteur moto près de 48.6277, 2.5891
🔍 Extraction coordonnées pour session: +33620951645
💰 Calcul prix: moto, 12.24km
⚠️ Extraction PostGIS échouée, coordonnées par défaut (0,0)
```

### Analyse des Problèmes
1. **Coordonnées (0,0)** → Problème extraction PostGIS
2. **Session non trouvée** → Vérifier normalisation téléphone
3. **Distance énorme** → Bug calcul coordonnées
4. **Aucun conducteur** → Vérifier statuts disponibles

### Commandes de Test
- `"taxi"` - Démarrer réservation
- `"moto"` ou `"voiture"` - Choisir véhicule
- Partager GPS - Position client
- `"gare melun"` - Destination exemple
- `"oui"` - Confirmer prix
- `"annuler"` - Annuler réservation

---

## Déploiement et Maintenance

### Commandes de Déploiement
```bash
# Déployer fonction Edge
supabase functions deploy whatsapp-bot

# Vérifier statut
supabase functions list

# Voir logs temps réel
supabase functions logs whatsapp-bot
```

### Configuration Twilio
- **Webhook URL :** `https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot`
- **Méthode :** POST
- **Content-Type :** application/x-www-form-urlencoded

### Monitoring
- Dashboard Supabase → Edge Functions → Logs
- Vérification sessions actives régulièrement
- Nettoyage automatique sessions expirées

---

**📂 Commit final :** `8b9695b` - Toutes les améliorations commitées sur branche `dev`

---

---

## Bug Résolu - Temps d'Arrivée 16272 Minutes (2025-07-23)

**❌ PROBLÈME :** Le conducteur Thomas Petit affichait un temps d'arrivée de 16272 minutes (11 jours!)

**🔍 CAUSE IDENTIFIÉE :**
- Ligne 763 : `getClientCoordinates(from)` utilisait le format non-normalisé `whatsapp:+33620951645`
- Session stockée avec format normalisé `+33620951645`
- Résultat : coordonnées non trouvées → (0,0) par défaut
- Distance (0,0) → conducteur ≈ 5424 km × 3 min/km = 16272 minutes

**✅ SOLUTION APPLIQUÉE :**
```typescript
// Ligne 763 - Avant
const clientCoords = await getClientCoordinates(from);

// Ligne 763 - Après (corrigé)
const clientCoords = await getClientCoordinates(normalizePhone(from));
```

**📋 ACTIONS DE DÉPLOIEMENT :**
1. `supabase functions deploy whatsapp-bot`
2. Tester : taxi → moto → GPS → destination → "oui"
3. Vérifier logs : coordonnées réelles (pas 0,0) et temps < 60 min

---

---

## Application Mobile Conducteur (LokoTaxiConducteurApp)

### Instructions de Développement
**⚠️ IMPORTANT : Ne jamais lancer l'application avec `ionic serve` ou `ng serve`**
- L'application doit uniquement être développée et compilée avec `ng build`
- Le lancement en mode développement cause des erreurs de configuration bash
- Se concentrer sur l'implémentation et les tests de compilation uniquement

**⚠️ IMPORTANT : Ne jamais commiter sur Git sans demande explicite**
- Ne jamais utiliser `git commit` ou `git push` sans instruction directe de l'utilisateur
- Attendre toujours la validation avant de créer des commits
- Laisser l'utilisateur gérer le versioning et les commits

### Authentification et Sécurité
- **Page Réservation** : Vérifier l'authentification avant affichage
- Si conducteur non connecté → Redirection vers page Login moderne
- Une fois authentifié → Afficher uniquement les réservations liées au conducteur connecté
- Vérifier la structure BDD et les liens entre `reservations` et `conducteurs`

### Structure Base de Données - Référence Exacte

**⚠️ IMPORTANT : Fichier de référence obligatoire**
- **Fichier :** `LokoTaxiConducteurApp/STRUCTURE_BASE_DONNEES.md`
- **Usage :** Consulter TOUJOURS ce fichier avant toute modification
- **Mise à jour :** Mettre à jour ce fichier si nouvelles informations découvertes

**Structure réelle différente du modèle initial :**
- Table `conducteurs` : `vehicle_type` (pas `type_vehicule`)
- Table `reservations` : `statut` (pas `status`), `prix_total` (pas `prix_estime`)
- 15 tables au total (PostGIS activé)
- 13 conducteurs et 4 réservations existants dans la base

**Règle absolue :** NE JAMAIS modifier la structure existante, seulement adapter l'app mobile.

---

## Note importante sur Git
**Ne jamais ajouter "Claude" comme auteur dans les commits Git.**  
Le code généré doit être attribué à l'équipe projet ou à moi-même, jamais à l'IA.