import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { HeaderEmpresaComponent } from '../shared/header-empresa/header-empresa.component';
import { ToastService } from '../../../shared/services/toast.service';

type EstadoPedido = 'Pendiente' | 'En camino' | 'Entregado' | 'Anulado';

interface PedidoEmpresa {
  id: number;
  locker: string;
  ubicacion: string;
  estado: EstadoPedido;
  estadoReal: string; // Estado real del backend (pendiente, completado, anulado)
  logisticaEstado: string;
  logisticaLabel: string;
  logisticaBadge: string;
  destinatario: string;
  destinatarioEmail: string;
  fecha: string;
  repartidor?: {
    id: number;
    nombre_completo?: string;
  } | null;
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
  selector: 'app-empresa-pedidos',
  imports: [CommonModule, RouterModule, DatePipe, FormsModule, HeaderEmpresaComponent],
  templateUrl: './pedidos.html',
  styleUrls: ['./pedidos.scss']
})
export class Pedidos {
  private readonly http = inject(HttpClient);
  private readonly toastService = inject(ToastService);

  page = 1;
  pageSize = 10;
  lastPage = 1;
  total = 0;

  // Filtros
  filtroEstado = '';
  filtroLogistica = '';
  filtroUbicacionId: number | null = null;
  filtroEmail = '';
  filtroFechaDesde = '';
  filtroFechaHasta = '';

  // Ubicaciones para el filtro
  ubicaciones: { id: number; nombre: string }[] = [];
  cargandoUbicaciones = false;

  cargando = true;
  pedidos: PedidoEmpresa[] = [];
  pageItems: PedidoEmpresa[] = [];
  asignandoRepartidor = new Set<number>(); // IDs de pedidos en proceso de asignación
  mensaje = { texto: '', tipo: '' as 'success' | 'error' | '' };

  // Modal de cancelación
  showCancelModal = false;
  reservaCancelar: PedidoEmpresa | null = null;
  cancelando = false;

  // Modal de asignación de repartidor
  showAsignarModal = false;
  reservaAsignar: PedidoEmpresa | null = null;

  async ngOnInit(): Promise<void> {
    await this.cargarUbicaciones();
    void this.cargarPedidos();
  }

  async cargarUbicaciones(): Promise<void> {
    this.cargandoUbicaciones = true;
    try {
      const res: any = await this.http
        .get(`${environment.apiUrl}/empresa/mis-ubicaciones`)
        .toPromise();
      
      this.ubicaciones = (res?.ubicaciones ?? []).map((u: any) => ({
        id: u.id,
        nombre: u.nombre,
      })).sort((a: { id: number; nombre: string }, b: { id: number; nombre: string }) => 
        a.nombre.localeCompare(b.nombre)
      );
    } catch (error) {
      console.error('Error cargando ubicaciones', error);
      this.ubicaciones = [];
    } finally {
      this.cargandoUbicaciones = false;
    }
  }

  async cargarPedidos(page = 1) {
    this.cargando = true;
    try {
      const params: Record<string, string | number> = {
        page,
        per_page: this.pageSize,
        solo_activos: 'false', // Mostrar historial completo por defecto
      };

      // Agregar filtros si existen
      if (this.filtroEstado) params['estado'] = this.filtroEstado;
      if (this.filtroLogistica) params['logistica_estado'] = this.filtroLogistica;
      if (this.filtroUbicacionId !== null && this.filtroUbicacionId !== undefined) {
        params['ubicacion_id'] = this.filtroUbicacionId;
      }
      if (this.filtroEmail) params['email'] = this.filtroEmail;
      if (this.filtroFechaDesde) params['fecha_desde'] = this.filtroFechaDesde;
      if (this.filtroFechaHasta) params['fecha_hasta'] = this.filtroFechaHasta;

      const res = await this.http
        .get<PaginatedResponse<any>>(`${environment.apiUrl}/reservas/empresa/mis-ultimas`, { params })
        .toPromise();

      const data = res?.data ?? [];

      // Mapeamos los datos de la API al formato de la interfaz
      this.pedidos = data.map((item) => this.mapPedido(item));

      this.page = Number(res?.current_page ?? page) || page;
      this.lastPage = Number(res?.last_page ?? 1) || 1;
      this.total = Number(res?.total ?? this.pedidos.length) || this.pedidos.length;

      this.actualizarPagina();
    } catch (error) {
      console.error('Error cargando pedidos empresa', error);
      this.pedidos = [];
      this.pageItems = [];
    } finally {
      this.cargando = false;
    }
  }

  private mapPedido(data: any): PedidoEmpresa {
    const lockerNumero = data?.locker?.numero ?? data?.locker?.id ?? data?.locker_id ?? '';
    const locker = lockerNumero ? `#${lockerNumero}` : 'N/D';

    // Obtener ubicación del locker o de ubicacion_destino
    const ubicacion = data?.locker?.ubicacion?.nombre 
      ?? data?.ubicacion_destino?.nombre 
      ?? data?.ubicacionDestino?.nombre 
      ?? 'Sin ubicación';

    const usuario = data?.usuario;
    const nombres = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ').trim();
    const destinatario = nombres || usuario?.email || 'Sin destinatario';
    const destinatarioEmail = usuario?.email ?? '';

    const estadoReal = String(data?.estado ?? 'pendiente');
    const logisticaEstado = String(data?.logistica_estado ?? 'pendiente_repartidor');
    const estado = this.mapEstado(logisticaEstado, estadoReal);
    const { label: logisticaLabel, badgeClass: logisticaBadge } = this.mapLogisticaEstado(logisticaEstado);

    const fecha = data?.fecha_reserva ?? data?.created_at ?? new Date().toISOString();

    return {
      id: data?.id ?? 0,
      locker,
      ubicacion,
      estado,
      estadoReal,
      logisticaEstado,
      logisticaLabel,
      logisticaBadge,
      destinatario,
      destinatarioEmail,
      fecha,
      repartidor: data?.repartidor ? {
        id: data.repartidor.id,
        nombre_completo: data.repartidor.nombre_completo || 
          (data.repartidor.nombre && data.repartidor.apellido 
            ? `${data.repartidor.nombre} ${data.repartidor.apellido}`.trim()
            : data.repartidor.nombre || 'Sin nombre'),
      } : null,
    };
  }

