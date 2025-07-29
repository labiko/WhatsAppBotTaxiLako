# 📅 Guide d'Ajout des Colonnes Temporelles

## 🎯 Objectif
Ajouter les colonnes nécessaires pour gérer les réservations planifiées (ex: "demain 14h") dans la table `reservations`.

## 📋 Étapes d'Installation

### 1️⃣ Ouvrir Supabase SQL Editor
1. Allez sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Dans le menu latéral, cliquez sur **SQL Editor**

### 2️⃣ Exécuter le Script SQL

1. **Cliquez sur ce lien pour ouvrir le fichier SQL :**
   [C:\Users\diall\Documents\LokoTaxi\sql\add_temporal_columns_reservations.sql](file:///C:/Users/diall/Documents/LokoTaxi/sql/add_temporal_columns_reservations.sql)

2. **Copiez tout le contenu** (Ctrl+A puis Ctrl+C)

3. **Collez dans l'éditeur SQL** de Supabase

4. **Cliquez sur "RUN"** ou appuyez sur Ctrl+Enter

### 3️⃣ Résultat Attendu

✅ Vous devriez voir le message :
```
"Colonnes temporelles ajoutées avec succès à la table reservations"
```

✅ Les colonnes suivantes ont été ajoutées :
- `date_reservation` (DATE) - La date de la réservation
- `heure_reservation` (INTEGER 0-23) - L'heure 
- `minute_reservation` (INTEGER 0-59) - Les minutes

### 4️⃣ Tester le Bot

Après avoir ajouté les colonnes, testez à nouveau :

1. **Envoyez un message audio** : "Je veux un taxi moto pour demain 14h"
2. **Partagez votre position GPS**
3. **Confirmez avec "oui"**

La réservation devrait maintenant être créée avec :
- `date_reservation` = '2025-07-28' (demain)
- `heure_reservation` = 14
- `minute_reservation` = 0

## ❌ En Cas d'Erreur

Si vous avez une erreur lors de l'exécution du script :

1. **Vérifiez que vous êtes dans le bon projet** Supabase
2. **Vérifiez les logs** dans l'onglet "Logs" de Supabase
3. **Contactez le support** avec le message d'erreur exact

## ✅ Confirmation

Pour vérifier que les colonnes ont été ajoutées :

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'reservations' 
AND column_name LIKE '%reservation%';
```

Vous devriez voir les 3 nouvelles colonnes temporelles.