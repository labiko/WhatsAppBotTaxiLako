# 🎯 PLAN FINAL - WORKFLOWS DÉTAILLÉS PAR CAS D'INPUT

## 📋 OBJECTIF
Plan exhaustif avec chaque cas d'input et son workflow complet étape par étape pour implémenter l'IA sans casser l'existant.

---

## 🏗️ ARCHITECTURE TECHNIQUE

### Point d'entrée unique
```typescript
// Dans index.ts - Point d'injection unique
async function processMessage(from: string, body: string, session: Session) {
  
  // 1️⃣ TENTATIVE IA pour messages complexes
  if (shouldUseAIAnalysis(body)) {
    const iaResult = await handleComplexTextMessage(body, from, session);
    
    if (iaResult.handled) {
      return iaResult.response; // IA a géré le message
    }
  }
  
  // 2️⃣ FALLBACK - Workflow standard inchangé
  return await standardWorkflow(from, body, session);
}
```

### États de session IA (ISOLÉS des états existants)
```typescript
// ✅ NOUVEAUX ÉTATS IA - Préfixe "ia_" pour isolation complète
"ia_attente_confirmation"     // IA attend confirmation client pour réservation
"ia_attente_gps"             // IA attend position GPS après analyse complète  
"ia_reservation_planifiee"   // IA réservation avec date/heure futures
"ia_choix_destination"       // IA attend choix destination parmi suggestions
"ia_attente_heure"           // IA attend précision heure (ex: "demain matin" sans heure)
"ia_attente_confirmation_report" // IA signale report automatique heure passée
"ia_attente_gps_pour_lieux"      // IA attend GPS pour géolocaliser lieux (multi-stop)
"prix_calcule_multi_stop"    // IA prix calculé pour course multi-arrêts

// ❌ ÉTATS EXISTANTS À NE PAS TOUCHER
"initial", "vehicule_choisi", "destination_choisie", "prix_calcule", etc.
```

---

## 📋 CAS 1 : RÉSERVATION COMPLÈTE SIMPLE

### Input: "Je veux une moto-taxi pour aller au marché Madina"

**🧠 ÉTAPE 1 - Analyse IA**
```typescript
// Détection: isComplexMessage() = true (phrase 4+ mots + destination)
const aiAnalysis = {
  vehicleType: "moto",
  destination: "marché Madina", 
  temporal: { isPlanned: false },
  confidence: 0.95
}
```

**💾 ÉTAPE 2 - Sauvegarde session**
```typescript
await saveSession(phone, {
  vehicleType: "moto",           // ✅ Extrait de l'IA
  destinationNom: "marché Madina", // ✅ Extrait de l'IA
  etat: "ia_attente_gps",        // État IA spécifique
  temporalPlanning: false
});
```

**📱 ÉTAPE 3 - Réponse bot**
```
✅ **RÉSERVATION MOTO**
━━━━━━━━━━━━━━━━━━━━━

🏍️ Type: MOTO-TAXI
📍 Destination: Marché Madina

🛍️ **MARCHÉ MADINA** • Dixinn
⏰ Ouvert: 6h00 - 20h00
🌅 Meilleur moment: 8h-10h (moins de monde)
⚠️ Fermeture: Dimanche après 15h
💡 Astuce: Négociation attendue sur les prix

📍 **PARTAGEZ VOTRE POSITION**
• 📱 Cliquer sur l'icône trombone (📎)
• 📍 Sélectionner "Localisation"
• 🎯 Confirmer le partage
```

**🗺️ ÉTAPE 4 - Client partage GPS**
- Client: [Position GPS partagée]
- Coordonnées: lat=9.5123, lng=-13.6456

**📊 ÉTAPE 5 - Calcul et confirmation**
```typescript
// Récupérer session
const session = await getSession(phone);
// session.etat = "ia_attente_gps"

// Calculer distance et prix
const distance = calculateDistance(clientCoords, destinationCoords);
const prix = calculerPrixCourse("moto", distance);

// Mettre à jour session
await saveSession(phone, {
  ...session,
  positionClient: "POINT(-13.6456 9.5123)",
  distanceKm: distance,
  prixEstime: prix,
  etat: "prix_calcule"
});
```

**💰 ÉTAPE 6 - Message final**
```
🎯 **RÉCAPITULATIF MOTO**
━━━━━━━━━━━━━━━━━━━━━

📍 **TRAJET**
De: Votre position
Vers: Marché Madina (Dixinn)
Distance: 4.2 km • ~15 min

💰 **TARIF: 15,000 GNF**
   Base: 5,000 GNF
   + Distance: 10,000 GNF

✅ Tapez "OUI" pour confirmer
❌ Tapez "NON" pour annuler
```

---

## 📋 CAS 2 : DESTINATION SEULE SANS TYPE VÉHICULE

### Input: "Je vais à l'hôpital Donka"

**🧠 ÉTAPE 1 - Analyse IA (AVEC VOITURE PAR DÉFAUT)**
```typescript
const aiAnalysis = {
  vehicleType: "voiture",        // ✅ VOITURE PAR DÉFAUT (règle Guinée)
  destination: "hôpital Donka",  // ✅ Détecté
  temporal: { isPlanned: false },
  confidence: 0.85
}
```

**💾 ÉTAPE 2 - Sauvegarde session complète**
```typescript
await saveSession(phone, {
  vehicleType: "voiture",        // ✅ Défaut appliqué
  destinationNom: "hôpital Donka", // ✅ Pré-rempli
  etat: "ia_attente_gps",        // Direct GPS (pas d'attente véhicule)
  temporalPlanning: false
});
```

