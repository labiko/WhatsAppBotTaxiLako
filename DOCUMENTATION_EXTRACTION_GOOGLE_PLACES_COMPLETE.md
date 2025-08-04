# 📊 DOCUMENTATION COMPLÈTE - EXTRACTION GOOGLE PLACES API CONAKRY

## 🎯 VUE D'ENSEMBLE

Cette documentation détaille le processus complet d'extraction de **TOUS** les lieux de Conakry depuis Google Places API, incluant la découverte du restaurant **2LK RESTAURANT-LOUNGE**.

### 📈 Résultats Finaux
- **2,877 lieux extraits** avec détails complets
- **2LK RESTAURANT-LOUNGE TROUVÉ** ✅
- **Couverture exhaustive** de Conakry et environs
- **Coût total : $113.82** (sur $300 de crédit gratuit)

---

## 🛠️ PRÉREQUIS

### 1. Compte Google Cloud
- Créer un compte sur https://console.cloud.google.com/
- Activer le crédit gratuit de $300
- Créer un nouveau projet

### 2. APIs à Activer
- **Places API**
- **Places API (New)**

### 3. Dépendances Node.js
```bash
npm install axios
```

---

## 📋 ÉTAPES D'EXTRACTION

### ÉTAPE 1 : Configuration Google Cloud

#### 1.1 Créer le Projet
```
1. Aller sur https://console.cloud.google.com/
2. Cliquer "Nouveau Projet"
3. Nom : "LokoTaxi-Places"
4. Créer
```

#### 1.2 Activer les APIs
```
1. Menu → APIs & Services → Library
2. Rechercher "Places API" → Enable
3. Rechercher "Places API (New)" → Enable
```

#### 1.3 Créer la Clé API
```
1. Menu → APIs & Services → Credentials
2. Create Credentials → API Key
3. Copier la clé générée
4. (Optionnel) Restreindre à Places API
```

### ÉTAPE 2 : Installation des Dépendances

```bash
# Se placer dans le dossier du projet
cd C:\Users\diall\Documents\LokoTaxi

# Installer axios
npm install axios
```

### ÉTAPE 3 : Extraction Initiale (Test Budget)

#### 3.1 Configuration du Script
Éditer `google_places_extractor_budget.js` :
```javascript
const GOOGLE_API_KEY = 'VOTRE_CLE_API_ICI';
```

#### 3.2 Lancer l'Extraction Test
```bash
node google_places_extractor_budget.js
```

**Résultat :** 184 lieux, coût $7.34

### ÉTAPE 4 : Extraction Complète par Quadrillage

#### 4.1 Stratégie de Quadrillage
Le script `google_places_grid_search.js` utilise :
- **Grille de 0.05° × 0.05°** (environ 5.5km par cellule)
- **64 points de recherche** couvrant tout Conakry
- **Rayon de 4km** par point avec chevauchement
- **19 types de lieux** différents
- **34 recherches textuelles** spécifiques

#### 4.2 Lancer l'Extraction Complète
```bash
node google_places_grid_search.js
```

#### 4.3 Monitoring en Temps Réel
Le script affiche :
```
📍 Recherche type: restaurant
💰 Budget: $268.04
   Zone 10/64: 0 restaurant(s) trouvé(s)
   Zone 20/64: 4 restaurant(s) trouvé(s)
   Zone 30/64: 31 restaurant(s) trouvé(s)
   ...
✅ Total restaurant: 221 lieux uniques
```

---

## 📊 STRUCTURE DES DONNÉES EXTRAITES

### Format JSON
```json
{
  "place_id": "ChIJxxxxxx",
  "name": "2LK RESTAURANT-LOUNGE",
  "geometry": {
    "location": {
      "lat": 9.625803399999999,
      "lng": -13.6215385
    }
  },
  "details": {
    "formatted_address": "J9GH+89G, Conakry, Guinée",
    "formatted_phone_number": "621 62 88 65",
    "rating": 4.8,
    "user_ratings_total": 39,
    "types": ["restaurant", "food", "establishment"]
  },
  "search_zone": "Zone_9.60_-13.65",
  "search_method": "text"
}
```

