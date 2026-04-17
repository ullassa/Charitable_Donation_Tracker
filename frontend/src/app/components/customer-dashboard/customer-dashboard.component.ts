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
  monthly: Array<{ label: string; amount: number }> = [];
  recent: Array<{ donationId: number; amount: number; donationDate: string; charityName: string }> = [];
  notifications: Array<{ notificationId: number; message: string; sentAt: string; type: string }> = [];

  fromDate = '';
  toDate = '';
  reportFormat: 'csv' | 'pdf' = 'csv';
  chartType: 'bar' | 'pie' | 'donut' = 'bar';
  private notificationsPoller: ReturnType<typeof setInterval> | null = null;

  private readonly storageListener = (event: StorageEvent): void => {
    if (event.key === 'cf:notify:refresh' || event.key === 'cf:auth:changed') {
      this.loadNotifications();
    }
  };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.load();
    this.notificationsPoller = setInterval(() => this.loadNotifications(), 15000);
    window.addEventListener('storage', this.storageListener);
  }

  ngOnDestroy(): void {
    if (this.notificationsPoller) {
      clearInterval(this.notificationsPoller);
      this.notificationsPoller = null;
    }

    window.removeEventListener('storage', this.storageListener);
  }

  load(): void {
    this.loading = true;
    this.error = '';

    this.api.getCustomerDashboard(this.fromDate || undefined, this.toDate || undefined).subscribe({
      next: (res: any) => {
        this.stats = res?.stats ?? this.stats;
        this.monthly = res?.monthly ?? [];
        this.recent = res?.recent ?? [];
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Failed to load customer dashboard.';
      }
    });

    this.loadNotifications();
  }

  private loadNotifications(): void {
    this.api.getNotifications().subscribe({
      next: (res: any) => {
        this.notifications = res?.items ?? [];
      }
    });
  }

  get maxMonthlyAmount(): number {
    return Math.max(1, ...this.monthly.map(item => item.amount || 0));
  }

  barWidth(amount: number): string {
    const width = (amount / this.maxMonthlyAmount) * 100;
    return `${Math.max(8, width)}%`;
  }

  get latestMonthShare(): number {
    if (!this.monthly.length || !this.stats.totalDonations) return 0;
    const latest = this.monthly[this.monthly.length - 1]?.amount ?? 0;
    return Math.round((latest / this.stats.totalDonations) * 100);
  }

  get donutStyle(): string {
    const pct = Math.max(0, Math.min(100, this.latestMonthShare));
    return `conic-gradient(#3b82f6 0 ${pct}%, #e5e7eb ${pct}% 100%)`;
  }

  applyDateFilter(): void {
    this.load();
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