**📱 ÉTAPE 3 - Réponse avec défaut voiture**
```
✅ **RÉSERVATION VOITURE**
━━━━━━━━━━━━━━━━━━━━━

🚗 Type: VOITURE (par défaut)
📍 Destination: Hôpital Donka

🏥 **HÔPITAL DONKA** • Kaloum
⏰ Ouvert 24h/24 - Urgences disponibles
⚡ Temps d'attente: ~45min en journée
💡 Conseil: Arrivez tôt le matin (moins d'attente)
📞 Standard: 622 00 00 00

💡 **Préférez la moto ?** Tapez "moto" pour changer

📍 **PARTAGEZ VOTRE POSITION**
• 📱 Cliquer sur l'icône trombone (📎)
• 📍 Sélectionner "Localisation"
• 🎯 Confirmer le partage
```

**🔄 ÉTAPE 4 - Option changement (facultatif)**
Si client tape "moto" → Changer vehicleType et continuer
Sinon GPS directement → Suite workflow standard

---

## 📋 CAS 3 : RÉSERVATION PLANIFIÉE

### Input: "Taxi ce soir à 20h pour le restaurant"

**🧠 ÉTAPE 1 - Analyse IA avec validation temporelle**
```typescript
const now = new Date(); // 16/08/2025 à 15h30
const aiAnalysis = {
  vehicleType: "voiture",        // "taxi" = voiture par défaut
  destination: "restaurant",     // ⚠️ Vague, besoin clarification
  temporal: {
    isPlanned: true,
    date: "2025-08-16",         // Aujourd'hui
    time: "20:00",
    relative: "ce soir"
  },
  confidence: 0.85
}

// Validation: 20h00 > 15h30 actuelle ✅ OK
```

**💾 ÉTAPE 2 - Sauvegarde session planifiée**
```typescript
await saveSession(phone, {
  vehicleType: "voiture",
  destinationNom: null,          // Destination trop vague
  etat: "ia_choix_destination",  // État spécial: clarifier destination
  temporalPlanning: true,
  plannedDate: "2025-08-16",
  plannedHour: 20,
  plannedMinute: 0
});
```

**📱 ÉTAPE 3 - Demande clarification destination**
```
📅 **RÉSERVATION CE SOIR**
━━━━━━━━━━━━━━━━━━━━━
🚗 Véhicule: Voiture
📅 Date: Aujourd'hui 16/08
⏰ Heure: 20h00

🍴 **RESTAURANTS DISPONIBLES**

1️⃣ **Petit Paris** • Kipé
   🦐 Spécialité fruits de mer
   ⏰ Ouvert jusqu'à 23h00
   💰 ~150K GNF/pers • ⭐ 4.5/5 (127 avis)
   📞 Réservation: 622 00 00 00

2️⃣ **Le Damier** • Ratoma  
   🍕 Cuisine internationale
   ⏰ Ouvert jusqu'à 22h00
   💰 ~80K GNF/pers • ⭐ 4.2/5 (89 avis)
   📍 Proche centre commercial

3️⃣ **Chez Fatou** • Kaloum
   🍛 Cuisine locale authentique
   ⏰ Ouvert jusqu'à 21h00
   💰 ~50K GNF/pers • ⭐ 4.7/5 (203 avis)
   🎵 Ambiance traditionnelle

📝 Tapez 1, 2 ou 3
💬 Ou écrivez le nom d'un autre restaurant
```

**👤 ÉTAPE 4 - Client choisit**
- Client: "1"

**🔍 ÉTAPE 5 - Enrichissement Google Places**
```typescript
// Recherche détaillée du restaurant choisi
const enrichedPlace = await enrichPlaceWithGoogleData("Restaurant Petit Paris Kipé Conakry");

const session = await getSession(phone);
await saveSession(phone, {
  ...session,
  destinationNom: "Restaurant Petit Paris",
  destinationPosition: "POINT(-13.6789 9.5234)",
  etat: "ia_attente_gps"
});
```

**📱 ÉTAPE 6 - Confirmation destination enrichie**
```
✅ **DESTINATION CONFIRMÉE**
━━━━━━━━━━━━━━━━━━━━━

🍴 **Restaurant Petit Paris** • Kipé
⏰ Ouvert jusqu'à 23h00 ✅
📞 Réservation table: 622 00 00 00
🦐 Conseil: Essayez les crevettes grillées!
🅿️ Parking disponible • 💳 CB acceptée

📍 **D'OÙ PARTIREZ-VOUS CE SOIR ?**

🎯 Options rapides:
• 📍 Partager position GPS actuelle
• 🏠 Tapez votre quartier
• 🏢 Nom d'un lieu connu

💡 Astuce: Le trajet vers Kipé peut prendre 
   +10min aux heures de pointe (19h-21h)
```

**🗺️ ÉTAPE 7 - GPS + Calcul + Réservation planifiée** (suit logique CAS 1)

---

## 📋 CAS 4 : TEMPS RELATIF SANS HEURE

### Input: "Moto demain matin pour l'université"

**🧠 ÉTAPE 1 - Analyse IA**
```typescript
const aiAnalysis = {
  vehicleType: "moto",
  destination: "université",
  temporal: {
    isPlanned: true,
    date: "2025-08-17",        // J+1
    time: null,                // ❌ Heure manquante
    relative: "demain matin"
  },
  confidence: 0.85
}
```

**💾 ÉTAPE 2 - Sauvegarde session incomplète**
```typescript
await saveSession(phone, {
  vehicleType: "moto",
  destinationNom: "université",
  etat: "ia_attente_heure",      // État spécial: heure manquante
  temporalPlanning: true,
  plannedDate: "2025-08-17",
  plannedHour: null,             // À compléter
  plannedMinute: null
});
```

