import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth';

type LogisticaEstado = 'pendiente_repartidor' | 'asignado' | 'en_camino' | 'completado';

type ReservaAsignada = {
  id: number;
  locker: string;
  ubicacion: string;
  fechaIso: string;
  estado: string;
  estadoLabel: string;
  estadoBadge: string;
  logisticaEstado: LogisticaEstado;
  logisticaLabel: string;
  logisticaBadge: string;
  destinatario: string;
  destinatarioEmail: string;
};

type Kpi = { label: string; value: number; hint: string };

interface Paginacion {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

@Component({
  standalone: true,
  selector: 'app-repartidor-home',
  imports: [CommonModule, RouterModule, DatePipe, FormsModule],
  templateUrl: './repartidor-home.html',
  styleUrls: ['./repartidor-home.scss'],
})
export class RepartidorHome implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  reservas: ReservaAsignada[] = [];
  kpis: Kpi[] = [];

  loading = false;
  actionLoading = new Set<number>();
  errorMsg = '';

  page = 1;
  lastPage = 1;
  perPage = 5;
  total = 0;

  filtroEstado = '';
  filtroLogistica = '';

  readonly logisticaOptions: { value: string; label: string }[] = [
    { value: '', label: 'Todas' },
    { value: 'pendiente_repartidor', label: 'Pendiente de repartidor' },
    { value: 'asignado', label: 'Asignado' },
    { value: 'en_camino', label: 'En camino' },
    { value: 'completado', label: 'Completado' },
  ];

  readonly estadoOptions: { value: string; label: string }[] = [
    { value: '', label: 'Todos' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'completado', label: 'Completado' },
    { value: 'anulado', label: 'Anulado' },
  ];

  user = this.auth.user;

  async ngOnInit(): Promise<void> {
    await this.auth.fetchMe().catch(() => undefined);
    await this.cargarAsignaciones();
  }

  async cargarAsignaciones(page = 1): Promise<void> {
    this.loading = true;
    this.errorMsg = '';

    const params: Record<string, string | number> = {
      page,
      per_page: this.perPage,
    };

    if (this.filtroEstado) params['estado'] = this.filtroEstado;
    if (this.filtroLogistica) params['logistica_estado'] = this.filtroLogistica;

    try {
      const res: any = await this.http
        .get(`${environment.apiUrl}/reservas/repartidor/mis`, { params })
        .toPromise();

      const reservasData = Array.isArray(res?.reservas) ? res.reservas : [];
      this.reservas = reservasData.map((item: any) => this.mapReserva(item));

      const pagination: Paginacion = res?.pagination ?? {};
      this.page = Number(pagination?.current_page ?? page) || page;
      this.lastPage = Number(pagination?.last_page ?? 1) || 1;
      this.perPage = Number(pagination?.per_page ?? this.perPage) || this.perPage;
      this.total = Number(pagination?.total ?? reservasData.length) || reservasData.length;

      this.kpis = this.buildKpis();
    } catch (error: any) {
      console.error('Error cargando asignaciones', error);
      this.errorMsg = error?.error?.message ?? 'No se pudieron cargar las reservas asignadas.';
      this.reservas = [];
    } finally {
      this.loading = false;
    }
  }

  aplicarFiltros(): void {
    void this.cargarAsignaciones(1);
  }

  limpiarFiltros(): void {
    this.filtroEstado = '';
    this.filtroLogistica = '';
    void this.cargarAsignaciones(1);
  }

  async marcarEnRuta(reservaId: number): Promise<void> {
    if (this.actionLoading.has(reservaId)) return;
    this.actionLoading.add(reservaId);
    try {
      await this.http.post(`${environment.apiUrl}/reservas/${reservaId}/en-ruta`, {}).toPromise();
      await this.cargarAsignaciones(this.page);
    } catch (error: any) {
      console.error('No se pudo marcar la reserva en ruta', error);
      alert(error?.error?.message ?? 'No se pudo marcar en ruta. Intenta nuevamente.');
    } finally {
      this.actionLoading.delete(reservaId);
    }
  }

