# LokoTaxiBotWhatsApp - Règles de Gestion Complètes

## 📋 Vue d'ensemble

LokoTaxi est un chatbot WhatsApp intelligent permettant aux clients de réserver des taxis (motos et voitures) avec calcul automatique de prix, sélection du conducteur le plus proche et gestion complète des sessions.

---

## 🔄 Flux Principal de Réservation

### 1. Initialisation de la réservation
- **Déclencheur** : Client envoie `"taxi"` ou `"je veux un taxi"`
- **Action** : Création d'une session avec état `"attente_vehicule"`
- **Réponse** : *"Quel type de taxi souhaitez-vous ? (Répondez par 'moto' ou 'voiture')"*

### 2. Sélection du type de véhicule
- **Entrées acceptées** : `"moto"` ou `"voiture"` (insensible à la casse)
- **Action** : Mise à jour session avec `vehicleType` et état `"vehicule_choisi"`
- **Réponse** : *"Merci. Veuillez partager votre position en cliquant sur l'icône (📎) puis 'Localisation'."*

### 3. Réception de la géolocalisation
- **Format attendu** : Coordonnées GPS (latitude, longitude) via WhatsApp
- **Traitement** : Stockage en format PostGIS `GEOGRAPHY(POINT, 4326)`
- **Action** : État devient `"position_recue"`
- **Réponse** : Demande de destination avec exemples d'adresses disponibles

### 4. Saisie de destination
- **Méthode** : Recherche floue avec distance Levenshtein
- **Tolérance** : Distance ≤ 3 caractères pour correspondance
- **Fallback** : Si aucune correspondance, liste des destinations disponibles
- **Action** : Calcul automatique de la distance et du prix

### 5. Confirmation du prix
- **Affichage** : Résumé complet avec type, destination, distance, prix
- **Options** : `"oui"` pour confirmer, `"non"` pour annuler
- **Action** : Si confirmé, recherche du conducteur le plus proche

### 6. Attribution du conducteur
- **Critère** : Conducteur disponible le plus proche (distance euclidienne)
- **Calcul** : Temps d'arrivée estimé (3 min/km minimum)
- **Mise à jour** : Statut conducteur devient `"occupé"`
- **Finalisation** : Réservation confirmée avec détails complets

---

## 💰 Règles de Tarification

### Tarifs par Kilomètre
- **Moto** : 3 000 GNF/km
- **Voiture** : 4 000 GNF/km

### Calcul du Prix
```
Prix Total = Distance (km) × Tarif par km × Véhicule
```

### Exemples de Prix
- **Moto - 5 km** : 5 × 3 000 = 15 000 GNF
- **Voiture - 5 km** : 5 × 4 000 = 20 000 GNF
- **Moto - 12.2 km** : 12.2 × 3 000 = 36 600 GNF

### Configuration
- Tarifs modifiables dans la table `tarifs`
- Support futur : tarifs par zones, heures creuses/pointe

---

## 📍 Gestion des Destinations

### Base de Données d'Adresses
14 destinations pré-enregistrées incluant :
- **Transports** : Gare de Melun, Aéroport Charles de Gaulle
- **Shopping** : Centre Commercial Carré Sénart
- **Administratif** : Préfecture de Melun
- **Santé** : Hôpital de Melun
- **Éducation** : Université Paris-Est Créteil

### Recherche Intelligente
- **Algorithme** : Distance de Levenshtein
- **Tolérance** : ≤ 3 caractères de différence
- **Exemples** :
  - `"gare melun"` → trouve `"Gare de Melun"`
  - `"aeroport"` → trouve `"Aeroport Charles de Gaulle"`
  - `"hospital"` → trouve `"Hôpital de Melun"`

### Gestion des Erreurs
- Si aucune correspondance : affichage de toutes les destinations
- Possibilité d'écrire `"liste"` pour voir toutes les options
- Suggestion automatique des destinations les plus proches

---

## 🚗 Gestion des Conducteurs

