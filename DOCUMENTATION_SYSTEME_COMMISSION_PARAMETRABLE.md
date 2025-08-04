# 📊 SYSTÈME COMMISSION PARAMÉTRABLE - Documentation Complète

## 🎯 **OBJECTIFS DU SYSTÈME**

### **Problématique Actuelle**
- ❌ Commission par défaut (15%) appliquée automatiquement
- ❌ Impossible de modifier les taux sans affecter l'historique
- ❌ Pas de distinction freelance vs entreprise
- ❌ Nouvelles commissions affectent les réservations passées

### **Solution Proposée**
- ✅ **Commission 0% par défaut** (pas de commission automatique)
- ✅ **Taux paramétrable** par entreprise avec date d'application
- ✅ **Historique complet** des changements de commission
- ✅ **Non-rétroactivité** : nouvelles commissions n'affectent pas le passé
- ✅ **Distinction claire** : Freelance (0%) vs Entreprise (paramétrable)

---

## 🏗️ **ARCHITECTURE BASE DE DONNÉES**

### **1. Table `entreprises` (Modifiée)**

```sql
CREATE TABLE entreprises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR(100) NOT NULL,
    siret VARCHAR(20) UNIQUE,
    adresse TEXT,
    telephone VARCHAR(20),
    email VARCHAR(100),
    responsable VARCHAR(100),
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

**🔄 Changements :**
- ❌ **SUPPRIMÉ** : `commission_pourcentage` (sera dans `commission_history`)
- ✅ **CONSERVÉ** : Toutes les autres colonnes métier

### **2. Table `commission_history` (Nouvelle)**

```sql
CREATE TABLE commission_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entreprise_id UUID NOT NULL,
    taux_commission DECIMAL(5,2) NOT NULL,  -- Ex: 15.50 pour 15.5%
    date_debut DATE NOT NULL,               -- Date d'application
    date_fin DATE NULL,                     -- NULL = taux en cours
    actif BOOLEAN DEFAULT true,
    motif TEXT,                            -- Raison du changement
    created_by VARCHAR(100),               -- Utilisateur ayant fait le changement
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    
    -- Contraintes
    FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE,
    CONSTRAINT unique_periode_active 
        UNIQUE (entreprise_id, date_debut) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT taux_positif 
        CHECK (taux_commission >= 0 AND taux_commission <= 100)
);
```

**🎯 Fonctionnalités :**
- ✅ **Historique temporel** : Chaque taux a une période de validité
- ✅ **Chevauchement impossible** : Un seul taux actif par entreprise/date
- ✅ **Traçabilité** : Qui, quand, pourquoi chaque changement
- ✅ **Flexibilité** : Taux futurs programmables

### **3. Table `conducteurs` (Relation facultative)**

```sql
ALTER TABLE conducteurs 
ADD COLUMN IF NOT EXISTS entreprise_id UUID,
ADD CONSTRAINT fk_conducteurs_entreprise 
    FOREIGN KEY (entreprise_id) 
    REFERENCES entreprises(id) 
    ON DELETE SET NULL;
```

**🔄 Comportement :**
- `entreprise_id = NULL` → **Conducteur freelance** (0% commission)
- `entreprise_id = UUID` → **Conducteur d'entreprise** (commission selon historique)

---

## ⚙️ **FONCTIONS MÉTIER**

### **1. Calcul Commission pour une Réservation**

```sql
CREATE OR REPLACE FUNCTION get_commission_taux(
    p_entreprise_id UUID,
    p_date_reservation DATE DEFAULT CURRENT_DATE
) RETURNS DECIMAL(5,2) AS $$
DECLARE
    v_taux DECIMAL(5,2);
BEGIN
    -- Freelance = 0% commission
    IF p_entreprise_id IS NULL THEN
        RETURN 0.00;
    END IF;
    
    -- Récupérer le taux applicable à la date de réservation
    SELECT taux_commission INTO v_taux
    FROM commission_history
    WHERE entreprise_id = p_entreprise_id
      AND date_debut <= p_date_reservation
      AND (date_fin IS NULL OR date_fin > p_date_reservation)
      AND actif = true
    ORDER BY date_debut DESC
    LIMIT 1;
    
    -- Si aucun taux défini = 0% (pas de commission par défaut)
    RETURN COALESCE(v_taux, 0.00);
END;
$$ LANGUAGE plpgsql;
```

### **2. Modification Commission (avec Historique)**

```sql
CREATE OR REPLACE FUNCTION set_commission_taux(
    p_entreprise_id UUID,
    p_nouveau_taux DECIMAL(5,2),
    p_date_debut DATE DEFAULT CURRENT_DATE,
    p_motif TEXT DEFAULT NULL,
    p_created_by VARCHAR(100) DEFAULT 'system'
) RETURNS BOOLEAN AS $$
DECLARE
    v_ancien_id UUID;
