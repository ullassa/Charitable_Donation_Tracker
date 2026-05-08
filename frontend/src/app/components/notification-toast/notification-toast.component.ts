import { Component, OnInit, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../services/notification.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-container" [attr.role]="'region'" [attr.aria-label]="'Notifications'">
      <div 
        *ngFor="let notification of notifications" 
        [@slideIn]
        class="notification-toast" 
        [ngClass]="'notification-' + notification.type"
        [attr.role]="'alert'"
        [attr.aria-live]="notification.priority === 'high' ? 'assertive' : 'polite'"
      >
        <div class="notification-content">
          <span class="material-symbols-outlined notification-icon" aria-hidden="true">{{ getNotificationIcon(notification.type) }}</span>
          <div class="notification-body">
            <div class="notification-title">{{ notification.title }}</div>
            <div class="notification-message">{{ notification.message }}</div>
          </div>
          <button 
            class="notification-close"
            (click)="closeNotification(notification.id)"
            [attr.aria-label]="'Close notification: ' + notification.title"
          >
            ✕
          </button>
        </div>
        <div *ngIf="notification.actionUrl" class="notification-action">
          <a [href]="notification.actionUrl" class="notification-link">View</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notification-container {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 9999;
      display: grid;
      gap: 0.75rem;
      max-width: 400px;
      pointer-events: none;
    }

    .notification-toast {
      background: #fff;
      border-radius: 12px;
      padding: 1rem;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      pointer-events: auto;
      animation: slideInRight 0.3s ease-out;
      border-left: 4px solid;
    }

    @keyframes slideInRight {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .notification-content {
      display: grid;
      grid-template-columns: 40px 1fr auto;
      gap: 1rem;
      align-items: start;
    }

    .notification-icon {
        font-size: 1.5rem;
        text-align: center;
        min-width: 40px;
        color: inherit;
    }

    .notification-body {
      display: grid;
      gap: 0.25rem;
    }

    .notification-title {
      font-weight: 600;
      font-size: 0.95rem;
    }

    .notification-message {
      font-size: 0.85rem;
      color: #64748b;
    }

    .notification-close {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.2rem;
      color: #94a3b8;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .notification-close:hover {
      background: #f1f5f9;
      color: #64748b;
    }

    .notification-close:focus-visible {
      outline: 2px solid #e688d6;
      outline-offset: 2px;
    }

    .notification-action {
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid #e5e7eb;
    }

    .notification-link {
      font-size: 0.85rem;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .notification-link:focus-visible {
      outline: 2px solid #e688d6;
      outline-offset: 2px;
      border-radius: 2px;
    }

    /* Notification types */
    .notification-donation {
      border-left-color: #41b3a3;
    }

    .notification-donation .notification-title {
      color: #41b3a3;
    }

    .notification-donation .notification-link {
      color: #41b3a3;
    }

    .notification-approval {
      border-left-color: #10b981;
    }

    .notification-approval .notification-title {
      color: #10b981;
    }

    .notification-approval .notification-link {
      color: #10b981;
    }

    .notification-status {
      border-left-color: #f59e0b;
    }

    .notification-status .notification-title {
      color: #f59e0b;
    }

    .notification-status .notification-link {
      color: #f59e0b;
    }

    .notification-alert {
      border-left-color: #ef4444;
    }

    .notification-alert .notification-title {
      color: #ef4444;
    }

    .notification-alert .notification-link {
      color: #ef4444;
    }

    @media (max-width: 640px) {
      .notification-container {
        left: 0.5rem;
        right: 0.5rem;
        max-width: 100%;
        top: auto;
        bottom: 1rem;
      }

      .notification-toast {
        animation: slideInUp 0.3s ease-out;
      }

      @keyframes slideInUp {
        from {
          transform: translateY(200px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationToastComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  private destroy$ = new Subject<void>();

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe((notifications) => {
        this.notifications = notifications.filter((n) => !n.read);
        
        // Auto-dismiss non-alert notifications after 5 seconds
        if (this.notifications.length > 0) {
          const lastNotification = this.notifications[this.notifications.length - 1];
          if (lastNotification.type !== 'alert') {
            setTimeout(() => {
              this.closeNotification(lastNotification.id);
            }, 5000);
          }
        }
      });
  }

  closeNotification(id: string): void {
    this.notificationService.markRead(id);
  }

  getNotificationIcon(type: string): string {
    const icons: { [key: string]: string } = {
      donation: 'savings',
      approval: 'check_circle',
      status: 'info',
      alert: 'warning'
    };
    return icons[type] || 'mail';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
