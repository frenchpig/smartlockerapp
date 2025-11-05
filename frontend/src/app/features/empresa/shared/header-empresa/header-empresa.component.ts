import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth';

@Component({
  standalone: true,
  selector: 'app-header-empresa',
  imports: [CommonModule, RouterModule],
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

  async onLogout() {
    try {
      await this.auth.logout();
    } finally {
      this.router.navigate(['/login']);
    }
  }
}

