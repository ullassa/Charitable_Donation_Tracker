/**
 * Test Utilities and Mock Data Helpers
 * Provides reusable mock data generators, filter/sort assertion helpers,
 * and utility functions for comprehensive donation tracking tests
 */

/**
 * Mock Data Generators
 */
export class DonationTestDataHelper {
  /**
   * Generate mock donor data with configurable properties
   */
  static generateMockDonor(
    id: number,
    name: string,
    email: string,
    totalDonated: number = 5000,
    donationCount: number = 3,
    donations: any[] = []
  ) {
    return {
      id,
      name,
      email,
      totalDonated,
      donationCount,
      donations: donations.length > 0 ? donations : this.generateMockDonations(donationCount, totalDonated)
    };
  }

  /**
   * Generate mock donation data with configurable properties
   */
  static generateMockDonation(
    id: number,
    charityId: number,
    charityName: string,
    amount: number,
    donationDate: Date = new Date(),
    paymentMethod: string = 'upi',
    isAnonymous: boolean = false,
    transactionReference: string = `TXN${String(id).padStart(3, '0')}`
  ) {
    return {
      id,
      charityRegistrationId: charityId,
      charityName,
      amount,
      isAnonymous,
      paymentMethod,
      transactionReference,
      donationDate,
      status: 'Completed'
    };
  }

  /**
   * Generate multiple mock donations
   */
  static generateMockDonations(
    count: number,
    totalAmount: number,
    startDate: Date = new Date('2025-04-01')
  ) {
    const donations = [];
    const amountPerDonation = Math.floor(totalAmount / count);

    for (let i = 0; i < count; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      donations.push(
        this.generateMockDonation(
          i + 1,
          (i % 3) + 1,
          ['Education Fund', 'Health Ministry', 'Environment Care'][i % 3],
          amountPerDonation,
          date,
          ['upi', 'card', 'netbanking'][i % 3],
          i % 5 === 0
        )
      );
    }

    return donations;
  }

  /**
   * Generate multiple mock donors
   */
  static generateMockDonors(count: number, startingId: number = 1) {
    const donors = [];
    const names = [
      'John Doe', 'Jane Smith', 'Robert Wilson', 'Alice Brown', 'Charlie Davis',
      'Diana Evans', 'Edward Franklin', 'Fiona Garcia', 'George Harris', 'Helen Irving'
    ];

    for (let i = 0; i < count; i++) {
      const totalAmount = Math.floor(Math.random() * 15000) + 1000;
      const donationCount = Math.floor(Math.random() * 5) + 1;

      donors.push(
        this.generateMockDonor(
          startingId + i,
          names[i % names.length],
          `${names[i % names.length].toLowerCase().replace(' ', '.')}@example.com`,
          totalAmount,
          donationCount
        )
      );
    }

    return donors;
  }

  /**
   * Generate mock charity data
   */
  static generateMockCharity(
    id: number,
    name: string,
    cause: string = 'Education',
    location: string = 'Delhi'
  ) {
    return {
      id,
      name,
      cause,
      location,
      description: `${name} charity description`,
      registrationId: `REG${String(id).padStart(3, '0')}`,
      mission: `Support ${cause}`,
      about: `About ${name}`,
      activities: `${name} activities`,
      addressLine: `${id} Main Street`,
      managerName: `Manager ${id}`,
      managerPhone: `987654321${String(id).padStart(2, '0')}`,
      pincode: `${110000 + id}`,
      state: location,
      email: `${name.toLowerCase().replace(' ', '')}@charity.com`,
      phoneNumber: `987654321${String(id).padStart(2, '0')}`,
      imageUrls: [`charity${id}.jpg`],
      isActive: true,
      status: 'Approved'
    };
  }
}

/**
 * Filter Assertion Helpers
 */
export class FilterAssertionHelper {
  /**
   * Assert that all items in array match filter predicate
   */
  static assertAllMatch(items: any[], predicate: (item: any) => boolean, description: string) {
    const results = items.filter(item => !predicate(item));
    if (results.length > 0) {
      throw new Error(`Filter assertion failed: ${description}. ${results.length} items did not match.`);
    }
    return true;
  }

  /**
   * Assert name filter matches (case-insensitive, partial match)
   */
  static assertNameFilterMatch(
    items: any[],
    filterValue: string,
    nameProperty: string = 'donorName'
  ) {
    const lowerFilter = filterValue.toLowerCase();
    return this.assertAllMatch(
      items,
      item => item[nameProperty].toLowerCase().includes(lowerFilter),
      `Name filter: ${filterValue}`
    );
  }

  /**
   * Assert date range filter (inclusive both ends)
   */
  static assertDateRangeFilter(
    items: any[],
    fromDate: Date | undefined,
    toDate: Date | undefined,
    dateProperty: string = 'donationDate'
  ) {
    return this.assertAllMatch(
      items,
      item => {
        const itemDate = new Date(item[dateProperty]).getTime();
        if (fromDate && itemDate < fromDate.getTime()) return false;
        if (toDate && itemDate > toDate.getTime()) return false;
        return true;
      },
      `Date range filter: ${fromDate?.toDateString()} to ${toDate?.toDateString()}`
    );
  }

