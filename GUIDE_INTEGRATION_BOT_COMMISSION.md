# 🤖 GUIDE INTÉGRATION BOT WHATSAPP - Commission Paramétrable

## 🎯 **OBJECTIF**
Intégrer le nouveau système de commission paramétrable dans le bot WhatsApp pour :
- ✅ Calcul automatique commission selon l'historique
- ✅ Affichage commission dans les confirmations
- ✅ Distinction Freelance (0%) vs Entreprise (variable)
- ✅ Respect non-rétroactivité des taux

---

## 📋 **MODIFICATIONS REQUISES**

### **1. Nouvelle Fonction TypeScript - Calcul Commission**

```typescript
/**
 * Calcule la commission pour une réservation selon l'historique des taux
 * @param conducteurId - ID du conducteur
 * @param prixCourse - Prix de la course en GNF
 * @param dateReservation - Date de la réservation (ISO string)
 * @returns Objet avec montant et taux de commission
 */
async function calculateCommission(
    conducteurId: string, 
    prixCourse: number, 
    dateReservation: string = new Date().toISOString().split('T')[0]
): Promise<{
    montantCommission: number;
    tauxCommission: number;
    typeCommission: 'freelance' | 'entreprise';
    entrepriseNom?: string;
}> {
    
    try {
        // 1. Récupérer les infos conducteur via la vue optimisée
        const { data: conducteur, error: errorConducteur } = await supabase
            .from('conducteurs_avec_commission')
            .select(`
                entreprise_id,
                entreprise_nom,
                commission_actuelle,
                type_conducteur
            `)
            .eq('id', conducteurId)
            .single();
        
        if (errorConducteur || !conducteur) {
            console.error('❌ Conducteur non trouvé:', conducteurId);
            return { 
                montantCommission: 0, 
                tauxCommission: 0, 
                typeCommission: 'freelance' 
            };
        }
        
        // 2. Si conducteur freelance = 0% commission
        if (!conducteur.entreprise_id || conducteur.type_conducteur === 'Freelance') {
            console.log('👤 Conducteur freelance - Commission: 0%');
            return { 
                montantCommission: 0, 
                tauxCommission: 0, 
                typeCommission: 'freelance' 
            };
        }
        
        // 3. Utiliser fonction PostgreSQL pour calcul historique précis
        const { data: tauxCommission, error: errorCommission } = await supabase
            .rpc('get_commission_taux', {
                p_entreprise_id: conducteur.entreprise_id,
                p_date_reservation: dateReservation
            });
        
        if (errorCommission) {
            console.error('❌ Erreur calcul commission:', errorCommission);
            // Fallback sur commission actuelle
            const taux = conducteur.commission_actuelle || 0;
            const montant = Math.round((prixCourse * taux) / 100);
            return { 
                montantCommission: montant, 
                tauxCommission: taux, 
                typeCommission: 'entreprise',
                entrepriseNom: conducteur.entreprise_nom 
            };
        }
        
        // 4. Calculer montant commission
        const taux = tauxCommission || 0;
        const montant = Math.round((prixCourse * taux) / 100);
        
        console.log(`💰 Commission calculée: ${taux}% de ${prixCourse} GNF = ${montant} GNF (${conducteur.entreprise_nom})`);
        
        return {
            montantCommission: montant,
            tauxCommission: taux,
            typeCommission: 'entreprise',
            entrepriseNom: conducteur.entreprise_nom
        };
        
    } catch (error) {
        console.error('❌ Erreur calcul commission:', error);
        return { 
            montantCommission: 0, 
            tauxCommission: 0, 
            typeCommission: 'freelance' 
        };
    }
}
```

### **2. Modification Confirmation Réservation**

```typescript
// Dans la fonction de confirmation de réservation
async function confirmerReservation(
    from: string, 
    conducteurSelectionne: any, 
    prixCourse: number,
    dateReservation?: string
) {
    // ... code existant ...
    
    // 🆕 CALCUL COMMISSION
    const dateRes = dateReservation || new Date().toISOString().split('T')[0];
    const commission = await calculateCommission(
        conducteurSelectionne.id, 
        prixCourse, 
        dateRes
    );
    
    // 🆕 MESSAGE AVEC DÉTAILS COMMISSION
    let messageConfirmation = `✅ **Réservation confirmée !**
    
