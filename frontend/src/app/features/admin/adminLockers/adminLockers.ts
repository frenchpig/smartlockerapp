import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HeaderAdmin } from '../shared/header-admin/headerAdmin';
import { environment } from '../../../../environments/environment';

type LockerEstado = 'Activo' | 'Ocupado' | 'En revisión' | 'Bloqueado';

interface LockerRow {
    id: number;
    numero: number;
    ubicacion: string;
    estado: LockerEstado;
    empresa?: string;
    actualizadoEl: string;
}

@Component({
    standalone: true,
    selector: 'app-admin-lockers',
    imports: [CommonModule, FormsModule, RouterModule, HeaderAdmin],
    templateUrl: './adminLockers.html',
    styleUrls: ['./adminLockers.scss']
})
export class AdminLockers implements OnInit {
    private router = inject(Router);
    private http = inject(HttpClient);

    rows: LockerRow[] = [];
    loading = false;
    
    // Paginación
    currentPage = 1;
    perPage = 20;
    total = 0;
    lastPage = 1;
    
    // KPIs - contadores totales
    kpisLoading = false;
    kpis = {
        totales: 0,
        activos: 0,
        ocupados: 0,
        revision: 0,
        bloqueados: 0
    };

    // ====== FILTROS ======
    q = '';
    fEstado: LockerEstado | 'Todos' = 'Todos';
    fUbicacion: string | 'Todas' = 'Todas';

    get ubicaciones(): string[] {
        // Cargar ubicaciones desde todos los lockers cargados hasta ahora
        // Para obtener todas las ubicaciones, necesitaríamos cargar todos los lockers o hacer una llamada separada
        // Por ahora, usamos las ubicaciones de los lockers visibles en la página actual
        const set = new Set(this.rows.map(r => r.ubicacion));
        const ubicacionesList = [...set];
        // Ordenar ubicaciones alfabéticamente
        return ubicacionesList.sort((a, b) => a.localeCompare(b));
    }

    get filtrados(): LockerRow[] {
        const filtrados = this.rows.filter(r => {
            const matchQ = this.q.trim()
                ? [r.numero.toString(), r.ubicacion, r.empresa ?? '', r.estado].some(t =>
                    t.toLowerCase().includes(this.q.trim().toLowerCase()))
                : true;
            const matchE = this.fEstado === 'Todos' ? true : r.estado === this.fEstado;
            const matchU = this.fUbicacion === 'Todas' ? true : r.ubicacion === this.fUbicacion;
            return matchQ && matchE && matchU;
        });

        // Mantener el ordenamiento por ubicación y número después de filtrar
        return filtrados.sort((a, b) => {
            const ubicacionCompare = a.ubicacion.localeCompare(b.ubicacion);
            if (ubicacionCompare !== 0) {
                return ubicacionCompare;
            }
            return a.numero - b.numero;
        });
    }

    get countTotales() { return this.kpis.totales; }
    get countActivos() { return this.kpis.activos; }
    get countOcupados() { return this.kpis.ocupados; }
    get countRevision() { return this.kpis.revision; }
    get countBloqueados() { return this.kpis.bloqueados; }


    limpiarFiltros() {
        this.q = '';
        this.fEstado = 'Todos';
        this.fUbicacion = 'Todas';
        this.currentPage = 1;
        this.cargarLockers();
    }

    async marcarRevision(row: LockerRow) {
        try {
            // Si está en revisión (mantenimiento), revertir a activo
            // Si no está en revisión, cambiar a mantenimiento
            const nuevoEstado = row.estado === 'En revisión' ? 'activo' : 'mantenimiento';
            
            await this.http
                .patch(`${environment.apiUrl}/lockers/${row.id}`, { estado: nuevoEstado })
                .toPromise();
            
            // Actualizar el estado localmente
            if (nuevoEstado === 'activo') {
                row.estado = 'Activo';
            } else {
                row.estado = 'En revisión';
            }
            
            row.actualizadoEl = new Date().toISOString();
            await Promise.all([
                this.cargarLockers(), // Recargar para obtener datos actualizados
                this.cargarKPIs() // Actualizar KPIs
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
            await Promise.all([
                this.cargarLockers(), // Recargar para obtener datos actualizados
                this.cargarKPIs() // Actualizar KPIs
            ]);
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
            await Promise.all([
                this.cargarLockers(), // Recargar para obtener datos actualizados
                this.cargarKPIs() // Actualizar KPIs
            ]);
        } catch (error) {
            console.error('Error activando locker:', error);
            alert('No se pudo activar el locker');
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
            this.cargarKPIs()
        ]);
    }

    private async cargarKPIs(): Promise<void> {
        this.kpisLoading = true;
        try {
            // Cargar todos los lockers para obtener los KPIs totales
            const response: any = await this.http
                .get<any>(`${environment.apiUrl}/lockers`, { 
                    params: { 
                        per_page: 10000 // Cargar todos para los KPIs
                    } 
                })
                .toPromise();

            const allLockers = response?.data || [];
            
            // Contar estados
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
            const response: any = await this.http
                .get<any>(`${environment.apiUrl}/lockers`, { 
                    params: { 
                        per_page: this.perPage,
                        page: this.currentPage
                    } 
                })
                .toPromise();

            const lockers = response?.data || [];

            this.rows = lockers.map((l: any) => {
                // Mapear estado del backend al frontend
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

            // Ordenar por ubicación (alfabético) y luego por número (aunque ya viene ordenado del backend)
            this.rows.sort((a, b) => {
                // Primero por ubicación
                const ubicacionCompare = a.ubicacion.localeCompare(b.ubicacion);
                if (ubicacionCompare !== 0) {
                    return ubicacionCompare;
                }
                // Si la ubicación es igual, ordenar por número
                return a.numero - b.numero;
            });

            // Actualizar información de paginación
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
