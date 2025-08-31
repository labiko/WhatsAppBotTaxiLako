import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup } from '@angular/forms';
import { 
  HistoriquePaiementService, 
  HistoriquePaiement, 
  HistoriqueFilters 
} from './historique-paiement.service';

@Component({
  selector: 'app-historique-paiements',
  templateUrl: './historique-paiements.component.html',
  styleUrls: ['./historique-paiements.component.scss']
})
export class HistoriquePaiementsComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Table configuration
  displayedColumns: string[] = [
    'date_formatee',
    'entreprise_nom',
    'montant_paye',
    'methode_paiement',
    'reference_paiement',
    'statut',
    'variation_balance',
    'actions'
  ];
  
  dataSource = new MatTableDataSource<HistoriquePaiement>([]);
  
  // Pagination
  totalElements = 0;
  pageSize = 20;
  pageIndex = 0;
  pageSizeOptions: number[] = [10, 20, 50, 100];

  // Loading states
  loading = false;
  loadingStats = false;
  
  // Filters
  filterForm: FormGroup;
  entreprisesList: { id: string; nom: string }[] = [];
  methodesPaiementList: string[] = [];
  
  // Statistics
  statistics = {
    totalPaiements: 0,
    montantTotal: 0,
    dernierpaiement: null as HistoriquePaiement | null,
    statutsCount: {} as { [key: string]: number }
  };

  constructor(
    private historiquePaiementService: HistoriquePaiementService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    // Initialisation du formulaire de filtres
    this.filterForm = this.fb.group({
      entreprise_id: [''],
      statut: [''],
      date_debut: [''],
      date_fin: [''],
      methode_paiement: [''],
      montant_min: [''],
      montant_max: ['']
    });
  }

  async ngOnInit() {
    await this.loadInitialData();
    this.setupFormSubscriptions();
  }

  private async loadInitialData() {
    try {
      // Charger les données en parallèle
      await Promise.all([
        this.loadHistorique(),
        this.loadStatistics(),
        this.loadFilterOptions()
      ]);
    } catch (error) {
      this.showError('Erreur lors du chargement des données');
      console.error('Erreur loadInitialData:', error);
    }
  }

  private async loadHistorique() {
    this.loading = true;
    
    try {
      const filters = this.getFiltersFromForm();
      const response = await this.historiquePaiementService.getHistoriquePaiements(
        filters,
        this.pageIndex + 1,
        this.pageSize
      );

      this.dataSource.data = response.data;
      this.totalElements = response.total;
      
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
      this.showError('Erreur lors du chargement de l\'historique des paiements');
    } finally {
      this.loading = false;
    }
  }

  private async loadStatistics() {
    this.loadingStats = true;
    
    try {
      this.statistics = await this.historiquePaiementService.getStatistiquesHistorique();
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
      this.showError('Erreur lors du chargement des statistiques');
    } finally {
      this.loadingStats = false;
    }
  }

  private async loadFilterOptions() {
    try {
      // Charger les options pour les filtres
      const [entreprises, methodes] = await Promise.all([
        this.historiquePaiementService.getEntreprisesList(),
        this.historiquePaiementService.getMethodesPaiementList()
      ]);

      this.entreprisesList = entreprises;
      this.methodesPaiementList = methodes;
      
    } catch (error) {
      console.error('Erreur lors du chargement des options de filtre:', error);
    }
  }

  private setupFormSubscriptions() {
    // Réagir aux changements de filtres avec debounce
    this.filterForm.valueChanges.subscribe(() => {
      // Réinitialiser la pagination lors du changement de filtres
      this.pageIndex = 0;
      this.loadHistorique();
    });
  }

  private getFiltersFromForm(): HistoriqueFilters {
    const formValue = this.filterForm.value;
    const filters: HistoriqueFilters = {};

    if (formValue.entreprise_id) filters.entreprise_id = formValue.entreprise_id;
    if (formValue.statut) filters.statut = formValue.statut;
    if (formValue.date_debut) filters.date_debut = formValue.date_debut;
    if (formValue.date_fin) filters.date_fin = formValue.date_fin;
    if (formValue.methode_paiement) filters.methode_paiement = formValue.methode_paiement;
    if (formValue.montant_min) filters.montant_min = parseFloat(formValue.montant_min);
    if (formValue.montant_max) filters.montant_max = parseFloat(formValue.montant_max);

    return filters;
  }

  // Event handlers
  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadHistorique();
  }

  clearFilters() {
    this.filterForm.reset();
    this.pageIndex = 0;
    this.loadHistorique();
  }

  async exportToCsv() {
    try {
      this.loading = true;
      const filters = this.getFiltersFromForm();
      const csvContent = await this.historiquePaiementService.exportToCsv(filters);
      
      // Téléchargement du fichier
      this.downloadCsv(csvContent, `historique_paiements_${new Date().toISOString().split('T')[0]}.csv`);
      
      this.showSuccess('Export CSV terminé avec succès');
      
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      this.showError('Erreur lors de l\'export CSV');
    } finally {
      this.loading = false;
    }
  }

  private downloadCsv(content: string, fileName: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // Utilitaires pour l'affichage
  formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0
    }).format(amount);
  }

  getStatutBadgeClass(statut: string): string {
    switch (statut?.toLowerCase()) {
      case 'completed':
      case 'confirmé':
      case 'payé':
        return 'badge-success';
      case 'pending':
      case 'en_attente':
        return 'badge-warning';
      case 'failed':
      case 'échec':
      case 'erreur':
        return 'badge-danger';
      default:
        return 'badge-info';
    }
  }

  getVariationBadgeClass(variation: number): string {
    if (variation > 0) return 'badge-success';
    if (variation < 0) return 'badge-danger';
    return 'badge-secondary';
  }

  // Messages utilisateur
  private showSuccess(message: string) {
    this.snackBar.open(message, '✓', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string) {
    this.snackBar.open(message, '✗', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  // Actions sur les lignes
  viewPaiementDetails(paiement: HistoriquePaiement) {
    // À implémenter selon vos besoins
    console.log('Détails du paiement:', paiement);
    // Ouvrir une modal ou naviguer vers une page de détails
  }

  refresh() {
    this.loadInitialData();
  }
}