🚗 **Conducteur :** ${conducteurSelectionne.nom}
📞 **Téléphone :** ${conducteurSelectionne.telephone}
🚙 **Véhicule :** ${conducteurSelectionne.vehicle_type} - ${conducteurSelectionne.plaque_immatriculation}
⏱️ **Arrivée estimée :** ${conducteurSelectionne.temps_arrivee}

💰 **Tarification :**
• Prix course : ${prixCourse.toLocaleString()} GNF`;

    // Affichage commission selon le type
    if (commission.typeCommission === 'freelance') {
        messageConfirmation += `
• Commission : 0% (Conducteur indépendant)
• **Montant à payer : ${prixCourse.toLocaleString()} GNF**`;
    } else {
        const montantConducteur = prixCourse - commission.montantCommission;
        messageConfirmation += `
• Commission ${commission.entrepriseNom} : ${commission.tauxCommission}% (${commission.montantCommission.toLocaleString()} GNF)
• **Montant à payer : ${prixCourse.toLocaleString()} GNF**
• Conducteur reçoit : ${montantConducteur.toLocaleString()} GNF`;
    }
    
    messageConfirmation += `

🆔 **Référence :** ${reservationId}
📅 **Date :** ${new Date().toLocaleDateString('fr-FR')}

⚠️ En cas de problème, contactez le conducteur directement.`;

    // ... reste du code existant ...
    
    // 🆕 SAUVEGARDER COMMISSION DANS LA RÉSERVATION
    await supabase
        .from('reservations')
        .update({
            commission_taux: commission.tauxCommission,
            commission_montant: commission.montantCommission,
            entreprise_id: commission.typeCommission === 'entreprise' ? 
                conducteurSelectionne.entreprise_id : null
        })
        .eq('id', reservationId);
}
```

### **3. Mise à Jour Structure Réservation**

```sql
-- Ajouter colonnes commission à la table reservations
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS commission_taux DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS commission_montant INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS entreprise_id UUID,
ADD CONSTRAINT fk_reservations_entreprise 
    FOREIGN KEY (entreprise_id) 
    REFERENCES entreprises(id) 
    ON DELETE SET NULL;
```

### **4. Vue Réservations avec Commission**

```sql
CREATE OR REPLACE VIEW reservations_avec_commission AS
SELECT 
    r.*,
    c.nom as conducteur_nom,
    c.telephone as conducteur_telephone,
    c.entreprise_id as conducteur_entreprise_id,
    e.nom as entreprise_nom,
    -- Calcul commission réelle appliquée
    CASE 
        WHEN r.commission_taux IS NOT NULL THEN r.commission_taux
        ELSE get_commission_taux(c.entreprise_id, r.created_at::DATE)
    END as commission_reelle,
    CASE 
        WHEN r.commission_montant IS NOT NULL THEN r.commission_montant
        ELSE ROUND((r.prix_estime * get_commission_taux(c.entreprise_id, r.created_at::DATE)) / 100)
    END as commission_montant_reel,
    -- Montant net conducteur
    COALESCE(r.prix_estime, 0) - COALESCE(r.commission_montant, 0) as montant_net_conducteur
FROM reservations r
LEFT JOIN conducteurs c ON r.conducteur_id = c.id
LEFT JOIN entreprises e ON COALESCE(r.entreprise_id, c.entreprise_id) = e.id;
```

---

## 🔧 **MODIFICATIONS SPÉCIFIQUES PAR WORKFLOW**

### **Workflow Principal (Texte)**

