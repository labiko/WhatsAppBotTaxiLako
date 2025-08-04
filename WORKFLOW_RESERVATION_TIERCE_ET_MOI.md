# 📋 **WORKFLOW RÉSERVATION TIERCE - SPÉCIFICATIONS COMPLÈTES**

## 🎯 **OBJECTIF**
Implémenter un nouveau workflow permettant de réserver un taxi pour soi-même (avec GPS) ou pour une autre personne (avec lieu de départ textuel). La vérification des conducteurs disponibles se fait APRÈS avoir obtenu la position (GPS ou lieu), dans un rayon de 5km.

## 📊 **CHANGEMENTS PRINCIPAUX**

### **Workflow actuel à supprimer :**
```
taxi → type véhicule → [VÉRIFICATION CONDUCTEURS] → confirmation → GPS → destination
```

### **Nouveau workflow à implémenter :**
```
taxi → type véhicule → confirmation (oui/non) → [SI OUI: GPS] [SI NON: lieu départ] → [VÉRIFICATION CONDUCTEURS 5KM] → destination
```

---

## 🟢 **PARCOURS A : RÉSERVATION POUR SOI ("OUI")**

### **ÉTAPE 1 : Demande initiale**
**Trigger:** `"taxi"`
```
Client: taxi
Bot: 🚕 Bienvenue chez LokoTaxi!
     
     Quel type de taxi souhaitez-vous ?
     • 'moto' - Transport rapide en moto-taxi
     • 'voiture' - Transport en voiture
     
     (Répondez par 'moto' ou 'voiture')
```
**État session:** `initial`

### **ÉTAPE 2 : Choix véhicule**
**Trigger:** `"moto"` ou `"voiture"`
```
Client: voiture
Bot: 📍 Parfait! Vous avez choisi: VOITURE
     
     🤔 Cette réservation est-elle pour vous ?
     
     Répondez:
     • "oui" → Partager votre position GPS
     • "non" → Réservation pour quelqu'un d'autre
     
     Ou tapez directement 'taxi' pour recommencer.
```
**État session:** `confirmation_depart`
**⚠️ CHANGEMENT:** Supprimer l'appel à `getAvailableDrivers()` ici

### **ÉTAPE 3A : Confirmation "oui"**
**Trigger:** `"oui"` (état: confirmation_depart)
```
Client: oui
Bot: ✅ CONFIRMATION REÇUE
     
     Pour calculer le prix de votre course, partagez votre position GPS:
     • Cliquez sur l'icône 📎 (trombone)
     • Sélectionnez "Lieu"
```
**État session:** `vehicule_choisi`

### **ÉTAPE 4A : GPS partagé**
**Trigger:** Coordonnées GPS reçues (état: vehicule_choisi)
```
Client: [PARTAGE GPS]
Bot: 📍 Position reçue! 
     🔍 Recherche de conducteurs disponibles...
```
**🔧 APPEL:** `getAvailableDrivers(vehicleType, {lat: clientLat, lon: clientLon}, 5000)`

#### **Cas 4A.1 : Conducteurs trouvés**
```
Bot: ✅ 3 conducteur(s) VOITURE disponible(s) à proximité!
     
     🏁 Quelle est votre destination ?
     
     Exemples de destinations disponibles:
     1️⃣ Hôpital Ignace Deen
     2️⃣ Marché Madina
     3️⃣ Aéroport de Conakry
     
     Tapez le nom ou le numéro de votre destination.
```
**État session:** `position_recue`

#### **Cas 4A.2 : Aucun conducteur dans 5km**
```
Bot: ❌ Désolé, aucun conducteur VOITURE disponible dans un rayon de 5km
     
     Options disponibles:
     • Tapez "moto" pour essayer un moto-taxi
     • Tapez "attendre" pour être notifié quand un conducteur sera disponible
     • Tapez "elargir" pour chercher dans un rayon de 10km
     • Tapez "taxi" pour recommencer
```
**État session:** `aucun_conducteur_proximite`

