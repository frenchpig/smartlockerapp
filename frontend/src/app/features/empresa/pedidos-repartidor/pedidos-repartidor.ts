import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
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
  articulos: Array<{
    id: number;
    nombre: string;
    cantidad: number;
  }>;
}

interface RepartidorItem {
  id: number;
  nombre: string;
  apellido?: string | null;
}

@Component({
  standalone: true,
  selector: 'app-pedidos-repartidor',
  imports: [CommonModule, RouterModule, DatePipe, HeaderEmpresaComponent],
  templateUrl: './pedidos-repartidor.html',
  styleUrls: ['./pedidos-repartidor.scss'],
})
export class PedidosRepartidorComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  repartidorId: number | null = null;
  repartidor: RepartidorItem | null = null;
  pedidos: PedidoRepartidor[] = [];
  loading = false;
  errorMsg = '';


  async ngOnInit(): Promise<void> {
    await this.auth.fetchMe().catch(() => undefined);
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.repartidorId = parseInt(id, 10);
      await this.cargarDatos();
    } else {
      this.router.navigate(['/empresa/repartidores']);
    }
  }

  async cargarDatos(): Promise<void> {
    if (!this.repartidorId) return;

    this.loading = true;
    this.errorMsg = '';

    try {
      // Cargar datos del repartidor
      const repartidorRes = await this.http
        .get<any>(`${environment.apiUrl}/empresa/repartidores`)
        .toPromise();
      
      const repartidores = repartidorRes?.data ?? [];
      this.repartidor = repartidores.find((r: any) => r.id === this.repartidorId) || null;

      // Cargar pedidos del repartidor
      const res = await this.http
        .get<any>(`${environment.apiUrl}/empresa/repartidores/${this.repartidorId}/pedidos`)
        .toPromise();

      this.pedidos = (res?.reservas ?? []).filter((p: PedidoRepartidor) =>
        p.logistica_estado !== 'completado'
      );
    } catch (error: any) {
      console.error('Error cargando datos:', error);
      this.errorMsg = error?.error?.message || 'Error al cargar los datos';
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
