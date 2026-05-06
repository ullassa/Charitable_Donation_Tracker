import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface Notification {
  id: string;
  type: 'donation' | 'approval' | 'status' | 'alert';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
  icon?: string;
  priority: 'low' | 'medium' | 'high';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private baseUrl = '/api/notifications';
  private notifications = new BehaviorSubject<Notification[]>([]);
  private unreadCount = new BehaviorSubject<number>(0);
  private connectionStatus = new BehaviorSubject<'connected' | 'disconnected'>('disconnected');
  private webSocket: WebSocket | null = null;

  notifications$: Observable<Notification[]> = this.notifications.asObservable();
  unreadCount$: Observable<number> = this.unreadCount.asObservable();
  connectionStatus$: Observable<'connected' | 'disconnected'> = this.connectionStatus.asObservable();

  constructor(private http: HttpClient) {
    this.initializeWebSocket();
    this.loadNotifications();
  }

  /**
   * Initialize WebSocket connection
   */
  private initializeWebSocket(): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/notifications/ws`;

    try {
      this.webSocket = new WebSocket(wsUrl);

      this.webSocket.onopen = () => {
        console.log('WebSocket connected');
        this.connectionStatus.next('connected');
      };

      this.webSocket.onmessage = (event) => {
        const notification = JSON.parse(event.data) as Notification;
        this.addNotification(notification);
      };

      this.webSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.connectionStatus.next('disconnected');
      };

      this.webSocket.onclose = () => {
        console.log('WebSocket disconnected');
        this.connectionStatus.next('disconnected');
        // Attempt to reconnect after 3 seconds
        setTimeout(() => this.initializeWebSocket(), 3000);
      };
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }
  }

  /**
   * Load notifications from server
   */
  private loadNotifications(): void {
    this.http.get<Notification[]>(`${this.baseUrl}/mine`).subscribe((data) => {
      data.forEach((n) => (n.createdAt = new Date(n.createdAt)));
      this.notifications.next(data);
      this.updateUnreadCount();
    });
  }

  /**
   * Add notification to list
   */
  private addNotification(notification: Notification): void {
    const current = this.notifications.value;
    this.notifications.next([notification, ...current]);
    this.updateUnreadCount();
    this.showNotificationToast(notification);
  }

  /**
   * Mark notification as read
   */
  markRead(notificationId: string): Observable<void> {
    return this.http
      .put<void>(`${this.baseUrl}/${notificationId}/read`, {})
      .pipe(
        tap(() => {
          const current = this.notifications.value;
          const updated = current.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          );
          this.notifications.next(updated);
          this.updateUnreadCount();
        })
      );
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${notificationId}`).pipe(
      tap(() => {
        const current = this.notifications.value;
        this.notifications.next(current.filter((n) => n.id !== notificationId));
        this.updateUnreadCount();
      })
    );
  }

  /**
   * Mark all as read
   */
  markAllRead(): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/read-all`, {}).pipe(
      tap(() => {
        const current = this.notifications.value;
        const updated = current.map((n) => ({ ...n, read: true }));
        this.notifications.next(updated);
        this.updateUnreadCount();
      })
    );
  }

  /**
   * Delete all notifications
   */
  deleteAll(): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/all`).pipe(
      tap(() => {
        this.notifications.next([]);
        this.updateUnreadCount();
      })
    );
  }

  /**
   * Update unread count
   */
  private updateUnreadCount(): void {
    const count = this.notifications.value.filter((n) => !n.read).length;
    this.unreadCount.next(count);
  }

  /**
   * Show browser notification
   */
  private showNotificationToast(notification: Notification): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: notification.icon || '/assets/logo.png',
        tag: notification.id,
        requireInteraction: notification.priority === 'high'
      });
    }
  }

  /**
   * Request notification permission
   */
  requestPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      return Notification.requestPermission();
    }
    return Promise.resolve('denied');
  }

  /**
   * Get notifications by type
   */
  getNotificationsByType(type: Notification['type']): Notification[] {
    return this.notifications.value.filter((n) => n.type === type);
  }

  /**
   * Get unread notifications
   */
  getUnreadNotifications(): Notification[] {
    return this.notifications.value.filter((n) => !n.read);
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.webSocket) {
      this.webSocket.close();
    }
  }
}
