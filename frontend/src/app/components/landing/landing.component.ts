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
  charityTypes: string[] = ['All'];
  selectedCharityType = 'All';
  charityStates: string[] = ['All'];
  selectedCharityState = 'All';
  urgencyLevels: string[] = ['All', 'High', 'Medium', 'Low'];
  selectedUrgency = 'All';
  isLoading = false;
  searchTerm = '';
  isLoggedIn = false;
  currentRole = '';
  favoriteCharityIds = new Set<number>();
  favoriteLoadingIds = new Set<number>();
  currentPage = 1;
  pageSize = 6;
  expandedCharities = new Set<string>();
  liveSpotlights: Array<{ name: string; role: string; message: string }> = [];

  heroSlides: Array<{
    title: string;
    subtitle: string;
    imageUrl: string;
    tag: string;
  }> = [
    {
      title: 'Children in need of support',
      subtitle: 'Help children access food, education, and care.',
      imageUrl: '/images/children.jpg',
      tag: 'Children'
    },
    {
      title: 'Animal welfare matters',
      subtitle: 'Protect and care for animals in distress.',
      imageUrl: '/images/Animal.jpg',
      tag: 'Animal Welfare'
    },
    {
      title: 'Elder care and compassion',
      subtitle: 'Support elderly people with dignity and comfort.',
      imageUrl: '/images/oldage.jpg',
      tag: 'Elder Care'
    }
  ];
  currentHeroSlide = 0;
  private heroRotationTimer: ReturnType<typeof setInterval> | null = null;
  private heroImageFallbacks: string[] = [];
  heroImageSrc = '';
  private readonly heroLogoFallbacks = [
    '/images/charityLogo.jpg',
    'images/charityLogo.jpg',
    '/frontend/images/charityLogo.jpg'
  ];
  heroLogoSrc = this.heroLogoFallbacks[0];

  heroTitle = this.heroSlides[0].title;
  heroSubtitle = this.heroSlides[0].subtitle;

  statistics = [
    { label: 'Charities', value: '0', icon: 'charity' },
    { label: 'Approved', value: '0', icon: 'approved' },
    { label: 'Pending', value: '0', icon: 'pending' },
    { label: 'Raised', value: '₹0', icon: 'users' }
  ];

  constructor(private api: ApiService, private router: Router) {}

  private normalizeImageUrl(url?: string | null): string {
    const raw = (url || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('/images/') || raw.startsWith('images/')) return raw.startsWith('/') ? raw : `/${raw}`;
    const path = raw.startsWith('/') ? raw : `/${raw}`;
    const assetBaseUrl = this.api.baseUrl.replace(/\/api\/?$/i, '');
    return `${assetBaseUrl}${path}`;
  }

  ngOnInit(): void {
    this.isLoggedIn = !!sessionStorage.getItem('token');
    this.currentRole = (sessionStorage.getItem('role') || '').trim().toLowerCase();

    if (this.isLoggedIn) {
      this.heroTitle = 'Welcome back to CareFund';
      this.heroSubtitle = 'Browse live charities and donate with confidence.';
    }
    this.selectHeroSlide(0);
    this.loadCharities();
    this.loadFavorites();
    this.startHeroRotation();
  }

  get isCustomer(): boolean {
    return this.isLoggedIn && this.currentRole === 'customer';
  }

  ngOnDestroy(): void {
    if (this.heroRotationTimer) {
      clearInterval(this.heroRotationTimer);
      this.heroRotationTimer = null;
    }
  }

  private startHeroRotation(): void {
    if (this.heroRotationTimer) {
      clearInterval(this.heroRotationTimer);
      this.heroRotationTimer = null;
    }

    if (this.heroSlides.length <= 1) {
      return;
    }

    this.heroRotationTimer = setInterval(() => {
      const nextIndex = (this.currentHeroSlide + 1) % this.heroSlides.length;
      this.selectHeroSlide(nextIndex);
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
        const uniqueTypes = Array.from<string>(
          new Set(
            approvedItems
              .map((item: any) => String(item?.cause || '').trim())
              .filter((cause: string) => !!cause)
          )
        ).sort((a: string, b: string) => a.localeCompare(b));
        this.charityTypes = ['All', ...uniqueTypes];
        const uniqueStates = Array.from<string>(
          new Set(
            approvedItems
              .map((item: any) => String(item?.state || '').trim())
              .filter((state: string) => !!state)
          )
        ).sort((a: string, b: string) => a.localeCompare(b));
        this.charityStates = ['All', ...uniqueStates];
        this.applyFilters();
        this.buildLiveSpotlights(approvedItems);
        this.updateStatistics(items);
      },
      error: () => {
        this.isLoading = false;
        this.charities = [];
        this.charityTypes = ['All'];
        this.selectedCharityType = 'All';
        this.charityStates = ['All'];
        this.selectedCharityState = 'All';
        this.selectedUrgency = 'All';
        this.filteredCharities = [];
        this.visibleCharities = [];
      }
    });
  }

  loadFavorites(): void {
    if (!this.isCustomer) {
      this.favoriteCharityIds.clear();
      return;
    }

    this.api.getFavoriteCharities().subscribe({
      next: (res: any) => {
        const items: number[] = Array.isArray(res?.items) ? res.items : [];
        this.favoriteCharityIds = new Set(items.filter(id => Number.isFinite(Number(id))).map(id => Number(id)));
      },
      error: () => {
        this.favoriteCharityIds.clear();
      }
    });
  }

  updateStatistics(items: any[]): void {
    const approved = items.filter(item => item.status === 'Approved').length;
    const pending = items.filter(item => item.status === 'Pending').length;
    const totalRaised = items.reduce((sum, item) => sum + Number(item.totalReceived || 0), 0);
    this.statistics = [
      { label: 'Charities', value: String(items.filter(item => item.isActive !== false).length), icon: 'charity' },
      { label: 'Approved', value: String(approved), icon: 'approved' },
      { label: 'Pending', value: String(pending), icon: 'pending' },
      { label: 'Raised', value: `₹${totalRaised.toLocaleString('en-IN')}`, icon: 'users' }
    ];
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onCharityTypeChange(type: string): void {
    this.selectedCharityType = type;
    this.applyFilters();
  }

  onStateChange(state: string): void {
    this.selectedCharityState = state;
    this.applyFilters();
  }

  onUrgencyChange(urgency: string): void {
    this.selectedUrgency = urgency;
    this.applyFilters();
  }

  private applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    const selectedType = this.selectedCharityType.trim().toLowerCase();
    const selectedState = this.selectedCharityState.trim().toLowerCase();
    const selectedUrgency = this.selectedUrgency.trim().toLowerCase();

    this.filteredCharities = this.charities.filter(charity => {
      const charityCause = String(charity?.cause || '').trim().toLowerCase();
      const matchesType = selectedType === 'all' || charityCause === selectedType;
      const charityState = String(charity?.state || '').trim().toLowerCase();
      const matchesState = selectedState === 'all' || charityState === selectedState;
      const urgency = this.getUrgencyLevel(charity).toLowerCase();
      const matchesUrgency = selectedUrgency === 'all' || urgency === selectedUrgency;

      const matchesSearch = !term ||
        [charity.charityName, charity.cause, charity.location, charity.description, charity.state]
          .filter(Boolean)
          .some((value: string) => String(value).toLowerCase().includes(term));

      return matchesType && matchesState && matchesUrgency && matchesSearch;
    });

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

  getProgressPercent(charity: any): number {
    const progress = Number(charity?.progressPercent ?? 0);
    if (Number.isNaN(progress)) return 0;
    return Math.max(0, Math.min(100, progress));
  }

  getUrgencyLevel(charity: any): 'High' | 'Medium' | 'Low' {
    const progress = this.getProgressPercent(charity);
    if (progress < 35) return 'High';
    if (progress < 70) return 'Medium';
    return 'Low';
  }

  isFavorite(charity: any): boolean {
    const charityId = Number(charity?.charityId ?? 0);
    return charityId > 0 && this.favoriteCharityIds.has(charityId);
  }

  toggleFavorite(charity: any): void {
    if (!this.isCustomer) {
      this.router.navigate(['/login']);
      return;
    }

    const charityId = Number(charity?.charityId ?? 0);
    if (charityId <= 0 || this.favoriteLoadingIds.has(charityId)) {
      return;
    }

    this.favoriteLoadingIds.add(charityId);
    const request$ = this.isFavorite(charity)
      ? this.api.removeFavoriteCharity(charityId)
      : this.api.addFavoriteCharity(charityId);

    request$.subscribe({
      next: () => {
        if (this.favoriteCharityIds.has(charityId)) {
          this.favoriteCharityIds.delete(charityId);
        } else {
          this.favoriteCharityIds.add(charityId);
        }
        this.favoriteLoadingIds.delete(charityId);
      },
      error: () => {
        this.favoriteLoadingIds.delete(charityId);
      }
    });
  }

  shareCharity(charity: any): void {
    const title = charity?.charityName || 'CareFund Charity';
    const text = `Support ${title} on CareFund.`;
    const url = `${window.location.origin}/charity/${charity?.charityId}`;

    if (navigator.share) {
      navigator.share({ title, text, url }).catch(() => {});
      return;
    }

    const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
    window.open(whatsapp, '_blank', 'noopener,noreferrer');
  }

  goToFeaturedCharity(): void {
    const featured = this.visibleCharities[0] ?? this.filteredCharities[0] ?? this.charities[0];
    const charityId = Number(featured?.charityId ?? 0);
    if (charityId > 0) {
      this.router.navigate(['/charity', charityId]);
      return;
    }

    this.router.navigate(['/']);
  }

  getRemainingAmount(charity: any): number {
    const target = Number(charity?.targetAmount ?? 0);
    const received = Number(charity?.totalReceived ?? 0);
    if (!target || Number.isNaN(target)) return 0;
    return Math.max(0, target - (Number.isNaN(received) ? 0 : received));
  }

  getCharityKey(charity: any): string {
    return String(
      charity?.charityId ??
      charity?.charityRegistrationId ??
      charity?.id ??
      charity?.email ??
      charity?.charityName ??
      ''
    );
  }

  isCharityExpanded(charity: any): boolean {
    return this.expandedCharities.has(this.getCharityKey(charity));
  }

  toggleCharityDetails(charity: any): void {
    const key = this.getCharityKey(charity);
    if (!key) return;
    if (this.expandedCharities.has(key)) {
      this.expandedCharities.delete(key);
    } else {
      this.expandedCharities.add(key);
    }
  }

  getShortText(value: string | undefined | null, maxLength = 120): string {
    const text = (value || '').trim();
    if (!text) return '';
    return text.length <= maxLength ? text : `${text.slice(0, maxLength).trim()}...`;
  }

  selectHeroSlide(index: number): void {
    if (!this.heroSlides.length) {
      this.heroTitle = 'CareFund Community';
      this.heroSubtitle = 'Support live causes across the platform.';
      this.heroImageSrc = this.heroLogoFallbacks[0];
      this.heroImageFallbacks = [];
      return;
    }

    this.currentHeroSlide = index;
    const slide = this.heroSlides[index];
    this.heroTitle = slide.title;
    this.heroSubtitle = slide.subtitle;
    const normalizedImage = this.normalizeImageUrl(slide.imageUrl);
    this.heroImageFallbacks = normalizedImage ? [normalizedImage] : this.buildImageFallbacks('children.jpg');
    this.heroImageSrc = this.heroImageFallbacks[0];
  }

  private buildImageFallbacks(fileName: string): string[] {
    return [
      `/images/${fileName}`,
      `images/${fileName}`,
      `/frontend/images/${fileName}`
    ];
  }

  onHeroImageError(): void {
    const currentIndex = this.heroImageFallbacks.indexOf(this.heroImageSrc);
    const nextIndex = currentIndex + 1;

    if (nextIndex < this.heroImageFallbacks.length) {
      this.heroImageSrc = this.heroImageFallbacks[nextIndex];
    }
  }

  onHeroLogoError(): void {
    const currentIndex = this.heroLogoFallbacks.indexOf(this.heroLogoSrc);
    const nextIndex = currentIndex + 1;

    if (nextIndex < this.heroLogoFallbacks.length) {
      this.heroLogoSrc = this.heroLogoFallbacks[nextIndex];
    }
  }

  private buildLiveSpotlights(items: any[]): void {
    this.liveSpotlights = items.slice(0, 3).map((item: any) => ({
      name: item.charityName || 'Live charity',
      role: item.cause || 'Approved charity',
      message: `${item.location || 'Location not set'} • Needed ₹${Number(item.targetAmount || 0).toLocaleString('en-IN')} • Received ₹${Number(item.totalReceived || 0).toLocaleString('en-IN')}`
    }));
  }

  getCharityImageUrl(charity: any): string {
    const imageUrl = Array.isArray(charity?.imageUrls) && charity.imageUrls.length > 0 ? charity.imageUrls[0] : '';
    return this.normalizeImageUrl(imageUrl) || this.heroLogoFallbacks[0];
  }

  getHeroTag(): string {
    return this.heroSlides[this.currentHeroSlide]?.tag || 'Live';
  }

}
