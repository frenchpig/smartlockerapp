import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

type Estado = 'Activo' | 'Entregado' | 'Cancelado';
interface Pedido {
  id: number;
  estado: Estado;
  locker: string;
  sede: string;
  creadoEl: string;
  tipoAcceso?: 'qr' | 'codigo_temporal' | string;
}

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class Home implements OnInit {
  pedidos: Pedido[] = [];
  loading = false;

private readonly router = inject(Router);
private readonly auth = inject(AuthService);
private readonly http = inject(HttpClient);
// Señal con el usuario autenticado
user = this.auth.user;

  ngOnInit(): void {
    // Asegura que cargamos los datos del usuario al entrar
    this.auth.fetchMe().catch(() => {}).finally(() => {
      this.cargarPedidos();
    });
  }

  async abrirConClave(id: number) {
    try {
      const estado = await this.http
        .get<{ has_code: boolean; is_valid: boolean; expires_at?: string }>(`${environment.apiUrl}/reservas/${id}/codigo-temporal/estado`)
        .toPromise();

      if (!estado?.has_code || !estado.is_valid) {
        await this.http
          .post(`${environment.apiUrl}/reservas/${id}/codigo-temporal`, {})
          .toPromise();
      }

      this.router.navigate(['/cliente/pedido', id, 'clave']);
    } catch (e) {
      console.error('No se pudo preparar el código temporal', e);
      alert('No se pudo preparar el código temporal. Intenta nuevamente en unos instantes.');
    }
  }

  // verQr(id: number) {
  //   this.router.navigate(['/cliente/pedido', id, 'qr']);
  // }

  async abrirPedido(p: Pedido) {
    if (p.tipoAcceso === 'qr') {
      this.router.navigate(['/cliente/pedido', p.id, 'qr']);
      return;
    }

    await this.abrirConClave(p.id);
  }


  refrescar() { this.cargarPedidos(); }

  private mapEstado(estadoApi: string): Estado {
    switch (estadoApi) {
      case 'pendiente': return 'Activo';
      case 'completado': return 'Entregado';
      case 'anulado': return 'Cancelado';
      default: return 'Activo';
    }
  }

  private async cargarPedidos() {
    this.loading = true;
    try {
      const res: any[] | undefined = await this.http
        .get<any[]>(`${environment.apiUrl}/reservas/mis-ultimas`)
        .toPromise();

      this.pedidos = (res || [])
        .filter(r => r.estado === 'pendiente')
        .map(r => ({
          id: r.id,
          estado: this.mapEstado(r.estado),
          locker: `#${r.locker?.numero ?? r.locker?.id ?? r.locker_id ?? ''}`,
          sede: r.locker?.ubicacion ?? 'N/D',
          creadoEl: r.created_at ?? r.fecha_reserva ?? new Date().toISOString(),
          tipoAcceso: r.tipo_acceso,
        }));
    } catch (err) {
      console.error('Error cargando pedidos', err);
    } finally {
      this.loading = false;
    }
  }

  async onLogout() {
    try {
      await this.auth.logout();
    } finally {
      this.router.navigate(['/login']);
    }
  }
}