---

## 🔴 **PARCOURS B : RÉSERVATION POUR QUELQU'UN D'AUTRE ("NON")**

### **ÉTAPE 3B : Confirmation "non"**
**Trigger:** `"non"` (état: confirmation_depart)
```
Client: non
Bot: 📍 RÉSERVATION POUR UNE AUTRE PERSONNE
     
     🔍 Où se trouve la personne à récupérer ?
     
     Tapez le nom du lieu de départ (ex: Hôpital Donka, Marché Madina, Kipe Centre...)
```
**État session:** `depart_autre_personne`

### **ÉTAPE 4B : Lieu de départ saisi**
**Trigger:** Nom de lieu (état: depart_autre_personne)
```
Client: Hôpital Donka
Bot: 🔍 Recherche du lieu...
```
**🔧 APPEL:** `searchAdresse("Hôpital Donka")`

#### **Cas 4B.1 : Lieu trouvé + conducteurs disponibles**
```
Bot: ✅ Lieu trouvé: Hôpital Ignace Deen (Donka)
     📍 Position: 9.535°N, -13.682°W
     
     🔍 Vérification des conducteurs à proximité...
     
     ✅ 2 conducteur(s) VOITURE disponible(s) près d'Hôpital Donka!
     
     🏁 Quelle est la destination finale ?
     
     Tapez le nom du lieu où vous voulez aller.
```
**🔧 APPEL:** `getAvailableDrivers(vehicleType, {lat: 9.535, lon: -13.682}, 5000)`
**État session:** `lieu_depart_trouve`

#### **Cas 4B.2 : Lieu trouvé mais aucun conducteur**
```
Bot: ✅ Lieu trouvé: Hôpital Ignace Deen (Donka)
     📍 Position: 9.535°N, -13.682°W
     
     ❌ Désolé, aucun conducteur VOITURE disponible dans un rayon de 5km d'Hôpital Donka
     
     Options disponibles:
     • Tapez un autre lieu de départ
     • Tapez "moto" pour essayer un moto-taxi  
     • Tapez "elargir" pour chercher dans un rayon de 10km
     • Tapez "taxi" pour recommencer
```
**État session:** `aucun_conducteur_lieu_depart`

#### **Cas 4B.3 : Lieu non trouvé**
```
Bot: ❓ Lieu non trouvé: "Hôpital Donka"
     
     Suggestions proches:
     1️⃣ Hôpital Ignace Deen
     2️⃣ Centre Médical de Donka
     3️⃣ Clinique Espoir Donka
     4️⃣ Hôpital Régional de Donka
     
     Tapez le numéro de votre choix ou essayez un autre nom
```
**État session:** reste `depart_autre_personne`

### **ÉTAPE 5B : Destination finale**
**Trigger:** Nom de destination (état: lieu_depart_trouve)
```
Client: Aéroport
Bot: 🔍 Recherche de la destination...
     
     📍 RÉSUMÉ DE LA COURSE (Réservation tierce)
     ========================================
     🚗 Type: VOITURE
     👤 Pour: Une autre personne
     📍 Départ: Hôpital Ignace Deen (Donka)
     🏁 Destination: Aéroport International de Conakry
     📏 Distance: 18.5 km
     💰 Prix estimé: 55,500 GNF
     
     ⏱️ Temps estimé: 35 minutes
     
     Confirmez-vous cette réservation ?
     (Répondez "oui" pour confirmer)
```
**État session:** `prix_calcule_tiers`

---

## 🔧 **MODIFICATIONS TECHNIQUES REQUISES**

