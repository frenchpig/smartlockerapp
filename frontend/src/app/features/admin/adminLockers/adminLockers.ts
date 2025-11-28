import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { HeaderAdmin } from '../shared/header-admin/headerAdmin';
import { environment } from '../../../../environments/environment';

type LockerEstado = 'Activo' | 'Ocupado' | 'En revisión' | 'Bloqueado';
type LockerEstadoBackend = 'activo' | 'bloqueado' | 'mantenimiento' | 'ocupado';

interface LockerRow {
    id: number;
    numero: number;
    ubicacion: string;
    estado: LockerEstado;
    empresa?: string;
    actualizadoEl: string;
}

interface GrupoUbicacion {
    nombre: string;
    lockers: LockerRow[];
}

interface Ubicacion {
    id: number;
    nombre: string;
    latitud?: number | null;
    longitud?: number | null;
    lockers_count?: number;
}

@Component({
    standalone: true,
    selector: 'app-admin-lockers',
    imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, HeaderAdmin],
    templateUrl: './adminLockers.html',
    styleUrls: ['./adminLockers.scss']
})
export class AdminLockers implements OnInit {
    private router = inject(Router);
    private http = inject(HttpClient);
    private fb = inject(FormBuilder);

    rows: LockerRow[] = [];
    loading = false;

    // Paginación
    currentPage = 1;
    perPage = 20;
    total = 0;
    lastPage = 1;

    // KPIs
    kpisLoading = false;
    kpis = {
        totales: 0,
        activos: 0,
        ocupados: 0,
        revision: 0,
        bloqueados: 0
    };

    q = '';
    fEstado: LockerEstado | 'Todos' = 'Todos';
    fUbicacion: string | 'Todas' = 'Todas';
    ubicacionesDisponibles: string[] = [];
    cargandoUbicaciones = false;

    // Gestión de ubicaciones
    mostrarGestionUbicaciones = false;
    ubicaciones: Ubicacion[] = [];
    cargandoUbicacionesLista = false;
    editandoUbicacion: Ubicacion | null = null;
    errorUbicacion = '';
    successUbicacion = '';
    ubicacionForm: FormGroup;

    // Cambio de estado
    lockerCambiarEstado: LockerRow | null = null;
    nuevoEstado: LockerEstadoBackend = 'activo';
    cambiandoEstado = false;
    estadosDisponibles: { value: LockerEstadoBackend; label: string }[] = [
        { value: 'activo', label: 'Activo' },
        { value: 'ocupado', label: 'Ocupado' },
        { value: 'mantenimiento', label: 'En revisión (Mantenimiento)' },
        { value: 'bloqueado', label: 'Bloqueado' },
    ];

    get filtrados(): LockerRow[] {
        // Los filtros ahora se aplican en el servidor, así que retornamos los rows directamente
        return this.rows.sort((a, b) => {
            const ubicacionCompare = a.ubicacion.localeCompare(b.ubicacion);
            if (ubicacionCompare !== 0) return ubicacionCompare;
            return a.numero - b.numero;
        });
    }

    get agrupadosPorUbicacion(): GrupoUbicacion[] {
        const map = new Map<string, GrupoUbicacion>();

        for (const row of this.filtrados) {
            if (!map.has(row.ubicacion)) {
                map.set(row.ubicacion, {
                    nombre: row.ubicacion,
                    lockers: []
                });
            }
            map.get(row.ubicacion)!.lockers.push(row);
        }

        return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
    }

    get countTotales() { return this.kpis.totales; }
    get countActivos() { return this.kpis.activos; }
    get countOcupados() { return this.kpis.ocupados; }
    get countRevision() { return this.kpis.revision; }
    get countBloqueados() { return this.kpis.bloqueados; }

    constructor() {
        this.ubicacionForm = this.fb.group({
            nombre: ['', [Validators.required, Validators.maxLength(255)]],
            latitud: ['', [Validators.pattern(/^-?\d+\.?\d*$/)]],
            longitud: ['', [Validators.pattern(/^-?\d+\.?\d*$/)]],
        });
    }

    limpiarFiltros() {
        this.q = '';
        this.fEstado = 'Todos';
        this.fUbicacion = 'Todas';
        this.currentPage = 1;
        void this.cargarLockers();
    }

