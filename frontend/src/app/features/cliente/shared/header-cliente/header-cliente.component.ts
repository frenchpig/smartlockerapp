import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth';

@Component({
  standalone: true,
  selector: 'app-header-cliente',
  imports: [CommonModule, RouterModule],
  templateUrl: './header-cliente.component.html',
  styleUrls: ['./header-cliente.component.scss']
})
export class HeaderClienteComponent {
  @Input() titulo: string = 'Smart Lockers';

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

