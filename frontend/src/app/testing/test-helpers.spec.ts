import {
  DonationTestDataHelper,
  FilterAssertionHelper,
  SortAssertionHelper,
  DonationCalculationHelper,
  DataTransformationHelper,
  ValidationHelper
} from './test-helpers';

describe('Test Helpers - Comprehensive Test Suite', () => {
  describe('DonationTestDataHelper', () => {
    describe('generateMockDonor', () => {
      it('should generate donor with specified properties', () => {
        const donor = DonationTestDataHelper.generateMockDonor(
          1,
          'John Doe',
          'john@example.com',
          5000,
          3
        );

        expect(donor.id).toBe(1);
        expect(donor.name).toBe('John Doe');
        expect(donor.email).toBe('john@example.com');
        expect(donor.totalDonated).toBe(5000);
        expect(donor.donationCount).toBe(3);
      });

      it('should generate donations if not provided', () => {
        const donor = DonationTestDataHelper.generateMockDonor(1, 'Test', 'test@example.com', 1000, 3);
        expect(donor.donations.length).toBe(3);
      });

      it('should use provided donations array', () => {
        const mockDonations = [{ id: 1, amount: 500 }];
        const donor = DonationTestDataHelper.generateMockDonor(
          1,
          'Test',
          'test@example.com',
          1000,
          1,
          mockDonations
        );
        expect(donor.donations).toEqual(mockDonations);
      });
    });

    describe('generateMockDonation', () => {
      it('should generate donation with default values', () => {
        const donation = DonationTestDataHelper.generateMockDonation(
          1,
          1,
          'Education Fund',
          1000
        );

        expect(donation.id).toBe(1);
        expect(donation.charityRegistrationId).toBe(1);
        expect(donation.charityName).toBe('Education Fund');
        expect(donation.amount).toBe(1000);
        expect(donation.isAnonymous).toBe(false);
        expect(donation.paymentMethod).toBe('upi');
        expect(donation.status).toBe('Completed');
      });

      it('should generate donation with custom properties', () => {
        const date = new Date('2025-04-20');
        const donation = DonationTestDataHelper.generateMockDonation(
          5,
          2,
          'Health Ministry',
          5000,
          date,
          'card',
          true,
          'TXN12345'
        );

        expect(donation.id).toBe(5);
        expect(donation.amount).toBe(5000);
        expect(donation.paymentMethod).toBe('card');
        expect(donation.isAnonymous).toBe(true);
        expect(donation.transactionReference).toBe('TXN12345');
      });

      it('should generate unique transaction reference', () => {
        const donation1 = DonationTestDataHelper.generateMockDonation(1, 1, 'Charity', 100);
        const donation2 = DonationTestDataHelper.generateMockDonation(2, 1, 'Charity', 100);
        expect(donation1.transactionReference).not.toBe(donation2.transactionReference);
      });
    });

    describe('generateMockDonations', () => {
      it('should generate specified number of donations', () => {
        const donations = DonationTestDataHelper.generateMockDonations(5, 5000);
        expect(donations.length).toBe(5);
      });

      it('should distribute amount across donations', () => {
        const donations = DonationTestDataHelper.generateMockDonations(5, 5000);
        const total = donations.reduce((sum, d) => sum + d.amount, 0);
        expect(total).toBeGreaterThan(0);
      });

      it('should create donations with sequential dates', () => {
        const donations = DonationTestDataHelper.generateMockDonations(3, 3000);
        const date1 = donations[0].donationDate.getTime();
        const date2 = donations[1].donationDate.getTime();
        expect(date2).toBeGreaterThan(date1);
      });

      it('should handle single donation', () => {
        const donations = DonationTestDataHelper.generateMockDonations(1, 1000);
        expect(donations.length).toBe(1);
        expect(donations[0].amount).toBe(1000);
      });
    });

    describe('generateMockDonors', () => {
      it('should generate specified number of donors', () => {
        const donors = DonationTestDataHelper.generateMockDonors(5);
        expect(donors.length).toBe(5);
      });

      it('should generate unique donor IDs', () => {
        const donors = DonationTestDataHelper.generateMockDonors(5, 1);
        const ids = donors.map(d => d.id);
        expect(new Set(ids).size).toBe(5);
      });

      it('should generate valid email addresses', () => {
        const donors = DonationTestDataHelper.generateMockDonors(3);
        donors.forEach(donor => {
          expect(donor.email).toMatch(/@example\.com$/);
        });
      });

      it('should start with specified ID', () => {
        const donors = DonationTestDataHelper.generateMockDonors(3, 100);
        expect(donors[0].id).toBe(100);
        expect(donors[1].id).toBe(101);
        expect(donors[2].id).toBe(102);
      });

      it('should generate donors with donations', () => {
        const donors = DonationTestDataHelper.generateMockDonors(2);
        donors.forEach(donor => {
          expect(donor.donations.length).toBeGreaterThan(0);
          expect(donor.donationCount).toBe(donor.donations.length);
        });
      });
    });

    describe('generateMockCharity', () => {
      it('should generate charity with required properties', () => {
        const charity = DonationTestDataHelper.generateMockCharity(1, 'Test Charity', 'Education', 'Delhi');
        expect(charity.id).toBe(1);
        expect(charity.name).toBe('Test Charity');
        expect(charity.cause).toBe('Education');
        expect(charity.location).toBe('Delhi');
      });

      it('should generate valid registration ID', () => {
        const charity = DonationTestDataHelper.generateMockCharity(5, 'Charity', 'Health');
        expect(charity.registrationId).toBe('REG005');
      });

      it('should generate valid email', () => {
        const charity = DonationTestDataHelper.generateMockCharity(1, 'Test Charity');
        expect(charity.email).toMatch(/@charity\.com$/);
      });

      it('should set isActive and status', () => {
        const charity = DonationTestDataHelper.generateMockCharity(1, 'Charity');
        expect(charity.isActive).toBe(true);
        expect(charity.status).toBe('Approved');
      });
    });
  });

  describe('FilterAssertionHelper', () => {
    const testData = [
      { donorName: 'John Doe', amount: 100, donationDate: new Date('2025-04-20') },
      { donorName: 'Jane Smith', amount: 200, donationDate: new Date('2025-04-21') },
      { donorName: 'Robert Wilson', amount: 150, donationDate: new Date('2025-04-22') }
    ];

    describe('assertAllMatch', () => {
      it('should pass when all items match predicate', () => {
        expect(() => {
          FilterAssertionHelper.assertAllMatch(
            testData,
            item => item.amount > 0,
            'All amounts positive'
          );
        }).not.toThrow();
      });

      it('should throw when items do not match predicate', () => {
        expect(() => {
          FilterAssertionHelper.assertAllMatch(
            testData,
            item => item.amount > 500,
            'All amounts > 500'
          );
        }).toThrowError();
      });
    });

    describe('assertNameFilterMatch', () => {
      it('should verify name filter (case-insensitive)', () => {
        const filtered = testData.filter(d => d.donorName.toLowerCase().includes('john'));
        expect(() => {
          FilterAssertionHelper.assertNameFilterMatch(filtered, 'john', 'donorName');
        }).not.toThrow();
      });

      it('should fail when names do not match filter', () => {
        const filtered = testData.filter(d => d.donorName.includes('Robert'));
        expect(() => {
          FilterAssertionHelper.assertNameFilterMatch(filtered, 'john', 'donorName');
        }).toThrowError();
      });
    });

    describe('assertDateRangeFilter', () => {
      it('should verify date range (from date)', () => {
        const fromDate = new Date('2025-04-20');
        const filtered = testData.filter(d => new Date(d.donationDate) >= fromDate);
        expect(() => {
          FilterAssertionHelper.assertDateRangeFilter(filtered, fromDate, undefined);
        }).not.toThrow();
      });

      it('should verify date range (to date)', () => {
        const toDate = new Date('2025-04-21');
        const filtered = testData.filter(d => new Date(d.donationDate) <= toDate);
        expect(() => {
          FilterAssertionHelper.assertDateRangeFilter(filtered, undefined, toDate);
        }).not.toThrow();
      });
    });

    describe('assertAmountRangeFilter', () => {
      it('should verify amount range', () => {
        const filtered = testData.filter(d => d.amount >= 100 && d.amount <= 200);
        expect(() => {
          FilterAssertionHelper.assertAmountRangeFilter(filtered, 100, 200, 'amount');
        }).not.toThrow();
      });
    });

    describe('assertCombinedFilters', () => {
      it('should verify combined filters', () => {
        const filtered = testData.filter(d =>
          d.donorName.toLowerCase().includes('john') &&
          d.amount >= 100
        );
        expect(() => {
          FilterAssertionHelper.assertCombinedFilters(filtered, 'john', undefined, undefined, 100);
        }).not.toThrow();
      });
    });
  });

  describe('SortAssertionHelper', () => {
    const testData = [
      { amount: 300 },
      { amount: 200 },
      { amount: 100 }
    ];

    const testDataAsc = [
      { amount: 100 },
      { amount: 200 },
      { amount: 300 }
    ];

    describe('assertDescendingSort', () => {
      it('should pass for descending order', () => {
        expect(() => {
          SortAssertionHelper.assertDescendingSort(testData, 'amount');
        }).not.toThrow();
      });

      it('should fail for ascending order', () => {
        expect(() => {
          SortAssertionHelper.assertDescendingSort(testDataAsc, 'amount');
        }).toThrowError();
      });
    });

    describe('assertAscendingSort', () => {
      it('should pass for ascending order', () => {
        expect(() => {
          SortAssertionHelper.assertAscendingSort(testDataAsc, 'amount');
        }).not.toThrow();
      });

      it('should fail for descending order', () => {
        expect(() => {
          SortAssertionHelper.assertAscendingSort(testData, 'amount');
        }).toThrowError();
      });
    });

    describe('assertAmountSortHighToLow', () => {
      it('should verify high to low sort', () => {
        expect(() => {
          SortAssertionHelper.assertAmountSortHighToLow(testData);
        }).not.toThrow();
      });
    });

    describe('assertAmountSortLowToHigh', () => {
      it('should verify low to high sort', () => {
        expect(() => {
          SortAssertionHelper.assertAmountSortLowToHigh(testDataAsc);
        }).not.toThrow();
      });
    });
  });

  describe('DonationCalculationHelper', () => {
    const donations = [
      { amount: 1000 },
      { amount: 2000 },
      { amount: 3000 }
    ];

    describe('calculateTotalDonated', () => {
      it('should calculate total donation amount', () => {
        const total = DonationCalculationHelper.calculateTotalDonated(donations);
        expect(total).toBe(6000);
      });

      it('should handle empty array', () => {
        const total = DonationCalculationHelper.calculateTotalDonated([]);
        expect(total).toBe(0);
      });

      it('should handle null amounts', () => {
        const donatationsWithNull = [
          { amount: 1000 },
          { amount: null },
          { amount: 2000 }
        ];
        const total = DonationCalculationHelper.calculateTotalDonated(donatationsWithNull as any);
        expect(total).toBe(3000);
      });
    });

    describe('calculateAverageDonation', () => {
      it('should calculate average donation', () => {
        const avg = DonationCalculationHelper.calculateAverageDonation(donations);
        expect(avg).toBe(2000);
      });

      it('should return 0 for empty array', () => {
        const avg = DonationCalculationHelper.calculateAverageDonation([]);
        expect(avg).toBe(0);
      });
    });

    describe('findHighestDonation', () => {
      it('should find highest donation', () => {
        const highest = DonationCalculationHelper.findHighestDonation(donations);
        expect(highest).toBe(3000);
      });

      it('should return 0 for empty array', () => {
        const highest = DonationCalculationHelper.findHighestDonation([]);
        expect(highest).toBe(0);
      });
    });

    describe('findLowestDonation', () => {
      it('should find lowest donation', () => {
        const lowest = DonationCalculationHelper.findLowestDonation(donations);
        expect(lowest).toBe(1000);
      });

      it('should return 0 for empty array', () => {
        const lowest = DonationCalculationHelper.findLowestDonation([]);
        expect(lowest).toBe(0);
      });
    });

    describe('getDonationStats', () => {
      it('should return all statistics', () => {
        const stats = DonationCalculationHelper.getDonationStats(donations);
        expect(stats.count).toBe(3);
        expect(stats.total).toBe(6000);
        expect(stats.average).toBe(2000);
        expect(stats.highest).toBe(3000);
        expect(stats.lowest).toBe(1000);
      });
    });
  });

  describe('DataTransformationHelper', () => {
    const donors = [
      {
        id: 1,
        name: 'John',
        email: 'john@example.com',
        donations: [
          { id: 1, amount: 100, charityRegistrationId: 1, charityName: 'Charity A', paymentMethod: 'upi', transactionReference: 'TXN001', donationDate: new Date(), isAnonymous: false, status: 'Completed' },
          { id: 2, amount: 200, charityRegistrationId: 1, charityName: 'Charity A', paymentMethod: 'card', transactionReference: 'TXN002', donationDate: new Date(), isAnonymous: false, status: 'Completed' }
        ]
      },
      {
        id: 2,
        name: 'Jane',
        email: 'jane@example.com',
        donations: [
          { id: 3, amount: 300, charityRegistrationId: 2, charityName: 'Charity B', paymentMethod: 'upi', transactionReference: 'TXN003', donationDate: new Date(), isAnonymous: true, status: 'Completed' }
        ]
      }
    ];

    describe('flattenDonorsToRows', () => {
      it('should flatten donors to individual donation rows', () => {
        const rows = DataTransformationHelper.flattenDonorsToRows(donors);
        expect(rows.length).toBe(3);
      });

      it('should include donor and donation information', () => {
        const rows = DataTransformationHelper.flattenDonorsToRows(donors);
        expect(rows[0].donorName).toBe('John');
        expect(rows[0].donationId).toBe(1);
        expect(rows[0].amount).toBe(100);
      });

      it('should handle empty donations', () => {
        const donorsNoDonations = [{ id: 1, name: 'Test', email: 'test@example.com', donations: [] }];
        const rows = DataTransformationHelper.flattenDonorsToRows(donorsNoDonations);
        expect(rows.length).toBe(0);
      });
    });

    describe('groupByCharity', () => {
      it('should group donations by charity', () => {
        const donations = donors.flatMap(d => d.donations);
        const groups = DataTransformationHelper.groupByCharity(donations);
        expect(groups.size).toBe(2);
      });

      it('should correctly group by charity ID', () => {
        const donations = donors.flatMap(d => d.donations);
        const groups = DataTransformationHelper.groupByCharity(donations);
        expect(groups.get(1)!.length).toBe(2);
        expect(groups.get(2)!.length).toBe(1);
      });
    });

    describe('groupByPaymentMethod', () => {
      it('should group donations by payment method', () => {
        const donations = donors.flatMap(d => d.donations);
        const groups = DataTransformationHelper.groupByPaymentMethod(donations);
        expect(groups.has('upi')).toBe(true);
        expect(groups.has('card')).toBe(true);
      });
    });

    describe('getDonorSummary', () => {
      it('should return donor summary with statistics', () => {
        const summary = DataTransformationHelper.getDonorSummary(donors[0]);
        expect(summary.name).toBe('John');
        expect(summary.donationCount).toBe(2);
      });
    });
  });

  describe('ValidationHelper', () => {
    describe('isValidAmount', () => {
      it('should validate positive amounts', () => {
        expect(ValidationHelper.isValidAmount(100)).toBe(true);
        expect(ValidationHelper.isValidAmount(0.01)).toBe(true);
      });

      it('should reject zero and negative amounts', () => {
        expect(ValidationHelper.isValidAmount(0)).toBe(false);
        expect(ValidationHelper.isValidAmount(-100)).toBe(false);
      });

      it('should reject NaN', () => {
        expect(ValidationHelper.isValidAmount(NaN)).toBe(false);
      });
    });

    describe('isValidEmail', () => {
      it('should validate valid emails', () => {
        expect(ValidationHelper.isValidEmail('test@example.com')).toBe(true);
        expect(ValidationHelper.isValidEmail('user.name@domain.co.uk')).toBe(true);
      });

      it('should reject invalid emails', () => {
        expect(ValidationHelper.isValidEmail('invalid')).toBe(false);
        expect(ValidationHelper.isValidEmail('@example.com')).toBe(false);
        expect(ValidationHelper.isValidEmail('test@')).toBe(false);
      });
    });

    describe('isValidDonationDate', () => {
      it('should accept past and current dates', () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);
        expect(ValidationHelper.isValidDonationDate(pastDate)).toBe(true);
        expect(ValidationHelper.isValidDonationDate(new Date())).toBe(true);
      });

      it('should reject future dates', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);
        expect(ValidationHelper.isValidDonationDate(futureDate)).toBe(false);
      });
    });

    describe('isValidDonation', () => {
      const validDonation = {
        amount: 1000,
        donationDate: new Date(),
        charityRegistrationId: 1,
        transactionReference: 'TXN123',
        paymentMethod: 'upi'
      };

      it('should validate correct donations', () => {
        expect(ValidationHelper.isValidDonation(validDonation)).toBe(true);
      });

      it('should reject donations with invalid amount', () => {
        const invalidDonation = { ...validDonation, amount: 0 };
        expect(ValidationHelper.isValidDonation(invalidDonation)).toBe(false);
      });

      it('should reject donations with invalid payment method', () => {
        const invalidDonation = { ...validDonation, paymentMethod: 'invalid' };
        expect(ValidationHelper.isValidDonation(invalidDonation)).toBe(false);
      });
    });
  });
});
