import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth';
import { UserMenuButtonComponent, MenuItem } from '../../../../shared/components/user-menu-button/user-menu-button.component';

@Component({
  standalone: true,
  selector: 'app-header-empresa',
  imports: [CommonModule, RouterModule, UserMenuButtonComponent],
  templateUrl: './header-empresa.component.html',
  styleUrls: ['./header-empresa.component.scss']
})
export class HeaderEmpresaComponent {
  @Input() titulo: string = 'Panel Empresa';

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
      route: '/empresa',
      icon: 'bi bi-house-door',
      label: 'Panel'
    },
    {
      route: '/empresa/pedidos',
      icon: 'bi bi-box-seam',
      label: 'Pedidos'
    },
    {
      route: '/empresa/repartidores',
      icon: 'bi bi-people',
      label: 'Repartidores'
    },
    {
      route: '/empresa/reservas/nueva',
      icon: 'bi bi-plus-circle',
      label: 'Nueva Reserva'
    },
    {
      route: '/empresa/EmpresaIncidencias',
      icon: 'bi bi-exclamation-triangle',
      label: 'Incidencias'
    },
    {
      route: '/empresa/productos',
      icon: 'bi bi-box',
      label: 'Productos'
    },
    {
      route: '/empresa/tarifaEmpresa',
      icon: 'bi bi-cash',
      label: 'Planes'
    },
    {
      route: '/empresa/PerfilEmpresa',
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