### Base de Données Conducteurs
- **13 conducteurs** : 5 motos + 8 voitures
- **Positions GPS** : Coordonnées réelles dans la région parisienne
- **Informations complètes** : Nom, téléphone, véhicule, statut

### Statuts des Conducteurs
- **`disponible`** : Prêt à accepter une course
- **`occupé`** : En course actuelle
- **`hors_service`** : Indisponible temporairement
- **`inactif`** : Compte désactivé

### Sélection Automatique
1. **Filtrage** : Conducteurs disponibles du bon type de véhicule
2. **Calcul distance** : Formule Haversine entre position client et conducteurs
3. **Sélection** : Conducteur le plus proche
4. **Mise à jour** : Statut devient `"occupé"`
5. **Estimation** : Temps d'arrivée (3 min/km, minimum 5 minutes)

### Algorithme de Distance
```javascript
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Rayon de la Terre en km
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

---

## 🗄️ Gestion des Sessions

### États de Session
1. **`attente_vehicule`** : En attente du choix moto/voiture
2. **`vehicule_choisi`** : Type sélectionné, attente GPS
3. **`position_recue`** : GPS reçue, attente destination
4. **`prix_calcule`** : Prix affiché, attente confirmation
5. **`conducteur_assigne`** : Réservation confirmée et conducteur trouvé

### Données de Session
```json
{
  "client_phone": "+33620951645",
  "vehicle_type": "moto",
  "position_client": "POINT(2.5891464 48.6276735)",
  "destination_nom": "Gare de Melun",
  "destination_id": "uuid",
  "destination_position": "POINT(2.6545 48.5264)",
  "distance_km": 12.24,
  "prix_estime": 36600,
  "prix_confirme": true,
  "etat": "conducteur_assigne",
  "conducteur_id": "uuid",
  "created_at": "2025-07-23T09:48:00Z",
  "updated_at": "2025-07-23T09:52:00Z",
  "expires_at": "2025-07-23T11:48:00Z"
}
```

### Nettoyage Automatique
- **Expiration** : Sessions supprimées après 2 heures d'inactivité
- **Nettoyage** : Processus automatique toutes les heures
- **Réinitialisation** : Tapez `"annuler"` ou `"taxi"` pour recommencer

---

## 🔧 Gestion des Erreurs et Cas Particuliers

### Commandes Spéciales
- **`"annuler"`** : Annule la réservation en cours
- **`"taxi"`** : Redémarre une nouvelle réservation (priorité absolue)
- **`"liste"`** : Affiche toutes les destinations disponibles
- **`"aide"`** : Affiche l'aide contextuelle

### Gestion des Erreurs
- **Session expirée** : Invitation à recommencer avec `"taxi"`
- **Aucun conducteur disponible** : Message d'attente et conseil de réessayer
- **Position GPS invalide** : Demande de repartager la position
- **Destination inconnue** : Suggestions et liste complète

### Messages d'Aide Contextuels
- **État `attente_vehicule`** : "Répondez par 'moto' ou 'voiture'"
- **État `vehicule_choisi`** : "Partagez votre position GPS"  
- **État `position_recue`** : "Écrivez votre destination"
- **État `prix_calcule`** : "Répondez 'oui' ou 'non'"

---

## 🌐 Intégration WhatsApp Business API

### Configuration Twilio
- **Webhook URL** : `https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot`
- **Méthode** : POST
- **Format** : application/x-www-form-urlencoded
- **Authentification** : Signatures Twilio (optionnel)

### Types de Messages Gérés
- **Texte** : Messages normaux avec analyse mot-clé
- **Géolocalisation** : Extraction latitude/longitude automatique
- **Audio** : Support futur avec transcription IA

### Format des Réponses
- **Messages simples** : Texte avec emojis pour clarté
- **Listes structurées** : Destinations et options formatées
- **Résumés** : Récapitulatifs de réservation avec tous les détails

---

## 📊 Monitoring et Logs

### Logs Automatiques
- **Requêtes entrantes** : Numéro, message, coordonnées GPS
- **Étapes de traitement** : Changements d'état, calculs de prix
- **Erreurs** : Détails complets pour débogage
- **Performance** : Temps de réponse et requêtes base de données

### Métriques Clés
- **Taux de conversion** : Sessions → Réservations confirmées
- **Temps de réponse** : Latence moyenne du bot
- **Erreurs fréquentes** : Types d'erreurs et résolutions
- **Utilisation** : Répartition moto vs voiture, destinations populaires

### Alertes Automatiques
- **Conducteurs indisponibles** : Notification si < 2 conducteurs disponibles
- **Erreurs critiques** : Échecs de base de données ou API
- **Sessions bloquées** : Sessions restant trop longtemps dans un état

---

## 🔒 Sécurité et Conformité

### Protection des Données
- **Numéros de téléphone** : Normalisés et chiffrés
- **Positions GPS** : Stockage sécurisé en PostGIS
- **Sessions** : Expiration automatique après 2h
- **Logs** : Anonymisation des données sensibles

### Validation des Entrées
- **Numéros de téléphone** : Format international requis
- **Coordonnées GPS** : Validation des plages de valeurs
- **Messages** : Nettoyage et validation des commandes
- **Injections SQL** : Requêtes paramétrées exclusivement

### Limites et Quotas
- **Une session** par numéro de téléphone simultanément
- **Timeout** : 2 minutes maximum par requête
- **Rate limiting** : Protection contre le spam
- **Géofencing** : Services limités à la région configurée

---

## 🚀 Déploiement et Maintenance

### Environnement de Production
- **Plateforme** : Supabase Edge Functions (Deno runtime)
- **Base de données** : PostgreSQL avec extension PostGIS
- **API** : WhatsApp Business via Twilio
- **Monitoring** : Logs temps réel dans Supabase Dashboard

### Procédure de Déploiement
```bash
# 1. Déploiement de la fonction
supabase functions deploy whatsapp-bot

