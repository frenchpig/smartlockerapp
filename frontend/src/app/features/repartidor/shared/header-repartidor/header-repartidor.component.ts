import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth';

@Component({
  standalone: true,
  selector: 'app-header-repartidor',
  imports: [CommonModule, RouterModule],
  templateUrl: './header-repartidor.component.html',
  styleUrls: ['./header-repartidor.component.scss']
})
export class HeaderRepartidorComponent {
  @Input() titulo: string = 'Panel Repartidor';

  private auth = inject(AuthService);
  private router = inject(Router);

  user = this.auth.user;

  async onLogout() {
    try {
      await this.auth.logout();
    } finally {
      this.router.navigate(['/login']);
    }
  }
}