### Format SQL Généré
```sql
INSERT INTO adresses (
    nom, nom_normalise, adresse_complete, ville, position, type_lieu, 
    actif, popularite, source_donnees, telephone, site_web, note_moyenne,
    metadata
) VALUES (
    '2LK RESTAURANT-LOUNGE',
    '2lk restaurant lounge',
    'J9GH+89G, Conakry, Guinée',
    'conakry',
    ST_GeogFromText('POINT(-13.6215385 9.625803399999999)'),
    'restaurant',
    true,
    97,
    'google_places_grid_search',
    '621 62 88 65',
    '',
    4.8,
    '{"zone": "Zone_9.60_-13.65", "method": "text", "ratings": 39}'
) ON CONFLICT (nom, ville) DO UPDATE SET ...
```

---

## 📈 STATISTIQUES D'EXTRACTION

### Par Type de Lieu
| Type | Nombre | Exemples |
|------|--------|----------|
| École | 260 | Université, Lycée, École primaire |
| Mosquée | 227 | Grande Mosquée, Mosquées de quartier |
| Hôtel | 225 | Hôtels, Lodges, Auberges |
| Restaurant | 221 | Restaurants, Fast-food, Cafés |
| Magasin | 221 | Boutiques, Commerces |
| Bar | 178 | Bars, Lounges, Pubs |
| Station-service | 172 | Total, Shell, etc. |
| Pharmacie | 147 | Pharmacies, Parapharmacies |
| Centre commercial | 142 | Marchés, Centres commerciaux |
| Garage | 139 | Réparation auto, Mécaniciens |

### Par Zone Géographique
| Zone | Lieux | Coordonnées Centre |
|------|-------|-------------------|
| Zone_9.60_-13.65 | 293 | Centre Conakry |
| Zone_9.50_-13.70 | 271 | Sud-Ouest |
| Zone_9.65_-13.60 | 262 | Nord-Est |
| Zone_9.60_-13.60 | 247 | Est |
| Zone_9.55_-13.65 | 241 | Centre-Ouest |

### Recherches Textuelles Spécifiques
- **"2LK"** : 1 résultat → 2LK RESTAURANT-LOUNGE ✅
- **"lounge Conakry"** : 20 résultats
- **"restaurant chinois"** : 20 résultats
- **"poulet braisé"** : 20 résultats
- **"attieké poisson"** : 1 résultat

---

## 💰 ANALYSE DES COÛTS

### Détail des Coûts
| Opération | Prix Unitaire | Quantité | Coût Total |
|-----------|---------------|----------|------------|
| Nearby Search | $0.017 | 1,266 | $21.52 |
| Text Search | $0.032 | 34 | $1.09 |
| Place Details | $0.032 | 2,877 | $92.06 |
| **TOTAL** | - | - | **$113.82** |

### Budget Restant
- Crédit initial : $300.00
- Utilisé : $113.82
- **Restant : $186.18**

### Coût par Lieu
- **$0.0396 par lieu** avec détails complets

---

## 📁 FICHIERS GÉNÉRÉS

### 1. Données Brutes JSON
**Fichier :** `conakry_google_grid_2025-07-30T15-23-17-434Z.json`
- Taille : ~8 MB
- Format : JSON array avec tous les détails
- Contient : 2,877 lieux avec métadonnées complètes

### 2. Script SQL d'Injection
**Fichier :** `conakry_google_grid_2025-07-30T15-23-17-434Z.sql`
- Taille : ~2.5 MB
- Format : INSERT SQL avec gestion des conflits
- Contient : 2,877 INSERT + requêtes de vérification

