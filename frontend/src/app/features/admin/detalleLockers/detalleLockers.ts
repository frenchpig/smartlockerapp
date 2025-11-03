import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HeaderAdmin } from '../../admin/shared/header-admin/headerAdmin';


type LockerEstado = 'Activo' | 'Ocupado' | 'En revisión' | 'Bloqueado';

interface Locker {
    id: number; codigo: string; nombre: string; empresa: string;
    sede: string; zona?: string; estado: LockerEstado;
    ip?: string; firmware?: string; serie?: string;
    actualizadoEl?: string;
}

@Component({
    standalone: true,
    selector: 'app-detalle-lockers',
    imports: [CommonModule, RouterModule, HeaderAdmin],
    templateUrl: './detalleLockers.html',
    styleUrl: './detalleLockers.scss'
})
export class LockerDetalle {
    private router = inject(Router);

    // aqui API
    locker: Locker = {
        id: 12,
        codigo: 'LK-012',
        nombre: 'Locker #12',
        empresa: 'Empresa A',
        sede: 'Metro Ñuñoa',
        zona: 'Nivel -1',
        estado: 'Activo',
        ip: '10.10.10.12',
        firmware: '1.2.3',
        serie: 'SN-001122',
        actualizadoEl: new Date().toISOString()
    };

    irEditar(): void {
        this.router.navigate(['/admin/editar']);
    }
    volver() { this.router.navigate(['/admin/lockers']); }
}
