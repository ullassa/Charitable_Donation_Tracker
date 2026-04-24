import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-impact',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent, FooterComponent],
  templateUrl: './impact.component.html',
  styleUrls: ['./impact.component.css']
})
export class ImpactComponent implements OnInit {
  metrics: Array<{ icon: string; label: string; value: string }> = [];
  stories: Array<{ title: string; cause: string; raised: number; target: number; progress: number; imageUrl: string }> = [];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadImpact();
  }

  loadImpact(): void {
    this.api.getPublicCharities().subscribe({
      next: (response: any) => {
        const items = (response?.items ?? []).filter((item: any) => item.status === 'Approved');
        
        const totalRaised = items.reduce((sum: number, item: any) => sum + Number(item.totalReceived || 0), 0);
        const totalNeeded = items.reduce((sum: number, item: any) => sum + Number(item.targetAmount || 0), 0);
        const totalRemaining = totalNeeded - totalRaised;

        this.metrics = [
          { icon: 'raised', label: 'Total Raised', value: `₹${totalRaised.toLocaleString('en-IN')}` },
          { icon: 'partners', label: 'Active Partners', value: String(items.length) },
          { icon: 'target', label: 'Total Target', value: `₹${totalNeeded.toLocaleString('en-IN')}` },
          { icon: 'progress', label: 'Overall Progress', value: `${Math.round((totalRaised / totalNeeded) * 100) || 0}%` }
        ];

        this.stories = items.slice(0, 6).map((item: any) => ({
          title: item.charityName || 'Charity Initiative',
          cause: item.cause || 'Community Support',
          raised: Number(item.totalReceived || 0),
          target: Number(item.targetAmount || 0),
          progress: Number(item.progressPercent || 0),
          imageUrl: this.normalizeImageUrl(Array.isArray(item.imageUrls) && item.imageUrls.length > 0 ? item.imageUrls[0] : '')
        }));
      },
      error: () => {
        this.metrics = [];
        this.stories = [];
      }
    });
  }

  normalizeImageUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('/images/')) return url;
    if (url.startsWith('http')) return url;
    const apiBase = this.api.baseUrl.replace(/\/api\/?$/i, '');
    return `${apiBase}${url.startsWith('/') ? url : '/' + url}`;
  }
}
