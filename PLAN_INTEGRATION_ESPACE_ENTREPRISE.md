# 🏢 PLAN D'INTÉGRATION - ESPACE ENTREPRISE LOKOTAXI

## 📋 **CONTEXTE GLOBAL DU PROJET**

### **🎯 Objectif Principal**
**Intégrer un espace entreprise** dans l'application mobile LokoTaxi existante en ajoutant :
- 🔄 **Page de sélection** : Choix "Conducteur" ou "Entreprise" au démarrage
- 🏢 **Espace entreprise complet** : Dashboard, gestion flotte, analytics
- 🔗 **Intégration harmonieuse** avec l'app conducteur existante

### **🏗️ Architecture Actuelle (EXISTANTE)**
- ✅ **App mobile conducteur** : Complètement développée et fonctionnelle
- ✅ **Bot WhatsApp** : Interface client pour réservations (Deno + Supabase Edge Functions)
- ✅ **Base de données** : PostgreSQL + PostGIS avec tables complètes
- ✅ **Workflow opérationnel** : Client WhatsApp → Bot → Conducteur → Validation

### **🎯 Objectif de Claude**
**Intégrer UNIQUEMENT l'espace entreprise** dans l'app existante :
1. ✅ **Interface conducteur** : App mobile (EXISTANTE - ne pas toucher)
2. 🆕 **Page sélection** : "Conducteur" ou "Entreprise" (NOUVELLE)
3. 🆕 **Interface entreprise** : Dashboard complet (NOUVELLE - focus principal)

---

## 🗄️ **PHASE 1 : STRUCTURE BASE DE DONNÉES**

### **📊 État Actuel Analysé**

**✅ Table `entreprises` existante :**
```sql
CREATE TABLE public.entreprises (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom character varying NOT NULL,
  siret character varying UNIQUE,
  adresse text,
  telephone character varying UNIQUE,
  email character varying,
  responsable character varying,
  password_hash character varying,
  actif boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

**✅ Table `conducteurs` avec liaison :**
```sql
-- Colonne entreprise_id déjà présente
entreprise_id uuid REFERENCES entreprises(id)
```

**✅ Table `reservations` avec code validation :**
```sql
-- Colonnes validation déjà présentes
code_validation character varying,
date_code_validation timestamp with time zone,
-- Nouvelles colonnes ajoutées
depart_nom TEXT,
depart_id UUID,
destination_position GEOGRAPHY(POINT, 4326)
```

### **🔧 Extensions Base de Données Requises**

**1️⃣ Enrichissement table `entreprises` :**
```sql
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS
  -- Informations business
  logo_url text,
  site_web text,
  secteur_activite varchar(100),
  taille_flotte integer DEFAULT 0,
  
  -- Configuration métier
  commission_rate numeric(5,2) DEFAULT 15.00, -- % commission LokoTaxi
  tarif_km_moto numeric(8,2) DEFAULT 1500, -- GNF par km
  tarif_km_voiture numeric(8,2) DEFAULT 2000, -- GNF par km
  tarif_minimum numeric(8,2) DEFAULT 5000, -- Course minimum GNF
  
  -- Dashboard & API
  api_key varchar(64) UNIQUE, -- Pour accès API
  webhook_url text, -- Notifications entreprise
  
  -- Paramètres dashboard
  dashboard_config jsonb DEFAULT '{}',
  derniere_connexion timestamp,
  
  -- Facturation
  mode_facturation varchar(20) DEFAULT 'monthly', -- monthly/weekly/daily
  jour_facturation integer DEFAULT 1, -- 1-31 pour monthly
  
  -- Statut avancé
  statut varchar(20) DEFAULT 'active'; -- active/suspended/trial
