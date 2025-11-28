import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration?: number;
}

@Component({
  standalone: true,
  selector: 'app-toast',
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss']
})
export class ToastComponent implements OnInit, OnDestroy {
  @Input() toast!: Toast;
  
  private timeoutId?: number;

  ngOnInit(): void {
    const duration = this.toast.duration ?? 5000; // 5 segundos por defecto
    if (duration > 0) {
      this.timeoutId = window.setTimeout(() => {
        this.close();
      }, duration);
    }
  }

  ngOnDestroy(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  close(): void {
    const toastElement = document.getElementById(`toast-${this.toast.id}`);
    if (toastElement) {
      toastElement.classList.add('toast-hide');
      setTimeout(() => {
        toastElement.remove();
      }, 300);
    }
  }

  getIconClass(): string {
    switch (this.toast.type) {
      case 'success':
        return 'bi-check-circle-fill';
      case 'error':
        return 'bi-x-circle-fill';
      case 'warning':
        return 'bi-exclamation-triangle-fill';
      case 'info':
        return 'bi-info-circle-fill';
      default:
        return 'bi-info-circle-fill';
    }
  }

  getToastClass(): string {
    return `toast toast-${this.toast.type}`;
  }
}

