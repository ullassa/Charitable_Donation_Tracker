import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="toast-stack" aria-live="polite" aria-atomic="true">
      <article
        class="toast"
        *ngFor="let item of toast.toasts"
        [class.success]="item.type === 'success'"
        [class.error]="item.type === 'error'"
        [class.warning]="item.type === 'warning'"
        [class.info]="item.type === 'info'"
      >
        <p>{{ item.text }}</p>
        <button type="button" (click)="toast.dismiss(item.id)" aria-label="Close message">×</button>
      </article>
    </section>
  `,
  styles: [`
    .toast-stack {
      position: fixed;
      top: 14px;
      right: 14px;
      z-index: 2000;
      display: grid;
      gap: 0.55rem;
      width: min(92vw, 360px);
    }

    .toast {
      display: flex;
      justify-content: space-between;
      gap: 0.65rem;
      align-items: flex-start;
      border: 1px solid #e2e8f0;
      border-left-width: 4px;
      border-radius: 10px;
      background: #ffffff;
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12);
      padding: 0.6rem 0.7rem;
    }

    .toast p {
      margin: 0;
      color: #1e293b;
      font-size: 0.88rem;
      line-height: 1.35;
    }

    .toast button {
      border: 0;
      background: transparent;
      color: #64748b;
      cursor: pointer;
      font-size: 1rem;
      line-height: 1;
      padding: 0;
      min-width: 18px;
    }

    .toast.success { border-left-color: #16a34a; }
    .toast.error { border-left-color: #dc2626; }
    .toast.warning { border-left-color: #d97706; }
    .toast.info { border-left-color: #2563eb; }
  `]
})
export class ToastContainerComponent {
  constructor(public toast: ToastService) {}
}