```typescript
// Dans handleTextMessage() - lors de la confirmation
if (body.toLowerCase() === 'oui' && session.etat === 'confirmation_prix') {
    // ... code existant jusqu'au calcul prix ...
    
    // 🆕 CALCUL COMMISSION AVANT CONFIRMATION
    const commission = await calculateCommission(
        conducteurChoisi.id, 
        prixFinal,
        new Date().toISOString().split('T')[0]
    );
    
    // Insérer réservation avec commission
    const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .insert({
            client_phone: normalizePhone(from),
            conducteur_id: conducteurChoisi.id,
            entreprise_id: commission.typeCommission === 'entreprise' ? 
                conducteurChoisi.entreprise_id : null,
            position_depart: `POINT(${clientCoords.longitude} ${clientCoords.latitude})`,
            destination: session.destination,
            prix_estime: prixFinal,
            commission_taux: commission.tauxCommission,
            commission_montant: commission.montantCommission,
            statut: 'confirmee',
            type_reservation: 'whatsapp_texte'
        })
        .select()
        .single();
    
    // Message de confirmation avec commission
    await confirmerReservation(from, conducteurChoisi, prixFinal);
}
```

### **Workflow Audio (Pular)**

```typescript
// Dans whatsapp-bot-pular - même logique
if (confirmationKeywords.includes(normalizedBody)) {
    // ... code existant ...
    
    // 🆕 CALCUL COMMISSION POUR AUDIO
    const commission = await calculateCommission(
        conducteur.id, 
        totalPrice,
        new Date().toISOString().split('T')[0]
    );
    
    // Message confirmation en Pular avec commission
    let confirmationMessage = `✅ A feewii! Nde taxi nde tonndi!
    
🚗 **Daartol:** ${conducteur.nom}
📞 **Nomre:** ${conducteur.telephone}
⏱️ **O arii hakkunde:** ${estimatedTime} min

💰 **Jaɓɓorgo:**
• Jaangol taxi: ${totalPrice.toLocaleString()} GNF`;
    
    if (commission.typeCommission === 'freelance') {
        confirmationMessage += `
• Daartol hooreejo: 0% commission
• **A yurtan:** ${totalPrice.toLocaleString()} GNF`;
    } else {
        confirmationMessage += `
• Commission ${commission.entrepriseNom}: ${commission.tauxCommission}%
• **A yurtan:** ${totalPrice.toLocaleString()} GNF`;
    }
    
    // ... reste du code ...
}
```

---

## 📊 **RAPPORTS ET MONITORING**

### **1. Rapport Commission Quotidien**

```sql
-- Vue pour rapports commission
CREATE OR REPLACE VIEW rapport_commission_quotidien AS
SELECT 
    DATE(created_at) as date_reservation,
    e.nom as entreprise_nom,
    COUNT(*) as nb_reservations,
    SUM(prix_estime) as ca_total,
    SUM(commission_montant) as commission_total,
    AVG(commission_taux) as taux_moyen,
    SUM(prix_estime - commission_montant) as montant_conducteurs
FROM reservations_avec_commission r
JOIN entreprises e ON r.entreprise_id = e.id
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND statut IN ('confirmee', 'terminee')
GROUP BY DATE(created_at), e.id, e.nom
ORDER BY date_reservation DESC, entreprise_nom;
```

### **2. Fonction Monitoring Bot**

```typescript
// Fonction pour monitoring commission dans le bot
async function logCommissionStats() {
    const { data: stats } = await supabase
        .from('rapport_commission_quotidien')
        .select('*')
        .eq('date_reservation', new Date().toISOString().split('T')[0]);
    
    console.log('📊 Stats commission aujourd\'hui:', stats);
    
    // Alertes si anomalies
    const totalCommission = stats?.reduce((sum, s) => sum + (s.commission_total || 0), 0) || 0;
    if (totalCommission === 0 && stats?.length > 0) {
        console.warn('⚠️ ALERTE: Aucune commission facturée aujourd\'hui alors qu\'il y a des réservations');
    }
}

// Appeler dans le workflow principal
setInterval(logCommissionStats, 3600000); // Toutes les heures
```

---

## 🧪 **TESTS D'INTÉGRATION**

### **1. Test Complet Freelance**

```typescript
// Test conducteur freelance
const testFreelance = async () => {
    const commission = await calculateCommission(
        'id-conducteur-freelance', 
        50000, 
        '2025-08-01'
    );
    
    console.assert(commission.montantCommission === 0, 'Commission freelance doit être 0');
    console.assert(commission.tauxCommission === 0, 'Taux freelance doit être 0');
    console.assert(commission.typeCommission === 'freelance', 'Type doit être freelance');
};
```

