import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth';
import { HeaderTecnicoComponent } from '../shared/header-tecnico/header-tecnico.component';

interface Mantenimiento {
  id: number;
  descripcion: string;
  fecha_mantenimiento: string;
  es_urgente: boolean;
  estado: 'resuelta' | 'pendiente' | 'cancelado';
  comentarios?: string;
  tipo?: 'preventivo' | 'correctivo';
  locker?: {
    id: number;
    numero: number;
    ubicacion?: {
      id: number;
      nombre: string;
    };
  };
  incidencia?: {
    id: number;
    descripcion: string;
  };
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
  selector: 'app-tecnico-home',
  imports: [CommonModule, RouterModule, DatePipe, HeaderTecnicoComponent],
  templateUrl: './tecnico-home.html',
  styleUrls: ['./tecnico-home.scss']
})
export class TecnicoHome implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  router = inject(Router);

  mantenciones = signal<Mantenimiento[]>([]);
  loading = signal<boolean>(true);
  page = signal<number>(1);
  lastPage = signal<number>(1);
  total = signal<number>(0);

  kpiPendientes = signal<number>(0);
  kpiUrgentes = signal<number>(0);
  kpiResueltas = signal<number>(0);

  getEstadoBadge(estado: string): string {
    switch (estado) {
      case 'resuelta': return 'bg-success';
      case 'pendiente': return 'bg-warning';
      case 'cancelado': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  getEstadoLabel(estado: string): string {
    switch (estado) {
      case 'resuelta': return 'Resuelta';
      case 'pendiente': return 'Pendiente';
      case 'cancelado': return 'Cancelado';
      default: return estado;
    }
  }

  async ngOnInit(): Promise<void> {
    await this.cargarMantenciones();
  }

  async cargarMantenciones(): Promise<void> {
    this.loading.set(true);
    try {
      const response = await this.http
        .get<PaginatedResponse<Mantenimiento>>(`${environment.apiUrl}/tecnico/mantenciones`, {
          params: { per_page: 20, page: this.page() }
        })
        .toPromise();

      this.mantenciones.set(response?.data ?? []);
      this.lastPage.set(response?.last_page ?? 1);
      this.total.set(response?.total ?? 0);

      // Calcular KPIs
      const mantenciones = this.mantenciones();
      this.kpiPendientes.set(mantenciones.filter(m => m.estado === 'pendiente').length);
      this.kpiUrgentes.set(mantenciones.filter(m => m.es_urgente && m.estado === 'pendiente').length);
      this.kpiResueltas.set(mantenciones.filter(m => m.estado === 'resuelta').length);
    } catch (error) {
      console.error('Error cargando mantenciones:', error);
      this.mantenciones.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  verDetalle(mantenimiento: Mantenimiento) {
    this.router.navigate(['/tecnico/mantenciones', mantenimiento.id]);
  }

  anterior() {
    if (this.page() > 1) {
      this.page.set(this.page() - 1);
      this.cargarMantenciones();
    }
  }

  siguiente() {
    if (this.page() < this.lastPage()) {
      this.page.set(this.page() + 1);
      this.cargarMantenciones();
    }
  }
}

