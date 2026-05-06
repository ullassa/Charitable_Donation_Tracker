import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-blogs',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent, FooterComponent],
  templateUrl: './blogs.component.html',
  styleUrls: ['./blogs.component.css']
})
export class BlogsComponent {
  categories = ['All', 'Success Stories', 'Awareness', 'Positive Vibes', 'Testimonials', 'News Updates'];
  selectedCategory = 'All';

  allPosts: Array<{
    id: number;
    title: string;
    description: string;
    category: string;
    date: string;
    imageUrl: string;
    highlight: string;
  }> = [
    {
      id: 1,
      title: 'School Kits Distributed to 300 Children',
      description: 'CareFund volunteers partnered with local educators to provide school kits, books, and hygiene supplies to children who were at risk of dropping out.',
      category: 'Success Stories',
      date: 'April 2026',
      imageUrl: '/images/children.jpg',
      highlight: 'Education Drive'
    },
    {
      id: 2,
      title: 'Community Health Awareness Camp Completed',
      description: 'Our awareness initiative reached families across multiple neighborhoods with sessions on preventive care, sanitation, and emergency support channels.',
      category: 'Awareness',
      date: 'March 2026',
      imageUrl: '/images/awareness.png',
      highlight: 'Health Awareness'
    },
    {
      id: 3,
      title: 'Elder Care Outreach Brings Weekly Support',
      description: 'Through our elder care network, volunteers now provide weekly check-ins, medicine reminders, and grocery support for senior citizens living alone.',
      category: 'Positive Vibes',
      date: 'March 2026',
      imageUrl: '/images/oldage.jpg',
      highlight: 'Elder Support'
    },
    {
      id: 4,
      title: 'Donor Testimonial: “I can finally see real impact”',
      description: 'A recurring donor shared how transparent updates and visible campaign progress gave confidence to keep supporting causes month after month.',
      category: 'Testimonials',
      date: 'February 2026',
      imageUrl: '/images/testimonial.png',
      highlight: 'Donor Voices'
    },
    {
      id: 5,
      title: 'Animal Care Collaboration Expanded This Quarter',
      description: 'CareFund helped connect rescue partners with donors for food, treatment, and shelter improvements across ongoing animal welfare projects.',
      category: 'News Updates',
      date: 'February 2026',
      imageUrl: '/images/Animal.jpg',
      highlight: 'Animal Welfare'
    },
    {
      id: 6,
      title: 'Youth Volunteers Lead Weekend Clean-Up Events',
      description: 'Young volunteers organized clean-up and recycling drives, creating a positive culture of service and shared responsibility in local communities.',
      category: 'Positive Vibes',
      date: 'January 2026',
      imageUrl: '/images/youth_leadership.png',
      highlight: 'Youth Leadership'
    },
    {
      id: 7,
      title: 'Awareness Article: Why Small Donations Matter',
      description: 'This month’s awareness story explains how consistent small contributions can sustain education, medical aid, and meal programs over time.',
      category: 'Awareness',
      date: 'January 2026',
      imageUrl: '/images/community_education.png',
      highlight: 'Community Education'
    },
    {
      id: 8,
      title: 'Charity Testimonial: “CareFund helped us reach people faster”',
      description: 'A partner organization shared how faster visibility and easier donor reach through CareFund helped them serve beneficiaries in urgent cases.',
      category: 'Testimonials',
      date: 'December 2025',
      imageUrl: '/images/testimonials.png',
      highlight: 'Partner Voices'
    }
  ];

  get filteredPosts() {
    return this.selectedCategory === 'All'
      ? this.allPosts
      : this.allPosts.filter(post => post.category === this.selectedCategory);
  }

  get featuredPosts() {
    return this.allPosts.slice(0, 3);
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
  }
}