### **2. Test Entreprise avec Historique**

```typescript
// Test entreprise avec historique de commission
const testEntreprise = async () => {
    // Réservation avant mise en place commission
    const commission1 = await calculateCommission(
        'id-conducteur-entreprise', 
        100000, 
        '2025-07-15'  // Avant commission
    );
    
    // Réservation après commission
    const commission2 = await calculateCommission(
        'id-conducteur-entreprise', 
        100000, 
        '2025-09-15'  // Après commission 15%
    );
    
    console.assert(commission1.montantCommission === 0, 'Pas de commission avant date');
    console.assert(commission2.montantCommission === 15000, 'Commission 15% après date');
};
```

---

## 🚀 **DÉPLOIEMENT**

### **Étape 1: Base de Données**
```bash
# 1. Exécuter le script principal
[C:\Users\diall\Documents\LokoTaxi\create_table_entreprises_v2_commission_parametrable.sql](file:///C:/Users/diall/Documents/LokoTaxi/create_table_entreprises_v2_commission_parametrable.sql)

# 2. Ajouter colonnes réservations
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS commission_taux DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS commission_montant INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS entreprise_id UUID;
```

### **Étape 2: Code Bot**
```bash
# 1. Backup du bot actuel
cd "C:\Users\diall\Documents\LokoTaxi\supabase\functions\whatsapp-bot"
$timestamp = Get-Date -Format "dd-MM-yyyy-HHh-mmins"
cp index.ts "index_backup_AVANT_COMMISSION_$timestamp.ts"

# 2. Intégrer les modifications commission
# 3. Déployer
supabase functions deploy whatsapp-bot
```

### **Étape 3: Tests**
```bash
# Exécuter tests automatiques
[C:\Users\diall\Documents\LokoTaxi\test_commission_parametrable.sql](file:///C:/Users/diall/Documents/LokoTaxi/test_commission_parametrable.sql)

# Tests manuels bot
# 1. Réservation conducteur freelance → Commission 0%
# 2. Réservation conducteur entreprise → Commission selon historique
# 3. Vérifier affichage correct dans confirmation
```

---

## ⚠️ **POINTS D'ATTENTION**

### **Sécurité**
- ✅ Validation commission calculée vs base de données
- ✅ Logs détaillés des calculs commission
- ✅ Alerte si commission anormale (>50% par exemple)

### **Performance**
- ✅ Utiliser vue `conducteurs_avec_commission` (précalculée)
- ✅ Cache fonction `get_commission_taux` si nécessaire
- ✅ Index sur colonnes commission réservations

### **UX**
- ✅ Message clair Freelance vs Entreprise
- ✅ Affichage montant conducteur en plus de commission
- ✅ Gestion erreurs calcul commission (fallback 0%)

---

## 📞 **SUPPORT POST-DÉPLOIEMENT**

### **Commandes Debug**
```sql
-- Vérifier commission d'un conducteur
SELECT * FROM conducteurs_avec_commission WHERE nom = 'NOM_CONDUCTEUR';

-- Voir historique commission entreprise
SELECT * FROM historique_commissions WHERE entreprise_nom = 'NOM_ENTREPRISE';

-- Analyser réservations avec commission
SELECT * FROM reservations_avec_commission 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### **Requêtes Monitoring**
```sql
-- Détecter anomalies commission
SELECT 
    'Anomalies détectées' as alerte,
    COUNT(*) as nb_reservations_sans_commission
FROM reservations r
JOIN conducteurs c ON r.conducteur_id = c.id
WHERE r.created_at >= CURRENT_DATE - INTERVAL '1 day'
  AND c.entreprise_id IS NOT NULL  -- Conducteur d'entreprise
  AND (r.commission_taux = 0 OR r.commission_taux IS NULL);  -- Mais pas de commission
```

---

**📋 GUIDE CRÉÉ :** `GUIDE_INTEGRATION_BOT_COMMISSION.md`
**🎯 PRÊT POUR :** Intégration complète dans le bot WhatsApp