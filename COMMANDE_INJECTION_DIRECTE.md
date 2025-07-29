# 🚀 INJECTION DIRECTE VIA LIGNE DE COMMANDE

**Problème :** Fichier SQL trop volumineux pour Supabase SQL Editor  
**Solution :** Injection directe via `psql`

---

## 📋 INFORMATIONS DE CONNEXION SUPABASE

```
Host: aws-0-eu-central-1.pooler.supabase.com
Port: 6543
Database: postgres
User: postgres.nmwnibzgvwltipmtwhzo
Password: [VOUS FOURNIREZ]
```

---

## 🔧 MÉTHODE 1 : COMMANDE DIRECTE

**Ouvrir terminal/cmd dans le répertoire :**
```bash
cd C:\Users\diall\Documents\LokoTaxi
```

**Commande d'injection :**
```bash
psql -h aws-0-eu-central-1.pooler.supabase.com -p 6543 -U postgres.nmwnibzgvwltipmtwhzo -d postgres -f guinea_complete_injection.sql
```

**Le système demandera le mot de passe.**

---

## 🔧 MÉTHODE 2 : FICHIER BATCH

**Exécuter le fichier :**
[inject_via_psql.bat](file:///C:/Users/diall/Documents/LokoTaxi/inject_via_psql.bat)

**Actions :**
1. Cliquer sur le lien
2. Exécuter le fichier .bat
3. Entrer le mot de passe quand demandé

---

## ✅ RÉSULTAT ATTENDU

```sql
BEGIN
DELETE 0
INSERT 0 15000
COMMIT
-- Statistiques
 status           | total_adresses_guinee | villes_couvertes
 Injection terminée |       15000          |        6

-- Détail par ville
   ville    | nb_lieux | types_differents
 conakry    |   3200   |       15
 kankan     |   3200   |       12
 nzerekore  |   2300   |       10
 labe       |   1900   |        8
 kindia     |    360   |        6
 boke       |    180   |        5
```

---

## 🚨 PRÉREQUIS

**Installation PostgreSQL client (si pas installé) :**
- Télécharger PostgreSQL depuis postgresql.org
- Ou installer via package manager
- Vérifier : `psql --version`

**Alternative si psql non disponible :**
- Utiliser DBeaver, PgAdmin, ou autre client PostgreSQL
- Importer le fichier SQL via l'interface graphique

---

## 🔍 VÉRIFICATION POST-INJECTION

**Test rapide via Supabase SQL Editor :**
```sql
SELECT COUNT(*) as total_guinee FROM adresses WHERE pays = 'Guinée';
SELECT ville, COUNT(*) FROM adresses WHERE pays = 'Guinée' GROUP BY ville ORDER BY COUNT(*) DESC LIMIT 5;
```

**Test fonction de recherche :**
```sql
SELECT * FROM search_adresses_intelligent('hopital', 'conakry', 5);
```

---

**🎯 Objectif :** Injecter 15,000 lieux Guinée pour recherche intelligente  
**⏱️ Durée :** 2-5 minutes selon connexion