### **1. Nouvelle signature fonction `getAvailableDrivers()`**
```typescript
async function getAvailableDrivers(
  vehicleType: string, 
  centerCoords: {lat: number, lon: number}, 
  radiusMeters: number = 5000
): Promise<Conducteur[]> {
  // Requête SQL avec calcul de distance PostGIS
  const query = `
    SELECT * FROM conducteurs_with_coords
    WHERE 
      type_vehicule = $1 
      AND statut = 'disponible'
      AND ST_DWithin(
        position::geography,
        ST_MakePoint($3, $2)::geography,
        $4
      )
    ORDER BY ST_Distance(
      position::geography,
      ST_MakePoint($3, $2)::geography
    )
    LIMIT 10
  `;
  
  return await db.query(query, [vehicleType, centerCoords.lat, centerCoords.lon, radiusMeters]);
}
```

### **2. Nouveaux états de session**
```typescript
type SessionState = 
  | 'initial'
  | 'confirmation_depart'      // Nouveau: attend oui/non
  | 'vehicule_choisi'          // Après "oui"
  | 'depart_autre_personne'    // Après "non", attend lieu
  | 'lieu_depart_trouve'       // Lieu validé + conducteurs OK
  | 'position_recue'           // GPS reçu + conducteurs OK
  | 'aucun_conducteur_proximite' // Aucun conducteur 5km (GPS)
  | 'aucun_conducteur_lieu_depart' // Aucun conducteur 5km (lieu)
  | 'prix_calcule'
  | 'prix_calcule_tiers'       // Prix calculé pour réservation tierce
  | 'confirme'
```

### **3. Structure session enrichie**
```typescript
interface Session {
  // Existant
  vehicleType: 'moto' | 'voiture' | null;
  positionClient?: string;
  destinationNom?: string;
  
  // Nouveau
  reservationPourAutrui?: boolean;
  lieuDepartNom?: string;
  lieuDepartId?: string;
  lieuDepartPosition?: string;
  conducteursDisponibles?: number;
  rayonRecherche?: number;
}
```

### **4. Logique de traitement modifiée**

#### **Handler choix véhicule (MODIFIER)**
```typescript
// ÉTAPE 2: Choix véhicule - SUPPRIMER getAvailableDrivers()
if ((messageText === 'moto' || messageText === 'voiture') && !hasLocation) {
  // ❌ SUPPRIMER CETTE PARTIE
  // const conducteursDisponibles = await getAvailableDrivers(messageText);
  
  // ✅ NOUVELLE LOGIQUE
  await saveSession(clientPhone, {
    vehicleType: messageText,
    etat: 'confirmation_depart'
  });
  
  responseMessage = `📍 Parfait! Vous avez choisi: ${messageText.toUpperCase()}
  
  🤔 Cette réservation est-elle pour vous ?
  
  Répondez:
  • "oui" → Partager votre position GPS
  • "non" → Réservation pour quelqu'un d'autre
  
  Ou tapez directement 'taxi' pour recommencer.`;
}
```

#### **Handler GPS avec vérification conducteurs (MODIFIER)**
```typescript
// ÉTAPE 4A: GPS reçu - AJOUTER vérification conducteurs
if (session.etat === 'vehicule_choisi' && hasLocation) {
  const lat = parseFloat(latitude!);
  const lon = parseFloat(longitude!);
  
  // ✅ NOUVELLE PARTIE: Vérifier conducteurs dans 5km
  const conducteursProches = await getAvailableDrivers(
    session.vehicleType!, 
    {lat, lon}, 
    5000
  );
  
  if (conducteursProches.length === 0) {
    // Aucun conducteur proche
    await saveSession(clientPhone, {
      ...session,
      positionClient: `POINT(${lon} ${lat})`,
      etat: 'aucun_conducteur_proximite',
      conducteursDisponibles: 0
    });
    
    responseMessage = `❌ Désolé, aucun conducteur ${session.vehicleType!.toUpperCase()} disponible dans un rayon de 5km
    
    Options disponibles:
    • Tapez "moto" pour essayer un moto-taxi
    • Tapez "attendre" pour être notifié quand un conducteur sera disponible
    • Tapez "elargir" pour chercher dans un rayon de 10km
    • Tapez "taxi" pour recommencer`;
  } else {
    // Conducteurs trouvés
    await saveSession(clientPhone, {
      ...session,
      positionClient: `POINT(${lon} ${lat})`,
      etat: 'position_recue',
      conducteursDisponibles: conducteursProches.length
    });
    
    const suggestions = await getSuggestionsIntelligentes('', 6);
    
    responseMessage = `📍 Position reçue!
    ✅ ${conducteursProches.length} conducteur(s) ${session.vehicleType!.toUpperCase()} disponible(s) à proximité!
    
    🏁 Quelle est votre destination ?
    
    ${formatSuggestions(suggestions)}`;
  }
}
```

