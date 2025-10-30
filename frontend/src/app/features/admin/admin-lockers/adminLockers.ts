import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { HeaderAdmin } from '../shared/header-admin/headerAdmin';


type LockerEstado = 'Activo' | 'Ocupado' | 'En revisión' | 'Bloqueado';

interface LockerRow {
    id: number;
    codigo: string;
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
export class AdminLockers {

    constructor(private router: Router) { }

    // ====== MOCK ======
    rows: LockerRow[] = [
        { id: 1, codigo: '#01', ubicacion: 'Metro Ñuñoa', estado: 'Activo', empresa: 'Empresa.cl', actualizadoEl: '2025-10-12T13:20:00Z' },
        { id: 2, codigo: '#02', ubicacion: 'Plaza Egaña', estado: 'Ocupado', empresa: 'Acme S.A.', actualizadoEl: '2025-10-12T12:45:00Z' },
        { id: 3, codigo: '#07', ubicacion: 'Costanera', estado: 'En revisión', actualizadoEl: '2025-10-11T09:10:00Z' },
        { id: 4, codigo: '#12', ubicacion: 'Metro Ñuñoa', estado: 'Bloqueado', actualizadoEl: '2025-10-10T18:05:00Z' },
        { id: 5, codigo: '#19', ubicacion: 'Mall Florida', estado: 'Activo', empresa: 'Empresa.cl', actualizadoEl: '2025-10-12T08:10:00Z' },
    ];

    // ====== FILTROS ======
    q = '';
    fEstado: LockerEstado | 'Todos' = 'Todos';
    fUbicacion: string | 'Todas' = 'Todas';

    get ubicaciones(): string[] {
        const set = new Set(this.rows.map(r => r.ubicacion));
        return [...set];
    }

    get filtrados(): LockerRow[] {
        return this.rows.filter(r => {
            const matchQ = this.q.trim()
                ? [r.codigo, r.ubicacion, r.empresa ?? '', r.estado].some(t =>
                    t.toLowerCase().includes(this.q.trim().toLowerCase()))
                : true;
            const matchE = this.fEstado === 'Todos' ? true : r.estado === this.fEstado;
            const matchU = this.fUbicacion === 'Todas' ? true : r.ubicacion === this.fUbicacion;
            return matchQ && matchE && matchU;
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

    marcarRevision(row: LockerRow) {
        row.estado = 'En revisión';
        row.actualizadoEl = new Date().toISOString();
    }

    bloquear(row: LockerRow) {
        row.estado = 'Bloqueado';
        row.actualizadoEl = new Date().toISOString();
    }

    activar(row: LockerRow) {
        row.estado = 'Activo';
        row.actualizadoEl = new Date().toISOString();
    }

    irDetalle(): void {
        this.router.navigate(['/admin/detalle']);
    }

    irEditar(): void {
        this.router.navigate(['/admin/editar']);
    }
}
