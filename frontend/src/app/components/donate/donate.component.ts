import { Component, OnInit, OnDestroy } from '@angular/core';
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
  imageUrls: string[];
  isActive: boolean;
  status: string;
}

@Component({
  selector: 'app-donate',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeaderComponent, FooterComponent],
  templateUrl: './donate.component.html',
  styleUrls: ['./donate.component.css']
})
export class DonateComponent implements OnInit, OnDestroy {
  charities: PublicCharity[] = [];
  availableCauses: string[] = [];
  selectedCharity: PublicCharity | null = null;
  queryCharity: PublicCharity | null = null;
  charityLoading = false;
  charityError = '';
  keyword = '';
  cause = '';

  showPaymentSection = false;
  selectedAmount = 0;
  readonly averageDonationByUsers = 500;

  paymentMethod: 'upi' | 'card' | 'netbanking' | 'wallet' = 'upi';
  paymentProcessing = false;
  paymentMessage = '';
  donateAnonymously = false;

  upiId = '';
  cardHolderName = '';
  cardNumber = '';
  cardExpiry = '';
  cardCvv = '';
  bankName = '';
  walletNumber = '';
  predefinedAmounts = [10, 25, 50, 100, 250, 500];
  
  // Gateway-related properties
  paymentMethodMap: Record<string, number> = {
    upi: 1,
    card: 2,
    netbanking: 3,
    wallet: 4
  };
  mockGatewayReference = '';
  gatewayProvider = '';
  gatewayEmail = '';
  gatewayName = '';
  gatewayContact = '';
  gatewayUpi = '';
  showFakeGateway = false;
  get requiresGatewayContact(): boolean {
    return this.paymentMethod === 'wallet';
  }
  