    aplicarFiltros() {
        this.currentPage = 1;
        void this.cargarLockers();
    }

    async marcarRevision(row: LockerRow) {
        try {
            const nuevoEstado = row.estado === 'En revisión' ? 'activo' : 'mantenimiento';

            await this.http
                .patch(`${environment.apiUrl}/lockers/${row.id}`, { estado: nuevoEstado })
                .toPromise();

            row.estado = nuevoEstado === 'activo' ? 'Activo' : 'En revisión';
            row.actualizadoEl = new Date().toISOString();
            await Promise.all([
                this.cargarLockers(),
                this.cargarKPIs()
            ]);
        } catch (error) {
            console.error('Error marcando revisión:', error);
            alert('No se pudo actualizar el estado del locker');
        }
    }

    async bloquear(row: LockerRow) {
        try {
            await this.http
                .patch(`${environment.apiUrl}/lockers/${row.id}`, { estado: 'bloqueado' })
                .toPromise();
            row.estado = 'Bloqueado';
            row.actualizadoEl = new Date().toISOString();
            await Promise.all([this.cargarLockers(), this.cargarKPIs()]);
        } catch (error) {
            console.error('Error bloqueando locker:', error);
            alert('No se pudo bloquear el locker');
        }
    }

    async activar(row: LockerRow) {
        try {
            await this.http
                .patch(`${environment.apiUrl}/lockers/${row.id}`, { estado: 'activo' })
                .toPromise();
            row.estado = 'Activo';
            row.actualizadoEl = new Date().toISOString();
            await Promise.all([this.cargarLockers(), this.cargarKPIs()]);
        } catch (error) {
            console.error('Error activando locker:', error);
            alert('No se pudo activar el locker');
        }
    }

    abrirModalCambiarEstado(row: LockerRow): void {
        this.lockerCambiarEstado = row;
        // Mapear el estado actual al formato del backend
        const estadoMap: Record<LockerEstado, LockerEstadoBackend> = {
            'Activo': 'activo',
            'Ocupado': 'ocupado',
            'En revisión': 'mantenimiento',
            'Bloqueado': 'bloqueado',
        };
        this.nuevoEstado = estadoMap[row.estado] || 'activo';
    }

    cerrarModalCambiarEstado(): void {
        this.lockerCambiarEstado = null;
        this.nuevoEstado = 'activo';
    }

    async confirmarCambiarEstado(): Promise<void> {
        if (!this.lockerCambiarEstado || this.cambiandoEstado) return;

        this.cambiandoEstado = true;
        try {
            await this.http
                .patch(`${environment.apiUrl}/lockers/${this.lockerCambiarEstado.id}`, { estado: this.nuevoEstado })
                .toPromise();

            // Mapear el estado del backend al formato del frontend
            const estadoMap: Record<LockerEstadoBackend, LockerEstado> = {
                'activo': 'Activo',
                'ocupado': 'Ocupado',
                'mantenimiento': 'En revisión',
                'bloqueado': 'Bloqueado',
            };

            this.lockerCambiarEstado.estado = estadoMap[this.nuevoEstado];
            this.lockerCambiarEstado.actualizadoEl = new Date().toISOString();

            await Promise.all([this.cargarLockers(), this.cargarKPIs()]);
            this.cerrarModalCambiarEstado();
        } catch (error) {
            console.error('Error cambiando estado:', error);
            alert('No se pudo cambiar el estado del locker');
        } finally {
            this.cambiandoEstado = false;
        }
    }

    cambiarPagina(page: number): void {
        if (page >= 1 && page <= this.lastPage) {
            this.currentPage = page;
            this.cargarLockers();
        }
    }

    irDetalle(row: LockerRow): void {
        this.router.navigate(['/admin/detalle', row.id]);
    }

    irEditar(row: LockerRow): void {
        this.router.navigate(['/admin/editar', row.id]);
    }

    ngOnInit(): void {
        Promise.all([
            this.cargarLockers(),
            this.cargarKPIs(),
            this.cargarUbicaciones()
        ]);
    }

    // Gestión de ubicaciones
    abrirGestionUbicaciones() {
        this.mostrarGestionUbicaciones = true;
        this.cargarListaUbicaciones();
    }