# 2. Mise à jour des tables si nécessaire
psql -f sql/migrations/latest.sql

# 3. Test du webhook Twilio
curl -X POST webhook-url -d "test-payload"

# 4. Vérification des logs
# Dashboard Supabase → Edge Functions → whatsapp-bot → Logs
```

### Maintenance Préventive
- **Nettoyage sessions** : Automatique toutes les heures
- **Mise à jour conducteurs** : Positions et statuts temps réel
- **Sauvegarde données** : Base de données quotidienne
- **Tests fonctionnels** : Scénarios complets hebdomadaires

---

## 📈 Évolutions Futures

### Fonctionnalités Planifiées
- **Transcription audio** : Support des messages vocaux
- **Paiement intégré** : Mobile money et cartes bancaires
- **Tracking temps réel** : Position du conducteur en direct
- **Évaluations** : Système de notes conducteurs/clients
- **Réservations programmées** : À l'avance avec rappels

### Améliorations Techniques
- **IA conversationnelle** : Compréhension langage naturel améliorée
- **Optimisation routes** : Algorithmes de routage avancés
- **Multi-langues** : Support français, anglais, langues locales
- **Analytics avancées** : Tableaux de bord et prédictions
- **API publique** : Intégration avec applications tierces

---

## 📞 Support et Assistance

### Commandes d'Aide
- **`"aide"`** : Affiche l'aide contextuelle selon l'état
- **`"statut"`** : Informations sur la session en cours
- **`"contact"`** : Coordonnées du support client

### Contact Support
- **WhatsApp** : Même numéro que le bot (escalade automatique)
- **Email** : support@lokotaxi.com
- **Téléphone** : +224 XXX XXX XXX (heures bureau)

### Résolution des Problèmes
1. **Session bloquée** : Tapez `"annuler"` puis `"taxi"`
2. **GPS non détecté** : Vérifiez permissions WhatsApp
3. **Conducteur introuvable** : Réessayez dans 5-10 minutes
4. **Prix incorrect** : Vérifiez distance et type de véhicule

---

*Documentation générée le 23 juillet 2025 - Version 1.0*  
*LokoTaxi WhatsApp Bot - Révolution du transport urbain en Afrique* 🚗✨