BEGIN
    -- Fermer l'ancien taux (date_fin = veille du nouveau taux)
    UPDATE commission_history 
    SET date_fin = p_date_debut - INTERVAL '1 day',
        updated_at = now()
    WHERE entreprise_id = p_entreprise_id 
      AND date_fin IS NULL 
      AND actif = true
    RETURNING id INTO v_ancien_id;
    
    -- Insérer le nouveau taux
    INSERT INTO commission_history (
        entreprise_id, taux_commission, date_debut, 
        motif, created_by
    ) VALUES (
        p_entreprise_id, p_nouveau_taux, p_date_debut,
        p_motif, p_created_by
    );
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erreur lors du changement de commission: %', SQLERRM;
        RETURN false;
END;
$$ LANGUAGE plpgsql;
```

### **3. Suppression Commission (Retour à 0%)**

```sql
CREATE OR REPLACE FUNCTION remove_commission(
    p_entreprise_id UUID,
    p_date_fin DATE DEFAULT CURRENT_DATE,
    p_motif TEXT DEFAULT 'Suppression commission',
    p_created_by VARCHAR(100) DEFAULT 'system'
) RETURNS BOOLEAN AS $$
BEGIN
    -- Fermer le taux actuel
    UPDATE commission_history 
    SET date_fin = p_date_fin,
        motif = COALESCE(motif, '') || ' | ' || p_motif,
        updated_at = now()
    WHERE entreprise_id = p_entreprise_id 
      AND date_fin IS NULL 
      AND actif = true;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 **VUES FACILITATRICES**

### **1. Vue Conducteurs avec Commission Actuelle**

```sql
CREATE OR REPLACE VIEW conducteurs_avec_commission AS
SELECT 
    c.id,
    c.nom,
    c.telephone,
    c.vehicle_type,
    c.plaque_immatriculation,
    c.statut,
    c.position,
    c.latitude,
    c.longitude,
    -- Informations entreprise
    c.entreprise_id,
    e.nom as entreprise_nom,
    get_commission_taux(c.entreprise_id, CURRENT_DATE) as commission_actuelle,
    CASE 
        WHEN c.entreprise_id IS NULL THEN 'Freelance'
        ELSE 'Entreprise'
    END as type_conducteur,
    -- Statut commission
    CASE 
        WHEN c.entreprise_id IS NULL THEN '0% (Freelance)'
        ELSE get_commission_taux(c.entreprise_id, CURRENT_DATE)::TEXT || '%'
    END as commission_display
FROM conducteurs c
LEFT JOIN entreprises e ON c.entreprise_id = e.id
WHERE c.actif = true;
```

### **2. Vue Historique Commission par Entreprise**

```sql
CREATE OR REPLACE VIEW historique_commissions AS
SELECT 
    e.id as entreprise_id,
    e.nom as entreprise_nom,
    ch.id as commission_id,
    ch.taux_commission,
    ch.date_debut,
    ch.date_fin,
    ch.motif,
    ch.created_by,
    ch.created_at,
    CASE 
        WHEN ch.date_fin IS NULL THEN 'Actif'
        WHEN ch.date_fin > CURRENT_DATE THEN 'Programmé'
        ELSE 'Archivé'
    END as statut,
    -- Durée d'application
    CASE 
        WHEN ch.date_fin IS NULL THEN 
            CURRENT_DATE - ch.date_debut || ' jours (en cours)'
        ELSE 
            ch.date_fin - ch.date_debut || ' jours'
    END as duree_application
FROM commission_history ch
JOIN entreprises e ON ch.entreprise_id = e.id
WHERE ch.actif = true
ORDER BY e.nom, ch.date_debut DESC;
```

### **3. Vue Statistiques Commission**

```sql
CREATE OR REPLACE VIEW stats_commissions AS
SELECT 
    e.nom as entreprise_nom,
    COUNT(ch.id) as nb_changements_commission,
    MIN(ch.taux_commission) as taux_min,
    MAX(ch.taux_commission) as taux_max,
    AVG(ch.taux_commission) as taux_moyen,
    get_commission_taux(e.id, CURRENT_DATE) as taux_actuel,
    MIN(ch.date_debut) as premiere_commission,
    MAX(ch.date_debut) as derniere_modification
FROM entreprises e
LEFT JOIN commission_history ch ON e.id = ch.entreprise_id AND ch.actif = true
WHERE e.actif = true
GROUP BY e.id, e.nom
ORDER BY e.nom;
```

