import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth';
import { UserMenuButtonComponent, MenuItem } from '../../../../shared/components/user-menu-button/user-menu-button.component';

@Component({
  standalone: true,
  selector: 'app-header-tecnico',
  imports: [CommonModule, RouterModule, UserMenuButtonComponent],
  templateUrl: './header-tecnico.component.html',
  styleUrls: ['./header-tecnico.component.scss']
})
export class HeaderTecnicoComponent {
  @Input() titulo: string = 'Panel Técnico';

  private auth = inject(AuthService);
  private router = inject(Router);

  user = this.auth.user;

  get nombreCompleto(): string {
    const u = this.user();
    if (!u) return 'Usuario';
    const nombre = u.nombre || '';
    const apellido = u.apellido || '';
    return (nombre + ' ' + apellido).trim() || 'Usuario';
  }

  menuItems: MenuItem[] = [
    {
      route: '/tecnico',
      icon: 'bi bi-tools',
      label: 'Mantenimientos'
    },
    {
      route: '/tecnico/historico',
      icon: 'bi bi-clock-history',
      label: 'Historial'
    },
    {
      route: '/tecnico/perfil',
      icon: 'bi bi-person',
      label: 'Mi Perfil'
    }
  ];

  async onLogout() {
    try {
      await this.auth.logout();
    } finally {
      this.router.navigate(['/login']);
    }
  }
}

