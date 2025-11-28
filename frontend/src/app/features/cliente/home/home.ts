import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { HeaderClienteComponent } from '../shared/header-cliente/header-cliente.component';
import { BotonIncidencia } from '../shared/reportar-incidencia/boton-incidencia';
import { PedidoIncidencia } from '../shared/reportar-incidencia/incidencia-modal.service';

type LogisticaEstado = 'pendiente_repartidor' | 'asignado' | 'en_camino' | 'completado';
type EstadoVisual = 'Listo para recoger' | 'En camino' | 'Pendiente de repartidor' | 'Repartidor asignado' | 'Cancelado';
type EstadoCliente = 'Activo' | 'Inactivo' | 'Suspendido';
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
  tipoAcceso?: 'qr' | 'codigo_temporal' | string;
  articulos: ArticuloResumen[];
  totalArticulos: number;
}

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [CommonModule, RouterModule, DatePipe, HeaderClienteComponent, BotonIncidencia],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class Home implements OnInit {
  pedidos: Pedido[] = [];
  pedidosPaginados: Pedido[] = [];
  loading = false;
  page = 1;
  perPage = 4;
  total = 0;
  lastPage = 1;

  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  // Señal con el usuario autenticado
  user = this.auth.user;

  // Helper para convertir Pedido a PedidoIncidencia
  getPedidoIncidencia(p: Pedido): PedidoIncidencia {
    return {
      id: p.id,
      lockerId: p.lockerId
    };
  }

  ngOnInit(): void {
    // Asegura que cargamos los datos del usuario al entrar
    this.auth.fetchMe().catch(() => { }).finally(() => {
      console.log('usuario que llegó del back:', this.user());
      console.log('estadoCliente calculado:', this.estadoCliente);
      this.cargarPedidos();
    });
  }

  //Para el back maybe funciona esto:
  // get estadoCliente(): EstadoCliente | null {
  //   const u: any = this.user();
  //   if (!u) return null;

  //   return (
  //     (u.estado as EstadoCliente) ||
  //     (u.estado_cliente as EstadoCliente) ||
  //     (u.status as EstadoCliente) ||
  //     null
  //   );
  // }

  get estadoCliente(): EstadoCliente {
  const u: any = this.user();
  const estado =
    (u?.estado as EstadoCliente) ||
    (u?.estado_cliente as EstadoCliente) ||
    (u?.status as EstadoCliente);

  return estado || 'Activo'; //temporal
}


  estadoClienteClase(estado?: string) {
    switch ((estado || '').toLowerCase()) {
      case 'activo':
        return 'badge-status-active';
      case 'inactivo':
        return 'badge-status-inactive';
      case 'suspendido':
        return 'badge-status-suspended';
      default:
        return 'badge-status-active';
    }
  }

  estadoClienteEstilo(estado: EstadoCliente) {
  switch (estado) {
    case 'Activo':
      return { background: '#dcfce7', color: '#166534' }; // verde suave
    case 'Inactivo':
      return { background: '#fee2e2', color: '#991b1b' }; // rojo claro
    case 'Suspendido':
      return { background: '#fef9c3', color: '#92400e' }; // amarillo
    default:
      return { background: '#e5e7eb', color: '#374151' }; // gris neutro
  }
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
    if (!p.canVerCodigo) {
      alert('Tu pedido aún no está listo para retirar. Espera a que el repartidor lo entregue.');
      return;
    }

    if (p.tipoAcceso === 'qr') {
      this.router.navigate(['/cliente/pedido', p.id, 'qr']);
      return;
    }

    await this.abrirConClave(p.id);
  }


  refrescar() { this.cargarPedidos(); }

  siguiente() {
    if (this.page < this.lastPage) {
      this.page++;
      this.actualizarVistaPaginada();
    }
  }

  anterior() {
    if (this.page > 1) {
      this.page--;
      this.actualizarVistaPaginada();
    }
  }

  private async cargarPedidos() {
    this.loading = true;
    try {
      const res: any[] | undefined = await this.http
        .get<any[]>(`${environment.apiUrl}/reservas/mis-ultimas`)
        .toPromise();

      this.pedidos = (res || [])
        .filter(r => r.estado !== 'anulado')
        .map(r => {
          const articulos = this.mapArticulos(r.articulos);
          return {
          id: r.id,
          ...this.mapEstados(r.logistica_estado, r.estado),
          locker: `#${r.locker?.numero ?? r.locker?.id ?? r.locker_id ?? ''}`,
          lockerId: r.locker?.id ?? r.locker_id ?? null,
          sede: r.locker?.ubicacion?.nombre ?? 'N/D',
          latitud: r.locker?.ubicacion?.latitud ?? null,
          longitud: r.locker?.ubicacion?.longitud ?? null,
          creadoEl: r.created_at ?? r.fecha_reserva ?? new Date().toISOString(),
          tipoAcceso: r.tipo_acceso,
            articulos,
            totalArticulos: articulos.reduce((acc: number, art: ArticuloResumen) => acc + art.cantidad, 0),
          };
        })
        .sort((a, b) => this.prioridadEstado(a.logisticaEstado) - this.prioridadEstado(b.logisticaEstado));

      this.total = this.pedidos.length;
      this.lastPage = Math.max(1, Math.ceil(this.total / this.perPage));
      this.page = Math.min(this.page, this.lastPage);
      this.actualizarVistaPaginada();
    } catch (err) {
      console.error('Error cargando pedidos', err);
    } finally {
      this.loading = false;
    }
  }

  private actualizarVistaPaginada() {
    const start = (this.page - 1) * this.perPage;
    this.pedidosPaginados = this.pedidos.slice(start, start + this.perPage);
  }

  async onLogout() {
    try {
      await this.auth.logout();
    } finally {
      this.router.navigate(['/login']);
    }
  }

  verDetalle(p: Pedido) {
    this.router.navigate(['/cliente/pedido', p.id]);
  }

  private mapEstados(logisticaEstado: string | undefined, estadoApi: string | undefined) {
    const logistica: LogisticaEstado = (logisticaEstado as LogisticaEstado) ?? 'pendiente_repartidor';
    const estadoBack = estadoApi ?? 'pendiente';

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
        estado: 'Cancelado' as EstadoVisual, // En home.ts no hay estado 'Entregado', solo 'Cancelado'
        estadoBadge: 'badge rounded-pill px-3 py-2 bg-success-subtle text-success-emphasis',
        logisticaEstado: 'completado' as LogisticaEstado,
        logisticaLabel: 'Entregado al cliente',
        logisticaBadge: 'badge-logistica badge-logistica-completado',
        canVerCodigo: false,
      };
    }

    const logisticaMap = this.mapLogistica(logistica);
    // Solo puede ver código si está entregado por logística pero no recogido por el usuario
    const canVerCodigo = logistica === 'completado' && estadoBack !== 'completado';

    return {
      estado: logisticaMap.estadoLabel,
      estadoBadge: logisticaMap.estadoBadge,
      logisticaEstado: logistica,
      logisticaLabel: logisticaMap.logisticaLabel,
      logisticaBadge: logisticaMap.logisticaBadge,
      canVerCodigo,
    };
  }

  private prioridadEstado(estado: LogisticaEstado) {
    switch (estado) {
      case 'completado':
        return 0;
      case 'en_camino':
        return 1;
      case 'asignado':
        return 2;
      default:
        return 3;
    }
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

  private mapArticulos(data: any): ArticuloResumen[] {
    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .map((art: any, index) => ({
        id: art?.id ?? index,
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
