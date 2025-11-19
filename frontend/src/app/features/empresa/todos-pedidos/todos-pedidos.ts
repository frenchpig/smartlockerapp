import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth';
import { environment } from '../../../../environments/environment';
import { HeaderEmpresaComponent } from '../shared/header-empresa/header-empresa.component';

interface PedidoRepartidor {
  id: number;
  estado: string;
  logistica_estado: string;
  fecha_reserva: string;
  hora_inicio: string;
  locker: {
    id: number;
    numero: number;
    ubicacion: {
      id: number;
      nombre: string;
    };
  };
  usuario: {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
  };
  repartidor?: {
    id: number;
    nombre: string;
    apellido?: string | null;
  };
  articulos: Array<{
    id: number;
    nombre: string;
    cantidad: number;
  }>;
}

@Component({
  standalone: true,
  selector: 'app-todos-pedidos',
  imports: [CommonModule, RouterModule, DatePipe, HeaderEmpresaComponent],
  templateUrl: './todos-pedidos.html',
  styleUrls: ['./todos-pedidos.scss'],
})
export class TodosPedidosComponent implements OnInit {
  readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  pedidos: PedidoRepartidor[] = [];
  loading = false;
  saving = false;
  errorMsg = '';
  pedidosSeleccionados = new Set<number>();
  accionMasivaLoading = false;

  // Modal de confirmación/alerta
  showConfirmModal = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmCallback: (() => void) | null = null;
  showAlertModal = false;
  alertTitle = '';
  alertMessage = '';
  alertType: 'success' | 'error' | 'info' = 'info';

  async ngOnInit(): Promise<void> {
    await this.auth.fetchMe().catch(() => undefined);
    await this.cargarPedidos();
  }

  async cargarPedidos(): Promise<void> {
    this.loading = true;
    this.errorMsg = '';

    try {
      const res = await this.http
        .get<any>(`${environment.apiUrl}/reservas/empresa/mis-ultimas`, {
          params: {
            per_page: 1000
          }
        })
        .toPromise();

      this.pedidos = (res?.data ?? [])
        .filter((r: any) => r.logistica_estado !== 'completado')
        .map((r: any) => ({
          id: r.id,
          estado: r.estado,
          logistica_estado: r.logistica_estado,
          fecha_reserva: r.fecha_reserva,
          hora_inicio: r.hora_inicio,
          locker: {
            id: r.locker?.id ?? 0,
            numero: r.locker?.numero ?? 0,
            ubicacion: {
              id: r.locker?.ubicacion?.id ?? 0,
              nombre: r.locker?.ubicacion?.nombre ?? ''
            }
          },
          usuario: {
            id: r.usuario?.id ?? 0,
            nombre: r.usuario?.nombre ?? '',
            apellido: r.usuario?.apellido ?? '',
            email: r.usuario?.email ?? ''
          },
          repartidor: r.repartidor ? {
            id: r.repartidor.id,
            nombre: r.repartidor.nombre,
            apellido: r.repartidor.apellido
          } : undefined,
          articulos: r.articulos ?? []
        }));
    } catch (error: any) {
      console.error('Error cargando todos los pedidos:', error);
      this.errorMsg = error?.error?.message || 'Error al cargar los pedidos';
      this.pedidos = [];
    } finally {
      this.loading = false;
    }
  }

  async marcarEnRuta(pedidoId: number): Promise<void> {
    if (this.saving) return;

    this.saving = true;
    this.errorMsg = '';

    try {
      await this.http
        .post(`${environment.apiUrl}/reservas/${pedidoId}/en-ruta`, {})
        .toPromise();

      await this.cargarPedidos();
    } catch (error: any) {
      console.error('Error marcando en ruta:', error);
      this.errorMsg = error?.error?.message || 'Error al marcar como en ruta';
      this.mostrarAlerta('Error', this.errorMsg, 'error');
    } finally {
      this.saving = false;
    }
  }

  async marcarEntregado(pedidoId: number): Promise<void> {
    if (this.saving) return;

    this.saving = true;
    this.errorMsg = '';

    try {
      await this.http
        .post(`${environment.apiUrl}/reservas/${pedidoId}/entregar`, {})
        .toPromise();

      await this.cargarPedidos();
    } catch (error: any) {
      console.error('Error marcando como entregado:', error);
      this.errorMsg = error?.error?.message || 'Error al marcar como entregado';
      this.mostrarAlerta('Error', this.errorMsg, 'error');
    } finally {
      this.saving = false;
    }
  }

  getEstadoLogisticaLabel(estado: string): string {
    const estados: Record<string, string> = {
      'pendiente_repartidor': 'Pendiente',
      'asignado': 'Asignado',
      'en_camino': 'En camino',
      'completado': 'Completado',
    };
    return estados[estado] || estado;
  }

  getEstadoLogisticaBadge(estado: string): string {
    const badges: Record<string, string> = {
      'pendiente_repartidor': 'badge-warning',
      'asignado': 'badge-info',
      'en_camino': 'badge-primary',
      'completado': 'badge-success',
    };
    return badges[estado] || 'badge-secondary';
  }

  puedeMarcarEnRuta(pedido: PedidoRepartidor): boolean {
    return pedido.estado === 'pendiente' &&
      (pedido.logistica_estado === 'asignado' || pedido.logistica_estado === 'pendiente_repartidor');
  }

  puedeMarcarEntregado(pedido: PedidoRepartidor): boolean {
    return pedido.logistica_estado === 'en_camino';
  }

  toggleSeleccionPedido(pedidoId: number): void {
    if (this.pedidosSeleccionados.has(pedidoId)) {
      this.pedidosSeleccionados.delete(pedidoId);
    } else {
      this.pedidosSeleccionados.add(pedidoId);
    }
  }