#### **Nouveau handler pour "non" (AJOUTER)**
```typescript
// NOUVEAU: Handler pour réservation tierce
if (session.etat === 'confirmation_depart' && messageText.toLowerCase() === 'non') {
  await saveSession(clientPhone, {
    ...session,
    etat: 'depart_autre_personne',
    reservationPourAutrui: true
  });
  
  responseMessage = `📍 RÉSERVATION POUR UNE AUTRE PERSONNE
  
  🔍 Où se trouve la personne à récupérer ?
  
  Tapez le nom du lieu de départ (ex: Hôpital Donka, Marché Madina, Kipe Centre...)`;
}
```

#### **Nouveau handler lieu départ (AJOUTER)**
```typescript
// NOUVEAU: Handler recherche lieu départ
if (session.etat === 'depart_autre_personne' && !hasLocation) {
  const lieuDepart = await searchAdresse(messageText);
  
  if (!lieuDepart) {
    // Lieu non trouvé - suggestions
    const suggestions = await getSuggestionsIntelligentes(messageText, 5);
    responseMessage = `❓ Lieu non trouvé: "${messageText}"
    
    Suggestions proches:
    ${formatSuggestions(suggestions)}
    
    Tapez le numéro de votre choix ou essayez un autre nom`;
  } else {
    // Lieu trouvé - vérifier conducteurs
    const conducteursProches = await getAvailableDrivers(
      session.vehicleType!,
      {lat: lieuDepart.latitude, lon: lieuDepart.longitude},
      5000
    );
    
    if (conducteursProches.length === 0) {
      // Aucun conducteur au lieu
      await saveSession(clientPhone, {
        ...session,
        lieuDepartNom: lieuDepart.nom,
        lieuDepartId: lieuDepart.id,
        lieuDepartPosition: `POINT(${lieuDepart.longitude} ${lieuDepart.latitude})`,
        etat: 'aucun_conducteur_lieu_depart'
      });
      
      responseMessage = `✅ Lieu trouvé: ${lieuDepart.nom}
      📍 Position: ${lieuDepart.latitude.toFixed(3)}°N, ${lieuDepart.longitude.toFixed(3)}°W
      
      ❌ Désolé, aucun conducteur ${session.vehicleType!.toUpperCase()} disponible dans un rayon de 5km de ${lieuDepart.nom}
      
      Options disponibles:
      • Tapez un autre lieu de départ
      • Tapez "moto" pour essayer un moto-taxi
      • Tapez "elargir" pour chercher dans un rayon de 10km
      • Tapez "taxi" pour recommencer`;
    } else {
      // Conducteurs trouvés
      await saveSession(clientPhone, {
        ...session,
        lieuDepartNom: lieuDepart.nom,
        lieuDepartId: lieuDepart.id,
        lieuDepartPosition: `POINT(${lieuDepart.longitude} ${lieuDepart.latitude})`,
        etat: 'lieu_depart_trouve',
        conducteursDisponibles: conducteursProches.length
      });
      
      responseMessage = `✅ Lieu trouvé: ${lieuDepart.nom}
      📍 Position: ${lieuDepart.latitude.toFixed(3)}°N, ${lieuDepart.longitude.toFixed(3)}°W
      
      🔍 Vérification des conducteurs à proximité...
      
      ✅ ${conducteursProches.length} conducteur(s) ${session.vehicleType!.toUpperCase()} disponible(s) près de ${lieuDepart.nom}!
      
      🏁 Quelle est la destination finale ?
      
      Tapez le nom du lieu où vous voulez aller.`;
    }
  }
}
```

