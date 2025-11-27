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
  selector: 'app-repartidor-home',
  imports: [CommonModule, RouterModule, DatePipe, FormsModule, HeaderRepartidorComponent],
  templateUrl: './repartidor-home.html',
  styleUrls: ['./repartidor-home.scss'],
})
export class RepartidorHome implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  reservas: ReservaAsignada[] = [];
  kpis: Kpi[] = [];
  ubicaciones: Ubicacion[] = [];

  loading = false;
  loadingUbicaciones = false;
  actionLoading = new Set<number>();
  accionMasivaLoading = false;
  pedidosSeleccionados = new Set<number>();
  errorMsg = '';

  page = 1;
  lastPage = 1;
  perPage = 10; // Aumentado para mostrar más pedidos
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

    // Ordenar por nombre de ubicación y luego por ID de pedido
    return Array.from(map.values())
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map(grupo => ({
        ...grupo,
        pedidos: grupo.pedidos.sort((a, b) => b.id - a.id) // Más recientes primero
      }));
  }

  async ngOnInit(): Promise<void> {
    await this.auth.fetchMe().catch(() => undefined);
    await this.cargarUbicaciones();
    await this.cargarAsignaciones();
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

  async cargarAsignaciones(page = 1): Promise<void> {
    this.loading = true;
    this.errorMsg = '';

    const params: Record<string, string | number> = {
      page,
      per_page: this.perPage,
      solo_activos: 'true', // Por defecto, solo mostrar pedidos activos
      // Excluir completados en logística por defecto
      excluir_logistica_completado: 'true',
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

      // Limpiar selección al cargar nuevas reservas
      this.pedidosSeleccionados.clear();

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
    this.filtroUbicacionId = null;
    this.filtroEmail = '';
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
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

  // Selección múltiple
  estaSeleccionado(pedidoId: number): boolean {
    return this.pedidosSeleccionados.has(pedidoId);
  }

  toggleSeleccionPedido(pedidoId: number): void {
    if (this.pedidosSeleccionados.has(pedidoId)) {
      this.pedidosSeleccionados.delete(pedidoId);
    } else {
      this.pedidosSeleccionados.add(pedidoId);
    }
  }

  toggleSeleccionarTodos(grupo: GrupoUbicacion): void {
    const todosSeleccionados = grupo.pedidos.every(p => this.pedidosSeleccionados.has(p.id));
    
    if (todosSeleccionados) {
      grupo.pedidos.forEach(p => this.pedidosSeleccionados.delete(p.id));
    } else {
      grupo.pedidos
        .filter(p => this.puedeMarcarEnRuta(p) || this.puedeMarcarEntregado(p))
        .forEach(p => this.pedidosSeleccionados.add(p.id));
    }
  }

  todosSeleccionadosEnGrupo(grupo: GrupoUbicacion): boolean {
    const seleccionables = grupo.pedidos.filter(p => this.puedeMarcarEnRuta(p) || this.puedeMarcarEntregado(p));
    return seleccionables.length > 0 && seleccionables.every(p => this.pedidosSeleccionados.has(p.id));
  }

  puedeMarcarEnRuta(reserva: ReservaAsignada): boolean {
    return reserva.estado === 'pendiente' && reserva.logisticaEstado === 'asignado';
  }

  puedeMarcarEntregado(reserva: ReservaAsignada): boolean {
    return reserva.logisticaEstado === 'en_camino';
  }

  get pedidosSeleccionablesParaEnRuta(): number[] {
    return this.reservas
      .filter(r => this.puedeMarcarEnRuta(r) && this.pedidosSeleccionados.has(r.id))
      .map(r => r.id);
  }

  get pedidosSeleccionablesParaEntregado(): number[] {
    return this.reservas
      .filter(r => this.puedeMarcarEntregado(r) && this.pedidosSeleccionados.has(r.id))
      .map(r => r.id);
  }

  async marcarEnRutaMasivo(): Promise<void> {
    const ids = this.pedidosSeleccionablesParaEnRuta;
    if (ids.length === 0) {
      alert('Selecciona al menos un pedido que pueda marcarse en ruta.');
      return;
    }

    if (!confirm(`¿Marcar ${ids.length} pedido(s) como en ruta?`)) {
      return;
    }

    await this.ejecutarMarcarEnRutaMasivo(ids);
  }

  async ejecutarMarcarEnRutaMasivo(ids: number[]): Promise<void> {
    this.accionMasivaLoading = true;
    this.errorMsg = '';

    try {
      const res: any = await this.http
        .post(`${environment.apiUrl}/reservas/repartidor/marcar-en-ruta-masivo`, {
          reserva_ids: ids
        })
        .toPromise();

      if (res?.resultados) {
        const { exitosos, fallidos } = res.resultados;
        let mensaje = `${exitosos.length} pedido(s) marcado(s) en ruta exitosamente.`;

        if (fallidos.length > 0) {
          mensaje += `\n\n${fallidos.length} pedido(s) no pudieron marcarse:`;
          fallidos.forEach((f: any) => {
            mensaje += `\n• Pedido #${f.id}: ${f.mensaje}`;
          });
        }

        alert(mensaje);
        this.pedidosSeleccionados.clear();
        await this.cargarAsignaciones(this.page);
      }
    } catch (error: any) {
      console.error('Error marcando en ruta masivo:', error);
      alert(error?.error?.message || 'Error al marcar pedidos en ruta');
    } finally {
      this.accionMasivaLoading = false;
    }
  }

  async marcarEntregadoMasivo(): Promise<void> {
    const ids = this.pedidosSeleccionablesParaEntregado;
    if (ids.length === 0) {
      alert('Selecciona al menos un pedido que pueda marcarse como entregado.');
      return;
    }

    if (!confirm(`¿Marcar ${ids.length} pedido(s) como entregado(s)?`)) {
      return;
    }

    await this.ejecutarMarcarEntregadoMasivo(ids);
  }

  async ejecutarMarcarEntregadoMasivo(ids: number[]): Promise<void> {
    this.accionMasivaLoading = true;
    this.errorMsg = '';

    try {
      const res: any = await this.http
        .post(`${environment.apiUrl}/reservas/repartidor/marcar-entregado-masivo`, {
          reserva_ids: ids
        })
        .toPromise();

      if (res?.resultados) {
        const { exitosos, fallidos } = res.resultados;
        let mensaje = `${exitosos.length} pedido(s) marcado(s) como entregado(s) exitosamente.`;

        if (fallidos.length > 0) {
          mensaje += `\n\n${fallidos.length} pedido(s) no pudieron marcarse:`;
          fallidos.forEach((f: any) => {
            mensaje += `\n• Pedido #${f.id}: ${f.mensaje}`;
          });
        }

        alert(mensaje);
        this.pedidosSeleccionados.clear();
        await this.cargarAsignaciones(this.page);
      }
    } catch (error: any) {
      console.error('Error marcando entregado masivo:', error);
      alert(error?.error?.message || 'Error al marcar pedidos como entregados');
    } finally {
      this.accionMasivaLoading = false;
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
      { label: 'Total activos', value: this.total, hint: `Total de pedidos activos (${this.reservas.length} en esta página)` },
      { label: 'Asignados', value: asignados, hint: 'Pedidos listos para iniciar' },
      { label: 'En camino', value: enCamino, hint: 'Pedidos en proceso de entrega' },
      { label: 'Pendientes', value: pendientes, hint: 'A la espera de asignación' },
    ];
  }
}