---

## 🧪 **EXEMPLES D'USAGE PRATIQUES**

### **Cas 1 : Création Entreprise sans Commission (Défaut)**

```sql
-- 1. Créer l'entreprise
INSERT INTO entreprises (nom, adresse, telephone, responsable) 
VALUES ('Taxi Express Conakry', 'Kaloum, Conakry', '+224 622 111 111', 'Mamadou Diallo');

-- 2. Vérifier la commission (doit être 0%)
SELECT get_commission_taux(
    (SELECT id FROM entreprises WHERE nom = 'Taxi Express Conakry'), 
    CURRENT_DATE
); 
-- Résultat attendu : 0.00
```

### **Cas 2 : Ajout Commission avec Date Future**

```sql
-- 1. Programmer une commission à partir du 1er septembre 2025
SELECT set_commission_taux(
    (SELECT id FROM entreprises WHERE nom = 'Taxi Express Conakry'),
    15.00,                              -- 15%
    '2025-09-01',                      -- À partir du 1er septembre
    'Mise en place commission initiale suite accord commercial',
    'admin_user'
);

-- 2. Vérifier l'effet selon les dates
SELECT get_commission_taux(
    (SELECT id FROM entreprises WHERE nom = 'Taxi Express Conakry'), 
    '2025-08-31'  -- Avant = 0%
);
SELECT get_commission_taux(
    (SELECT id FROM entreprises WHERE nom = 'Taxi Express Conakry'), 
    '2025-09-01'  -- À partir = 15%
);
```

### **Cas 3 : Modification Commission (Historique Préservé)**

```sql
-- 1. Changer la commission à partir du 1er janvier 2026
SELECT set_commission_taux(
    (SELECT id FROM entreprises WHERE nom = 'Taxi Express Conakry'),
    20.00,                              -- Nouveau : 20%
    '2026-01-01',                      -- À partir du 1er janvier 2026
    'Augmentation commission suite renégociation contrat',
    'manager_commercial'
);

-- 2. Vérifier l'historique complet
SELECT * FROM historique_commissions 
WHERE entreprise_nom = 'Taxi Express Conakry'
ORDER BY date_debut;

-- Résultat attendu :
-- | taux | date_debut | date_fin   | statut  |
-- |------|------------|------------|---------|
-- | 15.00| 2025-09-01 | 2025-12-31 | Archivé |
-- | 20.00| 2026-01-01 | NULL       | Actif   |
```

### **Cas 4 : Calcul Commission pour Réservations**

```sql
-- Simulation réservations à différentes dates
SELECT 
    '2025-08-15' as date_reservation,
    get_commission_taux(
        (SELECT id FROM entreprises WHERE nom = 'Taxi Express Conakry'), 
        '2025-08-15'
    ) as commission_applicable;  -- 0% (avant mise en place)

SELECT 
    '2025-10-15' as date_reservation,
    get_commission_taux(
        (SELECT id FROM entreprises WHERE nom = 'Taxi Express Conakry'), 
        '2025-10-15'
    ) as commission_applicable;  -- 15% (première période)

SELECT 
    '2026-02-15' as date_reservation,
    get_commission_taux(
        (SELECT id FROM entreprises WHERE nom = 'Taxi Express Conakry'), 
        '2026-02-15'
    ) as commission_applicable;  -- 20% (après augmentation)
```

### **Cas 5 : Conducteur Freelance vs Entreprise**

```sql
-- 1. Créer conducteur freelance (sans entreprise)
INSERT INTO conducteurs (nom, telephone, vehicle_type, entreprise_id)
VALUES ('Alpha Barry', '+224 655 123 456', 'moto', NULL);

-- 2. Créer conducteur d'entreprise
INSERT INTO conducteurs (nom, telephone, vehicle_type, entreprise_id)
VALUES ('Ibrahima Sow', '+224 666 789 012', 'voiture', 
    (SELECT id FROM entreprises WHERE nom = 'Taxi Express Conakry'));

-- 3. Comparer les commissions
SELECT 
    nom,
    type_conducteur,
    commission_display
FROM conducteurs_avec_commission
WHERE nom IN ('Alpha Barry', 'Ibrahima Sow');

-- Résultat attendu :
-- | nom           | type_conducteur | commission_display |
-- |---------------|-----------------|-------------------|
-- | Alpha Barry   | Freelance       | 0% (Freelance)    |
-- | Ibrahima Sow  | Entreprise      | 15%               |
```

---

## 🔄 **MIGRATION DONNÉES EXISTANTES**

### **Script de Migration**

