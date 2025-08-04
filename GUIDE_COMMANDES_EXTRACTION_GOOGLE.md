# 🚀 GUIDE RAPIDE - COMMANDES EXTRACTION GOOGLE PLACES

## 📋 COMMANDES À EXÉCUTER DANS L'ORDRE

### 1️⃣ PRÉPARATION ENVIRONNEMENT
```bash
# Ouvrir terminal dans le dossier projet
cd C:\Users\diall\Documents\LokoTaxi

# Installer les dépendances
npm install axios
```

### 2️⃣ CONFIGURATION CLÉ API
```bash
# Éditer le fichier pour ajouter votre clé API
notepad google_places_grid_search.js

# Remplacer la ligne 12 :
# const GOOGLE_API_KEY = 'VOTRE_CLE_API_ICI';
# Par :
# const GOOGLE_API_KEY = 'AIzaSyBGDz5BJkcTLY3x_96x8xuTxa7Gxd7BN6M';
```

### 3️⃣ EXTRACTION TEST (OPTIONNEL)
```bash
# Test avec budget limité (20 lieux par type)
node google_places_extractor_budget.js

# Résultat attendu : ~184 lieux, coût ~$7
```

### 4️⃣ EXTRACTION COMPLÈTE
```bash
# Extraction exhaustive par quadrillage
node google_places_grid_search.js

# Durée : ~8-10 minutes
# Résultat : ~2,877 lieux
# Coût : ~$114
```

### 5️⃣ VÉRIFICATION 2LK
```bash
# Windows PowerShell
Select-String -Pattern "2LK" -Path "conakry_google_grid_*.json"

# OU avec Git Bash
grep -i "2LK" conakry_google_grid_*.json
```

### 6️⃣ PRÉPARATION INJECTION SUPABASE
```bash
# Ouvrir le fichier SQL généré
notepad conakry_google_grid_2025-07-30T15-23-17-434Z.sql

# Copier tout le contenu (Ctrl+A, Ctrl+C)
```

---

## 🔧 SCRIPTS DISPONIBLES

| Fichier | Description | Lieux | Coût |
|---------|-------------|-------|------|
| `google_places_extractor_budget.js` | Test budget $300 | ~200 | ~$7 |
| `google_places_extractor_complete.js` | Extraction avec pagination | ~800 | ~$25 |
| `google_places_grid_search.js` | **Quadrillage exhaustif** | **~3000** | **~$115** |

---

## 📊 PARAMÈTRES PERSONNALISABLES

### Dans `google_places_grid_search.js` :

```javascript
// Zone géographique (ligne 17-22)
const CONAKRY_BOUNDS = {
    north: 9.75,    // Modifier pour votre ville
    south: 9.35,
    east: -13.45,
    west: -13.85
};

// Taille de la grille (ligne 25)
const GRID_SIZE = 0.05; // Réduire pour plus de précision

// Types de lieux (ligne 29)
const PLACE_TYPES = [
    'restaurant', 'hospital', // Ajouter vos types
];

// Recherches textuelles (ligne 36)
const TEXT_SEARCHES = [
    '2LK', 'restaurant chinois', // Ajouter vos recherches
];
```

---

## ⚡ COMMANDES RAPIDES COPIER-COLLER

### Installation + Extraction Complète
```bash
cd C:\Users\diall\Documents\LokoTaxi && npm install axios && node google_places_grid_search.js
```

### Vérification Résultats
```bash
dir conakry_google_grid_*.* && findstr /I "2LK" conakry_google_grid_*.sql
```

---

## 🎯 RÉSULTATS ATTENDUS

Après exécution complète :
- ✅ Fichier JSON : `conakry_google_grid_[timestamp].json` (~8 MB)
- ✅ Fichier SQL : `conakry_google_grid_[timestamp].sql` (~2.5 MB)
- ✅ 2LK RESTAURANT trouvé dans les données
- ✅ ~2,877 lieux avec détails complets

---

## ❌ TROUBLESHOOTING

### "Cannot find module 'axios'"
```bash
npm install axios
```

### "Invalid API key"
- Vérifier la clé dans Google Cloud Console
- Activer Places API dans le projet

### "OVER_QUERY_LIMIT"
- Attendre 24h ou utiliser une nouvelle clé
- Vérifier la facturation Google Cloud

### Script s'arrête prématurément
- Vérifier la connexion internet
- Relancer (les doublons sont gérés)

---

## 📞 COMMANDE SUPPORT
```bash
# Afficher les logs d'erreur
node google_places_grid_search.js 2> error.log
type error.log
```

---

*Guide créé le 30/07/2025 - Extraction réussie de 2,877 lieux incluant 2LK RESTAURANT*