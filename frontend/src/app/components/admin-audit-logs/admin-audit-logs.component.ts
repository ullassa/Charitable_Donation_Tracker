import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { ApiService } from '../../services/api.service';

interface AuditLogItem {
  id: number;
  time: string;
  userId: number | null;
  userName: string;
  role: string;
  action: string;
  entity: string;
  entityId?: number | null;
  details: string;
}

@Component({
  selector: 'app-admin-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, FooterComponent],
  templateUrl: './admin-audit-logs.component.html',
  styleUrls: ['./admin-audit-logs.component.css']
})
export class AdminAuditLogsComponent implements OnInit {
  logs: AuditLogItem[] = [];
  loading = false;
  error = '';
  expandedLogId: number | null = null;

  roleFilter = 'All';
  actionFilter = 'All';
  fromDate = '';
  toDate = '';

  currentPage = 1;
  pageSize = 20;

  readonly roleOptions = ['All', 'Customer', 'CharityManager', 'Admin'];
  readonly actionOptions = ['All', 'Create', 'Update', 'Delete', 'Approve', 'Reject', 'Login', 'Donation'];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading = true;
    this.error = '';

    this.api.getAdminAuditLogs().subscribe({
      next: (res: any) => {
        this.logs = res?.items ?? [];
        this.loading = false;
        this.currentPage = 1;
        this.expandedLogId = null;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Failed to load audit logs.';
      }
    });
  }

  toggleLogDetails(id: number): void {
    this.expandedLogId = this.expandedLogId === id ? null : id;
  }

  isLogOpen(id: number): boolean {
    return this.expandedLogId === id;
  }

  clearFilters(): void {
    this.roleFilter = 'All';
    this.actionFilter = 'All';
    this.fromDate = '';
    this.toDate = '';
    this.currentPage = 1;
  }

  get filteredLogs(): AuditLogItem[] {
    const role = this.roleFilter.toLowerCase();
    const action = this.actionFilter.toLowerCase();
    const from = this.fromDate ? new Date(this.fromDate) : null;
    const to = this.toDate ? new Date(this.toDate) : null;

    if (to) {
      to.setHours(23, 59, 59, 999);
    }

    return this.logs.filter(item => {
      const itemRole = (item.role || '').toLowerCase();
      const itemAction = (item.action || '').toLowerCase();
      const time = item.time ? new Date(item.time) : null;

      if (role !== 'all' && itemRole !== role) {
        return false;
      }

      if (action !== 'all' && itemAction !== action) {
        return false;
      }

      if (from && time && time < from) {
        return false;
      }

      if (to && time && time > to) {
        return false;
      }

      return true;
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredLogs.length / this.pageSize));
  }

  get pagedLogs(): AuditLogItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredLogs.slice(start, start + this.pageSize);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage += 1;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
    }
  }

  getDetailsPreview(details: string): string {
    const safe = (details || '').trim();
    if (!safe) return '—';
    return safe.length > 120 ? `${safe.slice(0, 120)}...` : safe;
  }

  getDetailsLines(details: string): string[] {
    const safe = (details || '').trim();
    if (!safe) return [];
    return safe
      .split(/\r?\n|\s*;\s*/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }
}
