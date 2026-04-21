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
  stats = { totalCollected: 0, donationsCount: 0 };
  monthly: Array<{ label: string; amount: number }> = [];
  recent: Array<{ donationId: number; amount: number; donationDate: string }> = [];

  fromDate = '';
  toDate = '';
  reportFormat: 'csv' | 'pdf' = 'csv';

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

    this.api.getCharityDashboard(this.fromDate || undefined, this.toDate || undefined).subscribe({
      next: (res: any) => {
        this.charity = res?.charity;
        this.stats = res?.stats ?? this.stats;
        this.monthly = res?.monthly ?? [];
        this.recent = res?.recent ?? [];
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

  applyDateFilter(): void {
    this.load();
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