### **5. Gestion des options d'élargissement**
```typescript
// Handler pour élargir le rayon de recherche
if ((session.etat === 'aucun_conducteur_proximite' || session.etat === 'aucun_conducteur_lieu_depart') 
    && messageText === 'elargir') {
  
  const centerCoords = session.etat === 'aucun_conducteur_proximite' 
    ? await getClientCoordinates(clientPhone)
    : await getCoordinatesFromPosition(session.lieuDepartPosition!);
  
  const conducteursElargis = await getAvailableDrivers(
    session.vehicleType!,
    centerCoords,
    10000 // 10km
  );
  
  if (conducteursElargis.length > 0) {
    responseMessage = `✅ ${conducteursElargis.length} conducteur(s) trouvé(s) dans un rayon de 10km!
    
    Le conducteur le plus proche est à ${(conducteursElargis[0].distance / 1000).toFixed(1)}km
    
    Souhaitez-vous continuer avec cette recherche élargie ?
    (Répondez "oui" pour continuer)`;
  } else {
    responseMessage = `❌ Aucun conducteur trouvé même dans un rayon de 10km.
    
    Nous vous conseillons de réessayer dans quelques minutes.
    Tapez "taxi" pour recommencer avec d'autres options.`;
  }
}
```

---

## 🎤 **ADAPTATIONS MODE AUDIO**

### **Détection automatique par l'IA**
L'IA doit détecter dans la transcription audio :
- **Pour qui** : "pour moi" vs "pour ma mère/père/ami"
- **Lieu départ** : Si mentionné pour autrui
- **Destination** : Toujours extraire si présente

### **Exemples de transcriptions**
```
🎤 "Je veux une voiture pour aller à l'aéroport"
→ for_self: true, vehicle: "voiture", destination: "aéroport"

🎤 "Il me faut un taxi moto pour récupérer ma femme à Donka"
→ for_self: false, vehicle: "moto", pickup: "Donka"

🎤 "Envoyez une voiture chercher mon fils à l'école Saint-Joseph pour l'amener à la maison"
→ for_self: false, vehicle: "voiture", pickup: "école Saint-Joseph", destination: "maison"
```

### **Workflow audio adapté**
```typescript
if (aiAnalysis.for_self === false && aiAnalysis.pickup_location) {
  // Rechercher coordonnées du lieu de départ
  const pickupCoords = await searchAdresse(aiAnalysis.pickup_location);
  
  // Vérifier conducteurs au lieu de départ
  const drivers = await getAvailableDrivers(
    aiAnalysis.vehicle_type,
    {lat: pickupCoords.latitude, lon: pickupCoords.longitude},
    5000
  );
  
  // Continuer selon disponibilité
}
```

---

## 📊 **RÉSUMÉ DES IMPACTS**

### **Fichiers à modifier**
1. `supabase/functions/whatsapp-bot/index.ts` - Handler principal
2. `handleTextMessage()` - Logique parcours texte
3. `handleAudioMessage()` - Logique parcours audio
4. `getAvailableDrivers()` - Ajout paramètres géo

### **Tests à effectuer**
1. **Parcours A** : taxi → voiture → oui → GPS → destination
2. **Parcours B** : taxi → moto → non → "Hôpital Donka" → destination
3. **Cas d'erreur** : Aucun conducteur proche (5km et 10km)
4. **Audio** : Phrases avec "pour quelqu'un d'autre"

### **Métriques de succès**
- ✅ Recherche conducteurs uniquement après position
- ✅ Rayon de recherche configurable (5km par défaut)
- ✅ Support réservations tierces complet
- ✅ Messages d'erreur clairs et options alternatives
- ✅ Parcours audio et texte alignés