import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService, User } from '../../../core/auth/auth';

export interface MenuItem {
  route?: string;
  icon: string;
  label: string;
  action?: () => void;
  divider?: boolean;
  danger?: boolean;
}

@Component({
  standalone: true,
  selector: 'app-user-menu-button',
  imports: [CommonModule, RouterModule],
  templateUrl: './user-menu-button.component.html',
  styleUrls: ['./user-menu-button.component.scss']
})
export class UserMenuButtonComponent {
  @Input() userRole: string = 'Usuario';
  @Input() menuItems: MenuItem[] = [];
  @Input() nombreUsuario?: string;
  @Input() emailUsuario?: string;
  @Input() avatarIcon: string = 'bi-person-circle';
  @Input() headerIcon: string = 'bi-person-circle';
  @Output() logout = new EventEmitter<void>();

  private auth = inject(AuthService);
  user = this.auth.user as () => User | null;

  get displayName(): string {
    if (this.nombreUsuario) {
      return this.nombreUsuario;
    }
    const u = this.user();
    if (!u) return 'Usuario';
    const nombre = u.nombre || '';
    const apellido = u.apellido || '';
    return (nombre + ' ' + apellido).trim() || nombre || 'Usuario';
  }

  get displayEmail(): string {
    if (this.emailUsuario) {
      return this.emailUsuario;
    }
    return this.user()?.email || '';
  }

  onLogout() {
    this.logout.emit();
  }

  handleItemClick(item: MenuItem) {
    if (item.action) {
      item.action();
    }
  }
}

