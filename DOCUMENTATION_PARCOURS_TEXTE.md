# 📱 DOCUMENTATION - PARCOURS TEXTE WHATSAPP BOT

## 🎯 **VUE D'ENSEMBLE**

Le parcours texte permet aux utilisateurs de réserver un taxi via messages WhatsApp classiques (pas d'audio). Workflow complet : `taxi → type véhicule → confirmation départ → GPS → destination → prix → confirmation finale`.

---

## 🏗️ **ARCHITECTURE GÉNÉRALE**

### **Point d'entrée principal**
```typescript
serve(async (req) => {
  // Routage automatique vers mode texte ou audio
  if (body && body.trim()) {
    return await handleTextMessage(from, body, latitude, longitude);
  }
});
```

### **Handler principal texte**
```typescript
async function handleTextMessage(from: string, body: string, latitude?: string, longitude?: string)
```

---

## 📋 **FLUX COMPLET DU PARCOURS TEXTE**

### **ÉTAPE 1 : Demande initiale** 
**Trigger :** `"taxi"`

```typescript
// Lignes 1540-1567
if (messageText.includes('taxi')) {
  // Nettoyer session précédente
  await deleteSession(clientPhone);
  
  // Créer nouvelle session
  await saveSession(clientPhone, {
    vehicleType: null,
    etat: 'initial'
  });
  
  responseMessage = `🚕 Bienvenue chez LokoTaxi!
  Quel type de taxi souhaitez-vous ?
  • 'moto' - Transport rapide en moto-taxi
  • 'voiture' - Transport en voiture`;
}
```

**Fonctions impliquées :**
- `deleteSession()` : Nettoie les sessions précédentes
- `saveSession()` : Crée nouvelle session avec état 'initial'

---

### **ÉTAPE 2 : Choix du véhicule**
**Trigger :** `"moto"` ou `"voiture"`

```typescript
// Lignes 2088-2160
if ((messageText === 'moto' || messageText === 'voiture') && !hasLocation) {
  // Vérifier conducteurs disponibles
  const conducteursDisponibles = await getAvailableDrivers(messageText);
  
  if (conducteursDisponibles.length === 0) {
    responseMessage = `❌ Aucun conducteur ${messageText} disponible...`;
  } else {
    await saveSession(clientPhone, {
      vehicleType: messageText,
      etat: 'confirmation_depart'  // ✨ NOUVEAU : Confirmation ajoutée
    });
    
    responseMessage = `📍 Parfait! Vous avez choisi: ${messageText.toUpperCase()}
    🤔 **Cette réservation est-elle pour vous ?**
    • "oui" → Partager votre position GPS
    • "non" → Réservation pour quelqu'un d'autre`;
  }
}
```

**Fonctions impliquées :**
- `getAvailableDrivers(vehicleType)` : Vérifie disponibilité conducteurs
- `saveSession()` : Met à jour avec type véhicule et nouvel état

---

### **ÉTAPE 3 : Confirmation départ** ✨ **NOUVEAU**
**Trigger :** `"oui"` ou `"non"` (état: confirmation_depart)

```typescript
// Lignes 1376-1462 (déplacé avant hasLocation)
} else if (session.etat === 'confirmation_depart') {
  if (messageText.toLowerCase() === 'oui') {
    await saveSession(clientPhone, {
      ...session,
      etat: 'vehicule_choisi'
    });
    
    responseMessage = `✅ **CONFIRMATION REÇUE**
    Pour calculer le prix de votre course, partagez votre position GPS:
    • Cliquez sur l'icône 📎 (trombone)
    • Sélectionnez "Lieu"`;
    
  } else if (messageText.toLowerCase() === 'non') {
    responseMessage = `📍 **RÉSERVATION POUR QUELQU'UN D'AUTRE**
    Fonctionnalité 'départ personnalisé' à implémenter.`;
  }
}
```

**Fonctions impliquées :**
- `saveSession()` : Passe à l'état 'vehicule_choisi' si "oui"

---

### **ÉTAPE 4 : Partage GPS**
**Trigger :** Coordonnées GPS partagées (état: vehicule_choisi)

```typescript
// Lignes 1464-1513 (dans bloc hasLocation)
} else if (session.etat === 'vehicule_choisi' || session.etat === 'attente_position_planifie') {
  const lat = parseFloat(latitude!);
  const lon = parseFloat(longitude!);
  
  await saveSession(clientPhone, {
    ...session,
    positionClient: `POINT(${lon} ${lat})`,
    etat: 'position_recue'
  });
  
  // Suggestions intelligentes de destinations
  const suggestions = await getSuggestionsIntelligentes('', 6);
  
  responseMessage = `📍 Position reçue! Merci.
  🏁 Quelle est votre destination ?
  Exemples de destinations disponibles:
  ${suggestionsText}`;
}
```

**Fonctions impliquées :**
- `saveSession()` : Stocke position GPS au format POINT
- `getSuggestionsIntelligentes()` : Propose destinations populaires

---

### **ÉTAPE 5 : Saisie destination**
**Trigger :** Nom de lieu (état: position_recue)

```typescript
// Lignes 1568-1619
} else if ((session.etat === 'position_recue' || session.etat === 'position_recue_planifiee') && !hasLocation) {
  const adresse = await searchAdresse(body);
  
  if (!adresse) {
    const suggestions = await getSuggestionsIntelligentes(body, 5);
    responseMessage = `❓ Destination non trouvée: "${body}"
    Destinations suggérées: ${suggestionsText}`;
  } else {
    // Calculer distance et prix
    const clientCoords = await getClientCoordinates(normalizePhone(from));
    const distanceKm = calculateDistance(clientCoords.latitude, clientCoords.longitude, 
                                       adresse.latitude, adresse.longitude);
    const prixInfo = await calculerPrixCourse(session.vehicleType!, distanceKm);
    
    await saveSession(clientPhone, {
      ...session,
      destinationNom: adresse.nom,
      destinationId: adresse.id,
      destinationPosition: `POINT(${adresse.longitude} ${adresse.latitude})`,
      distanceKm: distanceKm,
      prixEstime: prixInfo.prix_total,
      etat: 'prix_calcule'
    });
    
    responseMessage = `📍 **RÉSUMÉ DE VOTRE COURSE**
    🚗 Type: ${session.vehicleType!.toUpperCase()}
    📍 Destination: ${adresse.nom}
    📏 Distance: ${distanceKm.toFixed(1)} km
    💰 **Prix estimé: ${prixInfo.prix_total.toLocaleString('fr-FR')} GNF**
    Confirmez-vous cette réservation ?`;
  }
}
```

**Fonctions impliquées :**
- `searchAdresse(query)` : Recherche lieu dans base de données
- `getSuggestionsIntelligentes(query, limit)` : Suggestions si lieu non trouvé
- `getClientCoordinates(phone)` : Récupère coordonnées client depuis session
- `calculateDistance(lat1, lon1, lat2, lon2)` : Calcul distance Haversine
- `calculerPrixCourse(vehicleType, distance)` : Calcul prix selon tarifs

---

### **ÉTAPE 6 : Confirmation finale**
**Trigger :** `"oui"` (état: prix_calcule)

```typescript
// Lignes 1698-1788
if (session.etat === 'prix_calcule' && messageText === 'oui') {
  // Reconstruction coordonnées client
  const clientCoords = await getClientCoordinates(normalizePhone(from));
  
  const reservationData = {
    client_phone: clientPhone,
    conducteur_id: null,
    vehicle_type: session.vehicleType,
    position_depart: `POINT(${clientCoords.longitude} ${clientCoords.latitude})`, // ✅ FIX
    destination_nom: session.destinationNom,
    destination_id: session.destinationId,
    position_arrivee: session.destinationPosition,
    distance_km: session.distanceKm,
    prix_total: session.prixEstime,
    statut: 'pending'
  };
  
  // Insertion en base
  const saveResponse = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/reservations`, {
    method: 'POST',
    headers: { /* auth headers */ },
    body: JSON.stringify(reservationData)
  });
  
  if (saveResponse.ok) {
    await saveSession(clientPhone, {
      ...session,
      prixConfirme: true,
      etat: 'confirme'
    });
    
    responseMessage = `⏳ **RÉSERVATION EN ATTENTE**
    🚖 Votre demande de ${session.vehicleType} a été enregistrée
    📍 Destination: ${session.destinationNom}
    💰 Prix: ${session.prixEstime!.toLocaleString('fr-FR')} GNF
    🔍 **Recherche d'un conducteur disponible...**`;
    
    // Nettoyer session
    await deleteSession(clientPhone);
  }
}
```

**Fonctions impliquées :**
- `getClientCoordinates()` : Récupère coordonnées pour insertion
- `fetchWithRetry()` : Insertion sécurisée en base avec retry
- `saveSession()` : Met à jour état final
- `deleteSession()` : Nettoie session après succès

---

## 🔧 **FONCTIONS UTILITAIRES**

### **Gestion des sessions**
```typescript
async function saveSession(phone: string, data: Partial<Session>)
// Sauvegarde/met à jour session utilisateur avec UPSERT

