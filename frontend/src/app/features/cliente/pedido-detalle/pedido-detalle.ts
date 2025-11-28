import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { HeaderClienteComponent } from '../shared/header-cliente/header-cliente.component';

type LogisticaEstado = 'pendiente_repartidor' | 'asignado' | 'en_camino' | 'completado';
type EstadoVisual = 'Listo para recoger' | 'En camino' | 'Pendiente de repartidor' | 'Repartidor asignado' | 'Cancelado' | 'Entregado';
type ArticuloDetalle = {
  id?: number | string;
  nombre: string;
  cantidad: number;
  descripcion?: string;
};

interface PedidoDetalleModel {
  id: number;
  estado: EstadoVisual;
  estadoBadge: string;
  logisticaEstado: LogisticaEstado;
  logisticaLabel: string;
  logisticaBadge: string;
  canVerCodigo: boolean;
  locker: string;
  sede: string;
  creadoEl: string;
  finalizadoEl?: string | null;
  tipoAcceso?: 'qr' | 'codigo_temporal' | string;
  articulos: ArticuloDetalle[];
  totalArticulos: number;
  destinatario?: string;
}

@Component({
  selector: 'app-pedido-detalle',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe, HeaderClienteComponent],
  templateUrl: './pedido-detalle.html',
  styleUrls: ['./pedido-detalle.scss']
})
export class PedidoDetalle implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  pedido?: PedidoDetalleModel;
  cargando = true;
  error = '';

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);

    if (!idParam || Number.isNaN(id)) {
      this.router.navigate(['/cliente']);
      return;
    }

    void this.cargarPedido(id);
  }

  volver(): void {
    this.router.navigate(['/cliente']);
  }

  verCodigo(): void {
    if (!this.pedido) {
      return;
    }

    if (!this.pedido.canVerCodigo) {
      alert('Este pedido no está disponible para obtener un código.');
      return;
    }

    if (this.pedido.tipoAcceso !== 'codigo_temporal') {
      alert('Este pedido no tiene código temporal disponible.');
      return;
    }

    this.router.navigate(['/cliente/pedido', this.pedido.id, 'clave']);
  }

  verQr(): void {
    if (!this.pedido) {
      return;
    }

    if (!this.pedido.canVerCodigo) {
      alert('Este pedido no está disponible para obtener un código.');
      return;
    }

    if (this.pedido.tipoAcceso !== 'qr') {
      alert('Este pedido no tiene QR disponible.');
      return;
    }

    this.router.navigate(['/cliente/pedido', this.pedido.id, 'qr']);
  }

  private async cargarPedido(id: number) {
    this.cargando = true;
    this.error = '';

    try {
      const res = await this.http
        .get<any>(`${environment.apiUrl}/reservas/${id}`)
        .toPromise();

      if (!res) {
        this.error = 'No se encontró información del pedido.';
        return;
      }

      this.pedido = this.mapPedido(res);
    } catch (err: any) {
      console.error('Error cargando pedido', err);
      this.error = err?.error?.message ?? 'No se pudo cargar el pedido.';
    } finally {
      this.cargando = false;
    }
  }

  private mapPedido(res: any): PedidoDetalleModel {
    const articulos = this.mapArticulos(res?.articulos);
    const logistica = String(res?.logistica_estado ?? 'pendiente_repartidor') as LogisticaEstado;
    const estadoApi = res?.estado ?? 'pendiente';
    const mappedEstado = this.mapEstados(logistica, estadoApi);

    return {
      id: res?.id,
      ...mappedEstado,
      locker: `#${res?.locker?.numero ?? res?.locker?.id ?? res?.locker_id ?? ''}`,
      sede: res?.locker?.ubicacion?.nombre ?? 'N/D',
      creadoEl: res?.created_at ?? res?.fecha_reserva ?? new Date().toISOString(),
      finalizadoEl: res?.hora_fin ?? res?.updated_at ?? null,
      tipoAcceso: res?.tipo_acceso,
      articulos,
      totalArticulos: articulos.reduce((acc, art) => acc + art.cantidad, 0),
      destinatario: this.mapDestinatario(res?.usuario),
    };
  }

  private mapDestinatario(usuario: any): string | undefined {
    if (!usuario) {
      return undefined;
    }

    const nombres = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ').trim();

    return nombres || usuario?.email || undefined;
  }

  private mapArticulos(data: any): ArticuloDetalle[] {
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((art: any, index: number) => ({
      id: art?.id ?? index,
      nombre: String(art?.nombre ?? '').trim() || `Artículo ${index + 1}`,
      cantidad: Number(art?.cantidad ?? 1) || 1,
      descripcion: art?.descripcion,
    })).map((art) => ({
      ...art,
      cantidad: art.cantidad > 0 ? art.cantidad : 1,
    }));
  }

  private mapEstados(logisticaEstado: LogisticaEstado, estadoApi: string | undefined) {
    if (estadoApi === 'anulado') {
      return {
        estado: 'Cancelado' as EstadoVisual,
        estadoBadge: 'badge rounded-pill px-3 py-2 bg-danger-subtle text-danger-emphasis',
        logisticaEstado,
        logisticaLabel: 'Cancelado',
        logisticaBadge: 'badge-logistica badge-logistica-pendiente',
        canVerCodigo: false,
      };
    }

    if (estadoApi === 'completado') {
      return {
        estado: 'Entregado' as EstadoVisual,
        estadoBadge: 'badge rounded-pill px-3 py-2 bg-success-subtle text-success-emphasis',
        logisticaEstado: 'completado' as LogisticaEstado,
        logisticaLabel: 'Entregado al cliente',
        logisticaBadge: 'badge-logistica badge-logistica-completado',
        canVerCodigo: false,
      };
    }

    return this.mapLogistica(logisticaEstado);
  }

  private mapLogistica(estado: LogisticaEstado) {
    switch (estado) {
      case 'completado':
        return {
          estado: 'Listo para recoger' as EstadoVisual,
          estadoBadge: 'badge rounded-pill px-3 py-2 bg-success-subtle text-success-emphasis',
          logisticaEstado: estado,
          logisticaLabel: 'Entregado al locker',
          logisticaBadge: 'badge-logistica badge-logistica-completado',
          canVerCodigo: true,
        };
      case 'en_camino':
        return {
          estado: 'En camino' as EstadoVisual,
          estadoBadge: 'badge rounded-pill px-3 py-2 bg-warning-subtle text-warning-emphasis',
          logisticaEstado: estado,
          logisticaLabel: 'Repartidor en camino',
          logisticaBadge: 'badge-logistica badge-logistica-en-camino',
          canVerCodigo: false,
        };
      case 'asignado':
        return {
          estado: 'Repartidor asignado' as EstadoVisual,
          estadoBadge: 'badge rounded-pill px-3 py-2 bg-info-subtle text-info-emphasis',
          logisticaEstado: estado,
          logisticaLabel: 'Repartidor asignado',
          logisticaBadge: 'badge-logistica badge-logistica-asignado',
          canVerCodigo: false,
        };
      default:
        return {
          estado: 'Pendiente de repartidor' as EstadoVisual,
          estadoBadge: 'badge rounded-pill px-3 py-2 bg-secondary-subtle text-secondary-emphasis',
          logisticaEstado: estado,
          logisticaLabel: 'Pendiente de asignación',
          logisticaBadge: 'badge-logistica badge-logistica-pendiente',
          canVerCodigo: false,
        };
    }
  }
}
