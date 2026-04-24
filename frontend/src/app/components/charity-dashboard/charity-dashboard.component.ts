import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-charity-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, FooterComponent],
  templateUrl: './charity-dashboard.component.html',
  styleUrls: ['./charity-dashboard.component.css']
})
export class CharityDashboardComponent implements OnInit, OnDestroy {
  loading = false;
  error = '';

  charity: any = null;
  stats = { totalCollected: 0, donationsCount: 0, targetAmount: 0, remainingAmount: 0, progressPercent: 0 };
  monthly: Array<{ label: string; amount: number }> = [];
  recent: Array<{ donationId: number; donorName: string; amount: number; paymentMethod: string; donationDate: string }> = [];

  showTrend = false;

  fromDate = '';
  toDate = '';
  reportFormat: 'csv' | 'pdf' = 'csv';

  private readonly storageListener = (event: StorageEvent): void => {
    if (event.key === 'cf:notify:refresh' || event.key === 'cf:auth:changed' || event.key === 'cf:profile:refresh') {
      this.load();
    }
  };

  constructor(private api: ApiService) {}

  get normalizedStatus(): string {
    const raw = (this.charity?.status ?? '').toString().trim().toLowerCase();
    if (!raw) return 'pending';

    if (raw === 'approved' || raw === '2') return 'approved';
    if (raw === 'rejected' || raw === '3') return 'rejected';
    if (raw === 'hold' || raw === '5') return 'hold';
    if (raw === 'removed' || raw === '4') return 'hold';

    return 'pending';
  }

  get isApproved(): boolean {
    return this.normalizedStatus === 'approved';
  }

  ngOnInit(): void {
    this.load();
    window.addEventListener('storage', this.storageListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener('storage', this.storageListener);
  }

  load(): void {
    this.loading = true;
    this.error = '';

    this.api.getCharityDashboard(this.fromDate || undefined, this.toDate || undefined).subscribe({
      next: (res: any) => {
        this.charity = res?.charity;
        this.stats = res?.stats ?? this.stats;
        this.monthly = res?.monthly ?? [];
        this.recent = res?.recent ?? [];
        this.showTrend = this.isApproved;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Failed to load charity dashboard.';
      }
    });
  }

  get latestMonthAmount(): number {
    if (!this.monthly.length) return 0;
    return this.monthly[this.monthly.length - 1].amount;
  }

  get charityProgressPercent(): number {
    const progress = Number(this.stats?.progressPercent ?? 0);
    if (Number.isNaN(progress)) return 0;
    return Math.max(0, Math.min(100, progress));
  }

  get progressPieStyle(): string {
    const percent = this.charityProgressPercent;
    return `conic-gradient(#22c55e 0 ${percent}%, #e2e8f0 ${percent}% 100%)`;
  }

  get maxMonthlyAmount(): number {
    return Math.max(1, ...this.monthly.map(item => item.amount || 0));
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

  get yAxisStep(): number {
    return this.getNiceStep(this.maxMonthlyAmount, 5);
  }

  get yAxisMax(): number {
    const step = this.yAxisStep;
    return Math.max(step, Math.ceil(this.maxMonthlyAmount / step) * step);
  }

  get yAxisTicks(): number[] {
    const ticks: number[] = [];
    for (let value = this.yAxisMax; value >= 0; value -= this.yAxisStep) {
      ticks.push(value);
    }
    return ticks;
  }

  barHeight(amount: number): string {
    const height = (Math.max(0, amount) / this.yAxisMax) * 100;
    return `${Math.max(10, height)}%`;
  }

  itemTrackBy(index: number, item: { label: string; amount: number }): string {
    return `${item.label}-${item.amount}-${index}`;
  }

  applyDateFilter(): void {
    this.showTrend = true;
    this.load();
  }

  showTrendChart(): void {
    this.showTrend = true;
  }

  downloadReport(): void {
    this.api.downloadCharityReport(this.fromDate || undefined, this.toDate || undefined, this.reportFormat).subscribe({
      next: (blob) => this.saveBlob(blob, `charity-report.${this.reportFormat}`),
      error: () => (this.error = 'Unable to download report right now.')
    });
  }

  private saveBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }
}
