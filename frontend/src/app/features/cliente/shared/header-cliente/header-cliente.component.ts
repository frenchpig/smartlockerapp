import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth';
import { UserMenuButtonComponent, MenuItem } from '../../../../shared/components/user-menu-button/user-menu-button.component';
import { ModalIncidencia } from '../reportar-incidencia/modal-incidencia';

@Component({
  standalone: true,
  selector: 'app-header-cliente',
  imports: [CommonModule, RouterModule, UserMenuButtonComponent, ModalIncidencia],
  templateUrl: './header-cliente.component.html',
  styleUrls: ['./header-cliente.component.scss']
})
export class HeaderClienteComponent {
  @Input() titulo: string = 'Smart Lockers';

  private auth = inject(AuthService);
  private router = inject(Router);

  user = this.auth.user;

  menuItems: MenuItem[] = [
    {
      route: '/cliente',
      icon: 'bi bi-house-door',
      label: 'Inicio'
    },
    {
      route: '/cliente/mis-pedidos',
      icon: 'bi bi-list-ul',
      label: 'Mis Pedidos'
    },
    {
      route: '/cliente/ClienteIncidencias',
      icon: 'bi bi-exclamation-triangle',
      label: 'Incidencias'
    },
    {
      route: '/cliente/perfil',
      icon: 'bi bi-person',
      label: 'Perfil'
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

