import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { HeaderAdmin } from '../shared/header-admin/headerAdmin';

interface DashboardStats {
    lockers: {
        totales: number;
        activos: number;
        ocupados: number;
        en_revision: number;
    };
    empresas: {
        totales: number;
        activas: number;
    };
    usuarios: {
        totales: number;
        activos: number;
    };
    reservas: {
        totales: number;
        pendientes: number;
        completadas: number;
        hoy: number;
        esta_semana: number;
        este_mes: number;
    };
    incidencias: {
        totales: number;
        pendientes: number;
        resueltas: number;
        lockers: number;
        pedidos: number;
    };
    mantenimientos: {
        pendientes: number;
    };
    incidencias_recientes: Array<{
        id: number;
        tipo: string;
        problema_tipo: string | null;
        descripcion: string;
        estado: string;
        fecha: string;
        locker: { id: number; numero: string; ubicacion: string | null } | null;
        usuario: { id: number; nombre: string; email: string } | null;
        empresa: { id: number; nombre: string } | null;
    }>;
    empresas_activas: Array<{
        id: number;
        nombre: string;
        email: string;
        reservas_recientes: number;
    }>;
    reservas_recientes: Array<{
        id: number;
        estado: string;
        logistica_estado: string;
        fecha: string;
        usuario: { id: number; nombre: string; email: string } | null;
        locker: { id: number; numero: string; ubicacion: string | null } | null;
        empresa: { id: number; nombre: string } | null;
    }>;
}

@Component({
    standalone: true,
    selector: 'app-admin-dashboard',
    templateUrl: './adminDashboard.html',
    styleUrls: ['./adminDashboard.scss'],
    imports: [CommonModule, RouterModule, DatePipe, HeaderAdmin],
})
export class AdminDashboard implements OnInit {
    private router = inject(Router);
    private http = inject(HttpClient);

    cargando = signal(true);
    error = signal('');

    stats = signal<DashboardStats | null>(null);

    async ngOnInit(): Promise<void> {
        await this.cargarDashboard();
    }

    async cargarDashboard(): Promise<void> {
        this.cargando.set(true);
        this.error.set('');

        try {
            const data = await firstValueFrom(
                this.http.get<DashboardStats>(`${environment.apiUrl}/admin/dashboard`)
            );
            this.stats.set(data);
        } catch (err: any) {
            console.error('Error cargando dashboard:', err);
            this.error.set('No fue posible cargar las estadísticas del dashboard.');
        } finally {
            this.cargando.set(false);
        }
    }

    get problemaTipoLabel(): Record<string, string> {
        return {
            'pedido_incorrecto': 'Pedido Incorrecto',
            'pedido_dañado': 'Pedido Dañado',
            'pedido_faltante': 'Pedido Faltante',
            'pedido_extraviado': 'Pedido Extraviado',
            'no_se_abre': 'No se Abre',
            'no_se_cierra': 'No se Cierra',
            'dañado': 'Dañado',
            'bloqueado': 'Bloqueado',
            'sin_energia': 'Sin Energía',
            'codigo_no_funciona': 'Código no Funciona',
            'sensor_defectuoso': 'Sensor Defectuoso',
            'otro': 'Otro',
        };
    }

    getProblemaLabel(problema: string | null): string {
        if (!problema) return '—';
        return this.problemaTipoLabel[problema] || problema.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    tipoClase(tipo: string): Record<string, boolean> {
        return {
            'chip-primary': tipo === 'locker',
            'chip-info': tipo === 'pedido',
            'chip-secondary': tipo === 'otro',
        };
    }

    estadoClase(estado: string): Record<string, boolean> {
        return {
            'chip-danger': estado === 'pendiente',
            'chip-success': estado === 'resuelto',
            'chip-secondary': estado === 'anulada',
        };
    }

    estadoLabel(estado: string): string {
        const labels: Record<string, string> = {
            'pendiente': 'Pendiente',
            'resuelto': 'Resuelta',
            'anulada': 'Anulada',
        };
        return labels[estado] || estado;
    }

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

    verReserva(id: number) {
        // TODO: Implementar vista de reserva si existe
        console.log('Ver reserva:', id);
    }
}