**📱 ÉTAPE 3 - Demande heure précise**
```
✅ **RÉSERVATION MOTO DEMAIN**
━━━━━━━━━━━━━━━━━━━━━

🏍️ Type: MOTO-TAXI
📅 Date: Demain 17/08
🌅 Moment: Matin

🎓 **Université Gamal Abdel Nasser** • Dixinn
⏰ Horaires: 8h00 - 18h00 (Lun-Ven)
📚 Cours du matin: généralement 8h-12h
☕ Cafétéria ouverte dès 7h30
🚗 Parking étudiant disponible

⏰ **À QUELLE HEURE DEMAIN MATIN ?**

🌅 Suggestions:
• 7h00 - Très tôt, peu de trafic
• 7h30 - Cafétéria ouverte
• 8h00 - Début cours standard
• 8h30 - Cours possibles

💬 Tapez l'heure souhaitée (ex: 7h30, 8h)
```

**👤 ÉTAPE 4 - Client précise heure**
- Client: "8h"

**💾 ÉTAPE 5 - Complétion session**
```typescript
const session = await getSession(phone);
await saveSession(phone, {
  ...session,
  plannedHour: 8,
  plannedMinute: 0,
  etat: "ia_attente_gps"
});
```

**📱 ÉTAPE 6 - Suite workflow standard** (GPS → Prix → Confirmation)

---

## 📋 CAS 5 : HEURE DANS LE PASSÉ (VALIDATION TEMPORELLE)

### Input: "Taxi aujourd'hui à 14h pour l'aéroport" (il est 15h30)

**🧠 ÉTAPE 1 - Analyse IA avec validation**
```typescript
const now = new Date(); // 16/08/2025 à 15h30
const aiAnalysis = {
  vehicleType: "voiture",
  destination: "aéroport",
  temporal: {
    isPlanned: true,
    date: "2025-08-16",
    time: "14:00",            // ❌ 14h < 15h30 (passé)
    relative: "aujourd'hui"
  },
  confidence: 0.9
}

// VALIDATION AUTOMATIQUE: 14h00 < 15h30 → Reporter à demain
const correctedDate = "2025-08-17"; // Demain
```

**💾 ÉTAPE 2 - Sauvegarde avec correction**
```typescript
await saveSession(phone, {
  vehicleType: "voiture",
  destinationNom: "aéroport",
  etat: "ia_attente_confirmation_report",  // État spécial: report automatique
  temporalPlanning: true,
  plannedDate: "2025-08-17",              // ✅ Corrigé à demain
  plannedHour: 14,
  plannedMinute: 0
});
```

**📱 ÉTAPE 3 - Notification correction automatique**
```
⏰ **CORRECTION AUTOMATIQUE**
━━━━━━━━━━━━━━━━━━━━━

🚗 Véhicule: Voiture
📍 Destination: Aéroport

⚠️ **HEURE DÉJÀ PASSÉE**
Demandé: Aujourd'hui 14h00
Maintenant: Aujourd'hui 15h30

🔄 **REPORT AUTOMATIQUE**
Nouvelle réservation: DEMAIN 14h00 (17/08)

✈️ **Aéroport International de Conakry**
📋 Check-in: Arrivez 2h avant (vol international)
🅿️ Parking: 5,000 GNF/heure
💼 Terminal unique pour tous les vols
⚠️ Trafic: Prévoir +30min aux heures de pointe

✅ Confirmer pour DEMAIN 14h00 ?
• Tapez "OUI" → Continuer
• Tapez "AUTRE" → Changer l'heure
```

---

## 📋 CAS 6 : FAUTES D'ORTHOGRAPHE

### Input: "g veu 1 taxi pr madina demen a 9h"

**🧠 ÉTAPE 1 - Analyse IA tolérante**
```typescript
const aiAnalysis = {
  vehicleType: "voiture",        // "taxi" = voiture
  destination: "madina",         // ✅ Reconnu malgré "madina"
  temporal: {
    isPlanned: true,
    date: "2025-08-17",         // "demen" = demain
    time: "09:00",              // "9h" = 09:00
    relative: "demain"
  },
  confidence: 0.8               // Confiance moindre mais acceptable
}
```

**💾 ÉTAPE 2 - Sauvegarde normalisée**
```typescript
await saveSession(phone, {
  vehicleType: "voiture",
  destinationNom: "Madina",      // ✅ Nom corrigé
  etat: "ia_attente_gps",
  temporalPlanning: true,
  plannedDate: "2025-08-17",
  plannedHour: 9,
  plannedMinute: 0
});
```

**📱 ÉTAPE 3 - Réponse avec correction transparente**
```
✅ **RÉSERVATION COMPRISE**
━━━━━━━━━━━━━━━━━━━━━

🚗 Type: VOITURE
📅 Date: Demain 17/08
⏰ Heure: 09h00
📍 Destination: Madina

🏘️ **MADINA** • Commune de Dixinn
🌅 Trafic matinal: Dense entre 7h-9h
💡 Conseil: 09h00 = fin des embouteillages
🛣️ Plusieurs routes possibles

📍 **PARTAGEZ VOTRE POSITION**
• 📱 Utiliser le bouton localisation
• 🎯 Confirmer le partage GPS
```

---

## 📋 CAS 7 : MULTI-DESTINATIONS SIMPLES (GÉOLOCALISÉES)

### Inputs supportés:
- **"Taxi pour la pharmacie puis Madina"**
- **"Voiture pour la banque puis l'aéroport"**
- **"Moto pour le restaurant puis chez moi"**
- **"Taxi pour l'hôpital puis Kipé"**

