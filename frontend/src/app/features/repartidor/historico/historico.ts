import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth';
import { HeaderRepartidorComponent } from '../shared/header-repartidor/header-repartidor.component';

type LogisticaEstado = 'pendiente_repartidor' | 'asignado' | 'en_camino' | 'completado';

type ReservaAsignada = {
  id: number;
  locker: string | null;
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

interface Ubicacion {
  id: number;
  nombre: string;
  latitud?: number;
  longitud?: number;
}

interface GrupoUbicacion {
  nombre: string;
  pedidos: ReservaAsignada[];
}

interface Paginacion {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

@Component({
  standalone: true,
  selector: 'app-repartidor-historico',
  imports: [CommonModule, RouterModule, DatePipe, FormsModule, HeaderRepartidorComponent],
  templateUrl: './historico.html',
  styleUrls: ['./historico.scss'],
})
export class RepartidorHistorico implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  reservas: ReservaAsignada[] = [];
  kpis: Kpi[] = [];
  ubicaciones: Ubicacion[] = [];

  loading = false;
  loadingUbicaciones = false;
  actionLoading = new Set<number>();
  errorMsg = '';

  page = 1;
  lastPage = 1;
  perPage = 10;
  total = 0;

  filtroEstado = '';
  filtroLogistica = '';
  filtroUbicacionId: number | null = null;
  filtroEmail = '';
  filtroFechaDesde = '';
  filtroFechaHasta = '';

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

  get agrupadosPorUbicacion(): GrupoUbicacion[] {
    const map = new Map<string, GrupoUbicacion>();

    for (const reserva of this.reservas) {
      const ubicacionNombre = reserva.ubicacion || 'Sin ubicación';
      
      if (!map.has(ubicacionNombre)) {
        map.set(ubicacionNombre, {
          nombre: ubicacionNombre,
          pedidos: []
        });
      }
      
      map.get(ubicacionNombre)!.pedidos.push(reserva);
    }

    return Array.from(map.values())
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map(grupo => ({
        ...grupo,
        pedidos: grupo.pedidos.sort((a, b) => b.id - a.id)
      }));
  }

  async ngOnInit(): Promise<void> {
    await this.auth.fetchMe().catch(() => undefined);
    await this.cargarUbicaciones();
    await this.cargarHistorico();
  }

  async cargarUbicaciones(): Promise<void> {
    this.loadingUbicaciones = true;
    try {
      const res: any = await this.http
        .get(`${environment.apiUrl}/repartidor/mis-ubicaciones`)
        .toPromise();
      
      this.ubicaciones = Array.isArray(res?.ubicaciones) ? res.ubicaciones : [];
    } catch (error: any) {
      console.error('Error cargando ubicaciones', error);
      this.ubicaciones = [];
    } finally {
      this.loadingUbicaciones = false;
    }
  }

  async cargarHistorico(page = 1): Promise<void> {
    this.loading = true;
    this.errorMsg = '';

    const params: Record<string, string | number> = {
      page,
      per_page: this.perPage,
      // En histórico NO excluimos los completados, mostramos todos
      solo_activos: 'false',
    };

    if (this.filtroEstado) params['estado'] = this.filtroEstado;
    if (this.filtroLogistica) params['logistica_estado'] = this.filtroLogistica;
    if (this.filtroUbicacionId !== null && this.filtroUbicacionId !== undefined) {
      params['ubicacion_id'] = this.filtroUbicacionId;
    }
    if (this.filtroEmail) params['email'] = this.filtroEmail;
    if (this.filtroFechaDesde) params['fecha_desde'] = this.filtroFechaDesde;
    if (this.filtroFechaHasta) params['fecha_hasta'] = this.filtroFechaHasta;

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
      console.error('Error cargando histórico', error);
      this.errorMsg = error?.error?.message ?? 'No se pudo cargar el histórico de pedidos.';
      this.reservas = [];
    } finally {
      this.loading = false;
    }
  }

  aplicarFiltros(): void {
    void this.cargarHistorico(1);
  }

  limpiarFiltros(): void {
    this.filtroEstado = '';
    this.filtroLogistica = '';
    this.filtroUbicacionId = null;
    this.filtroEmail = '';
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    void this.cargarHistorico(1);
  }

  siguiente(): void {
    if (this.page < this.lastPage) {
      void this.cargarHistorico(this.page + 1);
    }
  }

  anterior(): void {
    if (this.page > 1) {
      void this.cargarHistorico(this.page - 1);
    }
  }

  private mapReserva(data: any): ReservaAsignada {
    // Solo mostrar locker si está asignado (locker_id existe y no es null)
    const lockerId = data?.locker_id ?? null;
    const lockerNumero = lockerId && data?.locker ? (data.locker.numero ?? data.locker.id ?? lockerId) : null;
    const locker = lockerNumero ? `#${lockerNumero}` : null;
    
    // La ubicación puede venir del locker asignado o de ubicacion_destino
    const ubicacion = data?.locker?.ubicacion?.nombre ?? data?.ubicacion_destino?.nombre ?? 'Sin ubicacion';
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
      { label: 'Total histórico', value: this.total, hint: `Total de pedidos (${this.reservas.length} en esta página)` },
      { label: 'Asignados', value: asignados, hint: 'Pedidos listos para iniciar' },
      { label: 'En camino', value: enCamino, hint: 'Pedidos en proceso de entrega' },
      { label: 'Completados', value: completados, hint: 'Entregas finalizadas' },
      { label: 'Pendientes', value: pendientes, hint: 'A la espera de asignación' },
    ];
  }
}

