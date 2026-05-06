import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { ApiService } from '../../services/api.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface PublicCharity {
  id: number;
  name: string;
  description: string;
  cause: string;
  location: string;
  registrationId: string;
  mission: string;
  about: string;
  activities: string;
  addressLine: string;
  managerName: string;
  managerPhone: string;
  pincode: string;
  state: string;
  email: string;
  phoneNumber: string;
  socialMediaLink: string;
  imageUrls: string[];
  isActive: boolean;
  status: string;
}

@Component({
  selector: 'app-charity-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeaderComponent, FooterComponent],
  templateUrl: './charity-detail.component.html',
  styleUrls: ['../donate/donate.component.css', './charity-detail.component.css']
})
export class CharityDetailComponent implements OnInit, OnDestroy {
  selectedCharity: PublicCharity | null = null;
  charityLoading = false;
  charityError = '';

  showPaymentSection = false;
  selectedAmount = 0;
  readonly averageDonationByUsers = 500;

  paymentMethod: 'upi' | 'card' | 'netbanking' | 'wallet' = 'upi';
  paymentProcessing = false;
  paymentMessage = '';
  donateAnonymously = false;
  showFakeGateway = false;
  mockGatewayReference = '';
  gatewayProvider: 'razorpay' = 'razorpay';
  gatewayEmail = '';
  gatewayName = '';
  gatewayCardNumber = '4242 4242 4242 4242';
  gatewayCardExpiry = '12/34';
  gatewayCardCvc = '123';
  gatewayContact = '';
  gatewayUpi = '';

  upiId = '';
  cardHolderName = '';
  cardNumber = '';
  cardExpiry = '';
  cardCvv = '';
  bankName = '';
  walletNumber = '';
  predefinedAmounts = [10, 25, 50, 100, 250, 500];

  private destroy$ = new Subject<void>();
  isLoggedIn = false;
  currentRole = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.checkLoginStatus();

    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const id = Number(params.get('id') || 0);
        if (!id || Number.isNaN(id)) {
          this.router.navigate(['/error']);
          return;
        }