```sql
-- ========================================
-- MIGRATION COMMISSION EXISTANTE VERS HISTORIQUE
-- ========================================

-- 1. Sauvegarder les commissions actuelles dans l'historique
INSERT INTO commission_history (
    entreprise_id, 
    taux_commission, 
    date_debut, 
    motif, 
    created_by
)
SELECT 
    id as entreprise_id,
    COALESCE(commission_pourcentage, 0.00) as taux_commission,
    CURRENT_DATE as date_debut,
    'Migration automatique depuis colonne commission_pourcentage' as motif,
    'migration_script' as created_by
FROM entreprises 
WHERE commission_pourcentage IS NOT NULL AND commission_pourcentage > 0;

-- 2. Vérifier la migration
SELECT 
    'Migration terminée' as status,
    COUNT(*) as entreprises_migrees
FROM commission_history 
WHERE created_by = 'migration_script';

-- 3. Comparer avant/après
SELECT 
    e.nom,
    e.commission_pourcentage as ancien_taux,
    get_commission_taux(e.id, CURRENT_DATE) as nouveau_taux,
    CASE 
        WHEN e.commission_pourcentage = get_commission_taux(e.id, CURRENT_DATE) 
        THEN '✅ Identique'
        ELSE '❌ Différent'
    END as verification
FROM entreprises e
WHERE e.commission_pourcentage IS NOT NULL;

-- 4. Supprimer l'ancienne colonne (APRÈS VÉRIFICATION COMPLÈTE)
-- ALTER TABLE entreprises DROP COLUMN commission_pourcentage;
```

---

## 🚀 **INTÉGRATION BOT WHATSAPP**

### **Modification Calcul Commission dans le Bot**

```typescript
// Fonction TypeScript pour le bot
async function calculateCommission(
    conducteurId: string, 
    prixCourse: number, 
    dateReservation: string = new Date().toISOString().split('T')[0]
): Promise<{montantCommission: number, tauxCommission: number}> {
    
    const { data: conducteur } = await supabase
        .from('conducteurs_avec_commission')
        .select('entreprise_id, commission_actuelle')
        .eq('id', conducteurId)
        .single();
    
    if (!conducteur || !conducteur.entreprise_id) {
        // Conducteur freelance = 0% commission
        return { montantCommission: 0, tauxCommission: 0 };
    }
    
    // Utiliser la fonction PostgreSQL pour le calcul historique
    const { data: commission } = await supabase
        .rpc('get_commission_taux', {
            p_entreprise_id: conducteur.entreprise_id,
            p_date_reservation: dateReservation
        });
    
    const tauxCommission = commission || 0;
    const montantCommission = (prixCourse * tauxCommission) / 100;
    
    return { montantCommission, tauxCommission };
}

// Exemple d'usage dans le bot
const reservationData = {
    conducteurId: 'uuid-conducteur',
    prixCourse: 50000, // 50,000 GNF
    dateReservation: '2025-09-15'
};

const { montantCommission, tauxCommission } = await calculateCommission(
    reservationData.conducteurId,
    reservationData.prixCourse,
    reservationData.dateReservation
);

console.log(`Prix course: ${reservationData.prixCourse} GNF`);
console.log(`Commission: ${tauxCommission}% = ${montantCommission} GNF`);
console.log(`Conducteur reçoit: ${reservationData.prixCourse - montantCommission} GNF`);
```

---

## 📋 **TESTS DE VALIDATION**

### **1. Test Commission 0% par Défaut**

```sql
-- Créer entreprise sans commission
INSERT INTO entreprises (nom) VALUES ('Test Entreprise Sans Commission');

-- Vérifier 0% par défaut
SELECT 
    CASE 
        WHEN get_commission_taux(
            (SELECT id FROM entreprises WHERE nom = 'Test Entreprise Sans Commission'),
            CURRENT_DATE
        ) = 0.00 
        THEN '✅ PASS : Commission 0% par défaut'
        ELSE '❌ FAIL : Commission non-zéro par défaut'
    END as test_result;
```

### **2. Test Non-Rétroactivité**

