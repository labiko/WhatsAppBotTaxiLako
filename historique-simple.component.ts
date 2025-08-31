import { Component, OnInit } from '@angular/core';
import { createClient } from '@supabase/supabase-js';

@Component({
  selector: 'app-historique-paiements',
  template: `
    <div class="historique-container" style="padding: 20px;">
      
      <div class="header" style="margin-bottom: 20px;">
        <h2>📜 Historique des Paiements</h2>
        <button (click)="loadData()" [disabled]="loading" 
                style="margin-left: 10px; padding: 8px 16px; background: #3f51b5; color: white; border: none; border-radius: 4px;">
          {{loading ? 'Chargement...' : '🔄 Actualiser'}}
        </button>
      </div>

      <div *ngIf="loading" style="text-align: center; padding: 40px;">
        <p>Chargement des données...</p>
      </div>

      <div *ngIf="error" style="padding: 16px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; margin-bottom: 20px;">
        <strong>❌ Erreur:</strong> {{error}}
      </div>

      <div *ngIf="!loading && !error">
        
        <!-- Statistiques -->
        <div class="stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 30px;">
          <div style="background: #e3f2fd; padding: 16px; border-radius: 8px; text-align: center;">
            <div style="font-size: 1.5rem; font-weight: bold; color: #1976d2;">{{totalPaiements}}</div>
            <div style="font-size: 0.9rem; color: #666;">Total Paiements</div>
          </div>
          <div style="background: #e8f5e8; padding: 16px; border-radius: 8px; text-align: center;">
            <div style="font-size: 1.5rem; font-weight: bold; color: #388e3c;">{{formatMontant(montantTotal)}}</div>
            <div style="font-size: 0.9rem; color: #666;">Montant Total</div>
          </div>
        </div>

        <!-- Table -->
        <div style="background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead style="background: #3f51b5; color: white;">
              <tr>
                <th style="padding: 12px 8px; text-align: left;">📅 Date</th>
                <th style="padding: 12px 8px; text-align: left;">🏢 Entreprise</th>
                <th style="padding: 12px 8px; text-align: right;">💰 Montant</th>
                <th style="padding: 12px 8px; text-align: center;">💳 Méthode</th>
                <th style="padding: 12px 8px; text-align: center;">📊 Statut</th>
                <th style="padding: 12px 8px; text-align: right;">📈 Variation</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let paiement of paiements; let i = index" 
                  [style.background-color]="i % 2 === 0 ? '#f8f9fa' : 'white'"
                  style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 12px 8px;">
                  <strong>{{paiement.date_formatee}}</strong>
                </td>
                <td style="padding: 12px 8px;">
                  {{paiement.entreprise_nom}}
                </td>
                <td style="padding: 12px 8px; text-align: right; font-weight: bold; color: #27ae60;">
                  {{formatMontant(paiement.montant_paye)}}
                </td>
                <td style="padding: 12px 8px; text-align: center;">
                  <span style="background: #e3f2fd; color: #1976d2; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem;">
                    {{paiement.methode_paiement}}
                  </span>
                </td>
                <td style="padding: 12px 8px; text-align: center;">
                  <span [style.background-color]="getStatutColor(paiement.statut)"
                        [style.color]="getStatutTextColor(paiement.statut)"
                        style="padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: 500;">
                    {{paiement.statut}}
                  </span>
                </td>
                <td style="padding: 12px 8px; text-align: right;">
                  <span [style.color]="paiement.variation_balance >= 0 ? '#27ae60' : '#e74c3c'"
                        style="font-weight: bold;">
                    {{paiement.variation_balance >= 0 ? '+' : ''}}{{formatMontant(paiement.variation_balance)}}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          
          <div *ngIf="paiements.length === 0" style="padding: 60px 20px; text-align: center; color: #666;">
            <div style="font-size: 3rem; margin-bottom: 16px;">💳</div>
            <h3>Aucun paiement trouvé</h3>
            <p>Aucun historique de paiement disponible pour le moment.</p>
          </div>
        </div>

        <!-- Pagination simple -->
        <div *ngIf="paiements.length > 0" style="margin-top: 20px; text-align: center;">
          <button (click)="loadMore()" [disabled]="loadingMore" 
                  style="padding: 10px 20px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px;">
            {{loadingMore ? 'Chargement...' : 'Charger plus de résultats'}}
          </button>
        </div>

      </div>
    </div>
  `
})
export class HistoriquePaiementsComponent implements OnInit {
  
  private supabase = createClient(
    'https://nmwnibzgvwltipmtwhzo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndssdGlwbXR3aHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxOTU5NzE1NCwiZXhwIjoyMDM1MTczMTU0fQ.4lmzOZ_J_lTmIUcJqn4pUE5Y_z0x1zGSJgQI1Bp6mxs'
  );
  
  paiements: any[] = [];
  loading = false;
  loadingMore = false;
  error = '';
  totalPaiements = 0;
  montantTotal = 0;
  currentPage = 0;
  pageSize = 20;

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.loading = true;
    this.error = '';
    this.currentPage = 0;
    
    try {
      const { data, error } = await this.supabase
        .from('historique_paiements_complet')
        .select('*')
        .range(0, this.pageSize - 1)
        .order('date_paiement', { ascending: false });

      if (error) throw error;

      this.paiements = data || [];
      this.calculateStats();
      
    } catch (error: any) {
      this.error = error.message || 'Erreur lors du chargement des données';
      console.error('Erreur historique:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadMore() {
    this.loadingMore = true;
    this.currentPage++;
    
    try {
      const from = this.currentPage * this.pageSize;
      const to = from + this.pageSize - 1;
      
      const { data, error } = await this.supabase
        .from('historique_paiements_complet')
        .select('*')
        .range(from, to)
        .order('date_paiement', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        this.paiements = [...this.paiements, ...data];
        this.calculateStats();
      }
      
    } catch (error: any) {
      this.error = error.message || 'Erreur lors du chargement';
      console.error('Erreur loadMore:', error);
    } finally {
      this.loadingMore = false;
    }
  }

  private calculateStats() {
    this.totalPaiements = this.paiements.length;
    this.montantTotal = this.paiements.reduce((sum, p) => sum + (p.montant_paye || 0), 0);
  }

  formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0
    }).format(montant || 0);
  }

  getStatutColor(statut: string): string {
    switch (statut?.toLowerCase()) {
      case 'confirme':
      case 'completed':
        return '#d4edda';
      case 'en_attente':
      case 'pending':
        return '#fff3cd';
      case 'echec':
      case 'failed':
        return '#f8d7da';
      default:
        return '#d1ecf1';
    }
  }

  getStatutTextColor(statut: string): string {
    switch (statut?.toLowerCase()) {
      case 'confirme':
      case 'completed':
        return '#155724';
      case 'en_attente':
      case 'pending':
        return '#856404';
      case 'echec':
      case 'failed':
        return '#721c24';
      default:
        return '#0c5460';
    }
  }
}