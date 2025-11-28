import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
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
  selector: 'app-tecnico-historico',
  imports: [CommonModule, RouterModule, DatePipe, HeaderTecnicoComponent, FormsModule],
  templateUrl: './tecnico-historico.html',
  styleUrls: ['./tecnico-historico.scss']
})
export class TecnicoHistorico implements OnInit {
  private http = inject(HttpClient);
  router = inject(Router);

  mantenciones = signal<Mantenimiento[]>([]);
  loading = signal<boolean>(true);
  page = signal<number>(1);
  lastPage = signal<number>(1);
  total = signal<number>(0);
  filtroEstado = signal<string>('');

  async ngOnInit(): Promise<void> {
    await this.cargarMantenciones();
  }

  async cargarMantenciones(): Promise<void> {
    this.loading.set(true);
    try {
      const params: any = { per_page: 20, page: this.page() };
      if (this.filtroEstado()) {
        params.estado = this.filtroEstado();
      }

      const response = await this.http
        .get<PaginatedResponse<Mantenimiento>>(`${environment.apiUrl}/tecnico/mantenciones/historicas`, {
          params
        })
        .toPromise();

      this.mantenciones.set(response?.data ?? []);
      this.lastPage.set(response?.last_page ?? 1);
      this.total.set(response?.total ?? 0);
    } catch (error) {
      console.error('Error cargando mantenciones históricas:', error);
      this.mantenciones.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  aplicarFiltros() {
    this.page.set(1);
    this.cargarMantenciones();
  }

  limpiarFiltros() {
    this.filtroEstado.set('');
    this.page.set(1);
    this.cargarMantenciones();
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