  /**
   * Assert amount range filter
   */
  static assertAmountRangeFilter(
    items: any[],
    minAmount?: number,
    maxAmount?: number,
    amountProperty: string = 'amount'
  ) {
    return this.assertAllMatch(
      items,
      item => {
        const amount = Number(item[amountProperty]);
        if (minAmount !== undefined && amount < minAmount) return false;
        if (maxAmount !== undefined && amount > maxAmount) return false;
        return true;
      },
      `Amount range filter: ${minAmount} to ${maxAmount}`
    );
  }

  /**
   * Assert combined multiple filters (name + date + amount)
   */
  static assertCombinedFilters(
    items: any[],
    nameFilter?: string,
    fromDate?: Date,
    toDate?: Date,
    minAmount?: number,
    maxAmount?: number
  ) {
    if (nameFilter) {
      this.assertNameFilterMatch(items, nameFilter, 'donorName');
    }
    if (fromDate || toDate) {
      this.assertDateRangeFilter(items, fromDate, toDate, 'donationDate');
    }
    if (minAmount !== undefined || maxAmount !== undefined) {
      this.assertAmountRangeFilter(items, minAmount, maxAmount, 'amount');
    }
    return true;
  }
}

/**
 * Sort Assertion Helpers
 */
export class SortAssertionHelper {
  /**
   * Assert items are sorted in descending order by property
   */
  static assertDescendingSort(items: any[], property: string, description: string = '') {
    for (let i = 0; i < items.length - 1; i++) {
      const current = Number(items[i][property]);
      const next = Number(items[i + 1][property]);
      if (current < next) {
        throw new Error(
          `Descending sort failed ${description}: Item ${i} (${current}) < Item ${i + 1} (${next})`
        );
      }
    }
    return true;
  }

  /**
   * Assert items are sorted in ascending order by property
   */
  static assertAscendingSort(items: any[], property: string, description: string = '') {
    for (let i = 0; i < items.length - 1; i++) {
      const current = Number(items[i][property]);
      const next = Number(items[i + 1][property]);
      if (current > next) {
        throw new Error(
          `Ascending sort failed ${description}: Item ${i} (${current}) > Item ${i + 1} (${next})`
        );
      }
    }
    return true;
  }

  /**
   * Assert items are sorted by amount (high to low)
   */
  static assertAmountSortHighToLow(items: any[], amountProperty: string = 'amount') {
    return this.assertDescendingSort(items, amountProperty, 'by amount (high to low)');
  }

  /**
   * Assert items are sorted by amount (low to high)
   */
  static assertAmountSortLowToHigh(items: any[], amountProperty: string = 'amount') {
    return this.assertAscendingSort(items, amountProperty, 'by amount (low to high)');
  }

  /**
   * Assert items are sorted by donation date (most recent first)
   */
  static assertDateSortNewestFirst(items: any[], dateProperty: string = 'donationDate') {
    for (let i = 0; i < items.length - 1; i++) {
      const current = new Date(items[i][dateProperty]).getTime();
      const next = new Date(items[i + 1][dateProperty]).getTime();
      if (current < next) {
        throw new Error(
          `Date sort (newest first) failed: Item ${i} (${items[i][dateProperty]}) is older than Item ${i + 1} (${items[i + 1][dateProperty]})`
        );
      }
    }
    return true;
  }

  /**
   * Assert items are sorted by donation date (oldest first)
   */
  static assertDateSortOldestFirst(items: any[], dateProperty: string = 'donationDate') {
    for (let i = 0; i < items.length - 1; i++) {
      const current = new Date(items[i][dateProperty]).getTime();
      const next = new Date(items[i + 1][dateProperty]).getTime();
      if (current > next) {
        throw new Error(
          `Date sort (oldest first) failed: Item ${i} (${items[i][dateProperty]}) is newer than Item ${i + 1} (${items[i + 1][dateProperty]})`
        );
      }
    }
    return true;
  }

  /**
   * Assert top N items by property value
   */
  static assertTopNByValue(items: any[], property: string, topN: number) {
    if (items.length > topN) {
      throw new Error(`Expected max ${topN} items, but got ${items.length}`);
    }
    return this.assertDescendingSort(items, property, `for top ${topN}`);
  }
}

/**
 * Donation Calculation Helpers
 */
export class DonationCalculationHelper {
  /**
   * Calculate total donated by a donor across all donations
   */
  static calculateTotalDonated(donations: any[]): number {
    return donations.reduce((sum, donation) => sum + Number(donation.amount || 0), 0);
  }

  /**
   * Calculate average donation amount
   */
  static calculateAverageDonation(donations: any[]): number {
    if (donations.length === 0) return 0;
    return this.calculateTotalDonated(donations) / donations.length;
  }

