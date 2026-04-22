import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, FooterComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  loading = false;
  error = '';
  commentDraft: Record<number, string> = {};
  expandedRequestId: number | null = null;
  expandedDonorId: number | null = null;
  activePanel: 'donors' | 'charities' = 'donors';

  statusFilter = '';
  stats: any = { pending: 0, approved: 0, rejected: 0, totalCustomers: 0, totalCharities: 0, totalDonors: 0, totalDonation: 0 };
  requests: any[] = [];
  donors: any[] = [];

  private readonly backListener = (): void => {
    window.history.pushState(null, '', window.location.href);
  };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.load();
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', this.backListener);
  }

  setActivePanel(panel: 'donors' | 'charities'): void {
    this.activePanel = panel;
    if (panel === 'donors' && this.donors.length === 0) {
      this.fetchDonors();
    }
    if (panel === 'charities' && this.requests.length === 0) {
      this.fetchRequests();
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('popstate', this.backListener);
  }

  load(): void {
    this.loading = true;
    this.error = '';

    this.api.getAdminDashboard().subscribe({
      next: (res: any) => {
        this.stats = res?.stats ?? this.stats;
        this.loading = false;
        this.fetchPanelData();
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Failed to load admin dashboard.';
      }
    });

    // panel data fetched after stats load
  }

  private fetchPanelData(): void {
    if (this.activePanel === 'donors') {
      this.fetchDonors();
    } else {
      this.fetchRequests();
    }
  }

  fetchDonors(): void {
    this.api.getAdminDonors().subscribe({
      next: (res: any) => {
        this.donors = res?.items ?? [];
        if (this.expandedDonorId !== null && !this.donors.some(item => item.donorId === this.expandedDonorId)) {
          this.expandedDonorId = null;
        }
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load donor details.';
      }
    });
  }

  fetchRequests(): void {
    this.api.getAdminCharityRequests(this.statusFilter || undefined).subscribe({
      next: (res: any) => {
        this.requests = res?.items ?? [];
        if (this.expandedRequestId !== null && !this.requests.some(item => item.charityRegistrationId === this.expandedRequestId)) {
          this.expandedRequestId = null;
        }
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load charity requests.';
      }
    });
  }

  toggleDetails(id: number): void {
    this.expandedRequestId = this.expandedRequestId === id ? null : id;
  }

  isDetailsOpen(id: number): boolean {
    return this.expandedRequestId === id;
  }

  toggleDonorDetails(id: number): void {
    this.expandedDonorId = this.expandedDonorId === id ? null : id;
  }

  isDonorDetailsOpen(id: number): boolean {
    return this.expandedDonorId === id;
  }

  review(id: number, action: 'approve' | 'reject'): void {
    const label = action === 'approve' ? 'approve' : 'reject';
    const confirmed = window.confirm(`Are you sure you want to ${label} this charity request?`);
    if (!confirmed) {
      return;
    }

    this.api.reviewCharityRequest(id, action, this.commentDraft[id] ?? '').subscribe({
      next: () => {
        localStorage.setItem('cf:notify:refresh', Date.now().toString());
        this.load();
      },
      error: (err) => {
        this.error = err?.error?.message || `Failed to ${action} request.`;
      }
    });
  }

  get totalReviewed(): number {
    return (this.stats.approved || 0) + (this.stats.rejected || 0);
  }

  get approvalPercent(): number {
    const reviewed = this.totalReviewed;
    if (!reviewed) return 0;
    return Math.round(((this.stats.approved || 0) / reviewed) * 100);
  }

  get approvalStyle(): string {
    const pct = Math.max(0, Math.min(100, this.approvalPercent));
    return `conic-gradient(#16a34a 0 ${pct}%, #ef4444 ${pct}% 100%)`;
  }

  getCharityIcon(cause: string | undefined | null): string {
    const normalized = (cause || '').toLowerCase();
    if (normalized.includes('education')) return 'EDU';
    if (normalized.includes('health')) return 'HEALTH';
    if (normalized.includes('child')) return 'CHILD';
    if (normalized.includes('women')) return 'WOMEN';
    if (normalized.includes('animal')) return 'ANIMAL';
    if (normalized.includes('food')) return 'FOOD';
    if (normalized.includes('environment')) return 'GREEN';
    if (normalized.includes('disaster')) return 'RELIEF';
    if (normalized.includes('elder')) return 'ELDER';
    return 'CAUSE';
  }

  get adminTrend(): Array<{ label: string; amount: number }> {
    return [
      { label: 'Pending', amount: Number(this.stats.pending || 0) },
      { label: 'Approved', amount: Number(this.stats.approved || 0) },
      { label: 'Rejected', amount: Number(this.stats.rejected || 0) }
    ];
  }

  get maxAdminTrendAmount(): number {
    return Math.max(1, ...this.adminTrend.map(item => item.amount || 0));
  }

  private getNiceStep(maxValue: number, tickCount: number): number {
    const safeMax = Math.max(1, maxValue);
    const rawStep = safeMax / Math.max(1, tickCount);
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / magnitude;

    let niceNormalized = 1;
    if (normalized > 1 && normalized <= 2) {
      niceNormalized = 2;
    } else if (normalized > 2 && normalized <= 5) {
      niceNormalized = 5;
    } else if (normalized > 5) {
      niceNormalized = 10;
    }

    return niceNormalized * magnitude;
  }

  get adminYAxisStep(): number {
    return this.getNiceStep(this.maxAdminTrendAmount, 5);
  }

  get adminYAxisMax(): number {
    const step = this.adminYAxisStep;
    return Math.max(step, Math.ceil(this.maxAdminTrendAmount / step) * step);
  }

  get adminYAxisTicks(): number[] {
    const ticks: number[] = [];
    for (let value = this.adminYAxisMax; value >= 0; value -= this.adminYAxisStep) {
      ticks.push(value);
    }
    return ticks;
  }

  adminBarHeight(amount: number): string {
    const height = (Math.max(0, amount) / this.adminYAxisMax) * 100;
    return `${Math.max(10, height)}%`;
  }

  adminBarColor(index: number): string {
    const palette = [
      ['#f59e0b', '#d97706'],
      ['#22c55e', '#16a34a'],
      ['#ef4444', '#dc2626']
    ];

    const [start, end] = palette[index % palette.length];
    return `linear-gradient(180deg, ${start}, ${end})`;
  }

  get charityStats(): Array<{ label: string; value: string }> {
    return [
      { label: 'Total charities', value: String(this.stats.totalCharities || 0) },
      { label: 'Total donors', value: String(this.stats.totalDonors || 0) },
      { label: 'Approved', value: String(this.stats.approved || 0) },
      { label: 'Pending', value: String(this.stats.pending || 0) },
      { label: 'Rejected', value: String(this.stats.rejected || 0) }
    ];
  }
}