### 3. Logs et Statistiques
- Durée d'extraction : 8.6 minutes
- Requêtes API : ~3,000
- Taux de succès : 100%

---

## 🔍 VÉRIFICATION 2LK RESTAURANT

### Données Extraites pour 2LK
```
Nom : 2LK RESTAURANT-LOUNGE
Téléphone : 621 62 88 65
Adresse : J9GH+89G, Conakry, Guinée
Coordonnées : 9.625803°N, -13.621539°E
Note : 4.8/5 (39 avis)
Type : Restaurant
Méthode de découverte : Recherche textuelle "2LK"
```

### Confirmation dans les Fichiers
```bash
# Vérifier dans JSON
grep -i "2LK" conakry_google_grid_2025-07-30T15-23-17-434Z.json

# Vérifier dans SQL
grep -i "2LK" conakry_google_grid_2025-07-30T15-23-17-434Z.sql
```

---

## 🚀 INJECTION DANS SUPABASE

### Prérequis Base de Données
```sql
-- Vérifier/Créer la colonne metadata
ALTER TABLE adresses 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
```

### Commande d'Injection
```bash
# Option 1 : Via SQL Editor Supabase
# Copier-coller le contenu du fichier SQL

# Option 2 : Via psql (si configuré)
psql -h YOUR_SUPABASE_HOST -U postgres -d postgres -f conakry_google_grid_2025-07-30T15-23-17-434Z.sql
```

### Vérifications Post-Injection
```sql
-- Total injecté
SELECT COUNT(*) FROM adresses 
WHERE source_donnees = 'google_places_grid_search';

-- Vérifier 2LK
SELECT * FROM adresses 
WHERE nom ILIKE '%2LK%';

-- Top restaurants
SELECT nom, note_moyenne, telephone 
FROM adresses 
WHERE type_lieu = 'restaurant' 
ORDER BY note_moyenne DESC 
LIMIT 10;
```

---

## 🎯 OPTIMISATIONS FUTURES

### 1. Extraction Continue
- Récupérer le budget restant ($186.18)
- Extraire zones périphériques (Coyah, Dubréka)
- Recherches plus spécifiques par quartier

### 2. Mise à Jour Périodique
- Script de mise à jour mensuelle
- Détection nouveaux lieux
- Mise à jour notes et informations

### 3. Enrichissement des Données
- Photos des lieux (API Photos)
- Horaires d'ouverture détaillés
- Menus pour restaurants

---

## 📞 SUPPORT ET DÉPANNAGE

### Erreurs Courantes

#### "Invalid API key"
→ Vérifier la clé dans Google Cloud Console

#### "OVER_QUERY_LIMIT"
→ Quota dépassé, attendre ou augmenter quota

#### "REQUEST_DENIED"
→ Activer Places API dans le projet

#### "Timeout" lors de l'extraction
→ Relancer, le script reprend où il s'est arrêté

### Logs et Debugging
- Tous les logs sont affichés en temps réel
- Rechercher les patterns "❌ Erreur" pour identifier les problèmes
- Vérifier le budget restant régulièrement

---

## 📋 CHECKLIST FINALE

- [x] Compte Google Cloud créé
- [x] APIs Places activées
- [x] Clé API configurée
- [x] Dépendances installées
- [x] Extraction test réussie (184 lieux)
- [x] Extraction complète réussie (2,877 lieux)
- [x] 2LK RESTAURANT trouvé
- [x] Fichiers JSON et SQL générés
- [ ] Injection dans Supabase
- [ ] Tests avec le bot WhatsApp

---

## 🏆 CONCLUSION

L'extraction Google Places par quadrillage a permis de récupérer **2,877 lieux** de Conakry, incluant le fameux **2LK RESTAURANT-LOUNGE**. Cette base de données enrichie permettra au bot taxi d'avoir une couverture exhaustive de la ville.

**Coût total : $113.82** pour une valeur inestimable de données locales.

---

*Documentation créée le 30/07/2025*