  private mapEstado(logisticaEstado: string, estadoReal: string): EstadoPedido {
    // Si el estado real es anulado, mostrar como anulado
    if (estadoReal === 'anulado') {
      return 'Anulado' as any; // Temporalmente, luego actualizaremos el tipo
    }
    
    switch (logisticaEstado) {
      case 'pendiente_repartidor':
      case 'asignado':
        return 'Pendiente';
      case 'en_camino':
        return 'En camino';
      case 'completado':
        return 'Entregado';
      default:
        return 'Pendiente';
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

  actualizarPagina() {
    // Ya no hacemos paginación local, usamos los datos directamente del servidor
    this.pageItems = this.pedidos;
  }

  totalPages(): number {
    return this.lastPage;
  }

  aplicarFiltros() {
    // Resetear a página 1 cuando se aplican filtros
    void this.cargarPedidos(1);
  }

  limpiarFiltros() {
    this.filtroEstado = '';
    this.filtroLogistica = '';
    this.filtroUbicacionId = null;
    this.filtroEmail = '';
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    void this.cargarPedidos(1);
  }

  siguiente() {
    if (this.page < this.lastPage) {
      void this.cargarPedidos(this.page + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  anterior() {
    if (this.page > 1) {
      void this.cargarPedidos(this.page - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  badgeClasses(estado: EstadoPedido) {
    switch (estado) {
      case 'Pendiente':
        return 'badge rounded-pill bg-secondary-subtle text-secondary-emphasis px-3 py-2';
      case 'En camino':
        return 'badge rounded-pill bg-warning-subtle text-warning-emphasis px-3 py-2';
      case 'Entregado':
        return 'badge rounded-pill bg-success-subtle text-success-emphasis px-3 py-2';
      case 'Anulado':
        return 'badge rounded-pill bg-danger-subtle text-danger-emphasis px-3 py-2';
    }
  }

  abrirModalAsignar(pedido: PedidoEmpresa): void {
    this.reservaAsignar = pedido;
    this.showAsignarModal = true;
  }

  cerrarModalAsignar(): void {
    this.showAsignarModal = false;
    this.reservaAsignar = null;
  }

  async confirmarAsignarRepartidor(): Promise<void> {
    if (!this.reservaAsignar || this.asignandoRepartidor.has(this.reservaAsignar.id)) {
      return;
    }

    const reservaId = this.reservaAsignar.id;
    this.asignandoRepartidor.add(reservaId);
    this.cerrarModalAsignar();

    try {
      const res = await this.http
        .post<any>(`${environment.apiUrl}/reservas/${reservaId}/asignar-repartidor`, {})
        .toPromise();

      this.toastService.success(res?.message || 'Repartidor asignado exitosamente');

      // Recargar pedidos
      await this.cargarPedidos(this.page);
    } catch (error: any) {
      console.error('Error asignando repartidor:', error);
      this.toastService.error(
        error?.error?.message || 'No se pudo asignar el repartidor. Intenta nuevamente.'
      );
    } finally {
      this.asignandoRepartidor.delete(reservaId);
    }
  }

  tieneRepartidor(pedido: PedidoEmpresa): boolean {
    return !!pedido.repartidor;
  }

  estaAsignando(pedido: PedidoEmpresa): boolean {
    return this.asignandoRepartidor.has(pedido.id);
  }

  puedeCancelar(pedido: PedidoEmpresa): boolean {
    // Solo se puede cancelar si está pendiente y no está en ruta
    return pedido.estadoReal === 'pendiente' && pedido.logisticaEstado !== 'en_camino';
  }

  abrirModalCancelar(pedido: PedidoEmpresa): void {
    this.reservaCancelar = pedido;
    this.showCancelModal = true;
  }

  cerrarModalCancelar(): void {
    this.showCancelModal = false;
    this.reservaCancelar = null;
  }

  async confirmarCancelar(): Promise<void> {
    if (!this.reservaCancelar || this.cancelando) {
      return;
    }

    this.cancelando = true;
    try {
      await this.http
        .post(`${environment.apiUrl}/reservas/${this.reservaCancelar.id}/cancelar`, {})
        .toPromise();

      this.toastService.success('Reserva cancelada exitosamente');
      this.cerrarModalCancelar();
      await this.cargarPedidos(this.page);
    } catch (error: any) {
      console.error('Error cancelando reserva:', error);
      this.toastService.error(
        error?.error?.message || 'No se pudo cancelar la reserva. Intenta nuevamente.'
      );
    } finally {
      this.cancelando = false;
    }
  }
}
