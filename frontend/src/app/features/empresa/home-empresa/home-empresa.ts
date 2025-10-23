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
  logisticaEstado: string;
  logisticaLabel: string;
  logisticaBadge: string;
  repartidorNombre: string;
  repartidorEmail: string;
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
  filtroLogistica = '';

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
    this.filtroLogistica = '';
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
      const logistica = this.filtroLogistica?.trim();

      if (estado) params['estado'] = estado;
      if (ubicacion) params['ubicacion'] = ubicacion;
      if (email) params['email'] = email;
      if (logistica) params['logistica_estado'] = logistica;

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
    const logisticaEstado = String(data?.logistica_estado ?? 'pendiente_repartidor');
    const { label: logisticaLabel, badgeClass: logisticaBadge } = this.mapLogisticaEstado(logisticaEstado);

    const repartidorUsuario = data?.repartidor?.usuario;
    const repartidorNombre = repartidorUsuario
      ? [repartidorUsuario?.nombre, repartidorUsuario?.apellido].filter(Boolean).join(' ').trim()
      : '';
    const repartidorEmail = repartidorUsuario?.email ?? 'Sin asignar';
    const repartidorNombreFinal = repartidorNombre || repartidorEmail || 'Sin asignar';

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
      logisticaEstado,
      logisticaLabel,
      logisticaBadge,
      repartidorNombre: repartidorNombreFinal,
      repartidorEmail,
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

  private mapLogisticaEstado(estado: string): { label: string; badgeClass: string } {
    switch (estado) {
      case 'asignado':
        return { label: 'Asignado', badgeClass: 'badge-logistica badge-logistica-asignado' };
      case 'en_camino':
        return { label: 'En camino', badgeClass: 'badge-logistica badge-logistica-en-camino' };
      case 'completado':
        return { label: 'Completado', badgeClass: 'badge-logistica badge-logistica-completado' };
      default:
        return { label: 'Pendiente de repartidor', badgeClass: 'badge-logistica badge-logistica-pendiente' };
    }
  }

  private buildKpis(pedidos: PedidoEmpresa[]): Kpi[] {
    const total = this.total;
    const sinRepartidor = pedidos.filter((p) => p.logisticaEstado === 'pendiente_repartidor').length;
    const asignados = pedidos.filter((p) => p.logisticaEstado === 'asignado').length;
    const enCamino = pedidos.filter((p) => p.logisticaEstado === 'en_camino').length;
    const completados = pedidos.filter((p) => p.logisticaEstado === 'completado').length;

    return [
      { label: 'Pedidos recientes', value: total, hint: 'Ultimos registros asociados a tu empresa' },
      { label: 'Sin repartidor', value: sinRepartidor, hint: 'Reservas esperando asignación' },
      { label: 'Asignados', value: asignados, hint: 'Repartidores ya designados' },
      { label: 'En camino', value: enCamino, hint: 'Pedidos en ruta hacia el locker' },
      { label: 'Completados', value: completados, hint: 'Entregas realizadas recientemente' },
    ];
  }
}
