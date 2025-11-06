import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HeaderAdmin } from '../shared/header-admin/headerAdmin';
import { environment } from '../../../../environments/environment';

type EmpresaEstado = 'Activa' | 'Inactiva';

interface Empresa {
  id: number;
  nombre: string;
  correo: string;
  telefono?: string;
  ubicacion?: string;
  estado: EmpresaEstado;
  creadaEl?: string;
  rut?: string;
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
  selector: 'app-admin-empresas',
  imports: [CommonModule, RouterModule, HeaderAdmin],
  templateUrl: './adminEmpresas.html',
  styleUrls: ['./adminEmpresas.scss']
})
export class AdminEmpresas implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);

  empresas = signal<Empresa[]>([]);
  empresasFiltradas = signal<Empresa[]>([]);
  loading = signal<boolean>(true);

  page = signal<number>(1);
  perPage = 8;
  totalEmpresas = signal<number>(0);

  private q = signal<string>('');
  private estado = signal<'Todos' | EmpresaEstado>('Todos');

  async ngOnInit(): Promise<void> {
    await this.cargarEmpresas();
  }

  private async cargarEmpresas(): Promise<void> {
    this.loading.set(true);
    try {
      const response = await this.http
        .get<PaginatedResponse<any>>(`${environment.apiUrl}/usuarios`, {
          params: { rol: 'empresa', per_page: 1000 }
        })
        .toPromise();

      const empresasMapeadas: Empresa[] = (response?.data ?? []).map((usuario: any) => {
        const datosEmpresa = usuario.datos_empresa;
        
        return {
          id: usuario.id,
          nombre: datosEmpresa?.nombre || [usuario.nombre, usuario.apellido].filter(Boolean).join(' ').trim() || usuario.email || `Empresa #${usuario.id}`,
          correo: usuario.email ?? '',
          telefono: usuario.telefono ?? undefined,
          ubicacion: datosEmpresa?.comuna?.nombre || undefined,
          rut: datosEmpresa?.rut || undefined,
          estado: usuario.habilitado ? 'Activa' as EmpresaEstado : 'Inactiva' as EmpresaEstado,
          creadaEl: usuario.created_at ? new Date(usuario.created_at).toISOString().split('T')[0] : undefined,
        };
      });

      this.empresas.set(empresasMapeadas);
      this.totalEmpresas.set(empresasMapeadas.length);
      this.aplicarFiltros();
    } catch (error) {
      console.error('Error cargando empresas:', error);
      this.empresas.set([]);
      this.empresasFiltradas.set([]);
      this.totalEmpresas.set(0);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Formatea un RUT para mostrarlo (ej: 761234567 -> 76.123.456-7, 76123456K -> 76.123.456-K)
   */
  formatearRut(rut: string | undefined): string {
    if (!rut) return '—';
    
    // Asegurar que solo tenga números y k/K, convertir k a K
    const limpio = rut.replace(/[^0-9kK]/g, '').toUpperCase();
    if (limpio.length === 0) return '—';
    
    // Separar el dígito verificador (último carácter, puede ser número o K)
    const rutSinVerificador = limpio.slice(0, -1);
    const verificador = limpio.slice(-1); // Ya está en mayúscula
    
    if (rutSinVerificador.length === 0) {
      return verificador;
    }
    
    // Formatear con puntos y guión
    const formateado = rutSinVerificador.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formateado}-${verificador}`;
  }

  /**
   * Limpia el RUT para búsqueda (solo números y k/K en mayúscula)
   */
  private limpiarRutParaBusqueda(rut: string): string {
    return rut.replace(/[^0-9kK]/g, '').toUpperCase();
  }

  private aplicarFiltros(): void {
    const q = this.q().toLowerCase().trim();
    const estado = this.estado();

    const filtradas = this.empresas().filter(e => {
      // Limpiar la query para búsqueda de RUT (solo números y k)
      const qLimpia = q.replace(/[^0-9k]/g, '');
      
      const matchTexto =
        e.nombre.toLowerCase().includes(q) ||
        e.correo.toLowerCase().includes(q) ||
        (e.telefono ?? '').toLowerCase().includes(q) ||
        (e.ubicacion ?? '').toLowerCase().includes(q) ||
        (e.rut && qLimpia.length > 0 ? this.limpiarRutParaBusqueda(e.rut).toLowerCase().includes(qLimpia) : false);
      
      const matchEstado = estado === 'Todos' ? true : e.estado === estado;
      return matchTexto && matchEstado;
    });

    this.empresasFiltradas.set(filtradas);
    this.totalEmpresas.set(filtradas.length);
    // Resetear a página 1 cuando cambian los filtros
    this.page.set(1);
  }

  filtradas = computed(() => {
    const inicio = (this.page() - 1) * this.perPage;
    const fin = inicio + this.perPage;
    return this.empresasFiltradas().slice(inicio, fin);
  });

  lastPage = computed(() => {
    return Math.max(1, Math.ceil(this.totalEmpresas() / this.perPage));
  });

  kpiTotal = computed(() => this.empresas().length);
  kpiActivas = computed(() => this.empresas().filter(e => e.estado === 'Activa').length);
  kpiInactivas = computed(() => this.empresas().filter(e => e.estado === 'Inactiva').length);
  kpiNuevas7d = computed(() => {
    const now = new Date().getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return this.empresas().filter(e => {
      const fecha = e.creadaEl ? new Date(e.creadaEl).getTime() : NaN;
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
    this.estado.set(select.value as 'Todos' | EmpresaEstado);
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

  nuevaEmpresa() {
    this.router.navigate(['/admin/empresaForm']);
  }

  editar(empresa: Empresa) {
    this.router.navigate(['/admin/editarEmpresa', empresa.id]);
  }

  verDetalle(empresa: Empresa) {
    this.router.navigate(['/admin/detalleEmpresa', empresa.id]);
  }

  activar(e: Empresa) {
    if (e.estado === 'Activa') return;
    this.cambiarEstadoUsuario(e.id, true);
  }

  desactivar(e: Empresa) {
    if (e.estado === 'Inactiva') return;
    this.cambiarEstadoUsuario(e.id, false);
  }

  private async cambiarEstadoUsuario(id: number, habilitado: boolean): Promise<void> {
    try {
      const response = await this.http
        .put<any>(`${environment.apiUrl}/usuarios/${id}/habilitado`, { habilitado })
        .toPromise();

      // Actualizar el estado local
      this.cambiarEstado(id, habilitado ? 'Activa' : 'Inactiva');
      
      // Recargar empresas para sincronizar con el backend
      await this.cargarEmpresas();
    } catch (error: any) {
      console.error('Error cambiando estado del usuario:', error);
      const errorMessage = error?.error?.message || error?.message || 'Error desconocido';
      const statusCode = error?.status || error?.statusCode || 'N/A';
      console.error(`Status: ${statusCode}, Mensaje: ${errorMessage}`);
      alert(`Error al cambiar el estado de la empresa (${statusCode}): ${errorMessage}`);
    }
  }

  private cambiarEstado(id: number, nuevo: EmpresaEstado) {
    this.empresas.update(lista =>
      lista.map(emp => emp.id === id ? { ...emp, estado: nuevo } : emp)
    );
    this.aplicarFiltros();
  }

  trackById = (_: number, e: Empresa) => e.id;
}
