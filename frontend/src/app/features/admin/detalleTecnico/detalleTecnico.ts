import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HeaderAdmin } from '../shared/header-admin/headerAdmin';
import { environment } from '../../../../environments/environment';

type TecnicoEstado = 'Activo' | 'Inactivo';

interface TecnicoDetalle {
    id: number;
    nombre: string;
    apellido: string;
    nombreCompleto: string;
    email: string;
    telefono?: string;
    estado: TecnicoEstado;
    fechaAlta?: string;
    mantenimientos_count?: number;
    mantenimientos?: any[];
}

interface Mantenimiento {
    id: number;
    descripcion: string;
    fecha_mantenimiento: string;
    estado: string;
    tipo?: string;
    locker?: {
        id: number;
        numero: number;
        ubicacion?: {
            nombre: string;
        };
    };
}

@Component({
    standalone: true,
    selector: 'app-detalle-tecnico',
    imports: [CommonModule, RouterModule, HeaderAdmin, DatePipe],
    templateUrl: './detalleTecnico.html',
    styleUrls: ['./detalleTecnico.scss']
})
export class DetalleTecnico implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private http = inject(HttpClient);

    tecnico?: TecnicoDetalle;
    loading = true;
    error?: string;

    /**
     * Formatea el teléfono para mostrarlo (remueve prefijo 569)
     */
    formatearTelefono(telefono: string | undefined): string {
        if (!telefono) return '—';
        if (telefono.startsWith('569') && telefono.length > 3) {
            return telefono.substring(3);
        }
        return telefono;
    }

    async ngOnInit(): Promise<void> {
        const idParam = this.route.snapshot.paramMap.get('id');
        if (!idParam) {
            this.error = 'ID de técnico no proporcionado';
            this.loading = false;
            return;
        }
        const id = Number(idParam);
        if (isNaN(id) || id <= 0) {
            this.error = 'ID de técnico inválido';
            this.loading = false;
            return;
        }
        await this.cargarTecnico(id);
    }

    private async cargarTecnico(id: number): Promise<void> {
        this.loading = true;
        this.error = undefined;
        try {
            const tecnico = await this.http
                .get<any>(`${environment.apiUrl}/tecnicos/${id}`)
                .toPromise();

            if (!tecnico) {
                this.error = 'Técnico no encontrado';
                this.loading = false;
                return;
            }

            if (tecnico.rol !== 'tecnico') {
                this.error = 'El usuario seleccionado no es un técnico';
                this.loading = false;
                return;
            }

            this.tecnico = {
                id: tecnico.id,
                nombre: tecnico.nombre || '',
                apellido: tecnico.apellido || '',
                nombreCompleto: [tecnico.nombre, tecnico.apellido].filter(Boolean).join(' ').trim() || tecnico.email || `Técnico #${tecnico.id}`,
                email: tecnico.email ?? '',
                telefono: tecnico.telefono || undefined,
                estado: tecnico.habilitado ? 'Activo' : 'Inactivo',
                fechaAlta: tecnico.created_at || undefined,
                mantenimientos_count: tecnico.mantenimientos_count || 0,
                mantenimientos: tecnico.mantenimientos || []
            };
        } catch (error: any) {
            console.error('Error cargando técnico:', error);
            this.error = error?.error?.message || 'Error al cargar el técnico';
        } finally {
            this.loading = false;
        }
    }

    editar() {
        if (this.tecnico) {
            this.router.navigate(['/admin/editarTecnico', this.tecnico.id]);
        }
    }

    volver() {
        this.router.navigate(['/admin/tecnicos']);
    }

    getEstadoBadge(estado: string): string {
        switch (estado) {
            case 'resuelta': return 'bg-success';
            case 'pendiente': return 'bg-warning';
            case 'cancelado': return 'bg-danger';
            default: return 'bg-secondary';
        }
    }

    getEstadoLabel(estado: string): string {
        switch (estado) {
            case 'resuelta': return 'Resuelta';
            case 'pendiente': return 'Pendiente';
            case 'cancelado': return 'Cancelado';
            default: return estado;
        }
    }
}

