import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
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
    imports: [CommonModule, RouterModule, HeaderAdmin],
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
            await this.cargarLocker(parseInt(id));
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
