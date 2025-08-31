import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface HistoriquePaiement {
  id: string;
  date_paiement: string;
  montant_paye: number;
  methode_paiement: string;
  reference_paiement?: string;
  statut: string;
  balance_avant: number;
  balance_apres: number;
  created_at: string;
  updated_at: string;
  entreprise_nom: string;
  entreprise_id: string;
  periode_nom?: string;
  periode_id?: string;
  date_debut?: string;
  date_fin?: string;
  periode_statut?: string;
  variation_balance: number;
  annee_paiement: number;
  mois_paiement: number;
  date_formatee: string;
}

export interface HistoriqueFilters {
  entreprise_id?: string;
  statut?: string;
  date_debut?: string;
  date_fin?: string;
  methode_paiement?: string;
  montant_min?: number;
  montant_max?: number;
}

export interface HistoriqueResponse {
  data: HistoriquePaiement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class HistoriquePaiementService {
  private supabase: SupabaseClient;

  constructor() {
    // Configuration Supabase - À adapter selon votre configuration existante
    const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndssdGlwbXR3aHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxOTU5NzE1NCwiZXhwIjoyMDM1MTczMTU0fQ.4lmzOZ_J_lTmIUcJqn4pUE5Y_z0x1zGSJgQI1Bp6mxs';
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Récupérer l'historique des paiements avec filtres et pagination
   * @param filters - Filtres à appliquer
   * @param page - Page actuelle (commence à 1)
   * @param limit - Nombre d'éléments par page
   */
  async getHistoriquePaiements(
    filters: HistoriqueFilters = {}, 
    page: number = 1, 
    limit: number = 20
  ): Promise<HistoriqueResponse> {
    try {
      // Construction de la requête de base
      let query = this.supabase
        .from('historique_paiements_complet')
        .select('*', { count: 'exact' });

      // Application des filtres
      if (filters.entreprise_id) {
        query = query.eq('entreprise_id', filters.entreprise_id);
      }

      if (filters.statut) {
        query = query.eq('statut', filters.statut);
      }

      if (filters.date_debut) {
        query = query.gte('date_paiement', filters.date_debut);
      }

      if (filters.date_fin) {
        query = query.lte('date_paiement', filters.date_fin);
      }

      if (filters.methode_paiement) {
        query = query.eq('methode_paiement', filters.methode_paiement);
      }

      if (filters.montant_min) {
        query = query.gte('montant_paye', filters.montant_min);
      }

      if (filters.montant_max) {
        query = query.lte('montant_paye', filters.montant_max);
      }

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      query = query
        .range(from, to)
        .order('date_paiement', { ascending: false })
        .order('created_at', { ascending: false });

      // Exécution de la requête
      const { data, error, count } = await query;

      if (error) {
        console.error('Erreur lors de la récupération de l\'historique:', error);
        throw error;
      }

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        data: data || [],
        total: count || 0,
        page,
        limit,
        totalPages
      };

    } catch (error) {
      console.error('Erreur dans getHistoriquePaiements:', error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques de l'historique des paiements
   */
  async getStatistiquesHistorique(): Promise<{
    totalPaiements: number;
    montantTotal: number;
    dernierpaiement?: HistoriquePaiement;
    statutsCount: { [key: string]: number };
  }> {
    try {
      // Récupération des données de base
      const { data, error } = await this.supabase
        .from('historique_paiements_complet')
        .select('*');

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          totalPaiements: 0,
          montantTotal: 0,
          statutsCount: {}
        };
      }

      // Calculs des statistiques
      const totalPaiements = data.length;
      const montantTotal = data.reduce((sum, paiement) => sum + (paiement.montant_paye || 0), 0);
      const dernierpaiement = data[0]; // Déjà trié par date DESC

      // Comptage par statut
      const statutsCount: { [key: string]: number } = {};
      data.forEach(paiement => {
        const statut = paiement.statut || 'Inconnu';
        statutsCount[statut] = (statutsCount[statut] || 0) + 1;
      });

      return {
        totalPaiements,
        montantTotal,
        dernierpaiement,
        statutsCount
      };

    } catch (error) {
      console.error('Erreur dans getStatistiquesHistorique:', error);
      throw error;
    }
  }

  /**
   * Obtenir la liste des entreprises pour le filtre
   */
  async getEntreprisesList(): Promise<{ id: string; nom: string }[]> {
    try {
      const { data, error } = await this.supabase
        .from('entreprises')
        .select('id, nom')
        .order('nom');

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Erreur dans getEntreprisesList:', error);
      throw error;
    }
  }

  /**
   * Obtenir la liste des méthodes de paiement uniques
   */
  async getMethodesPaiementList(): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('paiements_entreprises')
        .select('methode_paiement')
        .not('methode_paiement', 'is', null);

      if (error) throw error;

      // Extraire les méthodes uniques
      const methodes = [...new Set(data?.map(item => item.methode_paiement) || [])];
      return methodes.filter(Boolean).sort();
    } catch (error) {
      console.error('Erreur dans getMethodesPaiementList:', error);
      throw error;
    }
  }

  /**
   * Exporter l'historique vers CSV
   */
  async exportToCsv(filters: HistoriqueFilters = {}): Promise<string> {
    try {
      // Récupérer toutes les données (sans pagination) avec les filtres
      const response = await this.getHistoriquePaiements(filters, 1, 10000);
      const data = response.data;

      if (!data || data.length === 0) {
        throw new Error('Aucune donnée à exporter');
      }

      // Headers CSV
      const headers = [
        'Date Paiement',
        'Entreprise',
        'Montant Payé',
        'Méthode Paiement',
        'Référence',
        'Statut',
        'Balance Avant',
        'Balance Après',
        'Période',
        'Variation Balance'
      ];

      // Construction du CSV
      const csvContent = [
        headers.join(','),
        ...data.map(item => [
          item.date_formatee,
          `"${item.entreprise_nom}"`,
          item.montant_paye,
          `"${item.methode_paiement}"`,
          `"${item.reference_paiement || ''}"`,
          `"${item.statut}"`,
          item.balance_avant,
          item.balance_apres,
          `"${item.periode_nom || ''}"`,
          item.variation_balance
        ].join(','))
      ].join('\n');

      return csvContent;

    } catch (error) {
      console.error('Erreur dans exportToCsv:', error);
      throw error;
    }
  }
}