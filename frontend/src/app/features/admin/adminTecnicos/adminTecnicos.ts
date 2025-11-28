import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HeaderAdmin } from '../shared/header-admin/headerAdmin';
import { environment } from '../../../../environments/environment';

type TecnicoEstado = 'Activo' | 'Inactivo';

interface Tecnico {
  id: number;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  email: string;
  telefono?: string;
  estado: TecnicoEstado;
  creadoEl?: string;
  mantenimientos_count?: number;
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
  selector: 'app-admin-tecnicos',
  imports: [CommonModule, RouterModule, HeaderAdmin],
  templateUrl: './adminTecnicos.html',
  styleUrls: ['./adminTecnicos.scss']
})
export class AdminTecnicos implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);

  tecnicos = signal<Tecnico[]>([]);
  tecnicosFiltrados = signal<Tecnico[]>([]);
  loading = signal<boolean>(true);

  page = signal<number>(1);
  perPage = 8;
  totalTecnicos = signal<number>(0);

  private q = signal<string>('');
  private estado = signal<'Todos' | TecnicoEstado>('Todos');

  async ngOnInit(): Promise<void> {
    await this.cargarTecnicos();
  }

  private async cargarTecnicos(): Promise<void> {
    this.loading.set(true);
    try {
      const response = await this.http
        .get<PaginatedResponse<any>>(`${environment.apiUrl}/tecnicos`, {
          params: { per_page: 1000 }
        })
        .toPromise();

      const tecnicosMapeados: Tecnico[] = (response?.data ?? []).map((usuario: any) => {
        return {
          id: usuario.id,
          nombre: usuario.nombre ?? '',
          apellido: usuario.apellido ?? '',
          nombreCompleto: [usuario.nombre, usuario.apellido].filter(Boolean).join(' ').trim() || usuario.email || `Técnico #${usuario.id}`,
          email: usuario.email ?? '',
          telefono: usuario.telefono ?? undefined,
          estado: usuario.habilitado ? 'Activo' as TecnicoEstado : 'Inactivo' as TecnicoEstado,
          creadoEl: usuario.created_at ? new Date(usuario.created_at).toISOString().split('T')[0] : undefined,
          mantenimientos_count: usuario.mantenimientos_count ?? 0,
        };
      });

      this.tecnicos.set(tecnicosMapeados);
      this.totalTecnicos.set(tecnicosMapeados.length);
      this.aplicarFiltros();
    } catch (error) {
      console.error('Error cargando técnicos:', error);
      this.tecnicos.set([]);
      this.tecnicosFiltrados.set([]);
      this.totalTecnicos.set(0);
    } finally {
      this.loading.set(false);
    }
  }

  private aplicarFiltros(): void {
    const q = this.q().toLowerCase().trim();
    const estado = this.estado();

    const filtradas = this.tecnicos().filter(t => {
      const matchTexto =
        t.nombreCompleto.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        (t.telefono ?? '').toLowerCase().includes(q);
      
      const matchEstado = estado === 'Todos' ? true : t.estado === estado;
      return matchTexto && matchEstado;
    });

    this.tecnicosFiltrados.set(filtradas);
    this.totalTecnicos.set(filtradas.length);
    this.page.set(1);
  }

  filtradas = computed(() => {
    const inicio = (this.page() - 1) * this.perPage;
    const fin = inicio + this.perPage;
    return this.tecnicosFiltrados().slice(inicio, fin);
  });

  lastPage = computed(() => {
    return Math.max(1, Math.ceil(this.totalTecnicos() / this.perPage));
  });

  kpiTotal = computed(() => this.tecnicos().length);
  kpiActivos = computed(() => this.tecnicos().filter(t => t.estado === 'Activo').length);
  kpiInactivos = computed(() => this.tecnicos().filter(t => t.estado === 'Inactivo').length);
  kpiNuevos7d = computed(() => {
    const now = new Date().getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return this.tecnicos().filter(t => {
      const fecha = t.creadoEl ? new Date(t.creadoEl).getTime() : NaN;
      return !isNaN(fecha) && (now - fecha) <= sevenDays;
    }).length;
  });

  onBuscar(event: Event) {
    const input = event.target as HTMLInputElement;
    this.q.set(input.value);
    this.aplicarFiltros();
  }

  onEstadoChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.estado.set(select.value as 'Todos' | TecnicoEstado);
    this.aplicarFiltros();
  }

  limpiarFiltros() {
    this.q.set('');
    this.estado.set('Todos');
    this.page.set(1);
    this.aplicarFiltros();
  }

  anterior() {
    if (this.page() > 1) {
      this.page.set(this.page() - 1);
    }
  }

  siguiente() {
    if (this.page() < this.lastPage()) {
      this.page.set(this.page() + 1);
    }
  }

  nuevoTecnico() {
    this.router.navigate(['/admin/tecnicoForm']);
  }

  editar(tecnico: Tecnico) {
    this.router.navigate(['/admin/editarTecnico', tecnico.id]);
  }

  verDetalle(tecnico: Tecnico) {
    this.router.navigate(['/admin/detalleTecnico', tecnico.id]);
  }

  activar(t: Tecnico) {
    if (t.estado === 'Activo') return;
    this.cambiarEstadoUsuario(t.id, true);
  }

  desactivar(t: Tecnico) {
    if (t.estado === 'Inactivo') return;
    this.cambiarEstadoUsuario(t.id, false);
  }

  private async cambiarEstadoUsuario(id: number, habilitado: boolean): Promise<void> {
    try {
      await this.http
        .put<any>(`${environment.apiUrl}/usuarios/${id}/habilitado`, { habilitado })
        .toPromise();

      this.cambiarEstado(id, habilitado ? 'Activo' : 'Inactivo');
      await this.cargarTecnicos();
    } catch (error: any) {
      console.error('Error cambiando estado del técnico:', error);
      const errorMessage = error?.error?.message || error?.message || 'Error desconocido';
      alert(`Error al cambiar el estado del técnico: ${errorMessage}`);
    }
  }

  private cambiarEstado(id: number, nuevo: TecnicoEstado) {
    this.tecnicos.update(lista =>
      lista.map(tec => tec.id === id ? { ...tec, estado: nuevo } : tec)
    );
    this.aplicarFiltros();
  }

  trackById = (_: number, t: Tecnico) => t.id;
}

