import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-impact',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent, FooterComponent],
  templateUrl: './impact.component.html',
  styleUrls: ['./impact.component.css']
})
export class ImpactComponent {
  impactMetrics = [
    { icon: '', label: 'Total Donations', value: '$200', description: 'Funds distributed to verified causes' },
    { icon: '', label: 'Active Charities', value: '2', description: 'Verified charity partners' },
    { icon: '', label: 'Lives Impacted', value: '5+', description: 'People helped globally' },
    { icon: '', label: 'Reach', value: '1 Country', description: 'Global charitable reach' },
  ];

  impactStories = [
    {
      title: 'Medical Emergency Relief',
      cause: 'Medical',
      description: 'We provided emergency medical assistance to 500+ families in rural areas during the health crisis.',
      impact: '$500K disbursed',
      beneficiaries: '500+ families',
      image: '🏥'
    },
    {
      title: 'Education for Underprivileged',
      cause: 'Education',
      description: 'Built and equipped 10 schools providing quality education to 2,000+ children.',
      impact: '$300K utilized',
      beneficiaries: '2,000+ children',
      image: '📚'
    },
    {
      title: 'Food Security Initiative',
      cause: 'Food & Hunger',
      description: 'Distributed meals to 10,000+ underprivileged people during monsoon season.',
      impact: '$200K spent',
      beneficiaries: '10,000+ people',
      image: '🍽️'
    },
    {
      title: 'Environmental Conservation',
      cause: 'Environmental',
      description: 'Planted 100,000 trees and cleaned 50 water bodies across the region.',
      impact: '$150K invested',
      beneficiaries: 'Entire ecosystem',
      image: '🌍'
    }
  ];

  // milestones = [
  //   { year: '20-03-2026', event: 'Started Planning', icon: '🚀' },
  //   { year: '2023', event: 'First 1000 Donors Joined', icon: '👥' },
  //   { year: '2024', event: 'Reached 50K Lives Impacted', icon: '🎯' },
  //   { year: '2024', event: '150+ Charity Partners Onboarded', icon: '🤝' },
  //   { year: '2025', event: 'Expanded to 25+ Countries', icon: '🌏' },
  //   { year: '2026', event: '$2.5M+ Total Donations', icon: '💎' }
  // ];
}
