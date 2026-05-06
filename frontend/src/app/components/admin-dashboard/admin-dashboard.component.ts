import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeaderComponent, FooterComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  loading = false;
  error = '';
  commentDraft: Record<number, string> = {};
  expandedRequestId: number | null = null;
  expandedDonorId: number | null = null;
  expandedDonationId: number | null = null;
  activePanel: 'donors' | 'charities' | 'feedback' = 'donors';

  statusFilter = '';
  donorFrom = '';
  donorTo = '';
  donationNameFilter = '';
  donationFrom: string | Date | undefined = undefined;
  donationTo: string | Date | undefined = undefined;
  donationSort: 'desc' | 'asc' = 'desc';
  stats: any = { pending: 0, approved: 0, rejected: 0, hold: 0, totalCustomers: 0, totalCharities: 0, totalDonors: 0, totalDonation: 0 };
  requests: any[] = [];
  donors: any[] = [];
  feedbacks: any[] = [];
  donationMonthlyTrend: Array<{ label: string; amount: number }> = [];
  causeTrend: Array<{ cause: string; amount: number }> = [];

  constructor(private api: ApiService) {}

  private normalizeImageUrl(url?: string | null): string {
    const raw = (url || '').trim();
    if (!raw) {
      return '';
    }

    if (/^https?:\/\//i.test(raw)) {
      return raw;
    }

    const path = raw.startsWith('/') ? raw : `/${raw}`;
    const apiBase = this.api.baseUrl.replace(/\/api\/?$/i, '');
    return `${apiBase}${path}`;
  }

  ngOnInit(): void {
    this.load();
  }

  setActivePanel(panel: 'donors' | 'charities' | 'feedback'): void {
    this.activePanel = panel;
    if (panel === 'donors' && this.donors.length === 0) {
      this.fetchDonors();
    }
    if (panel === 'charities' && this.requests.length === 0) {
      this.fetchRequests();
    }
    if (panel === 'feedback' && this.feedbacks.length === 0) {
      this.fetchFeedbacks();
    }
  }

  ngOnDestroy(): void {
  }

  load(): void {
    this.loading = true;
    this.error = '';

    this.api.getAdminDashboard().subscribe({
      next: (res: any) => {
        this.stats = res?.stats ?? this.stats;
        this.fetchAnalytics();
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
    } else if (this.activePanel === 'charities') {
      this.fetchRequests();
    } else {
      this.fetchFeedbacks();
    }
  }

  fetchDonors(): void {
    this.api.getAdminDonors(this.donorFrom || undefined, this.donorTo || undefined).subscribe({
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

  clearDonorFilters(): void {
    this.donorFrom = '';
    this.donorTo = '';
    this.fetchDonors();
  }

  clearDonationFilters(): void {
    this.donationNameFilter = '';
    this.donationFrom = undefined;
    this.donationTo = undefined;
    this.expandedDonationId = null;
  }

  fetchDonersDateFiltered(fromDate?: string | Date, toDate?: string | Date): void {
    (this.api.getAdminDonors as any)(fromDate as any, toDate as any).subscribe({
      next: (res: any) => {
        this.donors = res?.items ?? [];
      },
      error: (err: any) => {
        this.error = err?.error?.message || 'Failed to load donor details.';
      }
    });
  }

  toggleDonationDetails(id: number): void {
    this.expandedDonationId = this.expandedDonationId === id ? null : id;
  }

  isDonationDetailsOpen(id: number): boolean {
    return this.expandedDonationId === id;
  }

  get donationRows(): Array<{
    donationId: number;
    donorName: string;
    donorEmail: string;
    amount: number;
    donationDate: Date;
    charityName: string;
    paymentMethod: string;
    transactionReference?: string;
  }> {
    return this.donors.flatMap(donor =>
      (donor?.donations ?? []).map((donation: any) => ({
        donationId: Number(donation?.donationId ?? donation?.id ?? 0),
        donorName: donation?.donorName || donor?.name || 'Anonymous',
        donorEmail: donation?.donorEmail || donor?.email || 'Hidden',
        amount: Number(donation?.amount || 0),
        donationDate: donation?.donationDate ? new Date(donation.donationDate) : new Date(0),
        charityName: donation?.charityName || 'Not provided',
        paymentMethod: donation?.paymentMethod || 'Unknown',
        transactionReference: donation?.transactionReference
      }))
    );
  }

  get filteredDonationRows(): Array<{
    donationId: number;
    donorName: string;
    donorEmail: string;
    amount: number;
    donationDate: Date;
    charityName: string;
    paymentMethod: string;
    transactionReference?: string;
  }> {
    const nameFilter = (this.donationNameFilter || '').trim().toLowerCase();
    const from = this.toDateValue(this.donationFrom);
    const to = this.toDateValue(this.donationTo);

    if (to) {
      to.setHours(23, 59, 59, 999);
    }

    const filtered = this.donationRows.filter(row => {
      const donorName = (row.donorName || '').toLowerCase();
      if (nameFilter && !donorName.includes(nameFilter)) {
        return false;
      }

      const donationDate = this.toDateValue(row.donationDate);
      if (from && donationDate && donationDate < from) {
        return false;
      }

      if (to && donationDate && donationDate > to) {
        return false;
      }

      return true;
    });

    return filtered.sort((a, b) =>
      this.donationSort === 'asc'
        ? a.amount - b.amount
        : b.amount - a.amount
    );
  }

  private toDateValue(value: string | Date | undefined | null): Date | null {
    if (!value) {
      return null;
    }

    const parsed = value instanceof Date ? new Date(value) : new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  get topDonors(): any[] {
    return [...this.donors]
      .filter(donor => Number(donor?.totalDonated || 0) > 0)
      .sort((a, b) => Number(b?.totalDonated || 0) - Number(a?.totalDonated || 0))
      .slice(0, 5);
  }

  fetchFeedbacks(): void {
    this.api.getAdminFeedbacks().subscribe({
      next: (res: any) => {
        this.feedbacks = res?.items ?? [];
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load feedback details.';
      }
    });
  }

  fetchAnalytics(): void {
    this.api.getAdminAnalytics(6).subscribe({
      next: (res: any) => {
        this.donationMonthlyTrend = (res?.monthly ?? []).map((item: any) => ({
          label: String(item?.label ?? ''),
          amount: Number(item?.amount ?? 0)
        }));

        this.causeTrend = (res?.causes ?? []).map((item: any) => ({
          cause: String(item?.cause ?? 'Unknown'),
          amount: Number(item?.amount ?? 0)
        }));
      },
      error: () => {
        this.donationMonthlyTrend = [];
        this.causeTrend = [];
      }
    });
  }

  get kpiCards(): Array<{ label: string; value: string | number; variant: 'pending' | 'approved' | 'rejected' | 'neutral' }> {
    if (this.activePanel === 'charities') {
      return [
        { label: 'Pending', value: this.stats.pending || 0, variant: 'pending' },
        { label: 'Approved', value: this.stats.approved || 0, variant: 'approved' },
        { label: 'Rejected', value: this.stats.rejected || 0, variant: 'rejected' },
        { label: 'Hold', value: this.stats.hold || 0, variant: 'neutral' }
      ];
    }

    if (this.activePanel === 'feedback') {
      const total = this.feedbacks.length;
      const average = total > 0
        ? this.feedbacks.reduce((sum, item) => sum + Number(item?.rating || 0), 0) / total
        : 0;
      const positive = total > 0
        ? Math.round((this.feedbacks.filter(item => Number(item?.rating || 0) >= 4).length / total) * 100)
        : 0;

      return [
        { label: 'Feedback', value: total, variant: 'neutral' },
        { label: 'Avg Rating', value: average ? `${average.toFixed(1)}/5` : '0/5', variant: 'approved' },
        { label: 'Positive', value: `${positive}%`, variant: 'approved' },
        { label: 'Users', value: (this.stats.totalCustomers || 0) + (this.stats.totalCharities || 0), variant: 'neutral' }
      ];
    }

    const donorCount = this.stats.totalDonors || this.donors.length;
    const totalDonation = this.stats.totalDonation || this.donors.reduce((sum, item) => sum + Number(item?.totalDonated || 0), 0);
    const donationCount = this.donors.reduce((sum, item) => sum + Number(item?.donationsCount || 0), 0);
    const averageDonation = donorCount > 0 ? totalDonation / donorCount : 0;

    return [
      { label: 'Donors', value: donorCount, variant: 'neutral' },
      { label: 'Donations', value: `₹${this.formatNumber(totalDonation)}`, variant: 'approved' },
      { label: 'Donation Count', value: donationCount, variant: 'neutral' },
      { label: 'Avg Donation', value: `₹${this.formatNumber(averageDonation)}`, variant: 'neutral' }
    ];
  }

  private formatNumber(value: number): string {
    if (!Number.isFinite(value)) return '0';
    return Math.round(value).toLocaleString('en-IN');
  }

  fetchRequests(): void {
    this.api.getAdminCharityRequests(this.statusFilter || undefined).subscribe({
      next: (res: any) => {
        this.requests = (res?.items ?? []).map((item: any) => ({
          ...item,
          imageUrls: Array.isArray(item?.imageUrls)
            ? item.imageUrls
                .map((url: any) => this.normalizeImageUrl(typeof url === 'string' ? url : ''))
                .filter((url: string) => !!url)
            : []
        }));
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

  review(id: number, action: 'approve' | 'reject' | 'hold'): void {
    const label = action;
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
      { label: 'Rejected', amount: Number(this.stats.rejected || 0) },
      { label: 'Hold', amount: Number(this.stats.hold || 0) }
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
      ['#ef4444', '#dc2626'],
      ['#6366f1', '#4f46e5']
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
      { label: 'Rejected', value: String(this.stats.rejected || 0) },
      { label: 'Hold', value: String(this.stats.hold || 0) }
    ];
  }

  get maxDonationTrendAmount(): number {
    return Math.max(1, ...this.donationMonthlyTrend.map(item => item.amount || 0));
  }

  donationTrendHeight(amount: number): string {
    const height = (Math.max(0, amount) / this.maxDonationTrendAmount) * 100;
    return `${Math.max(10, height)}%`;
  }

  get maxCauseAmount(): number {
    return Math.max(1, ...this.causeTrend.map(item => item.amount || 0));
  }

  causeBarWidth(amount: number): string {
    const width = (Math.max(0, amount) / this.maxCauseAmount) * 100;
    return `${Math.max(8, width)}%`;
  }
}
