# 🔄 WORKFLOW DÉTAILLÉ - "Taxi ce soir à 20h pour le restaurant"

## 📋 CONTEXTE
**Input utilisateur :** "Taxi ce soir à 20h pour le restaurant"
**Date/Heure actuelle :** 16/08/2025 à 15h30
**Numéro client :** +33620951645

---

## 🧠 ÉTAPE 1 : ANALYSE IA

### Détection message complexe
```typescript
// Dans index.ts ligne ~3200
if (isComplexMessage("Taxi ce soir à 20h pour le restaurant")) {
  // Message contient: temporal + destination → COMPLEXE ✅
}
```

### Appel GPT-4
```typescript
// text-intelligence.ts
const iaResult = await analyzeWithAI("Taxi ce soir à 20h pour le restaurant");
```

### Réponse IA
```json
{
  "vehicleType": "voiture",      // "taxi" seul = voiture par défaut
  "destination": "restaurant",    // Destination vague détectée
  "departure": null,
  "temporal": {
    "isPlanned": true,
    "date": "2025-08-16",        // Aujourd'hui
    "time": "20:00",
    "relative": "ce soir"
  },
  "action": "new_booking",
  "confidence": 0.85
}
```

---

## 🔧 ÉTAPE 2 : INJECTION DANS WORKFLOW EXISTANT

### Sauvegarde session avec données IA
```typescript
// Injection des données extraites dans la session
await saveSession("+33620951645", {
  vehicleType: "voiture",           // ✅ Extrait de l'IA
  etat: "vehicule_choisi",          // Skip étape choix véhicule
  destinationNom: null,             // "restaurant" trop vague
  temporalPlanning: true,           // ✅ Planifié
  plannedDate: "2025-08-16",        // ✅ Ce soir
  plannedHour: 20,                  // ✅ 20h
  plannedMinute: 0
});
```

---

## 💬 ÉTAPE 3 : PREMIÈRE RÉPONSE BOT

```
📅 **RÉSERVATION CE SOIR**
━━━━━━━━━━━━━━━━━━━━━
🚗 Véhicule : Voiture
📅 Date : Aujourd'hui 16/08
⏰ Heure : 20h00

🍴 **RESTAURANTS DISPONIBLES**

1️⃣ **Petit Paris** • Kipé
   🦐 Spécialité fruits de mer
   ⏰ Ouvert jusqu'à 23h00
   💰 ~150K GNF/pers
   ⭐ Restaurant chic

2️⃣ **Le Damier** • Ratoma  
   🍕 Cuisine internationale
   ⏰ Ouvert jusqu'à 22h00
   💰 ~80K GNF/pers
   📍 Proche centre commercial

3️⃣ **Chez Fatou** • Kaloum
   🍛 Cuisine locale authentique
   ⏰ Ouvert jusqu'à 21h00
   💰 ~50K GNF/pers
   🎵 Ambiance traditionnelle

📝 Tapez 1, 2 ou 3 pour choisir
💬 Ou écrivez le nom d'un autre restaurant
```

---

## 👤 ÉTAPE 4 : RÉPONSE CLIENT

**Client tape :** "1"

---

## 🔍 ÉTAPE 5 : TRAITEMENT CHOIX DESTINATION

### Récupération session
```typescript
const session = await getSession("+33620951645");
// session.etat = "vehicule_choisi"
// session.suggestionsDestination = JSON avec les 3 restaurants
```

### Sélection destination
```typescript
const destinations = JSON.parse(session.suggestionsDestination);
const chosen = destinations[0]; // Restaurant Petit Paris
```

### Recherche Google Places
```typescript
const location = await searchLocationGoogle("Restaurant Petit Paris Kipé Conakry");
// Retourne: { lat: 9.5234, lng: -13.6789, nom: "Restaurant Petit Paris" }
```

### Mise à jour session
```typescript
await saveSession("+33620951645", {
  ...session,
  destinationNom: "Restaurant Petit Paris",
  destinationPosition: "POINT(-13.6789 9.5234)",
  etat: "destination_choisie_planifie"
});
```

---

## 📍 ÉTAPE 6 : DEMANDE POSITION DÉPART

```
✅ **DESTINATION CONFIRMÉE**
━━━━━━━━━━━━━━━━━━━━━

🍴 **Restaurant Petit Paris** • Kipé
⏰ Ouvert jusqu'à 23h00 ✅
📞 Réservation table: 622 00 00 00
🦐 Conseil: Essayez les crevettes grillées!

📍 **D'OÙ PARTIREZ-VOUS CE SOIR ?**

🎯 Options rapides:
• 📍 Partager position GPS actuelle
• 🏠 Tapez votre quartier
• 🏢 Nom d'un lieu connu

💡 Astuce: Le trajet vers Kipé peut prendre 
   +10min aux heures de pointe
```

---

## 🗺️ ÉTAPE 7 : CLIENT PARTAGE GPS

**Client :** [Partage position GPS]
**Coordonnées reçues :** lat: 9.5123, lng: -13.6456 (Madina)

---

## 📊 ÉTAPE 8 : CALCUL PRIX ET DISTANCE

### Calcul distance
```typescript
const distance = calculateDistance(
  9.5123, -13.6456,  // Départ: Madina
  9.5234, -13.6789   // Arrivée: Restaurant
);
// = 3.2 km
```

