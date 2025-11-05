import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { HeaderAdmin } from '../../admin/shared/header-admin/headerAdmin';
import { environment } from '../../../../environments/environment';

type LockerEstado = 'Activo' | 'Ocupado' | 'En revisión' | 'Bloqueado';

interface Locker {
    id: number;
    numero: number;
    ubicacion?: { id: number; nombre: string };
    estado: string;
    tamano?: string;
    created_at?: string;
    updated_at?: string;
    historial?: HistorialItem[];
}

interface HistorialItem {
    id: number;
    accion: string;
    descripcion: string;
    usuario?: { id: number; nombre: string; apellido: string };
    created_at: string;
    reserva?: any;
    mantenimiento?: any;
    incidencia?: any;
}

@Component({
    standalone: true,
    selector: 'app-detalle-lockers',
    imports: [CommonModule, RouterModule, HeaderAdmin, FormsModule],
    templateUrl: './detalleLockers.html',
    styleUrl: './detalleLockers.scss'
})
export class LockerDetalle implements OnInit {
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private location = inject(Location);
    private http = inject(HttpClient);

    locker: Locker | null = null;
    loading = false;
    error: string | null = null;
    
    // Historial
    historial: HistorialItem[] = [];
    loadingHistorial = false;
    historialPage = 1;
    historialLastPage = 1;
    historialTotal = 0;
    filtroAccion: string = 'Todas';
    
    accionesDisponibles = [
        { value: 'Todas', label: 'Todas las acciones' },
        { value: 'creado', label: 'Creado' },
        { value: 'estado_cambiado', label: 'Estado cambiado' },
        { value: 'reserva_creada', label: 'Reserva creada' },
        { value: 'reserva_completada', label: 'Reserva completada' },
        { value: 'reserva_anulada', label: 'Reserva anulada' },
        { value: 'mantenimiento_programado', label: 'Mantenimiento programado' },
        { value: 'mantenimiento_realizado', label: 'Mantenimiento realizado' },
        { value: 'mantenimiento_cancelado', label: 'Mantenimiento cancelado' },
        { value: 'incidencia_reportada', label: 'Incidencia reportada' },
        { value: 'incidencia_resuelta', label: 'Incidencia resuelta' },
    ];

    get estadoDisplay(): LockerEstado {
        if (!this.locker) return 'Activo';
        const estado = this.locker.estado;
        if (estado === 'activo') return 'Activo';
        if (estado === 'ocupado') return 'Ocupado';
        if (estado === 'mantenimiento') return 'En revisión';
        if (estado === 'bloqueado') return 'Bloqueado';
        return 'Activo';
    }

    get nombreLocker(): string {
        return this.locker ? `Locker #${this.locker.numero}` : 'Locker';
    }

    async ngOnInit(): Promise<void> {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            await Promise.all([
                this.cargarLocker(parseInt(id)),
                this.cargarHistorial(parseInt(id))
            ]);
        }
    }

    private async cargarLocker(id: number): Promise<void> {
        this.loading = true;
        this.error = null;
        try {
            const response: any = await this.http
                .get<any>(`${environment.apiUrl}/lockers/${id}`)
                .toPromise();
            
            this.locker = response;
        } catch (error: any) {
            console.error('Error cargando locker:', error);
            this.error = 'No se pudo cargar la información del locker';
        } finally {
            this.loading = false;
        }
    }

    async cargarHistorial(id: number, page: number = 1): Promise<void> {
        this.loadingHistorial = true;
        try {
            const params: any = {
                page,
                per_page: 5
            };

            if (this.filtroAccion && this.filtroAccion !== 'Todas') {
                params.accion = this.filtroAccion;
            }

            const response: any = await this.http
                .get<any>(`${environment.apiUrl}/lockers/${id}/historial`, { params })
                .toPromise();

            this.historial = response.data || [];
            this.historialPage = response.current_page || 1;
            this.historialLastPage = response.last_page || 1;
            this.historialTotal = response.total || 0;
        } catch (error: any) {
            console.error('Error cargando historial:', error);
            this.historial = [];
        } finally {
            this.loadingHistorial = false;
        }
    }

    onFiltroAccionChange(): void {
        if (this.locker) {
            this.historialPage = 1;
            this.cargarHistorial(this.locker.id, 1);
        }
    }

    cambiarPagina(page: number): void {
        if (this.locker && page >= 1 && page <= this.historialLastPage) {
            this.historialPage = page;
            this.cargarHistorial(this.locker.id, page);
        }
    }

    getAccionDisplay(accion: string): string {
        const map: Record<string, string> = {
            'creado': 'Creado',
            'estado_cambiado': 'Estado cambiado',
            'reserva_creada': 'Reserva creada',
            'reserva_completada': 'Reserva completada',
            'reserva_anulada': 'Reserva anulada',
            'mantenimiento_programado': 'Mantenimiento programado',
            'mantenimiento_realizado': 'Mantenimiento realizado',
            'mantenimiento_cancelado': 'Mantenimiento cancelado',
            'incidencia_reportada': 'Incidencia reportada',
            'incidencia_resuelta': 'Incidencia resuelta',
        };
        return map[accion] || accion;
    }

    getUsuarioDisplay(item: HistorialItem): string {
        if (item.usuario) {
            return `${item.usuario.nombre} ${item.usuario.apellido}`;
        }
        return 'Sistema';
    }

    irEditar(): void {
        if (this.locker) {
            this.router.navigate(['/admin/editar', this.locker.id]);
        }
    }

    volver(): void {
        this.location.back();
    }
}