  async marcarEntregado(reservaId: number): Promise<void> {
    if (this.actionLoading.has(reservaId)) return;
    this.actionLoading.add(reservaId);
    try {
      await this.http.post(`${environment.apiUrl}/reservas/${reservaId}/entregar`, {}).toPromise();
      await this.cargarAsignaciones(this.page);
    } catch (error: any) {
      console.error('No se pudo marcar la reserva como entregada', error);
      alert(error?.error?.message ?? 'No se pudo marcar como entregada. Intenta nuevamente.');
    } finally {
      this.actionLoading.delete(reservaId);
    }
  }

  siguiente(): void {
    if (this.page < this.lastPage) {
      void this.cargarAsignaciones(this.page + 1);
    }
  }

  anterior(): void {
    if (this.page > 1) {
      void this.cargarAsignaciones(this.page - 1);
    }
  }

  async onLogout(): Promise<void> {
    try {
      await this.auth.logout();
    } finally {
      await this.router.navigate(['/login']);
    }
  }

  private mapReserva(data: any): ReservaAsignada {
    const lockerNumero = data?.locker?.numero ?? data?.locker?.id ?? data?.locker_id ?? '';
    const locker = lockerNumero ? `#${lockerNumero}` : 'N/D';
    const ubicacion = data?.locker?.ubicacion?.nombre ?? 'Sin ubicacion';
    const logisticaEstado: LogisticaEstado = data?.logistica_estado ?? 'pendiente_repartidor';
    const { label: logisticaLabel, badge: logisticaBadge } = this.mapLogisticaEstado(logisticaEstado);

    const estado = String(data?.estado ?? 'pendiente');
    const { label: estadoLabel, badge: estadoBadge } = this.mapEstado(estado);

    const usuario = data?.usuario;
    const nombres = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ').trim();
    const destinatario = nombres || usuario?.email || 'Sin destinatario';
    const destinatarioEmail = usuario?.email ?? '---';

    return {
      id: data?.id ?? 0,
      locker,
      ubicacion,
      fechaIso: data?.fecha_reserva ?? data?.created_at ?? new Date().toISOString(),
      estado,
      estadoLabel,
      estadoBadge,
      logisticaEstado,
      logisticaLabel,
      logisticaBadge,
      destinatario,
      destinatarioEmail,
    };
  }

  private mapLogisticaEstado(estado: string): { label: string; badge: string } {
    switch (estado) {
      case 'asignado':
        return { label: 'Asignado', badge: 'badge-logistica badge-logistica-asignado' };
      case 'en_camino':
        return { label: 'En camino', badge: 'badge-logistica badge-logistica-en-camino' };
      case 'completado':
        return { label: 'Completado', badge: 'badge-logistica badge-logistica-completado' };
      default:
        return { label: 'Pendiente de repartidor', badge: 'badge-logistica badge-logistica-pendiente' };
    }
  }

  private mapEstado(estado: string): { label: string; badge: string } {
    switch (estado) {
      case 'completado':
        return { label: 'Completado', badge: 'badge rounded-pill px-3 py-2 bg-success-subtle text-success-emphasis' };
      case 'anulado':
        return { label: 'Anulado', badge: 'badge rounded-pill px-3 py-2 bg-danger-subtle text-danger-emphasis' };
      default:
        return { label: 'Pendiente', badge: 'badge rounded-pill px-3 py-2 bg-warning-subtle text-warning-emphasis' };
    }
  }

  private buildKpis(): Kpi[] {
    const asignados = this.reservas.filter(r => r.logisticaEstado === 'asignado').length;
    const enCamino = this.reservas.filter(r => r.logisticaEstado === 'en_camino').length;
    const completados = this.reservas.filter(r => r.logisticaEstado === 'completado').length;
    const pendientes = this.reservas.filter(r => r.logisticaEstado === 'pendiente_repartidor').length;

    return [
      { label: 'Total (pagina)', value: this.reservas.length, hint: 'Reservas mostradas actualmente' },
      { label: 'Asignados', value: asignados, hint: 'Reservas listas para iniciar' },
      { label: 'En camino', value: enCamino, hint: 'Pedidos en proceso de entrega' },
      { label: 'Completados', value: completados, hint: 'Entregas finalizadas' },
      { label: 'Pendientes', value: pendientes, hint: 'A la espera de asignacion' },
    ];
  }
}
