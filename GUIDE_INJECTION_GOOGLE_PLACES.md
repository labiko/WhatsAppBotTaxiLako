# 🚀 GUIDE D'INJECTION GOOGLE PLACES DANS SUPABASE

## 📊 RÉSUMÉ DE L'EXTRACTION
- **2,877 lieux extraits** de Google Places API
- **2LK RESTAURANT-LOUNGE TROUVÉ** ✅
- **Fichier SQL :** `conakry_google_grid_2025-07-30T15-23-17-434Z.sql`
- **Taille :** ~2.5 MB

## 🛠️ ÉTAPES D'INJECTION

### ÉTAPE 1 : OUVRIR SUPABASE SQL EDITOR
1. Aller sur : https://supabase.com/dashboard
2. Sélectionner votre projet LokoTaxi
3. Menu latéral → **SQL Editor**

### ÉTAPE 2 : PRÉPARER LA TABLE
Exécuter d'abord ce script pour s'assurer que la colonne metadata existe :

```sql
-- Ajouter colonne metadata si elle n'existe pas
ALTER TABLE adresses 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Vérifier la structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'adresses' 
ORDER BY ordinal_position;
```

### ÉTAPE 3 : INJECTION DES DONNÉES

#### Option A : Copier-Coller Direct (Recommandé pour 2,877 lignes)
1. Ouvrir le fichier : [C:\Users\diall\Documents\LokoTaxi\conakry_google_grid_2025-07-30T15-23-17-434Z.sql](file:///C:/Users/diall/Documents/LokoTaxi/conakry_google_grid_2025-07-30T15-23-17-434Z.sql)
2. Sélectionner tout (Ctrl+A)
3. Copier (Ctrl+C)
4. Coller dans SQL Editor
5. Cliquer **RUN**

#### Option B : Injection Par Lots (Si erreur timeout)
Si le fichier est trop gros, diviser en 3 parties :

**Partie 1 : Lignes 1-1000**
```sql
-- Copier depuis le début jusqu'à la ligne ~1000
```

**Partie 2 : Lignes 1001-2000**
```sql
-- Copier les INSERT suivants
```

**Partie 3 : Lignes 2001-fin + Vérifications**
```sql
-- Copier le reste + les requêtes de vérification
```

### ÉTAPE 4 : VÉRIFICATIONS POST-INJECTION

Exécuter ces requêtes pour vérifier :

```sql
-- 1. Compter les nouvelles entrées
SELECT COUNT(*) as total_google_places
FROM adresses 
WHERE source_donnees = 'google_places_grid_search';

-- 2. Vérifier 2LK RESTAURANT
SELECT * FROM adresses 
WHERE nom ILIKE '%2LK%';

-- 3. Statistiques par type
SELECT 
    type_lieu,
    COUNT(*) as nombre,
    ROUND(AVG(note_moyenne), 2) as note_moyenne
FROM adresses 
WHERE source_donnees = 'google_places_grid_search'
GROUP BY type_lieu
ORDER BY nombre DESC;

-- 4. Top 10 restaurants par note
SELECT nom, note_moyenne, telephone, adresse_complete
FROM adresses 
WHERE type_lieu = 'restaurant' 
  AND source_donnees = 'google_places_grid_search'
  AND note_moyenne > 0
ORDER BY note_moyenne DESC
LIMIT 10;
```

## ✅ RÉSULTATS ATTENDUS

Après injection, vous devriez avoir :
- **~2,877 nouveaux lieux** dans la table `adresses`
- **2LK RESTAURANT-LOUNGE** disponible pour le bot
- **Couverture complète** de Conakry

## 🎯 TEST FINAL AVEC LE BOT

Tester avec WhatsApp :
1. "taxi"
2. "moto" 
3. [Partager position]
4. "2LK" ou "restaurant lounge"
5. Bot devrait proposer **2LK RESTAURANT-LOUNGE**

## ⚠️ EN CAS D'ERREUR

### Erreur "column metadata does not exist"
→ Exécuter d'abord l'ajout de colonne (Étape 2)

### Erreur "duplicate key"
→ Normal, les conflits sont gérés par ON CONFLICT

### Erreur timeout
→ Utiliser l'Option B (injection par lots)

## 📞 SUPPORT
En cas de problème, partager le message d'erreur exact.