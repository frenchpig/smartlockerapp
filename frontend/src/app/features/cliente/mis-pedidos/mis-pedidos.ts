import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth';
import { environment } from '../../../../environments/environment';

type Estado = 'Activo' | 'Entregado' | 'Cancelado';
interface Pedido {
  id: number;
  estado: Estado;
  locker: string;
  sede: string;
  latitud?: number | null;
  longitud?: number | null;
  creadoEl: string;
  finalizadoEl?: string | null;
  tipoAcceso?: 'qr' | 'codigo_temporal' | string;
}

interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

@Component({
  standalone: true,
  selector: 'app-mis-pedidos',
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './mis-pedidos.html',
  styleUrls: ['./mis-pedidos.scss'],
})
export class MisPedidos implements OnInit {
  pedidos: Pedido[] = [];
  loading = false;
  page = 1;
  perPage = 5;
  total = 0;
  lastPage = 1;

  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);

  user = this.auth.user;

  ngOnInit(): void {
    this.auth.fetchMe().catch(() => {}).finally(() => {
      this.cargarPedidos();
    });
  }

  async abrirPedido(p: Pedido) {
    if (p.tipoAcceso === 'qr') {
      this.router.navigate(['/cliente/pedido', p.id, 'qr']);
      return;
    }

    await this.abrirConClave(p.id);
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
      console.error('No se pudo preparar el codigo temporal', e);
      alert('No se pudo preparar el codigo temporal. Intenta nuevamente en unos instantes.');
    }
  }

  volver() {
    this.router.navigate(['/cliente']);
  }

  refrescar() {
    this.cargarPedidos(this.page);
  }

  siguiente() {
    if (this.page < this.lastPage) {
      this.cargarPedidos(this.page + 1);
    }
  }

  anterior() {
    if (this.page > 1) {
      this.cargarPedidos(this.page - 1);
    }
  }

  async onLogout() {
    try {
      await this.auth.logout();
    } finally {
      this.router.navigate(['/login']);
    }
  }

  private mapEstado(estadoApi: string): Estado {
    switch (estadoApi) {
      case 'pendiente':
        return 'Activo';
      case 'completado':
        return 'Entregado';
      case 'anulado':
        return 'Cancelado';
      default:
        return 'Activo';
    }
  }

  private async cargarPedidos(page = 1) {
    this.loading = true;
    try {
      const res = await this.http
        .get<PaginatedResponse<any>>(`${environment.apiUrl}/reservas/mis-historicas`, {
          params: {
            page,
            per_page: this.perPage,
          },
        })
        .toPromise();

      const data = res?.data ?? [];

      this.pedidos = data.map((r) => ({
        id: r.id,
        estado: this.mapEstado(r.estado),
        locker: `#${r.locker?.numero ?? r.locker?.id ?? r.locker_id ?? ''}`,
        sede: r.locker?.ubicacion?.nombre ?? 'N/D',
        latitud: r.locker?.ubicacion?.latitud ?? null,
        longitud: r.locker?.ubicacion?.longitud ?? null,
        creadoEl: r.created_at ?? r.fecha_reserva ?? new Date().toISOString(),
        finalizadoEl: r.hora_fin ?? r.updated_at ?? null,
        tipoAcceso: r.tipo_acceso,
      }));

      this.page = res?.current_page ?? page;
      this.lastPage = res?.last_page ?? 1;
      this.total = res?.total ?? this.pedidos.length;
    } catch (err) {
      console.error('Error cargando historial de pedidos', err);
      this.pedidos = [];
      this.total = 0;
      this.page = 1;
      this.lastPage = 1;
    } finally {
      this.loading = false;
    }
  }
}
