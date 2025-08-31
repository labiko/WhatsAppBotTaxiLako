-- ✅ Vue SQL pour l'historique des paiements
-- Usage: Onglet HISTORIQUE dans /super-admin/financial

CREATE OR REPLACE VIEW historique_paiements_complet AS
SELECT 
  pe.id,
  pe.date_paiement,
  pe.montant_paye,
  pe.methode_paiement,
  pe.reference_paiement,
  pe.statut,
  pe.balance_avant,
  pe.balance_apres,
  pe.created_at,
  pe.updated_at,
  -- Informations entreprise
  e.nom as entreprise_nom,
  e.id as entreprise_id,
  -- Informations période
  CONCAT('Période du ', TO_CHAR(fp.periode_debut, 'DD/MM/YYYY'), ' au ', TO_CHAR(fp.periode_fin, 'DD/MM/YYYY')) as periode_nom,
  fp.id as periode_id,
  fp.periode_debut as date_debut,
  fp.periode_fin as date_fin,
  fp.statut as periode_statut,
  -- Calculs utiles
  (pe.balance_apres - pe.balance_avant) as variation_balance,
  EXTRACT(YEAR FROM pe.date_paiement) as annee_paiement,
  EXTRACT(MONTH FROM pe.date_paiement) as mois_paiement,
  TO_CHAR(pe.date_paiement, 'DD/MM/YYYY HH24:MI') as date_formatee
FROM paiements_entreprises pe
LEFT JOIN entreprises e ON pe.entreprise_id = e.id  
LEFT JOIN facturation_periodes fp ON pe.periode_id = fp.id
WHERE pe.statut IS NOT NULL -- Filtrer les paiements valides
ORDER BY pe.date_paiement DESC, pe.created_at DESC;

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_paiements_entreprises_date_statut 
ON paiements_entreprises (date_paiement DESC, statut) 
WHERE statut IS NOT NULL;

-- Commentaire pour la documentation
COMMENT ON VIEW historique_paiements_complet IS 'Vue complète pour l''historique des paiements entreprises - Utilisée par l''onglet HISTORIQUE du super-admin';