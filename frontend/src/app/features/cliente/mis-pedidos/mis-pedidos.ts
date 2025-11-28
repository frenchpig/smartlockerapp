import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth';
import { environment } from '../../../../environments/environment';
import { HeaderClienteComponent } from '../shared/header-cliente/header-cliente.component';
import { BotonIncidencia } from '../shared/reportar-incidencia/boton-incidencia';
import { PedidoIncidencia } from '../shared/reportar-incidencia/incidencia-modal.service';

type LogisticaEstado = 'pendiente_repartidor' | 'asignado' | 'en_camino' | 'completado';
type EstadoVisual = 'Listo para recoger' | 'En camino' | 'Pendiente de repartidor' | 'Repartidor asignado' | 'Entregado' | 'Cancelado';
type ArticuloResumen = {
  id?: number;
  nombre: string;
  cantidad: number;
};
interface Pedido {
  id: number;
  estado: EstadoVisual;
  estadoBadge: string;
  logisticaEstado: LogisticaEstado;
  logisticaLabel: string;
  logisticaBadge: string;
  canVerCodigo: boolean;
  locker: string;
  lockerId?: number;
  sede: string;
  latitud?: number | null;
  longitud?: number | null;
  creadoEl: string;
  finalizadoEl?: string | null;
  tipoAcceso?: 'qr' | 'codigo_temporal' | string;
  articulos: ArticuloResumen[];
  totalArticulos: number;
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
  imports: [CommonModule, RouterModule, DatePipe, HeaderClienteComponent, BotonIncidencia],
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

  // Helper para convertir Pedido a PedidoIncidencia
  getPedidoIncidencia(p: Pedido): PedidoIncidencia {
    return {
      id: p.id,
      lockerId: p.lockerId
    };
  }

  ngOnInit(): void {
    this.auth.fetchMe().catch(() => {}).finally(() => {
      this.cargarPedidos();
    });
  }

  async abrirPedido(p: Pedido) {
    if (!p.canVerCodigo) {
      alert('Este pedido no está disponible para obtener un código en este momento.');
      return;
    }

    if (p.tipoAcceso === 'qr') {
      this.router.navigate(['/cliente/pedido', p.id, 'qr']);
      return;
    }

    await this.abrirConClave(p.id);
  }

  verDetalle(p: Pedido) {
    this.router.navigate(['/cliente/pedido', p.id]);
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

      this.pedidos = data.map((r, index) => {
        const articulos = this.mapArticulos(r.articulos, index);
        return {
          id: r.id,
          ...this.mapEstados(r.logistica_estado, r.estado),
          locker: `#${r.locker?.numero ?? r.locker?.id ?? r.locker_id ?? ''}`,
          lockerId: r.locker?.id ?? r.locker_id ?? null,
          sede: r.locker?.ubicacion?.nombre ?? 'N/D',
          latitud: r.locker?.ubicacion?.latitud ?? null,
          longitud: r.locker?.ubicacion?.longitud ?? null,
          creadoEl: r.created_at ?? r.fecha_reserva ?? new Date().toISOString(),
          finalizadoEl: r.hora_fin ?? r.updated_at ?? null,
          tipoAcceso: r.tipo_acceso,
          articulos,
          totalArticulos: articulos.reduce((acc, art) => acc + art.cantidad, 0),
        };
      });

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

  private mapEstados(logisticaEstado: string | undefined, estadoApi: string | undefined) {
    const estadoBack = estadoApi ?? 'pendiente';
    const logistica: LogisticaEstado = (logisticaEstado as LogisticaEstado) ?? 'pendiente_repartidor';

    if (estadoBack === 'anulado') {
      return {
        estado: 'Cancelado' as EstadoVisual,
        estadoBadge: 'badge rounded-pill px-3 py-2 bg-danger-subtle text-danger-emphasis',
        logisticaEstado: logistica,
        logisticaLabel: 'Cancelado',
        logisticaBadge: 'badge-logistica badge-logistica-pendiente',
        canVerCodigo: false,
      };
    }

    if (estadoBack === 'completado') {
      return {
        estado: 'Entregado' as EstadoVisual,
        estadoBadge: 'badge rounded-pill px-3 py-2 bg-success-subtle text-success-emphasis',
        logisticaEstado: 'completado' as LogisticaEstado,
        logisticaLabel: 'Entregado al cliente',
        logisticaBadge: 'badge-logistica badge-logistica-completado',
        canVerCodigo: false,
      };
    }

    const map = this.mapLogistica(logistica);
    return {
      estado: map.estadoLabel,
      estadoBadge: map.estadoBadge,
      logisticaEstado: logistica,
      logisticaLabel: map.logisticaLabel,
      logisticaBadge: map.logisticaBadge,
      canVerCodigo: logistica === 'completado',
    };
  }

  private mapLogistica(estado: LogisticaEstado) {
    switch (estado) {
      case 'completado':
        return {
          estadoLabel: 'Listo para recoger' as EstadoVisual,
          estadoBadge: 'badge rounded-pill px-3 py-2 bg-success-subtle text-success-emphasis',
          logisticaLabel: 'Entregado al locker',
          logisticaBadge: 'badge-logistica badge-logistica-completado',
        };
      case 'en_camino':
        return {
          estadoLabel: 'En camino' as EstadoVisual,
          estadoBadge: 'badge rounded-pill px-3 py-2 bg-warning-subtle text-warning-emphasis',
          logisticaLabel: 'Repartidor en camino',
          logisticaBadge: 'badge-logistica badge-logistica-en-camino',
        };
      case 'asignado':
        return {
          estadoLabel: 'Repartidor asignado' as EstadoVisual,
          estadoBadge: 'badge rounded-pill px-3 py-2 bg-info-subtle text-info-emphasis',
          logisticaLabel: 'Repartidor asignado',
          logisticaBadge: 'badge-logistica badge-logistica-asignado',
        };
      default:
        return {
          estadoLabel: 'Pendiente de repartidor' as EstadoVisual,
          estadoBadge: 'badge rounded-pill px-3 py-2 bg-secondary-subtle text-secondary-emphasis',
          logisticaLabel: 'Pendiente de asignación',
          logisticaBadge: 'badge-logistica badge-logistica-pendiente',
        };
    }
  }

  private mapArticulos(data: any, fallbackIndex: number): ArticuloResumen[] {
    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .map((art: any, index) => ({
        id: art?.id ?? `${fallbackIndex}-${index}`,
        nombre: String(art?.nombre ?? '').trim() || `Artículo ${index + 1}`,
        cantidad: Number(art?.cantidad ?? 1) || 1,
      }))
      .filter((art: ArticuloResumen) => !!art.nombre)
      .map((art) => ({
        ...art,
        cantidad: art.cantidad > 0 ? art.cantidad : 1,
      }));
  }
}
