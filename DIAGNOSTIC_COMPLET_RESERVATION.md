# 🔍 **GUIDE DIAGNOSTIC COMPLET - Erreur Sauvegarde Réservation**

## 📋 **ORDRE D'EXÉCUTION DES SCRIPTS**

### **1. Structure et Contraintes**
```sql
-- Exécuter dans Supabase SQL Editor
\i debug_reservations_structure.sql
```
**Objectif :** Vérifier la structure de la table et les contraintes

### **2. Session Utilisateur**  
```sql
-- Exécuter dans Supabase SQL Editor
\i debug_session_utilisateur.sql
```
**Objectif :** Analyser la session de l'utilisateur problématique

### **3. Réservations Récentes**
```sql
-- Exécuter dans Supabase SQL Editor  
\i debug_reservations_recentes.sql
```
**Objectif :** Vérifier les tentatives de réservation récentes

### **4. Test Insertion Manuelle**
```sql
-- Exécuter dans Supabase SQL Editor
\i test_insertion_reservation.sql
```
**Objectif :** Reproduire l'erreur avec les mêmes données

### **5. Conducteurs Disponibles**
```sql
-- Exécuter dans Supabase SQL Editor
\i debug_conducteurs_disponibles.sql  
```
**Objectif :** Vérifier la disponibilité des conducteurs

### **6. Contraintes et Erreurs**
```sql
-- Exécuter dans Supabase SQL Editor
\i debug_contraintes_erreurs.sql
```
**Objectif :** Identifier les contraintes qui pourraient échouer

## 🎯 **CAUSES PROBABLES À VÉRIFIER**

### **1. Contraintes de base de données**
- ✅ Type véhicule autorisé (`moto` vs enum)
- ✅ Statut autorisé (`pending` vs enum)  
- ✅ Format coordonnées GPS (PostGIS geometry)
- ✅ Contraintes NOT NULL

### **2. Clés étrangères**
- ⚠️ `conducteur_id` (peut être NULL au début)
- ⚠️ Référence vers table `conducteurs`

### **3. Formats de données**
- ⚠️ Prix négatif ou NULL
- ⚠️ Distance négative ou NULL
- ⚠️ Coordonnées GPS mal formatées

### **4. Permissions et limites** 
- ⚠️ Permissions Edge Function
- ⚠️ Timeout de requête
- ⚠️ Limite d'espace disque

## 📊 **RÉSULTATS ATTENDUS**

### **✅ Si structure OK :**
- Table exists avec colonnes correctes
- Contraintes définies
- Index présents

### **❌ Si erreur de contrainte :**
- Violation CHECK constraint  
- Violation FOREIGN KEY
- Violation NOT NULL

### **❌ Si erreur de format :**
- Géométrie PostGIS invalide
- Type de données incorrect
- Valeur enum non autorisée

## 🚨 **ACTIONS SELON RÉSULTATS**

### **Erreur contrainte → Modifier les données**
### **Erreur structure → Migrer la table**  
### **Erreur permissions → Ajuster les rôles**
### **Erreur géométrie → Corriger le format PostGIS**

---

**📝 INSTRUCTIONS :**
1. Exécutez les scripts dans l'ordre
2. Copiez les résultats avec erreurs
3. Identifiez la cause exacte
4. Appliquez le correctif approprié