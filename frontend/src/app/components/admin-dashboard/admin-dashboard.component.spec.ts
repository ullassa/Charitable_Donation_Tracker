import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

describe('AdminDashboardComponent - Donation Tracking', () => {
  let component: AdminDashboardComponent;
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let apiService: jasmine.SpyObj<ApiService>;

  const mockDonors = [
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      totalDonated: 5000,
      donationCount: 3,
      donations: [
        {
          id: 1,
          charityRegistrationId: 1,
          charityName: 'Education Fund',
          amount: 2000,
          isAnonymous: false,
          paymentMethod: 'card',
          transactionReference: 'TXN001',
          donationDate: new Date('2025-04-20'),
          status: 'Completed'
        },
        {
          id: 2,
          charityRegistrationId: 2,
          charityName: 'Health Ministry',
          amount: 1500,
          isAnonymous: false,
          paymentMethod: 'upi',
          transactionReference: 'TXN002',
          donationDate: new Date('2025-04-21'),
          status: 'Completed'
        },
        {
          id: 3,
          charityRegistrationId: 1,
          charityName: 'Education Fund',
          amount: 1500,
          isAnonymous: false,
          paymentMethod: 'netbanking',
          transactionReference: 'TXN003',
          donationDate: new Date('2025-04-22'),
          status: 'Completed'
        }
      ]
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane@example.com',
      totalDonated: 8000,
      donationCount: 2,
      donations: [
        {
          id: 4,
          charityRegistrationId: 1,
          charityName: 'Education Fund',
          amount: 5000,
          isAnonymous: true,
          paymentMethod: 'card',
          transactionReference: 'TXN004',
          donationDate: new Date('2025-04-19'),
          status: 'Completed'
        },
        {
          id: 5,
          charityRegistrationId: 3,
          charityName: 'Environment Care',
          amount: 3000,
          isAnonymous: false,
          paymentMethod: 'upi',
          transactionReference: 'TXN005',
          donationDate: new Date('2025-04-23'),
          status: 'Completed'
        }
      ]
    },
    {
      id: 3,
      name: 'Robert Wilson',
      email: 'robert@example.com',
      totalDonated: 15000,
      donationCount: 5,
      donations: [
        {
          id: 6,
          charityRegistrationId: 2,
          charityName: 'Health Ministry',
          amount: 3000,
          isAnonymous: false,
          paymentMethod: 'card',
          transactionReference: 'TXN006',
          donationDate: new Date('2025-04-18'),
          status: 'Completed'
        },
        {
          id: 7,
          charityRegistrationId: 1,
          charityName: 'Education Fund',
          amount: 4000,
          isAnonymous: false,
          paymentMethod: 'upi',
          transactionReference: 'TXN007',
          donationDate: new Date('2025-04-20'),
          status: 'Completed'
        },
        {
          id: 8,
          charityRegistrationId: 3,
          charityName: 'Environment Care',
          amount: 2500,
          isAnonymous: false,
          paymentMethod: 'card',
          transactionReference: 'TXN008',
          donationDate: new Date('2025-04-21'),
          status: 'Completed'
        },
        {
          id: 9,
          charityRegistrationId: 2,
          charityName: 'Health Ministry',
          amount: 3000,
          isAnonymous: true,
          paymentMethod: 'netbanking',
          transactionReference: 'TXN009',
          donationDate: new Date('2025-04-22'),
          status: 'Completed'
        },
        {
          id: 10,
          charityRegistrationId: 1,
          charityName: 'Education Fund',
          amount: 2500,
          isAnonymous: false,
          paymentMethod: 'upi',
          transactionReference: 'TXN010',
          donationDate: new Date('2025-04-23'),
          status: 'Completed'
        }
      ]
    },
    {
      id: 4,
      name: 'Alice Brown',
      email: 'alice@example.com',
      totalDonated: 10000,
      donationCount: 4,
      donations: [
        {
          id: 11,
          charityRegistrationId: 1,
          charityName: 'Education Fund',
          amount: 2500,
          isAnonymous: false,
          paymentMethod: 'card',
          transactionReference: 'TXN011',
          donationDate: new Date('2025-04-15'),
          status: 'Completed'
        },
        {
          id: 12,
          charityRegistrationId: 2,
          charityName: 'Health Ministry',
          amount: 2500,
          isAnonymous: false,
          paymentMethod: 'upi',
          transactionReference: 'TXN012',
          donationDate: new Date('2025-04-16'),
          status: 'Completed'
        },
        {
          id: 13,
          charityRegistrationId: 3,
          charityName: 'Environment Care',
          amount: 2500,
          isAnonymous: false,
          paymentMethod: 'card',
          transactionReference: 'TXN013',
          donationDate: new Date('2025-04-17'),
          status: 'Completed'
        },
        {
          id: 14,
          charityRegistrationId: 1,
          charityName: 'Education Fund',
          amount: 2500,
          isAnonymous: false,
          paymentMethod: 'netbanking',
          transactionReference: 'TXN014',
          donationDate: new Date('2025-04-24'),
          status: 'Completed'
        }
      ]
    },
    {
      id: 5,
      name: 'Charlie Davis',
      email: 'charlie@example.com',
      totalDonated: 3000,
      donationCount: 1,
      donations: [
        {
          id: 15,
          charityRegistrationId: 2,
          charityName: 'Health Ministry',
          amount: 3000,
          isAnonymous: false,
          paymentMethod: 'upi',
          transactionReference: 'TXN015',
          donationDate: new Date('2025-04-25'),
          status: 'Completed'
        }
      ]
    }
  ];

  beforeEach(async () => {
    const apiSpy = jasmine.createSpyObj('ApiService', [
      'getAdminDashboard',
      'getAdminAnalytics',
      'getAdminDonors',
      'getAdminCharityCount',
      'getAdminDonationStats'
    ]);

    await TestBed.configureTestingModule({
      declarations: [],
      imports: [CommonModule, FormsModule, RouterTestingModule, AdminDashboardComponent],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({}),
            snapshot: { paramMap: { get: () => null } }
          }
        }
      ]
    }).compileComponents();

    apiService = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
    apiService.getAdminDashboard.and.returnValue(of({ stats: {} }));
    apiService.getAdminAnalytics.and.returnValue(of({ monthly: [], causes: [] }));
    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize donation tracking properties', () => {
      expect(component.donors).toBeDefined();
      expect(component.donationNameFilter).toBe('');
      expect(component.donationFrom).toBeUndefined();
      expect(component.donationTo).toBeUndefined();
      expect(component.donationSort).toBe('desc');
      expect(component.expandedDonationId).toBeNull();
    });

    it('should load donors data on init', fakeAsync(() => {
      apiService.getAdminDonors.and.returnValue(of({ items: mockDonors }));
      component.ngOnInit();
      tick();
      expect(apiService.getAdminDonors).toHaveBeenCalled();
      expect(component.donors.length).toBe(5);
    }));
  });

  describe('Donation Rows Flattening', () => {
    beforeEach(() => {
      component.donors = mockDonors;
    });

    it('should flatten all donations from all donors', () => {
      const rows = component.donationRows;
      // Total: 3 + 2 + 5 + 4 + 1 = 15 donations
      expect(rows.length).toBe(15);
    });

    it('should include individual donation properties', () => {
      const rows = component.donationRows;
      const firstRow = rows[0];

      expect(firstRow).toEqual(jasmine.objectContaining({
        donationId: jasmine.any(Number),
        donorName: jasmine.any(String),
        donorEmail: jasmine.any(String),
        amount: jasmine.any(Number),
        donationDate: jasmine.any(Date),
        charityName: jasmine.any(String),
        paymentMethod: jasmine.any(String),
        transactionReference: jasmine.any(String)
      }));
    });

    it('should map donor information correctly to each donation row', () => {
      const rows = component.donationRows;
      // John's first donation
      const johnDonation = rows.find(r => r.donationId === 1);
      expect(johnDonation).toBeDefined();
      expect(johnDonation!.donorName).toBe('John Doe');
      expect(johnDonation!.donorEmail).toBe('john@example.com');
      expect(johnDonation!.amount).toBe(2000);
    });

    it('should include all donations even from same donor', () => {
      const rows = component.donationRows;
      const johnDonations = rows.filter(r => r.donorName === 'John Doe');
      expect(johnDonations.length).toBe(3);
    });

    it('should preserve donation metadata in flattened structure', () => {
      const rows = component.donationRows;
      const donation = rows.find(r => r.donationId === 4); // Jane's first donation (id: 4)
      if (!donation) {
        fail('Expected donation id 4 to be present');
        return;
      }
      expect(donation.transactionReference).toBe('TXN004');
      expect(donation.charityName).toBe('Education Fund');
      expect(donation.paymentMethod).toBe('card');
    });
  });

  describe('Donation Filtering - Donor Name', () => {
    beforeEach(() => {
      component.donors = mockDonors;
    });

    it('should filter donations by donor name (full match)', () => {
      component.donationNameFilter = 'John Doe';
      component.donationFrom = undefined;
      component.donationTo = undefined;
      component.donationSort = 'desc';

      const filtered = component.filteredDonationRows;
      expect(filtered.length).toBe(3);
      expect(filtered.every(d => d.donorName === 'John Doe')).toBe(true);
    });

    it('should filter donations by donor name (partial match - case insensitive)', () => {
      component.donationNameFilter = 'john';
      component.donationFrom = undefined;
      component.donationTo = undefined;

      const filtered = component.filteredDonationRows;
      expect(filtered.length).toBe(3);
      expect(filtered.every(d => d.donorName.toLowerCase().includes('john'))).toBe(true);
    });

    it('should filter donations by partial name (middle match)', () => {
      component.donationNameFilter = 'Robert';
      component.donationFrom = undefined;
      component.donationTo = undefined;

      const filtered = component.filteredDonationRows;
      expect(filtered.length).toBe(5);
      expect(filtered.every(d => d.donorName.includes('Robert'))).toBe(true);
    });

    it('should return empty array when name filter has no matches', () => {
      component.donationNameFilter = 'NonExistent';
      component.donationFrom = undefined;
      component.donationTo = undefined;

      const filtered = component.filteredDonationRows;
      expect(filtered.length).toBe(0);
    });

    it('should be case-insensitive for name filter', () => {
      component.donationNameFilter = 'JANE';
      component.donationFrom = undefined;
      component.donationTo = undefined;

      const filtered = component.filteredDonationRows;
      expect(filtered.length).toBe(2);
      expect(filtered.every(d => d.donorName.toLowerCase().includes('jane'))).toBe(true);
    });
  });

  describe('Donation Filtering - Date Range', () => {
    beforeEach(() => {
      component.donors = mockDonors;
    });

    it('should filter donations by from date (inclusive)', () => {
      component.donationNameFilter = '';
      component.donationFrom = new Date('2025-04-20');
      component.donationTo = undefined;
      component.donationSort = 'desc';

      const filtered = component.filteredDonationRows;
      expect(filtered.every(d => new Date(d.donationDate).getTime() >= new Date(component.donationFrom as any).getTime())).toBe(true);
    });

    it('should filter donations by to date (inclusive)', () => {
      component.donationNameFilter = '';
      component.donationFrom = undefined;
      component.donationTo = new Date('2025-04-22');

      const filtered = component.filteredDonationRows;
      expect(filtered.every(d => new Date(d.donationDate).getTime() <= new Date(component.donationTo as any).getTime())).toBe(true);
    });

    it('should filter donations by date range (both from and to)', () => {
      component.donationNameFilter = '';
      component.donationFrom = new Date('2025-04-20');
      component.donationTo = new Date('2025-04-22');

      const filtered = component.filteredDonationRows;
      const isInRange = filtered.every(d =>
        new Date(d.donationDate).getTime() >= new Date(component.donationFrom as any).getTime() &&
        new Date(d.donationDate).getTime() <= new Date(component.donationTo as any).getTime()
      );
      expect(isInRange).toBe(true);
    });

    it('should include donations on exact from date', () => {
      const targetDate = new Date('2025-04-19');
      component.donationNameFilter = '';
      component.donationFrom = targetDate;
      component.donationTo = undefined;

      const filtered = component.filteredDonationRows;
      const onDate = filtered.filter(d => d.donationDate.getTime() === targetDate.getTime());
      expect(onDate.length).toBeGreaterThan(0);
    });

    it('should include donations on exact to date', () => {
      const targetDate = new Date('2025-04-23');
      component.donationNameFilter = '';
      component.donationFrom = undefined;
      component.donationTo = targetDate;

      const filtered = component.filteredDonationRows;
      const onDate = filtered.filter(d => d.donationDate.getTime() === targetDate.getTime());
      expect(onDate.length).toBeGreaterThan(0);
    });

    it('should exclude donations outside date range', () => {
      component.donationNameFilter = '';
      component.donationFrom = new Date('2025-04-15');
      component.donationTo = new Date('2025-04-17');

      const filtered = component.filteredDonationRows;
      const count = filtered.length;
      // Donations on 15, 16, 17 only
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(component.donationRows.length);
    });
  });

  describe('Donation Filtering - Combined Filters', () => {
    beforeEach(() => {
      component.donors = mockDonors;
    });

    it('should apply name and date filters simultaneously', () => {
      component.donationNameFilter = 'Robert';
      component.donationFrom = new Date('2025-04-20');
      component.donationTo = new Date('2025-04-23');
      component.donationSort = 'desc';

      const filtered = component.filteredDonationRows;
      expect(filtered.every(d =>
        d.donorName.toLowerCase().includes('robert') &&
        new Date(d.donationDate).getTime() >= new Date(component.donationFrom as any).getTime() &&
        new Date(d.donationDate).getTime() <= new Date(component.donationTo as any).getTime()
      )).toBe(true);
    });

    it('should return empty when no donations match combined filters', () => {
      component.donationNameFilter = 'NonExistent';
      component.donationFrom = new Date('2025-04-20');
      component.donationTo = new Date('2025-04-22');

      const filtered = component.filteredDonationRows;
      expect(filtered.length).toBe(0);
    });

    it('should filter correctly when name matches but date does not', () => {
      component.donationNameFilter = 'Robert';
      component.donationFrom = new Date('2025-05-01'); // After all donations
      component.donationTo = undefined;

      const filtered = component.filteredDonationRows;
      expect(filtered.length).toBe(0);
    });

    it('should prioritize most restrictive filter', () => {
      // Robert has 5 donations total
      component.donationNameFilter = 'Robert';
      component.donationFrom = undefined;
      component.donationTo = undefined;
      let filtered = component.filteredDonationRows;
      expect(filtered.length).toBe(5);

      // Narrow date range
      component.donationFrom = new Date('2025-04-20');
      component.donationTo = new Date('2025-04-21');
      filtered = component.filteredDonationRows;
      expect(filtered.length).toBeLessThan(5);
    });
  });

  describe('Donation Sorting', () => {
    beforeEach(() => {
      component.donors = mockDonors;
      component.donationNameFilter = '';
      component.donationFrom = undefined;
      component.donationTo = undefined;
    });

    it('should sort donations by amount descending (high to low)', () => {
      component.donationSort = 'desc';

      const sorted = component.filteredDonationRows;
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].amount).toBeGreaterThanOrEqual(sorted[i + 1].amount);
      }
    });

    it('should sort donations by amount ascending (low to high)', () => {
      component.donationSort = 'asc';

      const sorted = component.filteredDonationRows;
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].amount).toBeLessThanOrEqual(sorted[i + 1].amount);
      }
    });

    it('should toggle sort order correctly', () => {
      component.donationSort = 'desc';
      let sorted = component.filteredDonationRows;
      const firstDescAmount = sorted[0].amount;

      component.donationSort = 'asc';
      sorted = component.filteredDonationRows;
      const firstAscAmount = sorted[0].amount;

      expect(firstDescAmount).toBeGreaterThanOrEqual(firstAscAmount);
    });

    it('should maintain sort order when filters change', () => {
      component.donationSort = 'desc';
      component.donationNameFilter = 'Robert';

      const sorted = component.filteredDonationRows;
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].amount).toBeGreaterThanOrEqual(sorted[i + 1].amount);
      }
    });

    it('should handle sorting with single donation', () => {
      component.donationNameFilter = 'Charlie';
      component.donationSort = 'desc';

      const sorted = component.filteredDonationRows;
      expect(sorted.length).toBe(1);
      expect(sorted[0].amount).toBe(3000);
    });

    it('should sort empty array without errors', () => {
      component.donationNameFilter = 'NonExistent';
      component.donationSort = 'desc';

      expect(() => {
        const sorted = component.filteredDonationRows;
        expect(sorted.length).toBe(0);
      }).not.toThrow();
    });
  });

  describe('Top Donors Calculation', () => {
    beforeEach(() => {
      component.donors = mockDonors;
    });

    it('should identify top 5 donors by total donation amount', () => {
      const topDonors = component.topDonors;
      expect(topDonors.length).toBeLessThanOrEqual(5);
    });

    it('should rank donors correctly by total donated', () => {
      const topDonors = component.topDonors;
      const donations = topDonors.map(d => Number(d.totalDonated));

      for (let i = 0; i < donations.length - 1; i++) {
        expect(donations[i]).toBeGreaterThanOrEqual(donations[i + 1]);
      }
    });

    it('should return top donor as Robert Wilson', () => {
      const topDonors = component.topDonors;
      expect(topDonors[0].name).toBe('Robert Wilson');
      expect(topDonors[0].totalDonated).toBe(15000);
    });

    it('should have second top donor as Alice Brown', () => {
      const topDonors = component.topDonors;
      expect(topDonors[1].name).toBe('Alice Brown');
      expect(topDonors[1].totalDonated).toBe(10000);
    });

    it('should have third top donor as Jane Smith', () => {
      const topDonors = component.topDonors;
      expect(topDonors[2].name).toBe('Jane Smith');
      expect(topDonors[2].totalDonated).toBe(8000);
    });

    it('should return exactly 5 donors if more than 5 exist', () => {
      const topDonors = component.topDonors;
      expect(topDonors.length).toBe(5);
    });

    it('should return fewer than 5 donors if fewer than 5 exist', () => {
      component.donors = mockDonors.slice(0, 3);
      const topDonors = component.topDonors;
      expect(topDonors.length).toBe(3);
    });

    it('should handle null or undefined totalDonated gracefully', () => {
      const modifiedDonors = [
        { ...mockDonors[0], totalDonated: null as any },
        ...mockDonors.slice(1)
      ];
      component.donors = modifiedDonors;

      expect(() => {
        const topDonors = component.topDonors;
        expect(topDonors).toBeTruthy();
      }).not.toThrow();
    });

    it('should include only positive donation amounts in ranking', () => {
      const topDonors = component.topDonors;
      expect(topDonors.every(d => Number(d.totalDonated) > 0)).toBe(true);
    });
  });

  describe('Donation Details Toggle', () => {
    beforeEach(() => {
      component.donors = mockDonors;
    });

    it('should expand donation details when toggling', () => {
      component.expandedDonationId = null;
      component.toggleDonationDetails(1);
      expect(component.expandedDonationId as number | null).toBe(1);
    });

    it('should collapse donation details when toggling same ID again', () => {
      component.expandedDonationId = 1;
      component.toggleDonationDetails(1);
      expect(component.expandedDonationId).toBeNull();
    });

    it('should switch expanded ID when toggling different donation', () => {
      component.expandedDonationId = 1;
      component.toggleDonationDetails(2);
      expect(component.expandedDonationId).toBe(2);
    });

    it('should check if donation details are expanded', () => {
      component.expandedDonationId = 5;
      expect(component.isDonationDetailsOpen(5)).toBe(true);
      expect(component.isDonationDetailsOpen(6)).toBe(false);
    });

    it('should handle multiple toggle operations', () => {
      component.toggleDonationDetails(1); // Expand 1
      expect(component.expandedDonationId).toBe(1);

      component.toggleDonationDetails(2); // Switch to 2
      expect(component.expandedDonationId).toBe(2);

      component.toggleDonationDetails(1); // Switch back to 1
      expect(component.expandedDonationId).toBe(1);

      component.toggleDonationDetails(1); // Collapse 1
      expect(component.expandedDonationId).toBeNull();
    });
  });

  describe('Filter Clear Operations', () => {
    beforeEach(() => {
      component.donors = mockDonors;
    });

    it('should clear donor name filter', () => {
      component.donationNameFilter = 'John';
      component.clearDonationFilters();
      expect(component.donationNameFilter).toBe('');
    });

    it('should clear date filters', () => {
      component.donationFrom = new Date('2025-04-20');
      component.donationTo = new Date('2025-04-22');
      component.clearDonationFilters();
      expect(component.donationFrom).toBeUndefined();
      expect(component.donationTo).toBeUndefined();
    });

    it('should reset expanded donation on clear', () => {
      component.expandedDonationId = 5;
      component.clearDonationFilters();
      expect(component.expandedDonationId).toBeNull();
    });

    it('should clear all donation filters together', () => {
      component.donationNameFilter = 'Jane';
      component.donationFrom = new Date('2025-04-15');
      component.donationTo = new Date('2025-04-25');
      component.expandedDonationId = 3;

      component.clearDonationFilters();

      expect(component.donationNameFilter).toBe('');
      expect(component.donationFrom).toBeUndefined();
      expect(component.donationTo).toBeUndefined();
      expect(component.expandedDonationId).toBeNull();
    });
  });

  describe('Data Fetching with Date Range', () => {
    it('should fetch donations with from date', fakeAsync(() => {
      apiService.getAdminDonors.and.returnValue(of(mockDonors));
      const fromDate = new Date('2025-04-20');
      component.fetchDonersDateFiltered(fromDate, undefined);
      tick();
      expect(apiService.getAdminDonors).toHaveBeenCalledWith(jasmine.any(Date), undefined);
    }));

    it('should fetch donations with to date', fakeAsync(() => {
      apiService.getAdminDonors.and.returnValue(of(mockDonors));
      const toDate = new Date('2025-04-25');
      component.fetchDonersDateFiltered(undefined, toDate);
      tick();
      expect(apiService.getAdminDonors).toHaveBeenCalledWith(undefined, jasmine.any(Date));
    }));

    it('should fetch donations with date range', fakeAsync(() => {
      apiService.getAdminDonors.and.returnValue(of(mockDonors));
      const fromDate = new Date('2025-04-20');
      const toDate = new Date('2025-04-25');
      component.fetchDonersDateFiltered(fromDate, toDate);
      tick();
      expect(apiService.getAdminDonors).toHaveBeenCalledWith(jasmine.any(Date), jasmine.any(Date));
    }));
  });

  describe('Edge Cases', () => {
    it('should handle empty donors list', () => {
      component.donors = [];
      expect(component.donationRows.length).toBe(0);
      expect(component.filteredDonationRows.length).toBe(0);
      expect(component.topDonors.length).toBe(0);
    });

    it('should handle donors with empty donations array', () => {
      const donorNoDonations = {
        id: 99,
        name: 'Test User',
        email: 'test@example.com',
        totalDonated: 0,
        donationCount: 0,
        donations: []
      };
      component.donors = [donorNoDonations];
      expect(component.donationRows.length).toBe(0);
    });

    it('should handle null donations array gracefully', () => {
      const donorNullDonations = {
        id: 99,
        name: 'Test User',
        email: 'test@example.com',
        totalDonated: 0,
        donationCount: 0,
        donations: null as any
      };
      component.donors = [donorNullDonations];
      expect(() => {
        const rows = component.donationRows;
      }).not.toThrow();
    });

    it('should handle very large donation amounts', () => {
      const largeDonor = {
        ...mockDonors[0],
        totalDonated: 999999999
      };
      component.donors = [largeDonor];
      expect(component.topDonors[0].totalDonated).toBe(999999999);
    });

    it('should maintain filter state across data refreshes', () => {
      component.donors = mockDonors;
      component.donationNameFilter = 'Robert';
      component.donationSort = 'asc';

      const filtered1 = component.filteredDonationRows;
      apiService.getAdminDonors.and.returnValue(of({ items: mockDonors }));
      component.fetchDonersDateFiltered(undefined, undefined);

      const filtered2 = component.filteredDonationRows;
      expect(filtered1.length).toBe(filtered2.length);
    });
  });
});
