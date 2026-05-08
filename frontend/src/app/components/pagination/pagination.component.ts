import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationService, PaginationOptions } from '../../services/pagination.service';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="pagination-container" *ngIf="totalItems > 0">
      <!-- Items Per Page Selector -->
      <div class="pagination-info">
        <label for="pageSize">Items per page:</label>
        <select
          id="pageSize"
          [(ngModel)]="pageSize"
          (change)="onPageSizeChange()"
          class="page-size-select"
        >
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
        <span class="total-info">
          Showing {{ startIndex + 1 }}-{{ Math.min(endIndex, totalItems) }} of {{ totalItems }} items
        </span>
      </div>

      <!-- Pagination Controls -->
      <div class="pagination-controls">
        <!-- First Page Button -->
        <button
          class="pagination-btn"
          [disabled]="currentPage === 1"
          (click)="goToFirstPage()"
          title="First page"
          aria-label="Go to first page"
        >
          <span class="material-symbols-outlined" aria-hidden="true">first_page</span> First
        </button>

        <!-- Previous Button -->
        <button
          class="pagination-btn"
          [disabled]="currentPage === 1"
          (click)="previousPage()"
          title="Previous page"
          aria-label="Go to previous page"
        >
          ← Previous
        </button>

        <!-- Page Numbers -->
        <div class="page-numbers">
          <button
            *ngFor="let page of pageNumbers"
            class="page-number"
            [class.active]="page === currentPage"
            [disabled]="page === '...'"
            (click)="goToPage(page)"
            [attr.aria-label]="'Go to page ' + page"
            [attr.aria-current]="page === currentPage ? 'page' : undefined"
          >
            {{ page }}
          </button>
        </div>

        <!-- Next Button -->
        <button
          class="pagination-btn"
          [disabled]="currentPage === totalPages"
          (click)="nextPage()"
          title="Next page"
          aria-label="Go to next page"
        >
          Next →
        </button>

        <!-- Last Page Button -->
        <button
          class="pagination-btn"
          [disabled]="currentPage === totalPages"
          (click)="goToLastPage()"
          title="Last page"
          aria-label="Go to last page"
        >
          Last <span class="material-symbols-outlined" aria-hidden="true">last_page</span>
        </button>
      </div>

      <!-- Go to Page Input -->
      <div class="go-to-page">
        <label for="goToInput">Go to page:</label>
        <input
          id="goToInput"
          type="number"
          [value]="currentPage"
          (change)="onGoToInputChange($event)"
          [min]="1"
          [max]="totalPages"
          class="go-to-input"
        >
        <span class="page-count">of {{ totalPages }}</span>
      </div>
    </div>
  `,
  styles: [`
    .pagination-container {
      display: grid;
      gap: 1rem;
      padding: 1.5rem;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
    }

    .pagination-info {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .pagination-info label {
      font-weight: 600;
      color: #64748b;
      font-size: 0.9rem;
    }

    .page-size-select {
      padding: 0.5rem 0.75rem;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
    }

    .page-size-select:hover,
    .page-size-select:focus {
      border-color: #e688d6;
      outline: none;
    }

    .total-info {
      font-size: 0.85rem;
      color: #94a3b8;
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .pagination-btn {
      padding: 0.6rem 1rem;
      border: 1px solid #e5e7eb;
      background: #fff;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.85rem;
      color: #475569;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .pagination-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #e688d6 0%, #41b3a3 100%);
      color: #fff;
      border-color: transparent;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(230, 136, 214, 0.3);
    }

    .pagination-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .pagination-btn:focus-visible {
      outline: 2px solid #e688d6;
      outline-offset: 2px;
    }

    .page-numbers {
      display: flex;
      gap: 0.25rem;
    }

    .page-number {
      width: 36px;
      height: 36px;
      border: 1px solid #e5e7eb;
      background: #fff;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.85rem;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .page-number:hover:not(:disabled) {
      border-color: #e688d6;
      background: rgba(230, 136, 214, 0.05);
    }

    .page-number.active {
      background: linear-gradient(135deg, #e688d6 0%, #41b3a3 100%);
      color: #fff;
      border-color: transparent;
      box-shadow: 0 2px 8px rgba(230, 136, 214, 0.3);
    }

    .page-number:disabled {
      cursor: default;
      opacity: 0.5;
    }

    .page-number:focus-visible {
      outline: 2px solid #e688d6;
      outline-offset: 2px;
    }

    .go-to-page {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      justify-content: center;
    }

    .go-to-page label {
      font-size: 0.9rem;
      font-weight: 600;
      color: #64748b;
    }

    .go-to-input {
      width: 60px;
      padding: 0.5rem 0.75rem;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      font-size: 0.9rem;
      text-align: center;
      font-family: inherit;
    }

    .go-to-input:focus {
      outline: none;
      border-color: #e688d6;
      box-shadow: 0 0 0 3px rgba(230, 136, 214, 0.1);
    }

    .page-count {
      font-size: 0.85rem;
      color: #94a3b8;
    }

    @media (max-width: 768px) {
      .pagination-container {
        padding: 1rem;
        gap: 0.75rem;
      }

      .pagination-controls {
        gap: 0.25rem;
      }

      .pagination-btn {
        padding: 0.5rem 0.75rem;
        font-size: 0.8rem;
      }

      .page-number {
        width: 32px;
        height: 32px;
        font-size: 0.8rem;
      }

      .page-numbers {
        order: -1;
        width: 100%;
        justify-content: center;
        margin-bottom: 0.5rem;
      }

      .pagination-info {
        font-size: 0.85rem;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaginationComponent implements OnInit {
  @Input() totalItems: number = 0;
  @Input() initialPageSize: number = 20;
  @Output() pageChange = new EventEmitter<{ page: number; pageSize: number }>();

  currentPage: number = 1;
  pageSize: number = 20;
  totalPages: number = 1;
  pageNumbers: (number | string)[] = [];

  Math = Math;

  constructor(private paginationService: PaginationService) {}

  ngOnInit(): void {
    this.pageSize = this.initialPageSize;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    this.pageNumbers = this.generatePageNumbers();
  }

  generatePageNumbers(): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 7;

    if (this.totalPages <= maxPagesToShow) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (this.currentPage > 4) {
        pages.push('...');
      }

      const startPage = Math.max(2, this.currentPage - 2);
      const endPage = Math.min(this.totalPages - 1, this.currentPage + 2);

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (this.currentPage < this.totalPages - 3) {
        pages.push('...');
      }

      pages.push(this.totalPages);
    }

    return pages;
  }

  goToPage(page: number | string): void {
    if (page === '...') return;

    const pageNum = Number(page);
    if (pageNum >= 1 && pageNum <= this.totalPages) {
      this.currentPage = pageNum;
      this.pageNumbers = this.generatePageNumbers();
      this.pageChange.emit({ page: this.currentPage, pageSize: this.pageSize });
    }
  }

  onGoToInputChange(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (!target) return;
    this.goToPage(target.value);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  goToFirstPage(): void {
    this.goToPage(1);
  }

  goToLastPage(): void {
    this.goToPage(this.totalPages);
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.updatePagination();
    this.pageChange.emit({ page: this.currentPage, pageSize: this.pageSize });
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.pageSize;
  }

  get endIndex(): number {
    return this.currentPage * this.pageSize;
  }
}
