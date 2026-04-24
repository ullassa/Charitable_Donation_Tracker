import { Injectable } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts: ToastMessage[] = [];
  private seed = 1;

  show(text: string, type: ToastType = 'info', durationMs = 3500): void {
    const id = this.seed++;
    this.toasts = [...this.toasts, { id, text, type }];

    window.setTimeout(() => this.dismiss(id), durationMs);
  }

  success(text: string): void {
    this.show(text, 'success');
  }

  error(text: string): void {
    this.show(text, 'error');
  }

  warning(text: string): void {
    this.show(text, 'warning');
  }

  info(text: string): void {
    this.show(text, 'info');
  }

  dismiss(id: number): void {
    this.toasts = this.toasts.filter(item => item.id !== id);
  }
}
