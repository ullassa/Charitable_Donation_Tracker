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
  blogPosts = [
    {
      id: 1,
      title: 'How Your Donation Makes a Real Difference',
      excerpt: 'Learn how every dollar you contribute helps solve critical problems in communities around the world.',
      category: 'Impact',
      author: 'Sarah Johnson',
      date: 'April 10, 2026',
      readTime: '5 min read',
      image: 'DATA',
      featured: true
    },
    {
      id: 2,
      title: 'Spotlight: Transforming Education in Rural Areas',
      excerpt: 'Meet the charity partners revolutionizing access to quality education for underprivileged children.',
      category: 'Charity',
      author: 'Ahmed Hassan',
      date: 'April 8, 2026',
      readTime: '7 min read',
      image: 'EDU',
      featured: true
    },
    {
      id: 3,
      title: 'Transparency in Giving: How We Track Your Impact',
      excerpt: 'Discover how CareFund ensures complete transparency in the distribution of donations to verified causes.',
      category: 'Transparency',
      author: 'Emily Davis',
      date: 'April 5, 2026',
      readTime: '6 min read',
      image: 'INSIGHT',
      featured: true
    },
    {
      id: 4,
      title: 'Medical Relief: Saving Lives Through Community Support',
      excerpt: 'Real stories of how our medical relief fund is providing emergency care to those in need.',
      category: 'Medical',
      author: 'Dr. Michael Chen',
      date: 'April 1, 2026',
      readTime: '8 min read',
      image: 'MED'
    },
    {
      id: 5,
      title: 'Environmental Initiative: Planting Hope',
      excerpt: 'Join our mission to plant 1 million trees and restore our damaged ecosystems one project at a time.',
      category: 'Environment',
      author: 'Lisa Green',
      date: 'March 28, 2026',
      readTime: '5 min read',
      image: 'GREEN'
    },
    {
      id: 6,
      title: 'Success Story: From Disaster to Recovery',
      excerpt: 'How CareFund came together to provide emergency relief and long-term recovery support.',
      category: 'Success',
      author: 'John Miller',
      date: 'March 25, 2026',
      readTime: '7 min read',
      image: 'RELIEF'
    }
  ];

  categories = ['All', 'Impact', 'Charity', 'Transparency', 'Medical', 'Environment', 'Success'];
  selectedCategory = 'All';

  get filteredPosts() {
    return this.selectedCategory === 'All'
      ? this.blogPosts
      : this.blogPosts.filter(post => post.category === this.selectedCategory);
  }

  get featuredPosts() {
    return this.blogPosts.filter(post => post.featured).slice(0, 3);
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
  }
}
