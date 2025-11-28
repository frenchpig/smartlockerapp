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
  errorMsg = '';

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

}
