import { Component, OnInit } from '@angular/core';
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
export class AdminDashboardComponent implements OnInit {
  loading = false;
  error = '';
  commentDraft: Record<number, string> = {};

  statusFilter = '';
  stats: any = { pending: 0, approved: 0, rejected: 0, totalCustomers: 0, totalCharities: 0, totalDonation: 0 };
  requests: any[] = [];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';

    this.api.getAdminDashboard().subscribe({
      next: (res: any) => {
        this.stats = res?.stats ?? this.stats;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Failed to load admin dashboard.';
      }
    });

    this.fetchRequests();
  }

  fetchRequests(): void {
    this.api.getAdminCharityRequests(this.statusFilter || undefined).subscribe({
      next: (res: any) => {
        this.requests = res?.items ?? [];
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load charity requests.';
      }
    });
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
}