        this.loadCharity(id);
      });
  }

  private getAuthToken(): string | null {
    return sessionStorage.getItem('token');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkLoginStatus(): void {
    this.isLoggedIn = !!this.getAuthToken();
    this.currentRole = (sessionStorage.getItem('role') || '').trim().toLowerCase();
  }

  get canDonate(): boolean {
    return !this.isLoggedIn || this.currentRole === 'customer';
  }

  get displayGalleryImages(): string[] {
    const images = this.selectedCharity?.imageUrls ?? [];
    const unique = Array.from(new Set(images.filter(url => !!url)));
    return unique.slice(0, 5);
  }

  private loadCharity(charityId: number): void {
    this.charityLoading = true;
    this.charityError = '';
    this.selectedCharity = null;

    this.apiService.getPublicCharityById(charityId).subscribe({
      next: (response: any) => {
        const item = response?.item ?? response;
        this.selectedCharity = this.mapCharity(item);
        this.charityLoading = false;
      },
      error: () => {
        this.apiService.getPublicCharities().subscribe({
          next: (fallback: any) => {
            const items = Array.isArray(fallback)
              ? fallback
              : (fallback?.items ?? fallback?.charities ?? []);
            const found = (Array.isArray(items) ? items : []).find((entry: any) => Number(entry?.charityId ?? entry?.id) === charityId);
            if (!found) {
              this.charityLoading = false;
              this.charityError = 'Charity not found.';
              return;
            }

            this.selectedCharity = this.mapCharity(found);
            this.charityLoading = false;
          },
          error: () => {
            this.charityLoading = false;
            this.charityError = 'Unable to load charity details right now.';
          }
        });
      }
    });
  }

  private mapCharity(item: any): PublicCharity {
    return {
      id: item?.id ?? item?.charityId ?? 0,
      name: item?.name ?? item?.charityName ?? '',
      description: item?.description ?? '',
      cause: item?.cause ?? '',
      location: item?.location ?? '',
      registrationId: item?.registrationId ?? '',
      mission: item?.mission ?? '',
      about: item?.about ?? '',
      activities: item?.activities ?? '',
      addressLine: item?.addressLine ?? '',
      managerName: item?.managerName ?? '',
      managerPhone: item?.managerPhone ?? item?.phoneNumber ?? item?.phone ?? '',
      pincode: item?.pincode ?? '',
      state: item?.state ?? '',
      email: item?.email ?? '',
      phoneNumber: item?.phoneNumber ?? item?.phone ?? '',
      socialMediaLink: item?.socialMediaLink ?? '',
      imageUrls: Array.isArray(item?.imageUrls)
        ? item.imageUrls
            .map((url: any) => this.normalizeImageUrl(typeof url === 'string' ? url : ''))
            .filter((url: string) => !!url)
        : [],
      isActive: item?.isActive ?? true,
      status: item?.status ?? ''
    };
  }

  private normalizeImageUrl(url?: string | null): string {
    const raw = (url || '').trim();
    if (!raw) {
      return '';
    }

    if (/^https?:\/\//i.test(raw)) {
      return raw;
    }

    const path = raw.startsWith('/') ? raw : `/${raw}`;
    const apiBase = this.apiService.baseUrl.replace(/\/api\/?$/i, '');
    return `${apiBase}${path}`;
  }

  getCharityIcon(cause: string | undefined | null): string {
    const normalized = (cause || '').toLowerCase();
    if (normalized.includes('education')) return 'EDU';
    if (normalized.includes('health')) return 'HEALTH';
    if (normalized.includes('child')) return 'CHILD';
    if (normalized.includes('women')) return 'WOMEN';
    if (normalized.includes('animal')) return 'ANIMAL';
    if (normalized.includes('food')) return 'FOOD';
    if (normalized.includes('environment')) return 'GREEN';
    if (normalized.includes('disaster')) return 'RELIEF';
    if (normalized.includes('elder')) return 'ELDER';
    return 'CAUSE';
  }

  selectAmount(amount: number): void {
    this.selectedAmount = amount;
  }

  startDonation(): void {
    if (!this.getAuthToken()) {
      this.paymentMessage = 'Please login to continue with donation payment.';
      this.router.navigate(['/login']);
      return;
    }

    if (!this.selectedCharity) {
      this.paymentMessage = 'Please select a charity first.';
      return;
    }

    if (!this.canDonate) {
      this.paymentMessage = 'Charity accounts cannot make donations. Please login with a donor account.';
      return;
    }

    if (this.selectedAmount <= 0) {
      this.paymentMessage = 'Please choose a donation amount first.';
      return;
    }

    if (this.donateAnonymously) {
      this.proceedToDonate(true);
      return;
    }

    if (this.paymentMethod === 'card' || this.paymentMethod === 'netbanking') {
      this.proceedToDonate(true);
      return;
    }

    this.showPaymentSection = true;
    this.paymentMessage = '';
  }

  selectPaymentMethod(method: 'upi' | 'card' | 'netbanking' | 'wallet'): void {
    this.paymentMethod = method;
    this.paymentMessage = '';
  }

  get selectedPaymentLabel(): string {
    switch (this.paymentMethod) {
      case 'upi': return 'UPI';
      case 'card': return 'Card';
      case 'netbanking': return 'Net Banking';
      case 'wallet': return 'Wallet';
      default: return 'Payment';
    }
  }

  get payableTotal(): number {
    return Number(((this.selectedAmount || 0) * 1.02).toFixed(2));
  }

  get platformFee(): number {
    return Number(((this.selectedAmount || 0) * 0.02).toFixed(2));
  }

  get gatewayDisplayName(): string {
    return 'Razorpay';
  }

  get requiresGatewayContact(): boolean {
    return this.paymentMethod === 'wallet';
  }

  get requiresGatewayUpi(): boolean {
    return this.paymentMethod === 'upi';
  }

  shareSelectedCharity(): void {
    if (!this.selectedCharity) {
      return;
    }

    const title = this.selectedCharity.name || 'CareFund Charity';
    const text = `Support ${title} on CareFund.`;
    const url = `${window.location.origin}/charity/${this.selectedCharity.id}`;

    if (navigator.share) {
      navigator.share({ title, text, url }).catch(() => {});
      return;
    }

    const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
    window.open(whatsapp, '_blank', 'noopener,noreferrer');
  }

  copyCharityLink(): void {
    if (!this.selectedCharity) {
      return;
    }

    const url = `${window.location.origin}/charity/${this.selectedCharity.id}`;
    navigator.clipboard?.writeText(url).catch(() => {});
  }

  scrollToDonationSection(): void {
    const target = document.getElementById('donation-section');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  proceedToDonate(skipPaymentDetailValidation = false): void {
    this.paymentMessage = '';

    if (!this.getAuthToken()) {
      this.router.navigate(['/login']);
      return;
    }

    if (!this.selectedCharity) {
      this.paymentMessage = 'Please choose a charity first.';
      return;
    }

    if (!this.canDonate) {
      this.paymentMessage = 'Charity accounts cannot make donations. Please login with a donor account.';
      return;
    }

    if (this.selectedAmount <= 0) {
      this.paymentMessage = 'Please choose a donation amount first.';
      return;
    }

    if (!skipPaymentDetailValidation && this.paymentMethod === 'upi' && !this.upiId.trim()) {
      this.paymentMessage = 'Enter your UPI ID to continue.';
      return;
    }

    if (!skipPaymentDetailValidation && this.paymentMethod === 'card') {
      if (!this.cardHolderName.trim() || !this.cardNumber.trim() || !this.cardExpiry.trim() || !this.cardCvv.trim()) {
        this.paymentMessage = 'Please fill card details to continue.';
        return;
      }
    }

    if (!skipPaymentDetailValidation && this.paymentMethod === 'netbanking' && !this.bankName.trim()) {
      this.paymentMessage = 'Please select a bank to continue.';
      return;
    }

    if (!skipPaymentDetailValidation && this.paymentMethod === 'wallet' && !this.walletNumber.trim()) {
      this.paymentMessage = 'Please enter your wallet number.';
      return;
    }

    this.openConfiguredGateway();
  }

  private openFakeGateway(): void {
    this.gatewayProvider = 'razorpay';
    this.mockGatewayReference = `RZP-MOCK-${Date.now()}`;
    this.gatewayEmail = this.gatewayEmail || '';
    this.gatewayName = this.gatewayName || this.cardHolderName || '';
    this.gatewayContact = this.gatewayContact || this.walletNumber || '';
    this.gatewayUpi = this.gatewayUpi || this.upiId || '';
    this.showFakeGateway = true;
  }

  private openConfiguredGateway(): void {
    this.apiService.getRazorpayConfig().subscribe({
      next: (config: any) => {
        if (config?.enabled && config?.keyId) {
          this.loadRazorpayScript().then(() => this.launchRazorpayCheckout(config)).catch(() => {
            this.paymentMessage = 'Razorpay checkout could not be loaded. Showing demo checkout instead.';
            this.openFakeGateway();
          });
          return;
        }

        this.paymentMessage = config?.message || 'Razorpay is not configured yet. Showing demo checkout instead.';
        this.openFakeGateway();
      },
      error: () => {
        this.paymentMessage = 'Unable to load Razorpay settings. Showing demo checkout instead.';
        this.openFakeGateway();
      }
    });
  }

  private loadRazorpayScript(): Promise<void> {
    if ((window as any).Razorpay) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Unable to load Razorpay checkout'));
      document.body.appendChild(script);
    });
  }

  private launchRazorpayCheckout(config: any): void {
    const amountInPaise = Math.max(1, Math.round(this.payableTotal * 100));
    const options = {
      key: config.keyId,
      amount: amountInPaise,
      currency: config.currency || 'INR',
      name: config.merchantName || 'CareFund Foundation',
      description: config.description || `Donation to ${this.selectedCharity?.name || 'CareFund'}`,
      prefill: {
        name: this.gatewayName || this.cardHolderName || '',
        email: this.gatewayEmail || '',
        contact: this.gatewayContact || this.walletNumber || this.upiId || ''
      },
      theme: {
        color: '#6366f1'
      },
      modal: {
        ondismiss: () => {
          this.paymentMessage = 'Payment cancelled. You can review details and try again.';
        }
      },
      handler: (response: any) => {
        this.mockGatewayReference = response?.razorpay_payment_id || response?.razorpay_order_id || `RZP-${Date.now()}`;
        this.finalizeDonation(this.mockGatewayReference);
      }
    };

    const razorpay = new (window as any).Razorpay(options);
    razorpay.on('payment.failed', (response: any) => {
      this.paymentMessage = response?.error?.description || 'Payment failed in Razorpay checkout. Please try again.';
    });
    razorpay.open();
  }

  cancelFakeGateway(): void {
    if (this.paymentProcessing) {
      return;
    }

    this.showFakeGateway = false;
    this.paymentMessage = 'Payment cancelled. You can review details and try again.';
  }

  completeFakeGatewayPayment(success: boolean): void {
    if (!success) {
      this.showFakeGateway = false;
      this.paymentMessage = 'Payment failed in gateway simulation. Please try again.';
      return;
    }

    const validationMessage = this.validateGatewayDetails();
    if (validationMessage) {
      this.paymentMessage = validationMessage;
      return;
    }

    this.showFakeGateway = false;
    this.paymentMessage = '';
    this.finalizeDonation(this.mockGatewayReference);
  }

  private validateGatewayDetails(): string {
    if (this.requiresGatewayContact && !this.gatewayContact.trim()) {
      return 'Enter contact number in Razorpay checkout.';
    }

    if (this.requiresGatewayUpi && !this.gatewayUpi.trim()) {
      return 'Enter UPI ID in Razorpay checkout.';
    }

    return '';
  }

  private finalizeDonation(paymentReference?: string): void {
    const charity = this.selectedCharity;
    if (!charity) {
      this.paymentMessage = 'Please choose a charity first.';
      return;
    }

    this.paymentProcessing = true;

    const paymentMethodMap: Record<string, number> = {
      upi: 1,
      card: 2,
      netbanking: 3,
      wallet: 1
    };

    const payload = {
      charityRegistrationId: charity.id,
      amount: this.selectedAmount,
      isAnonymous: this.donateAnonymously,
      paymentMethod: paymentMethodMap[this.paymentMethod] ?? 1,
      transactionReference: paymentReference || this.mockGatewayReference || `CF-${Date.now()}`
    };

    this.apiService.createDonation(payload).subscribe({
      next: (response: any) => {
        this.paymentProcessing = false;
        localStorage.setItem('cf:notify:refresh', Date.now().toString());
        this.router.navigate(['/payment-success'], {
          queryParams: {
            charityName: this.selectedCharity?.name,
            amount: this.selectedAmount,
            paymentMethod: this.selectedPaymentLabel,
            reference: response?.paymentReference || payload.transactionReference,
            gateway: `${this.gatewayDisplayName} (Mock)`
          }
        });
      },
      error: (error) => {
        this.paymentProcessing = false;
        this.paymentMessage = error?.error?.message || 'Payment failed. Please login as a customer and try again.';
      }
    });
  }
}