    cerrarGestionUbicaciones() {
        this.mostrarGestionUbicaciones = false;
        this.editandoUbicacion = null;
        this.ubicacionForm.reset();
        this.errorUbicacion = '';
        this.successUbicacion = '';
    }

    async cargarListaUbicaciones() {
        this.cargandoUbicacionesLista = true;
        try {
            const response: any = await firstValueFrom(
                this.http.get(`${environment.apiUrl}/ubicaciones`, {
                    params: { per_page: 1000 }
                })
            );
            this.ubicaciones = response?.data || [];
        } catch (error) {
            console.error('Error cargando ubicaciones:', error);
            this.errorUbicacion = 'No se pudieron cargar las ubicaciones.';
        } finally {
            this.cargandoUbicacionesLista = false;
        }
    }

    abrirFormularioUbicacion(ubicacion?: Ubicacion) {
        if (ubicacion) {
            // Editar: navegar a página de edición
            this.router.navigate(['/admin/ubicaciones/editar', ubicacion.id]);
        } else {
            // Crear: navegar a página de creación
            this.router.navigate(['/admin/ubicaciones/nueva']);
        }
    }

    cerrarFormularioUbicacion() {
        this.editandoUbicacion = null;
        this.ubicacionForm.reset();
        this.errorUbicacion = '';
        this.successUbicacion = '';
    }

    async guardarUbicacion() {
        if (this.ubicacionForm.invalid) {
            this.ubicacionForm.markAllAsTouched();
            return;
        }

        this.cargandoUbicacionesLista = true;
        this.errorUbicacion = '';
        this.successUbicacion = '';

        try {
            const data = {
                nombre: this.ubicacionForm.value.nombre,
                latitud: this.ubicacionForm.value.latitud ? parseFloat(this.ubicacionForm.value.latitud) : null,
                longitud: this.ubicacionForm.value.longitud ? parseFloat(this.ubicacionForm.value.longitud) : null,
            };

            if (this.editandoUbicacion) {
                // Actualizar
                await firstValueFrom(
                    this.http.put(`${environment.apiUrl}/ubicaciones/${this.editandoUbicacion.id}`, data)
                );
                this.successUbicacion = 'Ubicación actualizada exitosamente.';
            } else {
                // Crear
                await firstValueFrom(
                    this.http.post(`${environment.apiUrl}/ubicaciones`, data)
                );
                this.successUbicacion = 'Ubicación creada exitosamente.';
            }

            // Recargar lista y ubicaciones del filtro
            await Promise.all([
                this.cargarListaUbicaciones(),
                this.cargarUbicaciones()
            ]);

            // Cerrar formulario después de un breve delay
            setTimeout(() => {
                this.cerrarFormularioUbicacion();
            }, 1500);
        } catch (error: any) {
            console.error('Error guardando ubicación:', error);
            this.errorUbicacion = error?.error?.message || 
                error?.error?.errors?.nombre?.[0] ||
                'No se pudo guardar la ubicación. Intenta nuevamente.';
        } finally {
            this.cargandoUbicacionesLista = false;
        }
    }

    async eliminarUbicacion(ubicacion: Ubicacion) {
        if (!confirm(`¿Estás seguro de que deseas eliminar la ubicación "${ubicacion.nombre}"?\n\nNota: Solo se puede eliminar si no tiene lockers asociados.`)) {
            return;
        }

        this.cargandoUbicacionesLista = true;
        this.errorUbicacion = '';
        this.successUbicacion = '';

        try {
            await firstValueFrom(
                this.http.delete(`${environment.apiUrl}/ubicaciones/${ubicacion.id}`)
            );

            this.successUbicacion = 'Ubicación eliminada exitosamente.';
            
            // Recargar lista y ubicaciones del filtro
            await Promise.all([
                this.cargarListaUbicaciones(),
                this.cargarUbicaciones()
            ]);
        } catch (error: any) {
            console.error('Error eliminando ubicación:', error);
            this.errorUbicacion = error?.error?.message || 
                'No se pudo eliminar la ubicación. Verifica que no tenga lockers asociados.';
        } finally {
            this.cargandoUbicacionesLista = false;
        }
    }

    hasError(ctrl: string, err: string): boolean {
        const c = this.ubicacionForm.controls[ctrl];
        return (c.touched || c.dirty) && c.hasError(err);
    }