### Calcul prix
```typescript
const prix = calculerPrixCourse("voiture", 3.2);
// Base: 10,000 GNF + (3.2 × 3,000) = 19,600 GNF
// Arrondi: 20,000 GNF
```

### Sauvegarde complète
```typescript
await saveSession("+33620951645", {
  ...session,
  positionClient: "POINT(-13.6456 9.5123)",
  departNom: "Madina",
  distanceKm: 3.2,
  prixEstime: 20000,
  etat: "prix_calcule_planifie"
});
```

---

## 💰 ÉTAPE 9 : CONFIRMATION PRIX

```
🎯 **RÉCAPITULATIF TRAJET**
━━━━━━━━━━━━━━━━━━━━━

📅 **CE SOIR • 20H00**

📍 **TRAJET**
De : Madina
Vers : Restaurant Petit Paris (Kipé)
Distance : 3.2 km • ~12 min

💰 **TARIF TOTAL : 20,000 GNF**
   Base : 10,000 GNF
   + Distance : 10,000 GNF
   💳 Paiement cash au conducteur

🚗 **VÉHICULE**
Type : Voiture climatisée
État : Vérifié et assuré

⏰ **PLANNING**
19h30 : 📲 SMS de rappel
19h45 : 📞 Appel du conducteur
20h00 : 🚗 Arrivée conducteur

✅ Tapez "OUI" pour confirmer
❌ Tapez "NON" pour annuler
```

---

## ✅ ÉTAPE 10 : CONFIRMATION CLIENT

**Client :** "oui"

---

## 🚗 ÉTAPE 11 : CRÉATION RÉSERVATION

### Recherche conducteur disponible
```typescript
const conducteurs = await getAvailableDrivers("voiture");
// Retourne liste conducteurs voiture disponibles
```

### Création réservation planifiée
```typescript
const reservation = await createReservation({
  client_phone: "+33620951645",
  vehicle_type: "voiture",
  position_depart: "POINT(-13.6456 9.5123)",
  depart_nom: "Madina",
  destination_position: "POINT(-13.6789 9.5234)", 
  destination_nom: "Restaurant Petit Paris",
  distance_km: 3.2,
  prix: 20000,
  statut: "scheduled",              // Planifiée, pas "pending"
  date_reservation: "2025-08-16",
  heure_reservation: "20:00:00",
  conducteur_id: null               // Sera assigné plus tard
});
```

### Programmation notification
```sql
-- Notification automatique sera envoyée à 19h30 (30 min avant)
-- Via le système de rappels C# configuré
```

---

## 📱 ÉTAPE 12 : MESSAGE FINAL

```
✅ **RÉSERVATION CONFIRMÉE**
━━━━━━━━━━━━━━━━━━━━━

🎫 **RÉFÉRENCE**
#RES-2025-0816-1530

📅 **CE SOIR • 20H00**
━━━━━━━━━━━━━━━━━━━━━
📍 Madina
↓
🍴 Restaurant Petit Paris (Kipé)
━━━━━━━━━━━━━━━━━━━━━

💰 **20,000 GNF** • Cash

📱 **NOTIFICATIONS**
• 19h30 → 📲 SMS rappel
• 19h45 → 📞 Appel conducteur  
• 20h00 → 🚗 Sur place

🍴 **INFO RESTAURANT**
Le Petit Paris ferme à 23h00
Table? 📞 622 00 00 00
Spécialité: Fruits de mer 🦐

💡 **CONSEILS**
• Gardez votre téléphone chargé
• Préparez l'appoint si possible
• Le conducteur patientera 5 min max

❌ Annulation? Tapez "annuler"

Excellente soirée! 🌙✨
```

---

## 🔄 RÉSUMÉ DU WORKFLOW

### Avec IA (12 étapes optimisées)
1. **Analyse IA** → Extraction complète des infos
2. **Injection session** → Skip questions déjà répondues
3. **Clarification destination** → "restaurant" trop vague
4. **Client choisit** → Option 1
5. **Recherche lieu** → Google Places API
6. **Demande GPS départ** → Position nécessaire
7. **Client partage GPS** → Coordonnées reçues
8. **Calculs** → Distance + Prix
9. **Confirmation prix** → Récapitulatif complet
10. **Client confirme** → "oui"
11. **Création réservation** → Base de données
12. **Message final** → Confirmation + instructions

### Sans IA (aurait été 18+ étapes)
1. Client : "taxi"
2. Bot : "Moto ou voiture ?"
3. Client : "voiture"
4. Bot : "Pour maintenant ?"
5. Client : "non"
6. Bot : "Quelle date ?"
7. Client : "aujourd'hui"
8. Bot : "Quelle heure ?"
9. Client : "20h"
10. Bot : "Position départ ?"
11. Client : [GPS]
12. Bot : "Destination ?"
13. Client : "restaurant"
14. Bot : "Quel restaurant ?"
15. Client : "Petit Paris"
16. Bot : "Lequel ? [liste]"
17. Client : "1"
18. Bot : "Prix : 20,000 GNF. Confirmer ?"
19. Client : "oui"
20. Bot : "Réservation confirmée"

### 🎯 GAIN : 6 étapes économisées (-33%) grâce à l'IA !