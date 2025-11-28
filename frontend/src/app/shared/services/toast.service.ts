import { Injectable } from '@angular/core';
import { Toast, ToastType } from '../components/toast/toast.component';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastIdCounter = 0;

  show(message: string, type: ToastType = 'info', duration: number = 5000): void {
    const toast: Toast = {
      id: ++this.toastIdCounter,
      message,
      type,
      duration
    };

    this.renderToast(toast);

    // Auto-remove después de la duración
    if (duration > 0) {
      setTimeout(() => {
        this.remove(toast.id);
      }, duration);
    }
  }

  success(message: string, duration: number = 5000): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration: number = 5000): void {
    this.show(message, 'error', duration);
  }

  warning(message: string, duration: number = 5000): void {
    this.show(message, 'warning', duration);
  }

  info(message: string, duration: number = 5000): void {
    this.show(message, 'info', duration);
  }

  private renderToast(toast: Toast): void {
    const container = this.getOrCreateContainer();
    
    const wrapper = document.createElement('div');
    wrapper.id = `toast-wrapper-${toast.id}`;
    wrapper.style.marginBottom = '0.75rem';
    wrapper.style.pointerEvents = 'auto';
    
    const toastDiv = document.createElement('div');
    toastDiv.id = `toast-${toast.id}`;
    toastDiv.className = `toast toast-${toast.type}`;
    
    const iconClass = this.getIconClass(toast.type);
    
    toastDiv.innerHTML = `
      <div class="toast-content">
        <i class="bi ${iconClass}"></i>
        <span class="toast-message">${this.escapeHtml(toast.message)}</span>
        <button type="button" class="toast-close" aria-label="Cerrar">
          <i class="bi bi-x"></i>
        </button>
      </div>
    `;

    // Agregar evento de cierre
    const closeBtn = toastDiv.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.remove(toast.id));
    }

    wrapper.appendChild(toastDiv);
    container.appendChild(wrapper);
    
    // Agregar estilos si no existen
    this.ensureStyles();

    // Animación de entrada
    requestAnimationFrame(() => {
      toastDiv.style.animation = 'toast-slide-in 0.3s ease-out';
    });
  }

  private getIconClass(type: ToastType): string {
    switch (type) {
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

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private getOrCreateContainer(): HTMLElement {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; pointer-events: none;';
      document.body.appendChild(container);
    }
    return container;
  }

  private ensureStyles(): void {
    if (document.getElementById('toast-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      #toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        pointer-events: none;
      }

      #toast-container > div {
        pointer-events: auto;
        margin-bottom: 0.75rem;
      }

      .toast {
        min-width: 300px;
        max-width: 500px;
        background: #fff;
        border-radius: 0.5rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        border-left: 4px solid;
        animation: toast-slide-in 0.3s ease-out;
      }

      .toast.toast-hide {
        animation: toast-slide-out 0.3s ease-in forwards;
      }

      .toast-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem 1.25rem;
      }

      .toast-content i {
        font-size: 1.25rem;
        flex-shrink: 0;
      }

      .toast-message {
        flex: 1;
        font-size: 0.9rem;
        line-height: 1.4;
        color: #1f2937;
      }

      .toast-close {
        background: none;
        border: none;
        padding: 0.25rem;
        cursor: pointer;
        color: #6b7280;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 0.25rem;
        transition: all 0.2s;
        flex-shrink: 0;
      }

      .toast-close:hover {
        background: rgba(0, 0, 0, 0.05);
        color: #1f2937;
      }

      .toast-close i {
        font-size: 1rem;
      }

      .toast-success {
        border-left-color: #10b981;
      }

      .toast-success .toast-content i {
        color: #10b981;
      }

      .toast-error {
        border-left-color: #ef4444;
      }

      .toast-error .toast-content i {
        color: #ef4444;
      }

      .toast-warning {
        border-left-color: #f59e0b;
      }

      .toast-warning .toast-content i {
        color: #f59e0b;
      }

      .toast-info {
        border-left-color: #3b82f6;
      }

      .toast-info .toast-content i {
        color: #3b82f6;
      }

      @keyframes toast-slide-in {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes toast-slide-out {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }

      @media (max-width: 576px) {
        #toast-container {
          top: 10px;
          right: 10px;
          left: 10px;
        }

        .toast {
          min-width: auto;
          max-width: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  remove(id: number): void {
    const wrapper = document.getElementById(`toast-wrapper-${id}`);
    if (wrapper) {
      const toastElement = wrapper.querySelector(`#toast-${id}`);
      if (toastElement) {
        toastElement.classList.add('toast-hide');
        setTimeout(() => {
          wrapper.remove();
        }, 300);
      }
    }
  }

  clear(): void {
    const container = document.getElementById('toast-container');
    if (container) {
      container.innerHTML = '';
    }
  }
}

