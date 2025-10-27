import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { HeaderEmpresaComponent } from '../shared/header-empresa/header-empresa.component';

type EstadoPedido = 'Pendiente' | 'En camino' | 'Entregado';

interface PedidoEmpresa {
  id: number;
  locker: string;
  estado: EstadoPedido;
  logisticaEstado: string;
  logisticaLabel: string;
  logisticaBadge: string;
  destinatario: string;
  fecha: string;
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

  page = 1;
  pageSize = 10;
  lastPage = 1;
  total = 0;

  // Filtros
  filtroEstado = '';
  filtroLogistica = '';

  cargando = true;
  pedidos: PedidoEmpresa[] = [];
  pageItems: PedidoEmpresa[] = [];

  ngOnInit(): void {
    void this.cargarPedidos();
  }

  async cargarPedidos(page = 1) {
    this.cargando = true;
    try {
      const params: Record<string, string | number> = {
        page,
        per_page: this.pageSize,
      };

      // Agregar filtros si existen
      if (this.filtroEstado) params['estado'] = this.filtroEstado;
      if (this.filtroLogistica) params['logistica_estado'] = this.filtroLogistica;

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

    const usuario = data?.usuario;
    const nombres = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ').trim();
    const destinatario = nombres || usuario?.email || 'Sin destinatario';

    const logisticaEstado = String(data?.logistica_estado ?? 'pendiente_repartidor');
    const estado = this.mapEstado(logisticaEstado);
    const { label: logisticaLabel, badgeClass: logisticaBadge } = this.mapLogisticaEstado(logisticaEstado);

    const fecha = data?.fecha_reserva ?? data?.created_at ?? new Date().toISOString();

    return {
      id: data?.id ?? 0,
      locker,
      estado,
      logisticaEstado,
      logisticaLabel,
      logisticaBadge,
      destinatario,
      fecha
    };
  }

  private mapEstado(logisticaEstado: string): EstadoPedido {
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
    }
  }
}
