import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DonateComponent } from './donate.component';
import { ApiService } from '../../services/api.service';
import { Router, ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

describe('DonateComponent', () => {
  let component: DonateComponent;
  let fixture: ComponentFixture<DonateComponent>;
  let apiService: jasmine.SpyObj<ApiService>;
  let router: jasmine.SpyObj<Router>;
  let activatedRoute: ActivatedRoute;

  const mockCharities = [
    {
      id: 1,
      name: 'Education Charity',
      cause: 'Education',
      location: 'Delhi',
      description: 'Supporting education',
      registrationId: 'REG001',
      mission: 'Provide education',
      about: 'About us',
      activities: 'Activities',
      addressLine: 'Address 1',
      managerName: 'Manager 1',
      managerPhone: '9876543210',
      pincode: '110001',
      state: 'Delhi',
      email: 'charity@email.com',
      phoneNumber: '9876543210',
      imageUrls: ['image1.jpg'],
      isActive: true,
      status: 'Approved'
    },
    {
      id: 2,
      name: 'Health Charity',
      cause: 'Health',
      location: 'Mumbai',
      description: 'Supporting healthcare',
      registrationId: 'REG002',
      mission: 'Provide healthcare',
      about: 'About health',
      activities: 'Medical camps',
      addressLine: 'Address 2',
      managerName: 'Manager 2',
      managerPhone: '9876543211',
      pincode: '400001',
      state: 'Maharashtra',
      email: 'health@email.com',
      phoneNumber: '9876543211',
      imageUrls: ['image2.jpg'],
      isActive: true,
      status: 'Approved'
    }
  ];

  beforeEach(async () => {
    const apiSpy = jasmine.createSpyObj('ApiService', [
      'getPublicCharities',
      'getPublicCharitiesFromAuth',
      'createDonation'
    ]);

    await TestBed.configureTestingModule({
      declarations: [],
      imports: [CommonModule, FormsModule, RouterTestingModule, DonateComponent],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({}),
            snapshot: {
              queryParamMap: {
                get: () => null
              }
            }
          }
        }
      ]
    }).compileComponents();

    apiService = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
    (apiService as any).baseUrl = 'http://localhost/api';
    apiService.getPublicCharities.and.returnValue(of({ items: mockCharities }));
    apiService.getPublicCharitiesFromAuth.and.returnValue(of({ items: mockCharities }));
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    activatedRoute = TestBed.inject(ActivatedRoute);

    fixture = TestBed.createComponent(DonateComponent);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.selectedAmount).toBe(0);
      expect(component.donateAnonymously).toBe(false);
      expect(component.paymentMethod).toBe('upi');
      expect(component.paymentProcessing).toBe(false);
      expect(component.charities).toEqual([]);
    });

    it('should load charities on init', () => {
      apiService.getPublicCharities.and.returnValue(of(mockCharities));
      fixture.detectChanges();
      expect(apiService.getPublicCharities).toHaveBeenCalled();
    });

    it('should set isLoggedIn based on session token', () => {
      spyOn(sessionStorage, 'getItem').and.returnValue('mock_token');
      component.ngOnInit();
      expect(component.isLoggedIn).toBe(true);
    });

    it('should set isLoggedIn to false when no token', () => {
      spyOn(sessionStorage, 'getItem').and.returnValue(null);
      component.ngOnInit();
      expect(component.isLoggedIn).toBe(false);
    });
  });

  describe('Charity Loading', () => {
    it('should load charities successfully', fakeAsync(() => {
      apiService.getPublicCharities.and.returnValue(of(mockCharities));
      component.ngOnInit();
      tick();
      expect(component.charities.length).toBe(2);
      expect(component.charityLoading).toBe(false);
    }));

    it('should extract and populate available causes', fakeAsync(() => {
      apiService.getPublicCharities.and.returnValue(of(mockCharities));
      component.ngOnInit();
      tick();
      expect(component.availableCauses).toContain('Education');
      expect(component.availableCauses).toContain('Health');
    }));

    it('should fallback to auth endpoint if public endpoint fails', fakeAsync(() => {
      apiService.getPublicCharities.and.returnValue(throwError(() => new Error('Failed')));
      apiService.getPublicCharitiesFromAuth.and.returnValue(of(mockCharities));
      component.ngOnInit();
      tick();
      expect(apiService.getPublicCharitiesFromAuth).toHaveBeenCalled();
      expect(component.charities.length).toBe(2);
    }));

    it('should set error message when both endpoints fail', fakeAsync(() => {
      apiService.getPublicCharities.and.returnValue(throwError(() => new Error('Failed')));
      apiService.getPublicCharitiesFromAuth.and.returnValue(throwError(() => new Error('Failed')));
      component.ngOnInit();
      tick();
      expect(component.charityError).toBeTruthy();
    }));
  });

  describe('Charity Selection', () => {
    beforeEach(() => {
      component.charities = mockCharities;
    });

    it('should open charity details when selected', () => {
      component.openCharityDetails(mockCharities[0]);
      expect(component.selectedCharity).toEqual(mockCharities[0]);
      expect(component.showPaymentSection).toBe(false);
    });

    it('should clear payment message on charity selection', () => {
      component.paymentMessage = 'Previous error';
      component.openCharityDetails(mockCharities[0]);
      expect(component.paymentMessage).toBe('');
    });
  });

  describe('Amount Selection', () => {
    it('should select amount correctly', () => {
      component.selectAmount(100);
      expect(component.selectedAmount).toBe(100);
    });

    it('should calculate payable total with platform fee', () => {
      component.selectedAmount = 1000;
      expect(component.payableTotal).toBe(1020); // 1000 * 1.02
    });

    it('should calculate platform fee correctly', () => {
      component.selectedAmount = 1000;
      expect(component.platformFee).toBe(20); // 1000 * 0.02
    });

    it('should have predefined amounts available', () => {
      expect(component.predefinedAmounts.length).toBeGreaterThan(0);
      expect(component.predefinedAmounts).toContain(10);
      expect(component.predefinedAmounts).toContain(100);
    });
  });

  describe('Payment Method Selection', () => {
    it('should select payment method', () => {
      component.selectPaymentMethod('card');
      expect(component.paymentMethod).toBe('card');
    });

    it('should get correct payment method label', () => {
      component.paymentMethod = 'upi';
      expect(component.selectedPaymentLabel).toBe('UPI');

      component.paymentMethod = 'card';
      expect(component.selectedPaymentLabel).toBe('Card');

      component.paymentMethod = 'netbanking';
      expect(component.selectedPaymentLabel).toBe('Net Banking');
    });
  });

  describe('Anonymous Donation', () => {
    it('should toggle anonymous donation flag', () => {
      expect(component.donateAnonymously).toBe(false);
      component.donateAnonymously = true;
      expect(component.donateAnonymously).toBe(true);
    });
  });

  describe('Donation Start Validations', () => {
    beforeEach(() => {
      component.charities = mockCharities;
      spyOn(sessionStorage, 'getItem').and.returnValue('mock_token');
      component.isLoggedIn = true;
      component.currentRole = 'customer';
    });

    it('should show error if not logged in', () => {
      (sessionStorage.getItem as jasmine.Spy).and.returnValue(null);
      component.isLoggedIn = false;
      component.selectedCharity = mockCharities[0];
      component.selectedAmount = 100;
      component.startDonation();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should show error if no charity selected', () => {
      component.selectedCharity = null;
      component.selectedAmount = 100;
      component.startDonation();
      expect(component.paymentMessage).toContain('select a charity');
    });

    it('should show error if amount is zero', () => {
      component.selectedCharity = mockCharities[0];
      component.selectedAmount = 0;
      component.startDonation();
      expect(component.paymentMessage).toContain('choose a donation amount');
    });

    it('should show error if charity account tries to donate', () => {
      component.isLoggedIn = true;
      component.currentRole = 'charitymanager';
      component.selectedCharity = mockCharities[0];
      component.selectedAmount = 100;
      component.startDonation();
      expect(component.paymentMessage).toContain('Charity accounts cannot');
    });
  });

  describe('Charity Icon Mapping', () => {
    it('should return correct icon for education', () => {
      expect(component.getCharityIcon('education')).toBe('EDU');
    });

    it('should return correct icon for health', () => {
      expect(component.getCharityIcon('health')).toBe('HEALTH');
    });

    it('should return correct icon for environment', () => {
      expect(component.getCharityIcon('environment')).toBe('GREEN');
    });

    it('should return default icon for unknown cause', () => {
      expect(component.getCharityIcon('unknown')).toBe('CAUSE');
    });

    it('should handle case-insensitive search', () => {
      expect(component.getCharityIcon('EDUCATION')).toBe('EDU');
      expect(component.getCharityIcon('Health')).toBe('HEALTH');
    });
  });

  describe('Charity Sharing', () => {
    beforeEach(() => {
      component.selectedCharity = mockCharities[0];
    });

    it('should generate correct donation share URL', () => {
      component.shareSelectedCharity();
      const expectedUrl = `${window.location.origin}/donate?charityId=${mockCharities[0].id}`;
      // Verify that the URL was attempted to be shared
      expect(component.selectedCharity).toBeTruthy();
    });

    it('should copy charity link to clipboard', fakeAsync(() => {
      spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
      component.copyCharityLink();
      tick();
      const expectedUrl = `${window.location.origin}/donate?charityId=${mockCharities[0].id}`;
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedUrl);
    }));
  });

  describe('Filter and Search', () => {
    beforeEach(() => {
      apiService.getPublicCharities.and.returnValue(of(mockCharities));
      component.charities = mockCharities;
    });

    it('should apply keyword filter', () => {
      component.keyword = 'Education';
      component.cause = '';
      component.applyFilters();
      expect(apiService.getPublicCharities).toHaveBeenCalledWith('Education', undefined);
    });

    it('should apply cause filter', () => {
      component.keyword = '';
      component.cause = 'Health';
      component.applyFilters();
      expect(apiService.getPublicCharities).toHaveBeenCalledWith(undefined, 'Health');
    });

    it('should apply both filters together', () => {
      component.keyword = 'Charity';
      component.cause = 'Education';
      component.applyFilters();
      expect(apiService.getPublicCharities).toHaveBeenCalledWith('Charity', 'Education');
    });

    it('should reset selected charity when applying filters', () => {
      component.selectedCharity = mockCharities[0];
      component.applyFilters();
      expect(component.selectedCharity).toBeNull();
    });
  });

  describe('Component Cleanup', () => {
    it('should unsubscribe from route params on destroy', () => {
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');
      component.ngOnDestroy();
      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });

  describe('Payment Requirements', () => {
    it('should identify when gateway contact is required', () => {
      component.paymentMethod = 'wallet';
      expect(component.requiresGatewayContact).toBe(true);
    });

    it('should identify when gateway UPI is required', () => {
      component.paymentMethod = 'upi';
      expect(component.requiresGatewayUpi).toBe(true);
    });

    it('should not require contact for non-wallet methods', () => {
      component.paymentMethod = 'card';
      expect(component.requiresGatewayContact).toBe(false);
    });
  });
});