**🧠 ÉTAPE 1 - Analyse IA multi-stops (GÉNÉRIQUE)**
```typescript
// EXEMPLES selon l'input:
// "pharmacie puis Madina" → placeType: "pharmacy", searchKeyword: "pharmacie"
// "banque puis aéroport" → placeType: "bank", searchKeyword: "banque"  
// "restaurant puis chez moi" → placeType: "restaurant", searchKeyword: "restaurant"

const aiAnalysis = {
  vehicleType: "voiture",        // Défaut (ou extrait si précisé)
  destination: extractedPlace,   // "pharmacie", "banque", "restaurant", etc.
  secondaryDestination: extractedFinalDest, // "Madina", "aéroport", "chez moi"
  temporal: { isPlanned: false },
  isMultiStop: true,
  placeType: detectPlaceType(extractedPlace), // pharmacy|bank|restaurant|hospital
  confidence: 0.9
}
```

**💾 ÉTAPE 2 - Sauvegarde multi-arrêts (GÉNÉRIQUE)**
```typescript
await saveSession(phone, {
  vehicleType: aiAnalysis.vehicleType,
  destinationNom: aiAnalysis.destination,        // "pharmacie", "banque", etc.
  secondaryDestination: aiAnalysis.secondaryDestination, // "Madina", "aéroport"
  isMultiStop: true,
  placeType: aiAnalysis.placeType,               // pharmacy|bank|restaurant|hospital
  etat: "ia_attente_gps_pour_lieux",             // ✅ État générique multi-stop
  temporalPlanning: false
});
```

**📱 ÉTAPE 3 - Demande position GPS AVANT suggestions (GÉNÉRIQUE)**
```
✅ **COURSE AVEC ARRÊT**
━━━━━━━━━━━━━━━━━━━━━

🚗 Type: VOITURE
📍 Arrêt: {TYPE_LIEU} (à localiser)
📍 Destination finale: {DESTINATION_FINALE}

💰 **TARIF MAJORÉ**
Prix normal + 20% (arrêt multiple)
Attente {type_lieu}: Incluse (max 10min)

📍 **PARTAGEZ D'ABORD VOTRE POSITION**
Pour trouver les {type_lieu_pluriel} les plus proches

• 📱 Cliquer sur l'icône trombone (📎)
• 📍 Sélectionner "Localisation"
• 🎯 Confirmer le partage

EXEMPLES MESSAGES GÉNÉRÉS:
━━━━━━━━━━━━━━━━━━━━━
"Pour trouver les pharmacies les plus proches"
"Pour trouver les banques les plus proches"  
"Pour trouver les restaurants les plus proches"
"Pour trouver les hôpitaux les plus proches"
```

**🗺️ ÉTAPE 4 - Client partage GPS**
- Coordonnées reçues : lat=9.5123, lng=-13.6456 (ex: Kipé)

**🔍 ÉTAPE 5 - Recherche lieux géolocalisés (GÉNÉRIQUE)**
```typescript
// MAPPING DES TYPES DE LIEUX
const PLACE_TYPE_MAPPING = {
  'pharmacie': { googleType: 'pharmacy', keyword: 'pharmacie' },
  'banque': { googleType: 'bank', keyword: 'banque' },
  'restaurant': { googleType: 'restaurant', keyword: 'restaurant' },
  'hôpital': { googleType: 'hospital', keyword: 'hôpital' },
  'supermarché': { googleType: 'supermarket', keyword: 'supermarché' },
  'station-service': { googleType: 'gas_station', keyword: 'station essence' },
  'poste': { googleType: 'post_office', keyword: 'bureau de poste' }
};

// Récupération session pour connaître le type de lieu
const session = await getSession(phone);
const placeConfig = PLACE_TYPE_MAPPING[session.destinationNom];

// Recherche Google Places Nearby API (GÉNÉRIQUE)
const nearbyPlaces = await searchNearbyPlaces({
  location: { lat: 9.5123, lng: -13.6456 },
  radius: 3000, // 3km maximum
  type: placeConfig.googleType,
  keyword: placeConfig.keyword
});

// Enrichissement avec Google Places Details
const enrichedPlaces = await Promise.all(
  nearbyPlaces.map(async (place) => {
    const enriched = await enrichPlaceWithGoogleData(place.name, place.place_id);
    return {
      ...place,
      ...enriched,
      distance: calculateDistance(clientCoords, place.coords)
    };
  })
);

// Tri par distance croissante + filtrages intelligents
const sortedPlaces = enrichedPlaces
  .filter(place => place.distance <= 5) // Max 5km
  .filter(place => place.rating >= 3.0 || !place.rating) // Note minimum 3/5
  .sort((a, b) => {
    // Tri intelligent : distance + note + ouverture
    const aScore = a.distance - (a.rating || 3) * 0.5 + (a.isOpen ? -0.2 : 0.3);
    const bScore = b.distance - (b.rating || 3) * 0.5 + (b.isOpen ? -0.2 : 0.3);
    return aScore - bScore;
  })
  .slice(0, 7); // Top 7 suggestions
```

**📱 ÉTAPE 6 - Suggestions lieux PROCHES (EXEMPLES)**