```

---

## 🔐 **PHASE 2 : SYSTÈME D'AUTHENTIFICATION**

### **🎯 Architecture JWT + Sessions**

**📝 Workflow Auth :**
1. **Login** : email/password → JWT token (24h)
2. **Refresh** : Auto-refresh avant expiration
3. **Logout** : Blacklist token côté serveur
4. **Sécurité** : Rate limiting + IP tracking

**🔧 Endpoints Auth API :**
```typescript
POST /api/entreprise/auth/login
POST /api/entreprise/auth/refresh  
POST /api/entreprise/auth/logout
GET  /api/entreprise/auth/profile
PUT  /api/entreprise/auth/profile
```

---

## 📊 **PHASE 3 : API BACKEND DASHBOARD**

### **🏗️ Architecture API REST**

**📂 Structure recommandée :**
```
/api/entreprise/
├── auth/           # Authentification
├── dashboard/      # Métriques générales
├── conducteurs/    # Gestion flotte
├── reservations/   # Historique courses
├── analytics/      # Rapports détaillés
├── facturation/    # Données financières
└── notifications/  # Alertes temps réel
```

### **🔄 Endpoints Principaux**

**1️⃣ Dashboard Vue d'Ensemble :**
```typescript
GET /api/entreprise/dashboard/overview
// Retourne métriques quotidiennes, hebdomadaires, mensuelles
// CA brut/net, nombre courses, conducteurs actifs, notes
```

**2️⃣ Gestion Conducteurs :**
```typescript
GET /api/entreprise/conducteurs
GET /api/entreprise/conducteurs/:id/stats
PUT /api/entreprise/conducteurs/:id/status
```

**3️⃣ Réservations & Validation :**
```typescript
GET /api/entreprise/reservations
PUT /api/entreprise/reservations/:id/validate
// Body: { code_validation: "ABC123" }
```

---

## 🎨 **PHASE 4 : INTERFACE MOBILE (INTÉGRATION APP EXISTANTE)**

### **📱 Architecture App Mobile Existante**

**⚠️ IMPORTANT : L'application conducteur est DÉJÀ fonctionnelle - NE PAS MODIFIER**

**🔄 Modifications Requises :**
1. **Page d'accueil** : Ajouter sélection "Conducteur" / "Entreprise"
2. **Routing** : Nouvelles routes espace entreprise uniquement
3. **Navigation** : Stack séparée pour entreprise
4. **Auth** : Système auth entreprise indépendant

### **📱 Stack Technique (Basé sur l'Existant)**

**Framework** : React Native (assumé - s'adapter selon app existante)
**Navigation** : React Navigation (ou équivalent existant)
**State** : Redux/Context (réutiliser pattern existant)
**UI** : Style cohérent avec app conducteur existante
**Charts** : Victory Native ou React Native Chart Kit

### **📱 Flow d'Intégration App Mobile**

**🔄 Page Sélection (NOUVELLE) :**
```
+----------------------------------+
|         LokoTaxi Logo            |
|                                  |
|     Choisissez votre espace :    |
|                                  |
| +------------------------------+ |
| |        🚗 CONDUCTEUR         | |
| |   Gérer mes courses          | |
| +------------------------------+ |
|                                  |
| +------------------------------+ |
| |       🏢 ENTREPRISE          | |
| |   Dashboard & Gestion        | |
| +------------------------------+ |
+----------------------------------+
```

**📱 Navigation Entreprise (NOUVELLE) :**
```
Enterprise Stack:
├── 🏠 Dashboard - Vue d'ensemble
├── 👥 Conducteurs - Gestion flotte  
├── 📊 Analytics - Rapports détaillés
├── 💰 Finances - CA & facturation
├── ⚙️ Paramètres - Config
└── 🚪 Déconnexion
```

---

## 📈 **ROADMAP IMPLÉMENTATION**

### **🗓️ Planning Recommandé (8 semaines) - INTÉGRATION APP EXISTANTE**

**📅 Semaines 1-2 : Analyse & Extensions DB**
- 🔍 **Analyse app conducteur existante** (structure, patterns, libs)
- 🗄️ **Extensions base de données** uniquement (nouvelles tables entreprise)
- 🔗 **APIs entreprise** (réutiliser infrastructure existante)

**📅 Semaines 3-4 : Page Sélection & Auth Entreprise**
- 🔄 **Modification page d'accueil** : Ajout sélection Conducteur/Entreprise
- 🔐 **Système auth entreprise** (pattern similaire conducteur)
- 🧭 **Navigation entreprise** (stack séparée)

**📅 Semaines 5-6 : Interface Entreprise Core**
- 📊 **Dashboard principal** (métriques, graphiques)
- 👥 **Gestion conducteurs** (liste, statuts, stats)
- 📝 **Historique réservations** (avec validation)

**📅 Semaines 7-8 : Finalisations & Tests**
- 💰 **Module finances** (CA, commissions)
- 🔔 **Notifications** (réutiliser système existant)
- 🧪 **Tests intégration** avec app conducteur
- 🚀 **Déploiement stores** (mise à jour app existante)

---

## 📞 **CONTEXTE POUR CLAUDE (AUTRE PROJET)**

### **🎯 Mission Claude - INTÉGRATION ESPACE ENTREPRISE**
Tu vas **intégrer un espace entreprise** dans l'application mobile LokoTaxi existante. **L'app conducteur fonctionne déjà** - tu dois UNIQUEMENT ajouter la partie entreprise.

### **📱 Application Existante (NE PAS MODIFIER)**
- ✅ **App mobile conducteur** : Complètement développée et opérationnelle
- ✅ **Login/Auth conducteur** : Système d'authentification fonctionnel
- ✅ **Base de données** : PostgreSQL + PostGIS avec toutes les tables
- ✅ **APIs conducteur** : Backend complet pour gestion courses

### **🆕 Tâches à Réaliser (NOUVELLES UNIQUEMENT)**
1. **Page sélection** : "Conducteur" ou "Entreprise" au démarrage
2. **Auth entreprise** : Système login séparé pour entreprises
3. **Navigation entreprise** : Stack complète dashboard/gestion
4. **Intégration harmonieuse** : Design cohérent avec app existante

### **⚠️ Points d'Attention CRITIQUES**
- **NE PAS TOUCHER** à l'app conducteur existante
- **Réutiliser** l'infrastructure et patterns existants
- **Style cohérent** avec le design de l'app conducteur
- **Performance** : Garder fluidité de l'app existante

### **🎖️ Livrable Final**
Une **app mobile unique** avec :
- 🔄 **Choix au démarrage** : Conducteur (existant) ou Entreprise (nouveau)
- 🚗 **Espace conducteur** : Inchangé et fonctionnel
- 🏢 **Espace entreprise** : Dashboard complet intégré

---

*📝 Document généré le 4 août 2025 - Version 1.0*  
*🔄 À réviser et améliorer selon les besoins spécifiques*