  /**
   * Find highest single donation
   */
  static findHighestDonation(donations: any[]): number {
    if (donations.length === 0) return 0;
    return Math.max(...donations.map(d => Number(d.amount || 0)));
  }

  /**
   * Find lowest single donation
   */
  static findLowestDonation(donations: any[]): number {
    if (donations.length === 0) return 0;
    return Math.min(...donations.map(d => Number(d.amount || 0)));
  }

  /**
   * Calculate total raised by all donors for a specific charity
   */
  static calculateCharityTotal(donors: any[], charityId: number): number {
    return donors.reduce((sum, donor) => {
      const charityDonations = (donor.donations || [])
        .filter((d: any) => d.charityRegistrationId === charityId);
      return sum + this.calculateTotalDonated(charityDonations);
    }, 0);
  }

  /**
   * Calculate average donation per payment method
   */
  static calculateAverageByPaymentMethod(donations: any[]): Map<string, number> {
    const methodGroups = new Map<string, any[]>();

    donations.forEach(donation => {
      const method = donation.paymentMethod;
      if (!methodGroups.has(method)) {
        methodGroups.set(method, []);
      }
      methodGroups.get(method)!.push(donation);
    });

    const averages = new Map<string, number>();
    methodGroups.forEach((donations, method) => {
      const total = this.calculateTotalDonated(donations);
      averages.set(method, total / donations.length);
    });

    return averages;
  }

  /**
   * Get donation statistics
   */
  static getDonationStats(donations: any[]) {
    return {
      count: donations.length,
      total: this.calculateTotalDonated(donations),
      average: this.calculateAverageDonation(donations),
      highest: this.findHighestDonation(donations),
      lowest: this.findLowestDonation(donations)
    };
  }
}

/**
 * Flattening and Transformation Helpers
 */
export class DataTransformationHelper {
  /**
   * Flatten donor donations to individual rows (without grouping)
   */
  static flattenDonorsToRows(donors: any[]): any[] {
    return donors.flatMap(donor =>
      (donor?.donations ?? []).map((donation: any) => ({
        donationId: donation.id,
        donorName: donor.name,
        donorEmail: donor.email,
        amount: donation.amount,
        donationDate: donation.donationDate,
        charityName: donation.charityName,
        charityRegistrationId: donation.charityRegistrationId,
        paymentMethod: donation.paymentMethod,
        transactionReference: donation.transactionReference,
        isAnonymous: donation.isAnonymous,
        status: donation.status
      }))
    );
  }

  /**
   * Group donations by charity
   */
  static groupByCharity(donations: any[]): Map<number, any[]> {
    const groups = new Map<number, any[]>();
    donations.forEach(donation => {
      const charityId = donation.charityRegistrationId;
      if (!groups.has(charityId)) {
        groups.set(charityId, []);
      }
      groups.get(charityId)!.push(donation);
    });
    return groups;
  }

  /**
   * Group donations by payment method
   */
  static groupByPaymentMethod(donations: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>();
    donations.forEach(donation => {
      const method = donation.paymentMethod;
      if (!groups.has(method)) {
        groups.set(method, []);
      }
      groups.get(method)!.push(donation);
    });
    return groups;
  }

  /**
   * Group donations by date (day level)
   */
  static groupByDate(donations: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>();
    donations.forEach(donation => {
      const date = new Date(donation.donationDate).toDateString();
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(donation);
    });
    return groups;
  }

  /**
   * Get donor summary (name, email, total, count, average per donation)
   */
  static getDonorSummary(donor: any) {
    const stats = DonationCalculationHelper.getDonationStats(donor.donations || []);
    return {
      id: donor.id,
      name: donor.name,
      email: donor.email,
      totalDonated: donor.totalDonated,
      donationCount: donor.donationCount,
      averageDonation: stats.average,
      highestDonation: stats.highest,
      lowestDonation: stats.lowest
    };
  }
}

/**
 * Validation Helpers
 */
export class ValidationHelper {
  /**
   * Validate donation amount is positive
   */
  static isValidAmount(amount: number): boolean {
    return amount > 0 && !isNaN(amount);
  }

  /**
   * Validate donation date is not in future
   */
  static isValidDonationDate(date: Date): boolean {
    return new Date(date) <= new Date();
  }

  /**
   * Validate donor email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate all required donation fields
   */
  static isValidDonation(donation: any): boolean {
    return (
      this.isValidAmount(donation.amount) &&
      this.isValidDonationDate(donation.donationDate) &&
      donation.charityRegistrationId > 0 &&
      donation.transactionReference &&
      ['upi', 'card', 'netbanking', 'wallet'].includes(donation.paymentMethod)
    );
  }

  /**
   * Validate all required donor fields
   */
  static isValidDonor(donor: any): boolean {
    return (
      donor.id > 0 &&
      donor.name &&
      this.isValidEmail(donor.email) &&
      donor.totalDonated >= 0 &&
      Array.isArray(donor.donations) &&
      donor.donations.every((d: any) => this.isValidDonation(d))
    );
  }
}
