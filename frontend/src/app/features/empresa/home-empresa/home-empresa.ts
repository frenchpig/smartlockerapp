import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../../core/auth/auth';
import { environment } from '../../../../environments/environment';

type EstadoReserva = 'pendiente' | 'completado' | 'anulado' | string;

type Kpi = { label: string; value: number; hint: string };

type PedidoEmpresa = {
  id: number;
  locker: string;
  ubicacion: string;
  ubicacionLat?: number | null;
  ubicacionLng?: number | null;
  estado: EstadoReserva;
  estadoLabel: string;
  badgeClass: string;
  destinatario: string;
  destinatarioEmail: string;
  fechaIso: string;
};

interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

@Component({
  standalone: true,
  selector: 'app-home-empresa',
  imports: [CommonModule, RouterModule, DatePipe, FormsModule],
  templateUrl: './home-empresa.html',
  styleUrls: ['./home-empresa.scss']
})
export class HomeEmpresa implements OnInit {
  kpis: Kpi[] = [];
  pedidos: PedidoEmpresa[] = [];
  loading = false;
  page = 1;
  lastPage = 1;
  perPage = 5;
  total = 0;

  filtroEstado = '';
  filtroUbicacion = '';
  filtroEmail = '';

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  private readonly badgeClassByEstado: Record<string, string> = {
    pendiente: 'bg-warning-subtle text-warning-emphasis',
    completado: 'bg-success-subtle text-success-emphasis',
    anulado: 'bg-secondary-subtle text-secondary-emphasis',
  };

  user = this.auth.user;

  async ngOnInit(): Promise<void> {
    await this.auth.fetchMe().catch(() => undefined);
    await this.cargarPedidos();
  }

  async onLogout() {
    try {
      await this.auth.logout();
    } finally {
      this.router.navigate(['/login']);
    }
  }

  aplicarFiltros() {
    void this.cargarPedidos(1);
  }

  limpiarFiltros() {
    this.filtroEstado = '';
    this.filtroUbicacion = '';
    this.filtroEmail = '';
    void this.cargarPedidos(1);
  }

  siguiente() {
    if (this.page < this.lastPage) {
      void this.cargarPedidos(this.page + 1);
    }
  }

  anterior() {
    if (this.page > 1) {
      void this.cargarPedidos(this.page - 1);
    }
  }

  refrescar() {
    void this.cargarPedidos(this.page);
  }

  private async cargarPedidos(page = 1) {
    this.loading = true;
    try {
      const params: Record<string, string | number> = {
        page,
        per_page: this.perPage,
      };

      const estado = this.filtroEstado?.trim();
      const ubicacion = this.filtroUbicacion?.trim();
      const email = this.filtroEmail?.trim();

      if (estado) params['estado'] = estado;
      if (ubicacion) params['ubicacion'] = ubicacion;
      if (email) params['email'] = email;

      const res = await this.http
        .get<PaginatedResponse<any>>(`${environment.apiUrl}/reservas/empresa/mis-ultimas`, { params })
        .toPromise();

      const data = res?.data ?? [];
      const pedidos = data.map((item) => this.mapPedido(item));

      this.pedidos = pedidos;
      this.page = Number(res?.current_page ?? page) || page;
      this.lastPage = Number(res?.last_page ?? 1) || 1;
      const perPage = Number(res?.per_page ?? this.perPage);
      this.perPage = Number.isFinite(perPage) && perPage > 0 ? perPage : this.perPage;
      this.total = Number(res?.total ?? pedidos.length) || pedidos.length;

      this.kpis = this.buildKpis(pedidos);
    } catch (error) {
      console.error('Error cargando pedidos empresa', error);
      this.pedidos = [];
      this.page = 1;
      this.lastPage = 1;
      this.total = 0;
      this.kpis = this.buildKpis([]);
    } finally {
      this.loading = false;
    }
  }

  private mapPedido(data: any): PedidoEmpresa {
    const estado = String(data?.estado ?? 'pendiente').toLowerCase();
    const lockerNumero = data?.locker?.numero ?? data?.locker?.id ?? data?.locker_id ?? '';
    const locker = lockerNumero ? `#${lockerNumero}` : 'N/D';

    const ubicacionNombre = data?.locker?.ubicacion?.nombre ?? data?.locker_ubicacion ?? 'Sin ubicacion';
    const ubicacionLat = data?.locker?.ubicacion?.latitud ?? data?.locker_latitud ?? null;
    const ubicacionLng = data?.locker?.ubicacion?.longitud ?? data?.locker_longitud ?? null;

    const usuario = data?.usuario;
    const nombres = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ').trim();
    const destinatario = nombres || usuario?.email || 'Sin destinatario';
    const destinatarioEmail = usuario?.email ?? 'sin-registro';

    const fechaIso = data?.fecha_reserva ?? data?.created_at ?? new Date().toISOString();

    return {
      id: data?.id ?? 0,
      locker,
      ubicacion: ubicacionNombre,
      ubicacionLat,
      ubicacionLng,
      estado,
      estadoLabel: this.mapEstadoLabel(estado),
      badgeClass: this.badgeClassByEstado[estado] ?? 'bg-secondary-subtle text-secondary-emphasis',
      destinatario,
      destinatarioEmail,
      fechaIso,
    };
  }

  private mapEstadoLabel(estado: string): string {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'completado':
        return 'Completado';
      case 'anulado':
        return 'Anulado';
      default:
        return estado ? estado.charAt(0).toUpperCase() + estado.slice(1) : 'Pendiente';
    }
  }

  private buildKpis(pedidos: PedidoEmpresa[]): Kpi[] {
    const total = this.total;
    const pendientes = pedidos.filter((p) => p.estado === 'pendiente').length;
    const completados = pedidos.filter((p) => p.estado === 'completado').length;

    return [
      { label: 'Pedidos recientes', value: total, hint: 'Ultimos registros asociados a tu empresa' },
      { label: 'Pendientes', value: pendientes, hint: 'En proceso de retiro o entrega' },
      { label: 'Completados', value: completados, hint: 'Entregas realizadas recientemente' },
    ];
  }
}
