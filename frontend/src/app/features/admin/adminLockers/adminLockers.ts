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

    // ====== FILTROS ======
    q = '';
    fEstado: LockerEstado | 'Todos' = 'Todos';
    fUbicacion: string | 'Todas' = 'Todas';

    get ubicaciones(): string[] {
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

    get countTotales() { return this.rows.length; }
    get countActivos() { return this.rows.filter(r => r.estado === 'Activo').length; }
    get countOcupados() { return this.rows.filter(r => r.estado === 'Ocupado').length; }
    get countRevision() { return this.rows.filter(r => r.estado === 'En revisión').length; }
    get countBloqueados() { return this.rows.filter(r => r.estado === 'Bloqueado').length; }


    limpiarFiltros() {
        this.q = '';
        this.fEstado = 'Todos';
        this.fUbicacion = 'Todas';
    }

    async marcarRevision(row: LockerRow) {
        try {
            await this.http
                .patch(`${environment.apiUrl}/lockers/${row.id}`, { estado: 'mantenimiento' })
                .toPromise();
            row.estado = 'En revisión';
            row.actualizadoEl = new Date().toISOString();
            this.cargarLockers(); // Recargar para obtener datos actualizados
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
            this.cargarLockers(); // Recargar para obtener datos actualizados
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
            this.cargarLockers(); // Recargar para obtener datos actualizados
        } catch (error) {
            console.error('Error activando locker:', error);
            alert('No se pudo activar el locker');
        }
    }

    irDetalle(): void {
        this.router.navigate(['/admin/detalle']);
    }

    irEditar(): void {
        this.router.navigate(['/admin/editar']);
    }

    ngOnInit(): void {
        this.cargarLockers();
    }

    private async cargarLockers(): Promise<void> {
        this.loading = true;
        try {
            const response: any = await this.http
                .get<any>(`${environment.apiUrl}/lockers`, { params: { per_page: 1000 } })
                .toPromise();

            const lockers = response?.data || response || [];

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

            // Ordenar por ubicación (alfabético) y luego por número
            this.rows.sort((a, b) => {
                // Primero por ubicación
                const ubicacionCompare = a.ubicacion.localeCompare(b.ubicacion);
                if (ubicacionCompare !== 0) {
                    return ubicacionCompare;
                }
                // Si la ubicación es igual, ordenar por número
                return a.numero - b.numero;
            });
        } catch (error) {
            console.error('Error cargando lockers:', error);
        } finally {
            this.loading = false;
        }
    }
}
