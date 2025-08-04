# 🔍 GUIDE EXTRACTION STRUCTURE BASE DE DONNÉES

## 🎯 **OBJECTIF**
Extraire la structure complète de votre base de données LokoTaxi pour analyser et adapter le système commission.

## 📋 **3 MÉTHODES ALTERNATIVES**

---

## 🥇 **MÉTHODE 1: PG_DUMP (RECOMMANDÉE)**

### **Script PowerShell**
**[extract_structure_powershell.ps1](file:///C:/Users/diall/Documents/LokoTaxi/extract_structure_powershell.ps1)**

### **Actions :**
1. **Ouvrir le fichier** en cliquant sur le lien
2. **Modifier la ligne 15** : Remplacer `VOTRE_PASSWORD_SUPABASE` par votre vrai mot de passe
3. **Sauvegarder** le fichier
4. **Clic droit** sur le fichier → "Exécuter avec PowerShell"
5. **Résultat** : Fichier `lokotaxi_structure_dump.sql` généré

### **Avantages :**
✅ **Structure 100% complète** (tables, vues, fonctions, index)  
✅ **Format SQL standard** réutilisable  
✅ **Très rapide** (quelques secondes)  
✅ **Aucune limitation** de taille  

---

## 🥈 **MÉTHODE 2: SUPABASE DASHBOARD (SIMPLE)**

### **Actions :**
1. **Aller sur** https://supabase.com/dashboard
2. **Se connecter** à votre projet
3. **Database** → **Backups** → **Create backup**
4. **Cocher "Schema only"** (pas de données)
5. **Download** le fichier `.sql` généré

### **Avantages :**
✅ **Très simple** - interface graphique  
✅ **Pas d'installation** requise  
✅ **Authentification automatique**  

---

## 🥉 **MÉTHODE 3: EXPORT MANUEL TABLES**

### **Si les méthodes 1 et 2 ne marchent pas :**

#### **Étape 1 : Lister les tables**
```sql
-- Exécuter dans Supabase SQL Editor
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

#### **Étape 2 : Pour chaque table importante, exécuter :**
```sql
-- Remplacer 'NOM_TABLE' par le nom réel
SELECT 
    'CREATE TABLE IF NOT EXISTS ' || table_name || ' (' ||
    string_agg(
        column_name || ' ' || 
        CASE 
            WHEN data_type = 'character varying' THEN 'VARCHAR(' || character_maximum_length || ')'
            WHEN data_type = 'USER-DEFINED' AND udt_name = 'geography' THEN 'GEOGRAPHY(POINT, 4326)'
            ELSE UPPER(data_type)
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
        ', '
    ) || ');' as create_table_sql
FROM information_schema.columns 
WHERE table_name = 'NOM_TABLE' AND table_schema = 'public'
GROUP BY table_name;
```

#### **Tables prioritaires à analyser :**
- `adresses`
- `conducteurs` 
- `entreprises` (si existe)
- `sessions`
- `reservations`
- `tarifs`

---

## 🎯 **ANALYSE DES RÉSULTATS**

### **Une fois la structure extraite, chercher :**

**1. Table `entreprises` :**
- ✅ **Existe** → Utiliser le script de mise à jour
- ❌ **Manque** → Créer complètement

**2. Colonnes importantes :**
- `conducteurs.entreprise_id` (lien facultatif entreprise)
- `reservations.commission_*` (colonnes commission)
- Tables de commission existantes

**3. Contraintes existantes :**
- Foreign keys vers entreprises
- Contraintes CHECK sur les commissions
- Index de performance

---

## 📊 **VOTRE STRUCTURE ACTUELLE**

D'après l'analyse précédente :
- **10 tables** principales
- **14 vues** optimisées  
- **366 fonctions** (incluant PostGIS)
- **56 index** de performance

### **Tables probablement présentes :**
- `adresses` ✅ (destinations)
- `conducteurs` ✅ (chauffeurs)
- `sessions` ✅ (WhatsApp)
- `reservations` ✅ (réservations)
- `tarifs` ✅ (prix)
- `notifications_pending` ✅ (notifications)
- `parametres` ✅ (configuration)

### **À vérifier :**
- Table `entreprises` existe ?
- Colonne `conducteurs.entreprise_id` existe ?
- Système commission déjà en place ?

---

## 🚀 **PROCHAINES ÉTAPES**

### **Après extraction :**

1. **Analyser** la structure extraite
2. **Identifier** les éléments manquants pour le système commission
3. **Adapter** le script `create_table_entreprises_v2_commission_parametrable.sql`
4. **Tester** sur environnement de développement
5. **Déployer** en production

---

## ⚠️ **IMPORTANT**

### **Informations requises :**
- **Host Supabase** : `nmwnibzgvwltipmtwhzo.supabase.co` (déjà configuré)
- **Mot de passe Supabase** : À récupérer dans Dashboard → Settings → Database
- **Port** : 5432 (standard PostgreSQL)

### **Sécurité :**
- Ne jamais committer les mots de passe
- Utiliser des variables d'environnement en production
- Tester d'abord sur un environnement de dev

---

**🎯 OBJECTIF FINAL :** Avoir la structure complète pour adapter parfaitement le système commission à votre base existante !