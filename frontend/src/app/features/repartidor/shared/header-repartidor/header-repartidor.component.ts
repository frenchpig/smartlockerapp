import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth';
import { UserMenuButtonComponent, MenuItem } from '../../../../shared/components/user-menu-button/user-menu-button.component';

@Component({
  standalone: true,
  selector: 'app-header-repartidor',
  imports: [CommonModule, RouterModule, UserMenuButtonComponent],
  templateUrl: './header-repartidor.component.html',
  styleUrls: ['./header-repartidor.component.scss']
})
export class HeaderRepartidorComponent {
  @Input() titulo: string = 'Panel Repartidor';

  private auth = inject(AuthService);
  private router = inject(Router);

  user = this.auth.user;

  menuItems: MenuItem[] = [
    {
      route: '/repartidor',
      icon: 'bi bi-box-seam',
      label: 'Pedidos Activos'
    },
    {
      route: '/repartidor/historico',
      icon: 'bi bi-clock-history',
      label: 'Historial'
    },
    {
      route: '/repartidor/perfil',
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

