import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HeaderAdmin } from '../shared/header-admin/headerAdmin';

type IncidenciaEstado = 'Abierta' | 'Iniciada' | 'Cerrada';
type IncidenciaPrioridad = 'Baja' | 'Media' | 'Alta' | 'Crítica';
type IncidenciaOrigen = 'Locker' | 'Empresa' | 'Sistema' | 'Cliente';

interface IncidenciaResumen {
    id: number;
    titulo: string;
    origen: IncidenciaOrigen;
    prioridad: IncidenciaPrioridad;
    estado: IncidenciaEstado;
}

interface EmpresaResumen {
    id: number;
    nombre: string;
    correo: string;
    ubicacion: string;
}

@Component({
    standalone: true,
    selector: 'app-admin-dashboard',
    templateUrl: './adminDashboard.html',
    styleUrls: ['./adminDashboard.scss'],
    imports: [CommonModule, RouterModule, HeaderAdmin],
})
export class AdminDashboard {
    private router = inject(Router);

    // Lockers KPIs
    lockersTotales = 3;
    lockersActivos = 2;
    lockersOcupados = 1;
    lockersRevision = 0;

    // Incidencias
    incidenciasRecientes: IncidenciaResumen[] = [
        { id: 101, titulo: 'Locker no abre', origen: 'Locker', prioridad: 'Alta', estado: 'Abierta' },
        { id: 102, titulo: 'Cobro duplicado', origen: 'Empresa', prioridad: 'Media', estado: 'Iniciada' },
        { id: 103, titulo: 'Sensor de puerta', origen: 'Sistema', prioridad: 'Crítica', estado: 'Abierta' },
    ];

    // Empresas
    empresasActivas: EmpresaResumen[] = [
        { id: 3, nombre: 'Locker Solutions SA', correo: 'empresa@example.com', ubicacion: 'Puente Alto' },
        { id: 4, nombre: 'Smart Logistics SpA', correo: 'empresa2@example.com', ubicacion: 'Santiago' },
    ];

    prioridadClase(p: IncidenciaPrioridad) {
        return {
            'chip-low': p === 'Baja',
            'chip-medium': p === 'Media',
            'chip-high': p === 'Alta',
            'chip-critical': p === 'Crítica',
        };
    }

    estadoClase(e: IncidenciaEstado) {
        return {
            'chip-danger': e === 'Abierta',
            'chip-warn': e === 'Iniciada',
            'chip-success': e === 'Cerrada',
        };
    }

    // navegación
    verIncidencia(id: number) {
        this.router.navigate(['/admin/IncidenciaDetalle', id]);
    }

    irIncidencias() {
        this.router.navigate(['/admin/AdminIncidencias']);
    }

    verEmpresa(id: number) {
        this.router.navigate(['/admin/detalleEmpresa', id]);
    }

    irEmpresas() {
        this.router.navigate(['/admin/empresa']);
    }
}
