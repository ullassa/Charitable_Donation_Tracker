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
  notifications: Array<{ notificationId: number; message: string; sentAt: string; type: string }> = [];

  fromDate = '';
  toDate = '';
  reportFormat: 'csv' | 'pdf' = 'csv';
  trendGroupBy: 'day' | 'week' | 'month' | 'year' = 'month';
  private notificationsPoller: ReturnType<typeof setInterval> | null = null;
  private fallbackTrend: Array<{ label: string; amount: number }> = [];

  private readonly storageListener = (event: StorageEvent): void => {
    if (event.key === 'cf:notify:refresh' || event.key === 'cf:auth:changed' || event.key === 'cf:profile:refresh') {
      this.loadNotifications();
      this.load();
    }
  };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.load();
    this.notificationsPoller = setInterval(() => this.loadNotifications(), 2000);
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

    this.loadNotifications();
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

  private loadNotifications(): void {
    this.api.getNotifications().subscribe({
      next: (res: any) => {
        const rawItems = Array.isArray(res?.items) ? res.items : [];
        const mapped = rawItems
          .map((item: any) => ({
            notificationId: Number(item?.notificationId ?? 0),
            message: String(item?.message ?? ''),
            sentAt: String(item?.sentAt ?? ''),
            type: String(item?.type ?? 'General')
          }))
          .filter((item: any) => item.message || item.sentAt || item.notificationId > 0);

        const uniqueByKey = new Map<string, { notificationId: number; message: string; sentAt: string; type: string }>();
        for (const item of mapped) {
          const normalizedMessage = item.message.trim().toLowerCase().replace(/\s+/g, ' ');
          const normalizedType = item.type.trim().toLowerCase();
          const key = normalizedMessage
            ? `msg:${normalizedMessage}|type:${normalizedType}`
            : (item.notificationId > 0 ? `id:${item.notificationId}` : `fallback:${item.sentAt}`);

          const existing = uniqueByKey.get(key);
          if (!existing || new Date(item.sentAt).getTime() > new Date(existing.sentAt).getTime()) {
            uniqueByKey.set(key, item);
          }
        }

        this.notifications = Array.from(uniqueByKey.values())
          .sort((left, right) => new Date(right.sentAt).getTime() - new Date(left.sentAt).getTime())
          .slice(0, 20);
      },
      error: () => {
        this.notifications = [];
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

  applyDateFilter(): void {
    this.load();
  }

  onTrendGroupChanged(): void {
    this.loadTrend(this.fallbackTrend);
  }

  itemTrackBy(index: number, item: { label: string; amount: number }): string {
    return `${item.label}-${item.amount}-${index}`;
  }

  notificationTrackBy(index: number, item: { notificationId: number; sentAt: string; message: string }): string {
    if (item.notificationId > 0) {
      return `n-${item.notificationId}`;
    }

    return `n-${item.sentAt}-${item.message}-${index}`;
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