**🏥 EXEMPLE 1 - PHARMACIES (FORMAT AMÉLIORÉ) :**
```
📍 **PHARMACIES PROCHES DE VOUS**
━━━━━━━━━━━━━━━━━━━━━

1️⃣ **Pharmacie Kipé Centre** • 850m
   🚶‍♂️ 10 min à pied • 🚗 3 min en voiture • Quartier Kipé
   ✅ Ouvert • Ferme à 22h00 
   📞 622 00 00 01
   💊 Service standard • ⭐ 4.2/5

2️⃣ **Pharmacie de la Santé** • 1200m
   🚶‍♂️ 14 min à pied • 🚗 4 min en voiture • Quartier Ratoma
   ✅ Ouvert 24h/24 🌙
   📞 622 00 00 02
   💊 Pharmacie de garde • ⭐ 4.5/5

3️⃣ **Pharmacie Moderne** • 1800m
   🚶‍♂️ 22 min à pied • 🚗 5 min en voiture • Quartier Dixinn
   ⚠️ Ferme bientôt • Ferme à 20h00
   📞 622 00 00 03
   💊 Large stock • ⭐ 4.1/5

4️⃣ **Pharmacie Centrale** • 2100m
   🚶‍♂️ 25 min à pied • 🚗 6 min en voiture • Centre-ville
   ❌ Fermé • Ouvre demain 8h00
   📞 622 00 00 04
   💊 Spécialités rares • ⭐ 4.3/5

5️⃣ **Pharmacie du Peuple** • 2400m
   🚶‍♂️ 29 min à pied • 🚗 7 min en voiture • Quartier Matam
   ✅ Ouvert • Ferme à 19h00
   📞 622 00 00 05
   💊 Prix abordables • ⭐ 4.0/5

6️⃣ **Pharmacie Nouvelle** • 2800m
   🚶‍♂️ 34 min à pied • 🚗 8 min en voiture • Quartier Bambeto
   ✅ Ouvert • Lun-Sam: 8h-18h
   📞 622 00 00 06
   💊 Conseil médical • ⭐ 4.4/5

7️⃣ **Pharmacie Express** • 3200m
   🚶‍♂️ 38 min à pied • 🚗 10 min en voiture • Quartier Sonfonia
   ✅ Ouvert • 7j/7: 7h-21h
   📞 622 00 00 07
   💊 Livraison disponible • ⭐ 3.9/5
```

**🏦 EXEMPLE 2 - BANQUES :**
```
📍 **BANQUES PROCHES DE VOUS**
━━━━━━━━━━━━━━━━━━━━━

1️⃣ **BICIGUI Kipé** • 950m
   ⏰ Ouvert: 8h-16h (Lun-Ven)
   📞 622 11 11 01
   🏧 3 distributeurs • ⭐ 4.0/5

2️⃣ **UBA Bank** • 1.3km
   ⏰ Ouvert: 8h-17h (Lun-Ven)
   📞 622 11 11 02  
   💳 Change devises • ⭐ 4.3/5

3️⃣ **Ecobank** • 1.7km
   ⏰ Ouvert: 7h30-16h30
   📞 622 11 11 03
   🌍 Service international • ⭐ 4.1/5
```

**🍽️ EXEMPLE 3 - RESTAURANTS :**
```
📍 **RESTAURANTS PROCHES DE VOUS**
━━━━━━━━━━━━━━━━━━━━━

1️⃣ **Restaurant Kipé** • 750m
   ⏰ Ouvert jusqu'à 23h00 ✅
   📞 622 22 22 01
   🍛 Cuisine locale • ⭐ 4.4/5

2️⃣ **Le Palmier** • 1.1km
   ⏰ Ouvert jusqu'à 22h00
   📞 622 22 22 02
   🍕 International • ⭐ 4.2/5

3️⃣ **Chez Mama** • 1.6km
   ⏰ Ouvert jusqu'à 21h00
   📞 622 22 22 03
   🥘 Spécialités guinéennes • ⭐ 4.6/5
```

**📝 Message générique:** "Choisissez {type_lieu} (1 à 7)"

**🎯 NOUVELLES FONCTIONNALITÉS AJOUTÉES :**
- ✅ **7 suggestions** au lieu de 3 (plus de choix)
- ✅ **Tri intelligent** : distance + note + statut ouvert
- ✅ **Filtrage qualité** : Note minimum 3/5, max 5km
- ✅ **Priorisation ouverts** : Lieux ouverts remontent
- ✅ **Détection émojis** : Emoji automatique par type lieu
- ✅ **Infos géographiques** : Temps de marche + quartier
- ✅ **Horaires intelligents** : Status temps réel + détails
- ✅ **Durées dynamiques** : Temps à pied ET en voiture calculés
- ✅ **Trafic intelligent** : Coefficients selon heures de pointe Conakry
- ✅ **Indicateurs trafic** : 🔴 Rush, 🟡 Normal, 🟢 Fluide

**👤 ÉTAPE 7 - Client choisit**
- Client: "1"

**💾 ÉTAPE 8 - Sauvegarde choix et calcul trajet**
```typescript
const session = await getSession(phone);
const chosenPharmacy = sortedPharmacies[0]; // Pharmacie Kipé Centre

await saveSession(phone, {
  ...session,
  destinationNom: "Pharmacie Kipé Centre",
  destinationPosition: chosenPharmacy.coords,
  secondaryDestination: "Madina",
  etat: "prix_calcule_multi_stop"
});

// Calcul trajet multi-étapes
const leg1Distance = calculateDistance(clientCoords, chosenPharmacy.coords); // 0.85km
const leg2Distance = calculateDistance(chosenPharmacy.coords, madinaCoords); // 3.2km
const totalDistance = leg1Distance + leg2Distance; // 4.05km
const prix = calculerPrixCourse("voiture", totalDistance) * 1.2; // +20% multi-stop
```

**💰 ÉTAPE 9 - Confirmation prix multi-étapes**
```
🎯 **RÉCAPITULATIF COURSE MULTI-ARRÊTS**
━━━━━━━━━━━━━━━━━━━━━

📍 **TRAJET COMPLET**
1️⃣ Votre position → Pharmacie Kipé Centre (850m)
2️⃣ Pharmacie Kipé Centre → Madina (3.2km)
📏 Distance totale: 4.05 km • ~18 min

💰 **TARIF TOTAL: 30,000 GNF**
   Base course: 25,000 GNF
   + Majoration multi-arrêt (20%): 5,000 GNF
   💳 Paiement cash au conducteur

⏱️ **PLANNING ARRÊT**
🏥 Temps pharmacie: 10 min maximum
🚗 Attente conducteur: Incluse
⚠️ Au-delà de 10min: +2,000 GNF

✅ Tapez "OUI" pour confirmer
❌ Tapez "NON" pour annuler
```

---

