import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeaderComponent, FooterComponent],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit, OnDestroy {
  charities: any[] = [];
  filteredCharities: any[] = [];
  visibleCharities: any[] = [];
  isLoading = false;
  searchTerm = '';
  isLoggedIn = false;
  currentPage = 1;
  pageSize = 6;

  heroMainImageCandidates = [
    '/images/carefund-hero.jpg',
    '/images/carefund-hero.png',
    '/images/hero-main.jpg',
    '/images/hero-main.png',
    '/images/hero.jpg',
    '/images/hero.png'
  ];
  heroLogoImageCandidates = [
    '/images/carefund-logo.png',
    '/images/carefund-logo.jpg',
    '/images/hero-logo.png',
    '/images/hero-logo.jpg',
    '/images/logo.png',
    '/images/logo.jpg',
    '/favicon.ico'
  ];
  heroMainImageIndex = 0;
  heroLogoImageIndex = 0;
  heroMainImageSrc = this.heroMainImageCandidates[0];
  heroLogoImageSrc = this.heroLogoImageCandidates[0];
  heroSlides = [
    {
      title: 'CareFund keeps every donation visible',
      subtitle: 'See real charities, live updates, and meaningful impact in one place.'
    },
    {
      title: 'Donate with confidence',
      subtitle: 'Every contribution is tracked, notified by email, and synced across dashboards.'
    },
    {
      title: 'Support causes that matter',
      subtitle: 'Medical, education, food, disaster relief, and more. Pick your cause and give.'
    }
  ];
  currentHeroSlide = 0;
  private heroRotationTimer: ReturnType<typeof setInterval> | null = null;

  heroTitle = 'Make a Difference Today';
  heroSubtitle = 'Connect with real charities, support meaningful causes, and track your impact in one place.';

  statistics = [
    { label: 'Charities', value: '0', icon: '🤝' },
    { label: 'Approved', value: '0', icon: '✅' },
    { label: 'Pending', value: '0', icon: '⏳' },
    { label: 'Active Users', value: '', icon: '👥' }
  ];

  testimonials = [
    {
      name: 'John Smith',
      role: 'Charity Partner',
      message: 'CareFund has helped us reach more people in need. Highly recommended!'
    },
    {
      name: 'Sarah Johnson',
      role: 'Donor',
      message: 'Simple, transparent, and truly makes a difference. Love this platform!'
    },
    {
      name: 'Ahmed Hassan',
      role: 'Beneficiary',
      message: 'The support we received changed our lives. Thank you CareFund!'
    }
  ];

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.isLoggedIn = !!sessionStorage.getItem('token');
    const role = (sessionStorage.getItem('role') || '').trim().toLowerCase();

    if (this.isLoggedIn && role === 'customer') {
      this.router.navigate(['/dashboard/customer']);
      return;
    }

    if (this.isLoggedIn && role === 'charitymanager') {
      this.router.navigate(['/dashboard/charity']);
      return;
    }

    if (this.isLoggedIn && role === 'admin') {
      this.router.navigate(['/dashboard/admin']);
      return;
    }

    if (this.isLoggedIn) {
      this.heroTitle = 'Welcome back to CareFund';
      this.heroSubtitle = 'Browse live charities and donate with confidence.';
    }
    this.loadCharities();
    this.startHeroRotation();
  }

  ngOnDestroy(): void {
    if (this.heroRotationTimer) {
      clearInterval(this.heroRotationTimer);
      this.heroRotationTimer = null;
    }
  }

  private startHeroRotation(): void {
    this.heroRotationTimer = setInterval(() => {
      this.currentHeroSlide = (this.currentHeroSlide + 1) % this.heroSlides.length;
      const slide = this.heroSlides[this.currentHeroSlide];
      this.heroTitle = slide.title;
      this.heroSubtitle = slide.subtitle;
    }, 5000);
  }

  loadCharities(): void {
    this.isLoading = true;
    this.api.getPublicCharities().subscribe({
      next: (response: any) => {
        this.isLoading = false;
        const items = response?.items ?? [];
        const approvedItems = items.filter((item: any) => item.status === 'Approved' && item.isActive !== false);
        this.charities = approvedItems;
        this.filteredCharities = approvedItems;
        this.currentPage = 1;
        this.updateVisibleCharities();
        this.updateStatistics(items);
      },
      error: () => {
        this.isLoading = false;
        this.charities = [];
        this.filteredCharities = [];
        this.visibleCharities = [];
      }
    });
  }

  updateStatistics(items: any[]): void {
    const approved = items.filter(item => item.status === 'Approved').length;
    const pending = items.filter(item => item.status === 'Pending').length;
    this.statistics = [
      { label: 'Charities', value: String(items.filter(item => item.isActive !== false).length), icon: '🤝' },
      { label: 'Approved', value: String(approved), icon: '✅' },
      { label: 'Pending', value: String(pending), icon: '⏳' },
      { label: 'Active Users', value: '10K+', icon: '👥' }
    ];
  }

  onSearchChange(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredCharities = this.charities;
      this.currentPage = 1;
      this.updateVisibleCharities();
      return;
    }

    this.filteredCharities = this.charities.filter(charity =>
      [charity.charityName, charity.cause, charity.location, charity.description]
        .filter(Boolean)
        .some((value: string) => value.toLowerCase().includes(term))
    );
    this.currentPage = 1;
    this.updateVisibleCharities();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredCharities.length / this.pageSize));
  }

  get hasNextPage(): boolean {
    return this.currentPage < this.totalPages;
  }

  get hasPreviousPage(): boolean {
    return this.currentPage > 1;
  }

  nextPage(): void {
    if (this.hasNextPage) {
      this.currentPage++;
      this.updateVisibleCharities();
    }
  }

  previousPage(): void {
    if (this.hasPreviousPage) {
      this.currentPage--;
      this.updateVisibleCharities();
    }
  }

  updateVisibleCharities(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.visibleCharities = this.filteredCharities.slice(start, start + this.pageSize);
  }

  onHeroMainImageError(): void {
    if (this.heroMainImageIndex < this.heroMainImageCandidates.length - 1) {
      this.heroMainImageIndex++;
      this.heroMainImageSrc = this.heroMainImageCandidates[this.heroMainImageIndex];
    }
  }

  onHeroLogoImageError(): void {
    if (this.heroLogoImageIndex < this.heroLogoImageCandidates.length - 1) {
      this.heroLogoImageIndex++;
      this.heroLogoImageSrc = this.heroLogoImageCandidates[this.heroLogoImageIndex];
    }
  }
}
