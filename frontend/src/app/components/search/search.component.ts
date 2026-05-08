import { Component, OnInit, ChangeDetectionStrategy, ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchService } from '../../services/search.service';
import { LazyImageDirective } from '../../directives/lazy-image.directive';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

interface SearchSuggestion {
  name: string;
  image?: string;
  category?: string;
  description?: string;
  rating?: number;
}

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, LazyImageDirective],
  template: `
    <div class="search-container">
      <div class="search-input-wrapper">
        <input
          #searchInput
          type="text"
          class="search-input"
          placeholder="Search charities, causes..."
          [(ngModel)]="query"
          (input)="onSearch($event)"
          (keydown)="onKeyDown($event)"
          (focus)="showSuggestions = true"
          [attr.aria-label]="'Search for charities or causes'"
          [attr.aria-autocomplete]="'list'"
          [attr.aria-expanded]="showSuggestions && ((suggestions$ | async)?.length ?? 0) > 0"
        >
        <button
          *ngIf="query"
          class="search-clear"
          (click)="clearSearch()"
          [attr.aria-label]="'Clear search'"
        >
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
        <span class="material-symbols-outlined search-icon" aria-hidden="true">search</span>
      </div>

      <!-- Search Results Dropdown -->
      <div
        *ngIf="showSuggestions && (suggestions$ | async) as suggestions"
        class="search-dropdown"
        role="listbox"
      >
        <div *ngIf="suggestions.length === 0 && query" class="search-no-results">
          <p>No charities found matching "{{ query }}"</p>
          <small>Try different keywords or browse categories</small>
        </div>

        <div *ngIf="suggestions.length > 0" class="search-results">
          <div
            *ngFor="let result of suggestions; let i = index"
            class="search-result-item"
            [class.active]="selectedIndex === i"
            (click)="selectResult(result)"
            role="option"
            [attr.aria-selected]="selectedIndex === i"
          >
            <div *ngIf="result.image" class="result-image">
              <img [src]="result.image" [alt]="result.name" [appLazyImage]="result.image">
            </div>
            <div class="result-content">
              <div class="result-name">{{ result.name }}</div>
              <div class="result-meta">
                <span *ngIf="result.category" class="result-category">{{ result.category }}</span>
                <span *ngIf="result.description" class="result-description">{{ result.description }}</span>
              </div>
            </div>
            <div *ngIf="result.rating" class="result-rating">
              <span class="rating-stars">★ {{ result.rating }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Search History -->
      <div *ngIf="showSearchHistory && !query" class="search-history">
        <div class="history-header">
          <h4>Recent Searches</h4>
          <button
            class="history-clear"
            (click)="clearHistory()"
            [attr.aria-label]="'Clear search history'"
          >
            Clear
          </button>
        </div>
        <div *ngIf="(searchHistory$ | async) as history" class="history-items">
          <button
            *ngFor="let item of history.slice(0, 5)"
            class="history-item"
            (click)="search(item)"
            [attr.aria-label]="'Search for ' + item"
          >
            <span class="material-symbols-outlined history-icon" aria-hidden="true">schedule</span>
            {{ item }}
          </button>
        </div>
      </div>

      <!-- Advanced Filters -->
      <div *ngIf="showAdvancedFilters" class="advanced-filters">
        <div class="filter-group">
          <label>Category</label>
          <select [(ngModel)]="selectedCategory" (change)="updateFilters()" class="filter-select">
            <option value="">All Categories</option>
            <option value="health">Health</option>
            <option value="education">Education</option>
            <option value="disaster">Disaster Relief</option>
            <option value="animal">Animal Welfare</option>
            <option value="environment">Environment</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Minimum Rating</label>
          <input
            type="range"
            min="0"
            max="5"
            step="0.5"
            [(ngModel)]="minRating"
            (change)="updateFilters()"
            class="filter-range"
          >
          <span class="filter-value">{{ minRating }} ★</span>
        </div>

        <div class="filter-group">
          <label>Verified Only</label>
          <input
            type="checkbox"
            [(ngModel)]="verifiedOnly"
            (change)="updateFilters()"
            class="filter-checkbox"
          >
        </div>
      </div>
    </div>
  `,
  styles: [`
    .search-container {
      position: relative;
      width: 100%;
    }

    .search-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-input {
      width: 100%;
      padding: 0.75rem 1.5rem 0.75rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      font-size: 1rem;
      transition: all 0.2s ease;
      background: #fff;
      font-family: inherit;
    }

    .search-input:focus {
      outline: none;
      border-color: #e688d6;
      box-shadow: 0 0 0 3px rgba(230, 136, 214, 0.1);
    }

    .search-input::placeholder {
      color: #94a3b8;
    }

    .search-icon {
      position: absolute;
      right: 1rem;
      pointer-events: none;
      color: #94a3b8;
    }

    .search-input:focus ~ .search-icon {
      color: #e688d6;
    }

    .search-clear {
      position: absolute;
      right: 2.5rem;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.25rem;
      color: #94a3b8;
      font-size: 1.2rem;
      transition: color 0.2s ease;
    }

    .search-clear:hover {
      color: #64748b;
    }

    .search-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-top: none;
      border-radius: 0 0 10px 10px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      max-height: 400px;
      overflow-y: auto;
      z-index: 10;
    }

    .search-no-results {
      padding: 2rem 1rem;
      text-align: center;
      color: #94a3b8;
    }

    .search-no-results p {
      margin: 0 0 0.5rem 0;
      font-weight: 500;
    }

    .search-no-results small {
      display: block;
      font-size: 0.85rem;
    }

    .search-results {
      display: grid;
    }

    .search-result-item {
      display: grid;
      grid-template-columns: 60px 1fr auto;
      gap: 1rem;
      align-items: center;
      padding: 0.75rem 1rem;
      cursor: pointer;
      border-bottom: 1px solid #f1f5f9;
      transition: all 0.2s ease;
    }

    .search-result-item:hover,
    .search-result-item.active {
      background: rgba(230, 136, 214, 0.05);
    }

    .result-image {
      width: 60px;
      height: 60px;
      border-radius: 8px;
      overflow: hidden;
      background: #f1f5f9;
    }

    .result-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .result-content {
      display: grid;
      gap: 0.25rem;
      min-width: 0;
    }

    .result-name {
      font-weight: 600;
      color: var(--cf-ink);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .result-meta {
      display: flex;
      gap: 0.5rem;
      font-size: 0.8rem;
      color: #94a3b8;
    }

    .result-category {
      background: rgba(65, 179, 163, 0.1);
      color: #41b3a3;
      padding: 0.2rem 0.4rem;
      border-radius: 3px;
      font-weight: 500;
    }

    .result-description {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .result-rating {
      text-align: right;
      font-size: 0.85rem;
    }

    .rating-stars {
      color: #f59e0b;
      font-weight: 600;
    }

    .search-history {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-top: none;
      border-radius: 0 0 10px 10px;
      padding: 1rem;
      z-index: 10;
    }

    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .history-header h4 {
      margin: 0;
      font-size: 0.9rem;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .history-clear {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.85rem;
      padding: 0;
      transition: color 0.2s ease;
    }

    .history-clear:hover {
      color: #64748b;
    }

    .history-items {
      display: grid;
      gap: 0.5rem;
    }

    .history-item {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      padding: 0.5rem 0.75rem;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      cursor: pointer;
      color: #64748b;
      font-size: 0.9rem;
      transition: all 0.2s ease;
      text-align: left;
    }

    .history-item:hover {
      background: #f1f5f9;
      border-color: #e688d6;
    }

    .history-icon {
      color: #94a3b8;
    }

    .advanced-filters {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-top: none;
      border-radius: 0 0 10px 10px;
      padding: 1rem;
      z-index: 10;
      display: grid;
      gap: 1rem;
    }

    .filter-group {
      display: grid;
      gap: 0.5rem;
    }

    .filter-group label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .filter-select,
    .filter-range {
      padding: 0.5rem 0.75rem;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      font-size: 0.9rem;
      font-family: inherit;
    }

    .filter-select:focus,
    .filter-range:focus {
      outline: none;
      border-color: #e688d6;
    }

    .filter-value {
      display: inline-block;
      margin-left: 0.5rem;
      font-weight: 600;
      color: #41b3a3;
    }

    .filter-checkbox {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    @media (max-width: 640px) {
      .search-dropdown,
      .search-history,
      .advanced-filters {
        position: fixed;
        top: auto;
        bottom: 0;
        left: 0;
        right: 0;
        border-radius: 16px 16px 0 0;
        max-height: 70vh;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchComponent implements OnInit {
  @Output() resultSelected = new EventEmitter<SearchSuggestion>();

  @ViewChild('searchInput') searchInput!: ElementRef;

  query: string = '';
  selectedIndex: number = -1;
  showSuggestions: boolean = false;
  showSearchHistory: boolean = true;
  showAdvancedFilters: boolean = false;

  selectedCategory: string = '';
  minRating: number = 0;
  verifiedOnly: boolean = false;

  suggestions$: Observable<SearchSuggestion[]> = of([]);
  searchHistory$: Observable<string[]> = of([]);

  constructor(private searchService: SearchService) {}

  ngOnInit(): void {
    this.searchHistory$ = this.searchService.getSearchHistory();
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.query = target.value;
    this.selectedIndex = -1;
    this.showSearchHistory = !this.query;

    if (this.query.length > 1) {
      this.suggestions$ = this.buildSuggestions(this.query);
      this.showSuggestions = true;
    } else {
      this.showSuggestions = false;
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (!this.showSuggestions) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex++;
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex = Math.max(-1, this.selectedIndex - 1);
        break;
      case 'Enter':
        event.preventDefault();
        if (this.selectedIndex >= 0) {
          // Select from dropdown
          this.suggestions$.subscribe((results) => {
            if (results[this.selectedIndex]) {
              this.selectResult(results[this.selectedIndex]);
            }
          });
        } else {
          this.search(this.query);
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.showSuggestions = false;
        this.showSearchHistory = true;
        break;
    }
  }

  selectResult(result: SearchSuggestion): void {
    this.resultSelected.emit(result);
    this.searchService.addToHistory(result.name);
    this.query = result.name;
    this.showSuggestions = false;
  }

  search(query: string): void {
    this.searchService.addToHistory(query);
    this.suggestions$ = this.buildSuggestions(query);
  }

  clearSearch(): void {
    this.query = '';
    this.selectedIndex = -1;
    this.showSuggestions = false;
    this.showSearchHistory = true;
    this.searchInput.nativeElement.focus();
  }

  clearHistory(): void {
    this.searchService.clearHistory();
  }

  updateFilters(): void {
    const filters: any = {};
    if (this.selectedCategory) {
      filters.category = { operator: 'equals', value: this.selectedCategory };
    }
    if (this.minRating > 0) {
      filters.rating = { operator: 'gt', value: this.minRating };
    }
    if (this.verifiedOnly) {
      filters.verified = { operator: 'equals', value: true };
    }

    if (this.query) {
      this.suggestions$ = this.buildSuggestions(this.query, filters);
    }
  }

  private buildSuggestions(query: string, _filters?: Record<string, any>): Observable<SearchSuggestion[]> {
    return of(this.searchService.getSuggestions(query)).pipe(
      map((items) => items.map((name) => ({ name })))
    );
  }
}