## 📋 CAS 8 : LANGUE NON FRANÇAISE (REJET)

### Input: "I want a taxi to the airport"

**🧠 ÉTAPE 1 - Détection langue**
```typescript
// Dans shouldUseAIAnalysis()
const isEnglish = /\b(I|want|taxi|to|the|airport)\b/.test(message);
if (isEnglish) {
  return false; // Pas d'IA pour l'anglais
}

// Dans l'IA (si appelée quand même)
const aiAnalysis = {
  error: "langue_non_supportee",
  confidence: 0.0
}
```

**📱 ÉTAPE 2 - Réponse rejet poli**
```
🇫🇷 **FRANÇAIS UNIQUEMENT**
━━━━━━━━━━━━━━━━━━━━━

Désolé, je comprends uniquement le français.

💬 **REFORMULEZ EN FRANÇAIS :**
• "Je veux un taxi pour l'aéroport"
• "Taxi voiture aéroport"  
• "Je vais à l'aéroport"

🎯 Ou tapez simplement "taxi" pour commencer
```

---

## 📋 CAS 9 : CONFIDENCE FAIBLE (FALLBACK)

### Input: "Peut-être un truc pour aller quelque part tantôt"

**🧠 ÉTAPE 1 - Analyse IA incertaine**
```typescript
const aiAnalysis = {
  vehicleType: null,      // "truc" trop vague
  destination: null,      // "quelque part" trop vague  
  temporal: {
    isPlanned: false,
    relative: "tantôt"    // Vague
  },
  confidence: 0.3         // ❌ < 0.7 → Fallback
}
```

**🔄 ÉTAPE 2 - Fallback automatique**
```typescript
// Dans handleComplexTextMessage()
if (analysis.confidence < 0.7) {
  return { handled: false }; // → Retour au workflow standard
}
```

**📱 ÉTAPE 3 - Workflow standard normal**
```
🚖 **RÉSERVATION TAXI**
━━━━━━━━━━━━━━━━━━━━━

Bienvenue sur LokoTaxi ! 

🚗 Quel type de véhicule souhaitez-vous ?

1️⃣ **MOTO** - Rapide et économique
2️⃣ **VOITURE** - Confortable et sécurisé

💬 Répondez "1" ou "2"
```

---

## 📋 CAS 10 : MESSAGE SIMPLE (PAS D'IA)

### Input: "taxi"

**🔄 ÉTAPE 1 - Détection message simple**
```typescript
// Dans shouldUseAIAnalysis("taxi")
if (message === 'taxi') return false; // Message simple = pas d'IA
```

**📱 ÉTAPE 2 - Workflow standard direct**
```
🚖 **RÉSERVATION TAXI**
━━━━━━━━━━━━━━━━━━━━━

🚗 Quel type de véhicule souhaitez-vous ?

1️⃣ **MOTO** - Rapide et économique  
2️⃣ **VOITURE** - Confortable et sécurisé

💬 Répondez "1" ou "2"
```

---

## 🔧 FONCTIONS CENTRALES À IMPLÉMENTER

### 1. Fonction enrichissement Google Places (RÉUTILISE L'EXISTANT)
```typescript
// ✅ S'INSPIRER de searchLocationGoogle() existante dans index.ts
async function enrichPlaceWithGoogleData(placeName: string, placeId?: string) {
  // RÉUTILISER la constante existante GOOGLE_PLACES_API_KEY
  if (!GOOGLE_PLACES_API_KEY) {
    console.log(`⚠️ Google Places API key non configurée`);
    return null;
  }

  try {
    // 1. Si pas de place_id, chercher d'abord avec Text Search
    if (!placeId) {
      const searchResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(placeName)}&key=${GOOGLE_PLACES_API_KEY}`
      );
      const searchData = await searchResponse.json();
      if (searchData.results?.[0]) {
        placeId = searchData.results[0].place_id;
      }
    }

    // 2. Place Details API avec champs enrichis
    const detailsResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=opening_hours,rating,formatted_phone_number,price_level,types,website,business_status,user_ratings_total&key=${GOOGLE_PLACES_API_KEY}`
    );
    
    const details = await detailsResponse.json();
    
    if (details.status === 'OK') {
      return formatPlaceInfo(details.result);
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Erreur enrichissement: ${error.message}`);
    return null;
  }
}

