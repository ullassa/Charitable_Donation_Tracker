import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SocialShareService } from '../../services/social-share.service';

@Component({
  selector: 'app-share-buttons',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="share-buttons-container">
      <div class="share-header" *ngIf="showLabel">
        <span>Share this</span>
      </div>
      
      <div class="share-buttons-grid" [ngClass]="'layout-' + layout">
        <!-- Native Share Button -->
        <button 
          *ngIf="supportsNativeShare"
          class="share-btn share-native"
          (click)="shareNative()"
          title="Share using your device"
          [attr.aria-label]="'Share ' + title + ' using your device'"
        >
          <span class="material-symbols-outlined share-icon" aria-hidden="true">ios_share</span>
          <span class="share-label" *ngIf="layout === 'vertical'">Share</span>
        </button>

        <!-- Twitter -->
        <button 
          class="share-btn share-twitter"
          (click)="shareTwitter()"
          title="Share on Twitter"
          [attr.aria-label]="'Share ' + title + ' on Twitter'"
        >
          <span class="share-icon">𝕏</span>
          <span class="share-label" *ngIf="layout === 'vertical'">Twitter</span>
        </button>

        <!-- Facebook -->
        <button 
          class="share-btn share-facebook"
          (click)="shareFacebook()"
          title="Share on Facebook"
          [attr.aria-label]="'Share ' + title + ' on Facebook'"
        >
          <span class="share-icon">f</span>
          <span class="share-label" *ngIf="layout === 'vertical'">Facebook</span>
        </button>

        <!-- LinkedIn -->
        <button 
          class="share-btn share-linkedin"
          (click)="shareLinkedIn()"
          title="Share on LinkedIn"
          [attr.aria-label]="'Share ' + title + ' on LinkedIn'"
        >
          <span class="share-icon">in</span>
          <span class="share-label" *ngIf="layout === 'vertical'">LinkedIn</span>
        </button>

        <!-- WhatsApp -->
        <button 
          class="share-btn share-whatsapp"
          (click)="shareWhatsApp()"
          title="Share on WhatsApp"
          [attr.aria-label]="'Share ' + title + ' on WhatsApp'"
        >
          <span class="material-symbols-outlined share-icon" aria-hidden="true">chat</span>
          <span class="share-label" *ngIf="layout === 'vertical'">WhatsApp</span>
        </button>

        <!-- Email -->
        <button 
          class="share-btn share-email"
          (click)="shareEmail()"
          title="Share via Email"
          [attr.aria-label]="'Share ' + title + ' via Email'"
        >
          <span class="material-symbols-outlined share-icon" aria-hidden="true">mail</span>
          <span class="share-label" *ngIf="layout === 'vertical'">Email</span>
        </button>

        <!-- Copy Link -->
        <button 
          class="share-btn share-copy"
          (click)="copyLink()"
          title="Copy link to clipboard"
          [attr.aria-label]="'Copy link for ' + title"
          [class.copied]="linkCopied"
        >
          <span class="material-symbols-outlined share-icon" aria-hidden="true">{{ linkCopied ? 'check' : 'link' }}</span>
          <span class="share-label" *ngIf="layout === 'vertical'">{{ linkCopied ? 'Copied!' : 'Copy' }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .share-buttons-container {
      display: grid;
      gap: 0.75rem;
    }

    .share-header {
      font-size: 0.9rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .share-buttons-grid {
      display: grid;
      gap: 0.5rem;
    }

    .share-buttons-grid.layout-horizontal {
      grid-template-columns: repeat(auto-fit, minmax(44px, 1fr));
    }

    .share-buttons-grid.layout-vertical {
      grid-template-columns: 1fr;
    }

    .share-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border: 1.5px solid #e5e7eb;
      border-radius: 10px;
      background: #fff;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.9rem;
      transition: all 0.2s ease;
    }

    .share-label {
      font-size: 0.85rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .share-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .share-btn:focus-visible {
      outline: 2px solid #e688d6;
      outline-offset: 2px;
    }

    .share-btn:active {
      transform: translateY(0);
    }

    /* Platform-specific colors */
    .share-native {
      color: #41b3a3;
      border-color: #41b3a3;
    }

    .share-native:hover {
      background: rgba(65, 179, 163, 0.05);
    }

    .share-twitter {
      color: #1da1f2;
      border-color: #1da1f2;
    }

    .share-twitter:hover {
      background: rgba(29, 161, 242, 0.05);
    }

    .share-facebook {
      color: #1877f2;
      border-color: #1877f2;
    }

    .share-facebook:hover {
      background: rgba(24, 119, 242, 0.05);
    }

    .share-linkedin {
      color: #0a66c2;
      border-color: #0a66c2;
    }

    .share-linkedin:hover {
      background: rgba(10, 102, 194, 0.05);
    }

    .share-whatsapp {
      color: #25d366;
      border-color: #25d366;
    }

    .share-whatsapp:hover {
      background: rgba(37, 211, 102, 0.05);
    }

    .share-email {
      color: #ea4335;
      border-color: #ea4335;
    }

    .share-email:hover {
      background: rgba(234, 67, 53, 0.05);
    }

    .share-copy {
      color: #8b5cf6;
      border-color: #8b5cf6;
    }

    .share-copy:hover {
      background: rgba(139, 92, 246, 0.05);
    }

    .share-copy.copied {
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
      border-color: #10b981;
    }

    @media (max-width: 640px) {
      .share-buttons-grid.layout-horizontal {
        grid-template-columns: repeat(4, 1fr);
      }

      .share-btn {
        padding: 0.6rem 0.5rem;
        font-size: 0.8rem;
      }

      .share-label {
        display: none;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShareButtonsComponent {
  @Input() url?: string;
  @Input() title: string = '';
  @Input() description?: string;
  @Input() layout: 'horizontal' | 'vertical' = 'horizontal';
  @Input() showLabel: boolean = false;

  linkCopied: boolean = false;
  supportsNativeShare: boolean = typeof navigator !== 'undefined' && !!navigator.share;

  constructor(private socialShareService: SocialShareService) {}

  shareNative(): void {
    this.socialShareService.shareNative({
      title: this.title,
      text: this.description || '',
      url: this.url || window.location.href
    });
  }

  shareTwitter(): void {
    const shareUrl = this.url || window.location.href;
    const shareText = this.description ? `${this.title} - ${this.description}` : this.title;
    this.socialShareService.shareTwitter(shareText, shareUrl);
  }

  shareFacebook(): void {
    this.socialShareService.shareFacebook(this.url || window.location.href);
  }

  shareLinkedIn(): void {
    this.socialShareService.shareLinkedIn(
      this.url || window.location.href,
      this.title
    );
  }

  shareWhatsApp(): void {
    const shareUrl = this.url || window.location.href;
    const shareText = this.description ? `${this.title} - ${this.description}` : this.title;
    this.socialShareService.shareWhatsApp(shareText, shareUrl);
  }

  shareEmail(): void {
    const shareUrl = this.url || window.location.href;
    const shareText = this.description ? `${this.title} - ${this.description}` : this.title;
    this.socialShareService.shareEmail('', this.title, `${shareText}\n\n${shareUrl}`);
  }

  copyLink(): void {
    this.socialShareService.copyToClipboard(this.url || window.location.href).then(
      () => {
        this.linkCopied = true;
        setTimeout(() => {
          this.linkCopied = false;
        }, 2000);
      }
    );
  }
}