  toggleSeleccionarTodos(): void {
    const pedidosSeleccionables = this.pedidos.filter(p =>
      this.puedeMarcarEnRuta(p) || this.puedeMarcarEntregado(p)
    ).map(p => p.id);

    if (pedidosSeleccionables.every(id => this.pedidosSeleccionados.has(id))) {
      pedidosSeleccionables.forEach(id => this.pedidosSeleccionados.delete(id));
    } else {
      pedidosSeleccionables.forEach(id => this.pedidosSeleccionados.add(id));
    }
  }

  estaSeleccionado(pedidoId: number): boolean {
    return this.pedidosSeleccionados.has(pedidoId);
  }

  get todosSeleccionados(): boolean {
    const pedidosSeleccionables = this.pedidos.filter(p =>
      this.puedeMarcarEnRuta(p) || this.puedeMarcarEntregado(p)
    );

    if (pedidosSeleccionables.length === 0) {
      return false;
    }

    return pedidosSeleccionables.every(p => this.pedidosSeleccionados.has(p.id));
  }

  get pedidosSeleccionablesParaEnRuta(): number[] {
    return this.pedidos
      .filter(p => this.puedeMarcarEnRuta(p) && this.pedidosSeleccionados.has(p.id))
      .map(p => p.id);
  }

  get pedidosSeleccionablesParaEntregado(): number[] {
    return this.pedidos
      .filter(p => this.puedeMarcarEntregado(p) && this.pedidosSeleccionados.has(p.id))
      .map(p => p.id);
  }

  async marcarEnRutaMasivo(): Promise<void> {
    const ids = this.pedidosSeleccionablesParaEnRuta;
    if (ids.length === 0) {
      this.mostrarAlerta('Información', 'Selecciona al menos un pedido que pueda marcarse en ruta.', 'info');
      return;
    }

    this.mostrarConfirmacion(
      'Confirmar acción',
      `¿Marcar ${ids.length} pedido(s) como en ruta?`,
      () => this.ejecutarMarcarEnRutaMasivo(ids)
    );
  }

  async ejecutarMarcarEnRutaMasivo(ids: number[]): Promise<void> {
    this.accionMasivaLoading = true;
    this.errorMsg = '';

    try {
      const res = await this.http
        .post<any>(`${environment.apiUrl}/reservas/marcar-en-ruta-masivo`, {
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

        this.mostrarAlerta(
          fallidos.length > 0 ? 'Resultado parcial' : 'Éxito',
          mensaje,
          fallidos.length > 0 ? 'info' : 'success'
        );
        this.pedidosSeleccionados.clear();
        await this.cargarPedidos();
      }
    } catch (error: any) {
      console.error('Error marcando en ruta masivo:', error);
      this.errorMsg = error?.error?.message || 'Error al marcar pedidos en ruta';
      this.mostrarAlerta('Error', this.errorMsg, 'error');
    } finally {
      this.accionMasivaLoading = false;
    }
  }

  async marcarEntregadoMasivo(): Promise<void> {
    const ids = this.pedidosSeleccionablesParaEntregado;
    if (ids.length === 0) {
      this.mostrarAlerta('Información', 'Selecciona al menos un pedido que pueda marcarse como entregado.', 'info');
      return;
    }

    this.mostrarConfirmacion(
      'Confirmar acción',
      `¿Marcar ${ids.length} pedido(s) como entregado(s)?`,
      () => this.ejecutarMarcarEntregadoMasivo(ids)
    );
  }

  async ejecutarMarcarEntregadoMasivo(ids: number[]): Promise<void> {
    this.accionMasivaLoading = true;
    this.errorMsg = '';

    try {
      const res = await this.http
        .post<any>(`${environment.apiUrl}/reservas/marcar-entregado-masivo`, {
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

        this.mostrarAlerta(
          fallidos.length > 0 ? 'Resultado parcial' : 'Éxito',
          mensaje,
          fallidos.length > 0 ? 'info' : 'success'
        );
        this.pedidosSeleccionados.clear();
        await this.cargarPedidos();
      }
    } catch (error: any) {
      console.error('Error marcando entregado masivo:', error);
      this.errorMsg = error?.error?.message || 'Error al marcar pedidos como entregados';
      this.mostrarAlerta('Error', this.errorMsg, 'error');
    } finally {
      this.accionMasivaLoading = false;
    }
  }

  mostrarConfirmacion(titulo: string, mensaje: string, callback: () => void): void {
    this.confirmTitle = titulo;
    this.confirmMessage = mensaje;
    this.confirmCallback = callback;
    this.showConfirmModal = true;
  }

  mostrarAlerta(titulo: string, mensaje: string, tipo: 'success' | 'error' | 'info' = 'info'): void {
    this.alertTitle = titulo;
    this.alertMessage = mensaje;
    this.alertType = tipo;
    this.showAlertModal = true;
  }

  cerrarConfirmModal(): void {
    this.showConfirmModal = false;
    this.confirmCallback = null;
    this.confirmTitle = '';
    this.confirmMessage = '';
  }

  confirmarAccion(): void {
    const callback = this.confirmCallback;
    this.cerrarConfirmModal();
    if (callback) {
      setTimeout(() => {
        callback();
      }, 100);
    }
  }

  cerrarAlertModal(): void {
    this.showAlertModal = false;
    this.alertTitle = '';
    this.alertMessage = '';
  }

  get confirmMessageFormatted(): string {
    return this.confirmMessage.replace(/\n/g, '<br>');
  }

  get alertMessageFormatted(): string {
    return this.alertMessage.replace(/\n/g, '<br>');
  }
}
