# 🔍 DIAGNOSTIC COLONNES TABLE ADRESSES

## 📋 COMMANDES DE DIAGNOSTIC

### 1️⃣ VÉRIFICATION STRUCTURE COMPLÈTE
```cmd
cd C:\Users\diall\Documents\LokoTaxi
psql "postgresql://postgres:kZlDbxjn6zGgiuGm@db.nmwnibzgvwltipmtwhzo.supabase.co:5432/postgres" -f analyze_and_fix_table.sql
```

### 2️⃣ VÉRIFICATION SIMPLE
```cmd
psql "postgresql://postgres:kZlDbxjn6zGgiuGm@db.nmwnibzgvwltipmtwhzo.supabase.co:5432/postgres" -f simple_check.sql
```

### 3️⃣ VÉRIFICATION MANUELLE
```cmd
psql "postgresql://postgres:kZlDbxjn6zGgiuGm@db.nmwnibzgvwltipmtwhzo.supabase.co:5432/postgres" -c "\d adresses"
```

---

## 🎯 COLONNES REQUISES POUR INJECTION

Pour que `inject_via_api.js` fonctionne, ces colonnes DOIVENT exister :

| Colonne | Type | Description |
|---------|------|-------------|
| `nom` | VARCHAR | ✅ Existe probablement |
| `nom_normalise` | VARCHAR | ✅ Existe probablement |
| `adresse_complete` | TEXT | ✅ Existe probablement |
| `ville` | VARCHAR | ✅ Existe probablement |
| `position` | GEOGRAPHY | ✅ Existe probablement |
| `type_lieu` | VARCHAR | ✅ Existe probablement |
| `actif` | BOOLEAN | ✅ Existe probablement |
| `source_donnees` | VARCHAR | ❓ À vérifier |
| `telephone` | VARCHAR | ❓ À vérifier |
| `note_moyenne` | DECIMAL(2,1) | ❌ Probablement manquante |
| `metadata` | JSONB | ❌ Probablement manquante |

---

## 🛠️ SOLUTIONS SELON LE DIAGNOSTIC

### Si colonnes manquantes :
1. Exécuter `analyze_and_fix_table.sql`
2. Redémarrer Supabase (Dashboard → Settings → API → Restart)
3. Retester `inject_via_api.js`

### Si cache PostgREST bloqué :
1. Aller sur Dashboard Supabase
2. Settings → API
3. Cliquer "Restart API server"
4. Attendre 1-2 minutes
5. Retester

### Si injection échoue encore :
Créer version simplifiée sans `note_moyenne` et `metadata`

---

## 📊 RÉSULTATS ATTENDUS

Après correction, la commande doit afficher :
```
✅ note_moyenne ajoutée
✅ metadata ajoutée
✅ source_donnees ajoutée
✅ telephone ajoutée
```

Et l'injection doit réussir avec :
```
✅ Batch 1 injecté avec succès
✅ Batch 2 injecté avec succès
...
🎯 2LK RESTAURANT trouvé !
```

---

*Diagnostic créé le 30/07/2025*