// Fonction formatage selon type de lieu
function formatPlaceInfo(details: any) {
  const now = new Date();
  const isOpen = details.opening_hours?.open_now;
  
  return {
    isOpen: isOpen,
    hours: formatOpeningHours(details.opening_hours),
    rating: details.rating ? `⭐ ${details.rating}/5 (${details.user_ratings_total} avis)` : null,
    phone: details.formatted_phone_number,
    priceLevel: formatPriceLevel(details.price_level),
    businessStatus: details.business_status,
    placeType: detectPlaceType(details.types)
  };
}
```

### 2. Fonction recherche lieux à proximité (NOUVELLE - MULTI-STOPS)
```typescript
// ✅ NOUVELLE fonction pour CAS 7 - Multi-destinations géolocalisées
async function searchNearbyPlaces(params: {
  location: { lat: number, lng: number },
  radius: number,
  type: string,
  keyword?: string
}) {
  // RÉUTILISER la constante existante GOOGLE_PLACES_API_KEY
  if (!GOOGLE_PLACES_API_KEY) {
    console.log(`⚠️ Google Places API key non configurée`);
    return [];
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
      `location=${params.location.lat},${params.location.lng}&` +
      `radius=${params.radius}&` +
      `type=${params.type}&` +
      `keyword=${encodeURIComponent(params.keyword || '')}&` +
      `key=${GOOGLE_PLACES_API_KEY}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK') {
      console.log(`🔍 [NEARBY] ${data.results.length} ${params.type}(s) trouvé(s) dans ${params.radius}m`);
      return data.results.map((place: any) => ({
        place_id: place.place_id,
        name: place.name,
        coords: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng
        },
        rating: place.rating,
        vicinity: place.vicinity,
        opening_hours: place.opening_hours,
        types: place.types
      }));
    }
    
    console.log(`⚠️ [NEARBY] Erreur Google Places: ${data.status}`);
    return [];
    
  } catch (error) {
    console.error(`❌ [NEARBY] Exception: ${error.message}`);
    return [];
  }
}
```

### 3. Fonction détection type de lieu (NOUVELLE - MULTI-STOPS)
```typescript
// ✅ NOUVELLE fonction pour détecter automatiquement le type de lieu
function detectPlaceType(placeName: string): { googleType: string; keyword: string; emoji: string } {
  const normalizedPlace = placeName.toLowerCase().trim();
  
  // SANTÉ
  if (/pharmacie|pharmacy/.test(normalizedPlace)) {
    return { googleType: 'pharmacy', keyword: 'pharmacie', emoji: '💊' };
  }
  if (/hôpital|hopital|hospital|clinique/.test(normalizedPlace)) {
    return { googleType: 'hospital', keyword: 'hôpital', emoji: '🏥' };
  }
  if (/laboratoire|labo|analyse/.test(normalizedPlace)) {
    return { googleType: 'hospital', keyword: 'laboratoire', emoji: '🧪' };
  }
  
  // FINANCE
  if (/banque|bank|bicigui|uba|ecobank/.test(normalizedPlace)) {
    return { googleType: 'bank', keyword: 'banque', emoji: '🏦' };
  }
  if (/distributeur|atm|guichet/.test(normalizedPlace)) {
    return { googleType: 'atm', keyword: 'distributeur', emoji: '🏧' };
  }
  
  // COMMERCE
  if (/restaurant|resto|manger/.test(normalizedPlace)) {
    return { googleType: 'restaurant', keyword: 'restaurant', emoji: '🍽️' };
  }
  if (/supermarché|supermarket|magasin|shop/.test(normalizedPlace)) {
    return { googleType: 'supermarket', keyword: 'supermarché', emoji: '🛒' };
  }
  if (/station|essence|carburant|gas/.test(normalizedPlace)) {
    return { googleType: 'gas_station', keyword: 'station essence', emoji: '⛽' };
  }
  if (/marché|market/.test(normalizedPlace)) {
    return { googleType: 'market', keyword: 'marché', emoji: '🛍️' };
  }
  
  // SERVICES PUBLICS
  if (/poste|courrier|postal/.test(normalizedPlace)) {
    return { googleType: 'post_office', keyword: 'bureau de poste', emoji: '📮' };
  }
  if (/école|school|université|university/.test(normalizedPlace)) {
    return { googleType: 'school', keyword: 'école', emoji: '🏫' };
  }
  if (/mairie|préfecture|administration/.test(normalizedPlace)) {
    return { googleType: 'local_government_office', keyword: 'mairie', emoji: '🏛️' };
  }
  
  // DÉFAUT - lieu générique
  return { googleType: 'establishment', keyword: placeName, emoji: '📍' };
}

// Formatage du message selon le type (AMÉLIORÉ)
function formatPlaceListMessage(places: any[], placeType: any, finalDestination: string): string {
  const header = `📍 **${placeType.keyword.toUpperCase()}S PROCHES DE VOUS**`;
  
  let message = `${header}\n${'━'.repeat(21)}\n\n`;
  
  places.forEach((place, index) => {
    const emoji = placeType.emoji;
    const number = index + 1;
    const distanceKm = place.distance;
    const distanceM = Math.round(distanceKm * 1000);
    
    // 📍 INFOS GÉOGRAPHIQUES ENRICHIES (DYNAMIQUES)
    const travelTimes = calculateTravelTimes(distanceKm);
    const walkTime = travelTimes.walkTime;
    const driveTime = travelTimes.driveTime;
    const neighborhood = extractNeighborhood(place.vicinity);
    const now = new Date();
    const trafficStatus = getTrafficIndicator(now.getHours());
    
    // ⏰ GESTION HORAIRES INTELLIGENTE  
    const timeStatus = getTimeStatus(place.opening_hours);
    const hoursDetail = formatDetailedHours(place.opening_hours);
    
    message += `${number}️⃣ **${place.name}** • ${distanceM}m\n`;
    message += `   🚶‍♂️ ${walkTime} min à pied • 🚗 ${driveTime} min en voiture ${neighborhood}\n`;
    if (driveTime > walkTime * 0.3) { // Si le trafic ralentit significativement
      message += `   ${trafficStatus}\n`;
    }
    message += `   ${timeStatus} ${hoursDetail}\n`;
    message += `   📞 ${place.phone || 'Tél. non disponible'}\n`;
    message += `   ${emoji} ${place.specialty || 'Service standard'}`;
    if (place.rating) message += ` • ⭐ ${place.rating}/5`;
    message += `\n\n`;
  });
  
  message += `📝 Choisissez ${placeType.keyword} (1 à 7)\n`;
  message += `💡 Toutes sont sur le trajet vers ${finalDestination}`;
  
  return message;
}

// ⏰ FONCTIONS HORAIRES INTELLIGENTES
function getTimeStatus(openingHours: any): string {
  if (!openingHours) return '⏰';
  
  const now = new Date();
  const isOpen = openingHours.open_now;
  
  if (isOpen === true) {
    // Vérifier si ferme bientôt (dans l'heure)
    const closingSoon = checkClosingSoon(openingHours, now);
    return closingSoon ? '⚠️ Ferme bientôt' : '✅ Ouvert';
  } else if (isOpen === false) {
    return '❌ Fermé';
  } else {
    return '⏰ Horaires non disponibles';
  }
}

function formatDetailedHours(openingHours: any): string {
  if (!openingHours?.weekday_text) return '';
  
  const today = new Date().getDay(); // 0=Dimanche, 1=Lundi, etc.
  const todayHours = openingHours.weekday_text[today === 0 ? 6 : today - 1];
  
  // Nettoyer et formater
  return todayHours ? todayHours.replace(/^[^:]+:\s*/, '') : '';
}

function checkClosingSoon(openingHours: any, now: Date): boolean {
  if (!openingHours?.periods) return false;
  
  const currentDay = now.getDay();
  const currentTime = now.getHours() * 100 + now.getMinutes();
  
  const todayPeriod = openingHours.periods.find((p: any) => 
    p.open?.day === currentDay && p.close?.day === currentDay
  );
  
  if (todayPeriod?.close?.time) {
    const closeTime = parseInt(todayPeriod.close.time);
    const timeDiff = closeTime - currentTime;
    return timeDiff > 0 && timeDiff <= 100; // Ferme dans l'heure
  }
  
  return false;
}

// 📍 EXTRACTION QUARTIER
function extractNeighborhood(vicinity: string): string {
  if (!vicinity) return '';
  
  // Extraire le quartier/commune de l'adresse
  const parts = vicinity.split(',');
  const neighborhood = parts[0]?.trim();
  
  return neighborhood ? `• ${neighborhood}` : '';
}

// 🚗 CALCULS TEMPS DYNAMIQUES (TRAFIC CONAKRY)
function calculateTravelTimes(distanceKm: number): { walkTime: number; driveTime: number } {
  const now = new Date();
  const currentHour = now.getHours();
  
  // ⏰ COEFFICIENTS TRAFIC SELON L'HEURE (CONAKRY)
  let trafficMultiplier = 1.0;
  
  if (currentHour >= 7 && currentHour <= 9) {
    trafficMultiplier = 1.8; // Rush matinal
  } else if (currentHour >= 17 && currentHour <= 19) {
    trafficMultiplier = 2.0; // Rush soir (plus dense)
  } else if (currentHour >= 12 && currentHour <= 14) {
    trafficMultiplier = 1.3; // Pause déjeuner
  } else if (currentHour >= 22 || currentHour <= 6) {
    trafficMultiplier = 0.7; // Nuit (circulation fluide)
  }
  
  // 🚶‍♂️ TEMPS À PIED (constant, ~12 min/km)
  const walkTime = Math.ceil(distanceKm * 12);
  
  // 🚗 TEMPS EN VOITURE (variable selon trafic)
  const baseCarTime = distanceKm * 3; // 3 min/km en circulation normale
  const driveTime = Math.ceil(baseCarTime * trafficMultiplier);
  
  return { walkTime, driveTime };
}

// 📊 AJOUT INDICATEUR TRAFIC
function getTrafficIndicator(currentHour: number): string {
  if (currentHour >= 7 && currentHour <= 9) {
    return '🔴 Trafic dense';
  } else if (currentHour >= 17 && currentHour <= 19) {
    return '🔴 Rush soir';
  } else if (currentHour >= 12 && currentHour <= 14) {
    return '🟡 Trafic modéré';
  } else if (currentHour >= 22 || currentHour <= 6) {
    return '🟢 Circulation fluide';
  }
  return '🟡 Trafic normal';
}
```

### 4. Fonction validation temporelle
```typescript
function validateTemporalInfo(temporal: any): any {
  const now = new Date();
  
  if (temporal.date === now.toISOString().split('T')[0]) { // Aujourd'hui
    const requestedTime = new Date(`${temporal.date}T${temporal.time}`);
    
    if (requestedTime <= now) {
      // Reporter à demain
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      return {
        ...temporal,
        date: tomorrow.toISOString().split('T')[0],
        wasRescheduled: true,
        originalDate: temporal.date
      };
    }
  }
  
  return temporal;
}
```

### 3. Fonction détection complexité
```typescript
function shouldUseAIAnalysis(message: string): boolean {
  // Messages simples = pas d'IA
  if (message.length < 10) return false;
  if (['taxi', 'moto', 'voiture', 'oui', 'non', 'annuler'].includes(message.toLowerCase())) return false;
  
  // Messages complexes = IA
  if (message.split(' ').length >= 4) return true;
  if (hasTemporalIndicators(message)) return true;
  if (hasDestinationPattern(message)) return true;
  
  return false;
}
```

---

## ✅ RÉSUMÉ IMPLÉMENTATION

**📋 ORDRE DE DÉVELOPPEMENT (RÉUTILISE 100% L'EXISTANT) :**

1. **BACKUP OBLIGATOIRE** → Créer backup index.ts avant toute modification
2. **Point injection IA** → Ajouter shouldUseAIAnalysis() au début du workflow existant
3. **États IA isolés** → Préfixe "ia_" pour éviter conflits avec workflow existant
4. **Enrichissement Google Places** → Réutiliser GOOGLE_PLACES_API_KEY et logique existante
5. **Validation temporelle** → S'inspirer de la logique plannedDate/plannedHour existante
6. **Fallback robuste** → Si IA échoue → return vers workflow standard (inchangé)
7. **Tests progressifs** → Un cas à la fois, validation non-régression

**🎯 RÈGLES STRICTES :**
- ✅ **JAMAIS MODIFIER** le workflow standard existant
- ✅ **TOUJOURS RÉUTILISER** les fonctions existantes (saveSession, getSession, etc.)
- ✅ **PRÉFIXER "ia_"** tous les nouveaux états pour isolation
- ✅ **BACKUP + TEST** à chaque étape pour éviter les régressions

**🎯 OBJECTIF :** Chaque cas d'input a son workflow détaillé à suivre à la lettre pour l'implémentation, en respectant 100% l'architecture existante.