  private destroy$ = new Subject<void>();
  isLoggedIn = false;
  currentRole = '';
  isMobileDevice = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) {}

  private detectMobileDevice(): boolean {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    // Check for mobile user agents
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    const isTouchDevice = () => {
      return (
        (navigator.maxTouchPoints !== undefined && navigator.maxTouchPoints > 2) ||
        ('ontouchstart' in window)
      );
    };
    return mobileRegex.test(userAgent.toLowerCase()) || isTouchDevice();
  }

  ngOnInit(): void {
    this.checkLoginStatus();
    this.isMobileDevice = this.detectMobileDevice();
    // Auto-select Card on desktop (UPI doesn't work without UPI app)
    if (!this.isMobileDevice) {
      this.paymentMethod = 'card';
    }
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
      this.cause = typeof params['cause'] === 'string' ? params['cause'] : this.cause;
      const charityId = params['charityId'] ? parseInt(params['charityId'], 10) : null;

      if (params['charityName'] || charityId) {
        this.queryCharity = {
          id: charityId || 0,
          name: params['charityName'] || 'Selected Charity',
          description: params['description'] || '',
          cause: params['cause'] || '',
          location: params['location'] || '',
          registrationId: params['registrationId'] || '',
          mission: params['mission'] || '',
          about: params['about'] || '',
          activities: params['activities'] || '',
          addressLine: params['addressLine'] || '',
          managerName: params['managerName'] || '',
          managerPhone: params['managerPhone'] || params['phone'] || '',
          pincode: params['pincode'] || '',
          state: params['state'] || '',
          email: params['email'] || '',
          phoneNumber: params['phone'] || '',
          imageUrls: typeof params['imageUrls'] === 'string'
            ? params['imageUrls'].split(',').map((item: string) => item.trim()).filter(Boolean)
            : [],
          isActive: true,
          status: 'Approved'
        };
      }

      if (charityId && this.charities.length > 0) {
        const preselected = this.charities.find(charity => charity.id === charityId);
        if (preselected) {
          this.openCharityDetails(preselected);
        }
      } else if (this.queryCharity && !this.selectedCharity) {
        this.openCharityDetails(this.queryCharity);
      }
    });

    this.loadCharities();
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

  private loadCharities(): void {
    this.charityLoading = true;
    this.charityError = '';

    this.apiService.getPublicCharities(this.keyword || undefined, this.cause || undefined).subscribe({
      next: (response: any) => {
        this.charities = this.mapCharities(response);
        this.availableCauses = Array.from(new Set(this.charities.map(c => c.cause).filter(Boolean)));

        if (this.charities.length === 0) {
          this.apiService.getPublicCharitiesFromAuth().subscribe({
            next: (fallbackResponse: any) => {
              this.charities = this.mapCharities(fallbackResponse);
              this.availableCauses = Array.from(new Set(this.charities.map(c => c.cause).filter(Boolean)));
              this.applyInitialSelection();
              this.charityLoading = false;
            },
            error: () => {
              this.applyInitialSelection();
              this.charityLoading = false;
            }
          });
          return;
        }

        this.applyInitialSelection();
        this.charityLoading = false;
      },
      error: (error) => {
        this.apiService.getPublicCharitiesFromAuth().subscribe({
          next: (fallbackResponse: any) => {
            this.charities = this.mapCharities(fallbackResponse);
            this.availableCauses = Array.from(new Set(this.charities.map(c => c.cause).filter(Boolean)));
            this.applyInitialSelection();
            this.charityLoading = false;
          },
          error: () => {
            this.charityLoading = false;
            const backendMessage = error?.error?.message || error?.message;
            this.charityError = backendMessage || 'Unable to load available charities right now.';

            if (this.queryCharity && !this.selectedCharity) {
              this.openCharityDetails(this.queryCharity);
              this.charityError = '';
            }
          }
        });
      }
    });
  }

  applyFilters(): void {
    this.selectedCharity = null;
    this.loadCharities();
  }

  private mapCharities(response: any): PublicCharity[] {
    const payload = Array.isArray(response)
      ? response
      : (response?.items ?? response?.charities ?? []);

    return (Array.isArray(payload) ? payload : []).map((item: any) => ({
      id: item.id ?? item.charityId ?? 0,
      name: item.name ?? item.charityName ?? '',
      description: item.description ?? '',
      cause: item.cause ?? '',
      location: item.location ?? '',
      registrationId: item.registrationId ?? '',
      mission: item.mission ?? '',
      about: item.about ?? '',
      activities: item.activities ?? '',
      addressLine: item.addressLine ?? '',
      managerName: item.managerName ?? '',
      managerPhone: item.managerPhone ?? item.phoneNumber ?? item.phone ?? '',
      pincode: item.pincode ?? '',
      state: item.state ?? '',
      email: item.email ?? '',
      phoneNumber: item.phoneNumber ?? item.phone ?? '',
      imageUrls: Array.isArray(item.imageUrls)
        ? item.imageUrls
            .map((url: any) => this.normalizeImageUrl(typeof url === 'string' ? url : ''))
            .filter((url: string) => !!url)
        : [],
      isActive: item.isActive ?? true,
      status: item.status ?? ''
    }));
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

  private applyInitialSelection(): void {
    const requestedId = this.route.snapshot.queryParamMap.get('charityId');
    if (requestedId) {
      const charityId = parseInt(requestedId, 10);
      const preselected = this.charities.find(charity => charity.id === charityId);
      if (preselected) {
        this.openCharityDetails(preselected);
      } else if (this.queryCharity && !this.selectedCharity) {
        this.openCharityDetails(this.queryCharity);
      }
    } else if (this.queryCharity && !this.selectedCharity) {
      this.openCharityDetails(this.queryCharity);
    }
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

  openCharityDetails(charity: PublicCharity): void {
    this.selectedCharity = charity;
    this.showPaymentSection = false;
    this.paymentMessage = '';
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
    // Warn user if selecting UPI on desktop
    if (method === 'upi' && !this.isMobileDevice) {
      this.paymentMessage = '⚠️ UPI works best on mobile devices. Use Card or Net Banking on desktop. If you have a UPI app, try again on mobile.';
      return;
    }
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

  get requiresGatewayUpi(): boolean {
    return this.paymentMethod === 'upi';
  }

  get isUpiDisabledOnDesktop(): boolean {
    return !this.isMobileDevice;
  }

  shareSelectedCharity(): void {
    if (!this.selectedCharity) {
      return;
    }

    const title = this.selectedCharity.name || 'CareFund Charity';
    const text = `Support ${title} on CareFund.`;
    const url = `${window.location.origin}/donate?charityId=${this.selectedCharity.id}`;

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

    const url = `${window.location.origin}/donate?charityId=${this.selectedCharity.id}`;
    navigator.clipboard?.writeText(url).catch(() => {});
  }

  async proceedToDonate(skipPaymentDetailValidation = false): Promise<void> {
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

    if (!skipPaymentDetailValidation && this.paymentMethod === 'upi') {
      if (!this.isMobileDevice) {
        this.paymentMessage = '⚠️ UPI is only available on mobile devices. Please use Card or Net Banking instead.';
        return;
      }
      if (!this.upiId.trim()) {
        this.paymentMessage = 'Enter your UPI ID to continue.';
        return;
      }
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

    // Open Razorpay gateway for payment
    this.openConfiguredGateway();
  }

  private generateTransactionReference(): string {
    return `CF-${Date.now()}`;
  }

  private openFakeGateway(): void {
    this.gatewayProvider = 'razorpay';
    this.mockGatewayReference = `RZP-MOCK-${Date.now()}`;
    this.gatewayEmail = '';
    this.gatewayName = '';
    this.gatewayContact = '';
    this.gatewayUpi = '';
    this.showFakeGateway = true;
  }

  private openConfiguredGateway(): void {
    this.apiService.getRazorpayConfig().subscribe({
      next: (config: any) => {
        if (config?.enabled && config?.keyId) {
          // create server-side order first
          this.paymentProcessing = true;
          const payload: any = {
            charityRegistrationId: this.selectedCharity?.id,
            amount: this.selectedAmount,
            upivpa: this.paymentMethod === 'upi' ? this.upiId : undefined,
            contactNumber: this.paymentMethod === 'wallet' ? this.walletNumber : this.gatewayContact,
            walletNumber: this.paymentMethod === 'wallet' ? this.walletNumber : undefined,
            transactionReference: `CF-${Date.now()}`,
            paymentMethod: this.paymentMethod
          };

          this.apiService.createRazorpayOrder(payload).subscribe({
            next: (orderResp: any) => {
              const orderId = orderResp?.orderId;
              const paymentId = orderResp?.paymentId;
              this.loadRazorpayScript().then(() => this.launchRazorpayCheckout(config, { orderId, paymentId })).catch(() => {
                this.paymentProcessing = false;
                this.paymentMessage = 'Razorpay checkout could not be loaded. Showing demo checkout instead.';
                this.openFakeGateway();
              });
            },
            error: () => {
              this.paymentProcessing = false;
              this.paymentMessage = 'Unable to create payment order. Showing demo checkout instead.';
              this.openFakeGateway();
            }
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

  private launchRazorpayCheckout(config: any, order?: { orderId?: string; paymentId?: number }): void {
    const amountInPaise = Math.max(1, Math.round(this.payableTotal * 100));
    const options = {
      key: config.keyId,
      amount: amountInPaise,
      currency: config.currency || 'INR',
      name: config.merchantName || 'CareFund Foundation',
      description: config.description || `Donation to ${this.selectedCharity?.name || 'CareFund'}`,
      order_id: order?.orderId,
      notes: { paymentId: order?.paymentId },
      image: undefined,
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
        const razorpayPaymentId = response?.razorpay_payment_id;
        const razorpayOrderId = response?.razorpay_order_id;
        const razorpaySignature = response?.razorpay_signature;
        const paymentId = (order && order.paymentId) || undefined;

        if (paymentId && razorpayPaymentId && razorpayOrderId) {
          // call server finalize
          this.apiService.finalizeRazorpayPayment({
            paymentId: paymentId,
            razorpayPaymentId: razorpayPaymentId,
            razorpayOrderId: razorpayOrderId,
            razorpaySignature: razorpaySignature || '',
            charityRegistrationId: this.selectedCharity?.id || 0,
            amount: this.selectedAmount,
            isAnonymous: this.donateAnonymously
          }).subscribe({
            next: (res: any) => {
              this.paymentProcessing = false;
              localStorage.setItem('cf:notify:refresh', Date.now().toString());
              this.router.navigate(['/payment-success'], {
                queryParams: {
                  charityName: this.selectedCharity?.name,
                  amount: this.selectedAmount,
                  paymentMethod: this.selectedPaymentLabel,
                  reference: res?.paymentReference || `CF-${Date.now()}`,
                  gateway: `Razorpay`
                }
              });
            },
            error: (err) => {
              this.paymentProcessing = false;
              this.paymentMessage = err?.error?.message || 'Payment verification failed. Please contact support.';
            }
          });
        } else {
          this.paymentMessage = 'Payment completed but verification data missing.';
          this.paymentProcessing = false;
        }
      }
    };

    // When using UPI, hint Razorpay to open UPI flow and prefill the VPA (UPI ID)
    if (this.paymentMethod === 'upi') {
      // add method and upi prefill where supported
      (options as any).method = 'upi';
      (options as any).prefill = (options as any).prefill || {};
      (options as any).prefill.vpa = this.upiId || (options as any).prefill.contact || '';
    }

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
    const payableAmount = this.payableTotal;

    const paymentMethodMap: Record<string, number> = {
      upi: 1,
      card: 2,
      netbanking: 3,
      wallet: 4
    };

    this.apiService.createDonation({
      charityRegistrationId: charity.id,
      amount: this.selectedAmount,
      isAnonymous: this.donateAnonymously,
      paymentMethod: this.paymentMethodMap[this.paymentMethod] ?? 1,
      transactionReference: this.mockGatewayReference || `CF-${Date.now()}`
    }).subscribe({
      next: (response: any) => {
        this.paymentProcessing = false;
        localStorage.setItem('cf:notify:refresh', Date.now().toString());
        this.router.navigate(['/payment-success'], {
          queryParams: {
            charityName: this.selectedCharity?.name,
            amount: this.selectedAmount,
            paymentMethod: this.selectedPaymentLabel,
            reference: response?.paymentReference || response?.donationId,
            gateway: 'Direct'
          }
        });
      },
      error: (error) => {
        this.paymentProcessing = false;
        this.paymentMessage = error?.error?.message || 'Donation failed. Please try again.';
      }
    });
  }
}
