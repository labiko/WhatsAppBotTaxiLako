-- ============================================================================
-- 🔧 AMÉLIORATIONS BASE DE DONNÉES - CAS 7 MULTI-DESTINATIONS
-- ============================================================================
-- 
-- OBJECTIF : Ajouts optionnels pour améliorer le support multi-destinations
-- STATUS : OPTIONNEL - Les fonctionnalités marchent sans ces colonnes
-- 
-- ============================================================================

-- 📊 AJOUTS TABLE SESSIONS (OPTIONNELS)
-- ============================================================================

-- Support multi-destinations amélioré
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS is_multi_stop BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS place_type VARCHAR(50), -- 'pharmacy', 'bank', 'restaurant'
ADD COLUMN IF NOT EXISTS secondary_destination TEXT, -- Destination finale après arrêt
ADD COLUMN IF NOT EXISTS arrets_intermediaires JSONB DEFAULT '[]'::jsonb; -- Liste arrêts

-- ============================================================================
-- 📊 AJOUTS TABLE RESERVATIONS (OPTIONNELS)  
-- ============================================================================

-- Support multi-destinations dans réservations finales
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS is_multi_stop BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS arrêts_intermediaires JSONB DEFAULT '[]'::jsonb, -- [{nom, position, duree_arret}]
ADD COLUMN IF NOT EXISTS majoration_multi_stop NUMERIC DEFAULT 0, -- +20% par exemple
ADD COLUMN IF NOT EXISTS temps_attente_prevu INTEGER DEFAULT 10; -- Minutes d'attente par arrêt

-- ============================================================================
-- 📊 NOUVELLE TABLE LIEUX FAVORIS (OPTIONNEL - FUTUR)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lieux_favoris (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_phone TEXT NOT NULL,
  nom_lieu TEXT NOT NULL,
  type_lieu VARCHAR(50) NOT NULL, -- 'pharmacy', 'bank', 'restaurant'
  position GEOGRAPHY(POINT, 4326) NOT NULL,
  google_place_id TEXT,
  frequence_visite INTEGER DEFAULT 1,
  derniere_visite TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Index pour performance
  UNIQUE(client_phone, nom_lieu, type_lieu)
);

-- Index de performance pour recherches rapides
CREATE INDEX IF NOT EXISTS idx_lieux_favoris_client_type 
ON public.lieux_favoris(client_phone, type_lieu);

-- ============================================================================
-- 🎯 EXEMPLES D'UTILISATION
-- ============================================================================

-- Sauvegarder une course multi-stops
/*
INSERT INTO reservations (
  client_phone, vehicle_type, 
  position_depart, destination_nom, destination_position,
  is_multi_stop, arrêts_intermediaires, majoration_multi_stop
) VALUES (
  '+33620951645', 'voiture',
  'POINT(-13.6456 9.5123)', 'Madina', 'POINT(-13.6789 9.5234)',
  true, 
  '[{"nom": "Pharmacie Kipé Centre", "position": "POINT(-13.6500 9.5150)", "duree_arret": 10}]'::jsonb,
  5000 -- +5000 GNF pour arrêt multiple
);
*/

-- Rechercher lieux favoris d'un client
/*
SELECT nom_lieu, type_lieu, frequence_visite 
FROM lieux_favoris 
WHERE client_phone = '+33620951645' 
  AND type_lieu = 'pharmacy'
ORDER BY frequence_visite DESC, derniere_visite DESC
LIMIT 3;
*/

-- ============================================================================
-- ✅ CONCLUSION
-- ============================================================================

-- CES AJOUTS SONT **OPTIONNELS** :
-- - Les fonctionnalités multi-destinations marchent avec la structure actuelle
-- - Ces colonnes ajoutent des capacités avancées (historique, favoris, etc.)
-- - Peuvent être ajoutées plus tard sans impact sur le code existant
-- 
-- PRIORITÉ : IMPLÉMENTER D'ABORD LE CODE, PUIS AJOUTER CES AMÉLIORATIONS