    private async cargarUbicaciones(): Promise<void> {
        this.cargandoUbicaciones = true;
        try {
            const response: any = await this.http
                .get<any>(`${environment.apiUrl}/ubicaciones`, {
                    params: {
                        per_page: 1000 // Obtener todas las ubicaciones
                    }
                })
                .toPromise();

            const ubicaciones = response?.data || [];
            const nombres = ubicaciones
                .map((u: any) => u.nombre)
                .filter((nombre: string) => nombre && nombre.trim() !== '')
                .filter((nombre: string, index: number, self: string[]) => self.indexOf(nombre) === index); // Eliminar duplicados
            
            this.ubicacionesDisponibles = nombres.sort((a: string, b: string) => a.localeCompare(b));
        } catch (error) {
            console.error('Error cargando ubicaciones:', error);
            // Fallback: extraer de los lockers cargados
            const set = new Set(this.rows.map(r => r.ubicacion).filter(u => u && u !== 'Sin ubicación'));
            this.ubicacionesDisponibles = [...set].sort((a, b) => a.localeCompare(b));
        } finally {
            this.cargandoUbicaciones = false;
        }
    }

    private async cargarKPIs(): Promise<void> {
        this.kpisLoading = true;
        try {
            const response: any = await this.http
                .get<any>(`${environment.apiUrl}/lockers`, {
                    params: {
                        per_page: 10000
                    }
                })
                .toPromise();

            const allLockers = response?.data || [];

            this.kpis.totales = allLockers.length;
            this.kpis.activos = allLockers.filter((l: any) => l.estado === 'activo').length;
            this.kpis.ocupados = allLockers.filter((l: any) => l.estado === 'ocupado').length;
            this.kpis.revision = allLockers.filter((l: any) => l.estado === 'mantenimiento').length;
            this.kpis.bloqueados = allLockers.filter((l: any) => l.estado === 'bloqueado').length;
        } catch (error) {
            console.error('Error cargando KPIs:', error);
        } finally {
            this.kpisLoading = false;
        }
    }

    private async cargarLockers(): Promise<void> {
        this.loading = true;
        try {
            const params: Record<string, string | number> = {
                per_page: this.perPage,
                page: this.currentPage
            };

            // Agregar filtros al backend
            if (this.q.trim()) {
                params['busqueda'] = this.q.trim();
            }

            if (this.fEstado !== 'Todos') {
                // Convertir estado del frontend al formato del backend
                const estadoMap: Record<string, string> = {
                    'Activo': 'activo',
                    'Ocupado': 'ocupado',
                    'En revisión': 'mantenimiento',
                    'Bloqueado': 'bloqueado'
                };
                params['estado'] = estadoMap[this.fEstado] || this.fEstado.toLowerCase();
            }

            if (this.fUbicacion !== 'Todas') {
                params['ubicacion_nombre'] = this.fUbicacion;
            }

            const response: any = await this.http
                .get<any>(`${environment.apiUrl}/lockers`, { params })
                .toPromise();

            const lockers = response?.data || [];

            this.rows = lockers.map((l: any) => {
                let estado: LockerEstado = 'Activo';
                if (l.estado === 'activo') estado = 'Activo';
                else if (l.estado === 'ocupado') estado = 'Ocupado';
                else if (l.estado === 'mantenimiento') estado = 'En revisión';
                else if (l.estado === 'bloqueado') estado = 'Bloqueado';

                return {
                    id: l.id,
                    numero: l.numero ?? l.id,
                    ubicacion: l.ubicacion?.nombre ?? 'Sin ubicación',
                    estado: estado,
                    empresa: l.empresa_actual?.nombre ?? undefined,
                    actualizadoEl: l.updated_at ?? l.created_at ?? new Date().toISOString(),
                };
            });

            this.rows.sort((a, b) => {
                const ubicacionCompare = a.ubicacion.localeCompare(b.ubicacion);
                if (ubicacionCompare !== 0) return ubicacionCompare;
                return a.numero - b.numero;
            });

            this.currentPage = response?.current_page || 1;
            this.lastPage = response?.last_page || 1;
            this.total = response?.total || 0;
            this.perPage = response?.per_page || 20;
        } catch (error) {
            console.error('Error cargando lockers:', error);
        } finally {
            this.loading = false;
        }
    }
}