async function getSession(phone: string): Promise<Session>
// Récupère session la plus récente (ORDER BY updated_at DESC)

async function deleteSession(phone: string)
// Supprime session utilisateur
```

### **Recherche et géolocalisation**
```typescript
async function searchAdresse(query: string): Promise<Adresse | null>
// Recherche lieu dans table adresses avec fuzzy matching

async function 









(query: string, limit: number): Promise<Adresse[]>
// Suggestions basées sur popularité et recherche partielle

async function getClientCoordinates(phone: string): Promise<{latitude: number, longitude: number}>
// Extrait coordonnées GPS depuis session PostGIS

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number
// Calcul distance avec formule Haversine
```

### **Conducteurs et tarification**
```typescript
async function getAvailableDrivers(vehicleType: string): Promise<Conducteur[]>
// Récupère conducteurs disponibles par type

async function calculerPrixCourse(vehicleType: string, distanceKm: number): Promise<PrixInfo>
// Calcule prix selon tarifs configurés (3000 GNF/km)
```

### **Communications**
```typescript
async function fetchWithRetry(url: string, options: RequestInit): Promise<Response>
// Requêtes HTTP avec retry automatique et gestion d'erreurs

function normalizePhone(phone: string): string
// Normalise numéro WhatsApp (retire préfixe "whatsapp:")
```

---

## 🎯 **ÉTATS DE SESSION**

| État | Description | Prochaine étape attendue |
|------|-------------|-------------------------|
| `initial` | Session créée, attend type véhicule | moto/voiture |
| `confirmation_depart` | Véhicule choisi, attend confirmation | oui/non |
| `vehicule_choisi` | Confirmation reçue, attend GPS | Coordonnées |
| `position_recue` | GPS reçu, attend destination | Nom de lieu |
| `prix_calcule` | Prix calculé, attend confirmation finale | oui/non |
| `confirme` | Réservation confirmée | - |

---

## 🚨 **GESTION D'ERREURS**

### **Erreurs courantes et solutions**
- **Session expirée** : Redirection vers 'taxi'
- **Lieu non trouvé** : Suggestions intelligentes
- **Aucun conducteur** : Message d'excuse + alternatives
- **Erreur sauvegarde** : Message technique + retry
- **GPS invalide** : Demande de repartage

### **Fallbacks**
- Suggestions de destinations populaires
- Messages d'aide contextuels
- Commande 'annuler' à tout moment
- Nettoyage automatique des sessions

---

## 🔄 **INTÉGRATION AVEC MODE AUDIO**

Le parcours texte est **complètement indépendant** du mode audio :
- **Point d'entrée séparé** : `handleTextMessage()` vs `handleAudioMessage()`
- **Sessions partagées** : Même table `sessions` pour les deux modes
- **Fonctions communes** : Recherche, prix, conducteurs réutilisés
- **Aucune interférence** : Modifications texte n'affectent pas l'audio