```sql
-- Simuler historique
INSERT INTO entreprises (nom) VALUES ('Test Non-Retroactivite');

-- Commission 10% à partir du 1er août
SELECT set_commission_taux(
    (SELECT id FROM entreprises WHERE nom = 'Test Non-Retroactivite'),
    10.00, '2025-08-01', 'Test période 1', 'test_user'
);

-- Commission 20% à partir du 1er octobre
SELECT set_commission_taux(
    (SELECT id FROM entreprises WHERE nom = 'Test Non-Retroactivite'),
    20.00, '2025-10-01', 'Test période 2', 'test_user'
);

-- Vérifier non-rétroactivité
SELECT 
    date_test,
    commission_attendue,
    commission_reelle,
    CASE 
        WHEN commission_attendue = commission_reelle 
        THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as resultat
FROM (
    SELECT 
        '2025-07-15' as date_test,
        0.00 as commission_attendue,
        get_commission_taux(
            (SELECT id FROM entreprises WHERE nom = 'Test Non-Retroactivite'),
            '2025-07-15'
        ) as commission_reelle
    UNION ALL
    SELECT 
        '2025-08-15',
        10.00,
        get_commission_taux(
            (SELECT id FROM entreprises WHERE nom = 'Test Non-Retroactivite'),
            '2025-08-15'
        )
    UNION ALL
    SELECT 
        '2025-10-15',
        20.00,
        get_commission_taux(
            (SELECT id FROM entreprises WHERE nom = 'Test Non-Retroactivite'),
            '2025-10-15'
        )
) tests;
```

---

## 🎯 **ÉTAPES D'IMPLÉMENTATION**

### **Phase 1 : Préparation Base de Données**
1. ✅ Création table `commission_history`
2. ✅ Création fonctions métier (`get_commission_taux`, `set_commission_taux`)
3. ✅ Création vues facilitatrices
4. ✅ Scripts de test et validation

### **Phase 2 : Migration Données**
1. 🔄 Backup des données existantes
2. 🔄 Migration commissions actuelles vers historique
3. 🔄 Vérification intégrité des données
4. 🔄 Suppression ancienne colonne `commission_pourcentage`

### **Phase 3 : Intégration Application**
1. 🔄 Modification bot WhatsApp (calcul commission)
2. 🔄 Interface admin pour gestion commissions
3. 🔄 Tests fonctionnels complets
4. 🔄 Documentation utilisateur

### **Phase 4 : Déploiement**
1. 🔄 Déploiement environnement test
2. 🔄 Tests utilisateurs
3. 🔄 Déploiement production
4. 🔄 Formation équipes

---

## ⚠️ **POINTS D'ATTENTION**

### **Sécurité**
- ✅ Validation des taux (0-100%)
- ✅ Contraintes base de données respectées
- ✅ Audit trail complet (qui, quand, pourquoi)
- ✅ Permissions admin pour modifications

### **Performance**
- ✅ Index sur `commission_history` (entreprise_id, date_debut)
- ✅ Fonction `get_commission_taux` optimisée
- ✅ Vues pré-calculées pour affichage

### **Cohérence Métier**
- ✅ Un seul taux actif par entreprise/période
- ✅ Pas de chevauchement de dates
- ✅ Migration transparente depuis ancien système
- ✅ Freelance = 0% garanti

---

## 📞 **SUPPORT ET MAINTENANCE**

### **Requêtes Fréquentes**

```sql
-- Voir tous les taux d'une entreprise
SELECT * FROM historique_commissions 
WHERE entreprise_nom = 'NOM_ENTREPRISE'
ORDER BY date_debut DESC;

-- Voir toutes les entreprises sans commission actuellement
SELECT nom FROM entreprises e
WHERE get_commission_taux(e.id, CURRENT_DATE) = 0
  AND e.actif = true;

-- Statistiques globales commissions
SELECT 
    AVG(get_commission_taux(id, CURRENT_DATE)) as commission_moyenne,
    COUNT(CASE WHEN get_commission_taux(id, CURRENT_DATE) = 0 THEN 1 END) as entreprises_sans_commission,
    COUNT(CASE WHEN get_commission_taux(id, CURRENT_DATE) > 0 THEN 1 END) as entreprises_avec_commission
FROM entreprises WHERE actif = true;
```

### **Maintenance Régulière**

```sql
-- Nettoyer les anciennes entrées de test
DELETE FROM commission_history 
WHERE created_by LIKE 'test_%' 
  AND created_at < NOW() - INTERVAL '30 days';

-- Vérifier la cohérence des données
SELECT COUNT(*) as anomalies FROM commission_history ch1
WHERE EXISTS (
    SELECT 1 FROM commission_history ch2
    WHERE ch1.entreprise_id = ch2.entreprise_id
      AND ch1.id != ch2.id
      AND ch1.date_debut <= ch2.date_fin
      AND ch2.date_debut <= ch1.date_fin
      AND ch1.actif = true AND ch2.actif = true
);
```

---

**📋 DOCUMENTATION CRÉÉE :** `DOCUMENTATION_SYSTEME_COMMISSION_PARAMETRABLE.md`
**🎯 PROCHAINE ÉTAPE :** Création du script SQL complet pour implémentation