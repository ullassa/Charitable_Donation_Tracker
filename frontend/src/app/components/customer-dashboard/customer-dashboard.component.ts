import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, FooterComponent],
  templateUrl: './customer-dashboard.component.html',
  styleUrls: ['./customer-dashboard.component.css']
})
export class CustomerDashboardComponent implements OnInit, OnDestroy {
  loading = false;
  error = '';

  stats = { totalDonations: 0, donationsCount: 0 };
  trend: Array<{ label: string; amount: number }> = [];
  recent: Array<{ donationId: number; amount: number; donationDate: string; charityName: string }> = [];

  fromDate = '';
  toDate = '';
  reportFormat: 'csv' | 'pdf' = 'csv';
  trendGroupBy: 'day' | 'week' | 'month' | 'year' = 'month';
  private fallbackTrend: Array<{ label: string; amount: number }> = [];

  private readonly storageListener = (event: StorageEvent): void => {
    if (event.key === 'cf:notify:refresh' || event.key === 'cf:auth:changed' || event.key === 'cf:profile:refresh') {
      this.load();
    }
  };

  constructor(private api: ApiService) {}

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

    this.api.getCustomerDashboard(this.fromDate || undefined, this.toDate || undefined).subscribe({
      next: (res: any) => {
        this.stats = res?.stats ?? this.stats;
        this.recent = res?.recent ?? [];
        this.fallbackTrend = (res?.monthly ?? []).map((item: any) => ({
          label: String(item?.label ?? ''),
          amount: Number(item?.amount ?? 0)
        }));
        this.loadTrend(this.fallbackTrend);
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Failed to load customer dashboard.';
      }
    });
  }

  private loadTrend(fallback: Array<{ label: string; amount: number }> = []): void {
    this.api.getCustomerTrend(this.trendGroupBy, this.fromDate || undefined, this.toDate || undefined).subscribe({
      next: (res: any) => {
        const items = (res?.items ?? []).map((item: any) => ({
          label: String(item?.label ?? ''),
          amount: Number(item?.amount ?? 0)
        }));
        this.trend = items.length ? items : fallback;
      },
      error: () => {
        this.trend = fallback;
      }
    });
  }

  get maxTrendAmount(): number {
    return Math.max(1, ...this.trend.map(item => item.amount || 0));
  }

  barWidth(amount: number): string {
    const width = (Math.max(0, amount) / this.maxTrendAmount) * 100;
    return `${Math.max(12, width)}%`;
  }

  barHeight(amount: number): string {
    const height = (Math.max(0, amount) / this.maxTrendAmount) * 100;
    return `${Math.max(10, height)}%`;
  }

  barColor(index: number): string {
    const palette = [
      ['#22c55e', '#16a34a'],
      ['#3b82f6', '#2563eb'],
      ['#8b5cf6', '#7c3aed'],
      ['#ec4899', '#db2777'],
      ['#f59e0b', '#d97706'],
      ['#06b6d4', '#0891b2'],
      ['#ef4444', '#dc2626']
    ];

    const [start, end] = palette[index % palette.length];
    return `linear-gradient(180deg, ${start}, ${end})`;
  }

  applyDateFilter(): void {
    this.load();
  }

  onTrendGroupChanged(): void {
    this.loadTrend(this.fallbackTrend);
  }

  itemTrackBy(index: number, item: { label: string; amount: number }): string {
    return `${item.label}-${item.amount}-${index}`;
  }

  downloadReport(): void {
    this.api.downloadCustomerReport(this.fromDate || undefined, this.toDate || undefined, this.reportFormat).subscribe({
      next: (blob) => this.saveBlob(blob, `customer-report.${this.reportFormat}`),
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
