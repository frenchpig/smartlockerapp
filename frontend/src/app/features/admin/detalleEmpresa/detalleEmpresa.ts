import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HeaderAdmin } from '../shared/header-admin/headerAdmin';
import { environment } from '../../../../environments/environment';

type EmpresaEstado = 'Activa' | 'Inactiva';

interface EmpresaDetalle {
    id: number;
    nombre: string;
    razonSocial?: string;
    rut?: string;
    correo: string;
    telefono?: string;
    direccion?: string;
    comuna?: string;
    region?: string;
    estado: EmpresaEstado;
    creadosUlt7d?: number;
    fechaAlta?: string;
}

interface HistorialItem {
    id: number;
    tipo: string;
    descripcion: string;
    reserva_id?: number;
    detalles?: any;
    created_at: string;
}

interface PaginatedResponse<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

@Component({
    standalone: true,
    selector: 'app-detalle-empresa',
    imports: [CommonModule, RouterModule, HeaderAdmin, DatePipe],
    templateUrl: './detalleEmpresa.html',
    styleUrls: ['./detalleEmpresa.scss']
})
export class DetalleEmpresa implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private http = inject(HttpClient);

    empresa?: EmpresaDetalle;
    historial: HistorialItem[] = [];
    loading = true;
    loadingHistorial = true;
    error?: string;

    /**
     * Formatea un RUT para mostrarlo (ej: 761234567 -> 76.123.456-7, 76123456K -> 76.123.456-K)
     */
    formatearRut(rut: string | undefined): string {
        if (!rut) return '—';
        const limpio = rut.replace(/[^0-9kK]/g, '').toUpperCase();
        if (limpio.length === 0) return '—';
        const rutSinVerificador = limpio.slice(0, -1);
        const verificador = limpio.slice(-1);
        if (rutSinVerificador.length === 0) {
            return verificador;
        }
        const formateado = rutSinVerificador.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return `${formateado}-${verificador}`;
    }

    tipoToLabel(tipo: string): string {
        const map: Record<string, string> = {
            'creacion_cuenta': 'Inicio',
            'reserva_creada': 'Reserva',
            'reserva_cancelada': 'Cancelación',
            'reserva_completada': 'Completado',
            'datos_actualizados': 'Actualización',
            'locker_asignado': 'Asignación',
            'locker_liberado': 'Liberación',
            'estado_cambiado': 'Cambio de Estado'
        };
        return map[tipo] || tipo;
    }

    async ngOnInit(): Promise<void> {
        const idParam = this.route.snapshot.paramMap.get('id');
        if (!idParam) {
            this.error = 'ID de empresa no proporcionado';
            this.loading = false;
            return;
        }
        const id = Number(idParam);
        if (isNaN(id) || id <= 0) {
            this.error = 'ID de empresa inválido';
            this.loading = false;
            return;
        }
        await Promise.all([
            this.cargarEmpresa(id),
            this.cargarHistorial(id)
        ]);
    }

    private async cargarEmpresa(id: number): Promise<void> {
        this.loading = true;
        this.error = undefined;
        try {
            console.log('Cargando empresa con ID:', id);
            const usuario = await this.http
                .get<any>(`${environment.apiUrl}/usuarios/${id}`)
                .toPromise();

            console.log('Usuario recibido:', usuario);

            if (!usuario) {
                console.error('Usuario no encontrado');
                this.error = 'Empresa no encontrada';
                this.loading = false;
                return;
            }

            if (usuario.rol !== 'empresa') {
                console.error('El usuario no es una empresa. Rol:', usuario.rol);
                this.error = 'El usuario seleccionado no es una empresa';
                this.loading = false;
                return;
            }

            const datosEmpresa = usuario.datos_empresa || usuario.datosEmpresa;
            console.log('Datos empresa:', datosEmpresa);
            
            if (!datosEmpresa && usuario.rol === 'empresa') {
                console.warn('La empresa no tiene datos_empresa cargados');
            }
            
            this.empresa = {
                id: usuario.id,
                nombre: datosEmpresa?.nombre || [usuario.nombre, usuario.apellido].filter(Boolean).join(' ').trim() || usuario.email || `Empresa #${usuario.id}`,
                razonSocial: datosEmpresa?.razon_social || datosEmpresa?.razonSocial || undefined,
                rut: datosEmpresa?.rut || undefined,
                correo: usuario.email ?? '',
                telefono: usuario.telefono || undefined,
                direccion: datosEmpresa?.direccion || undefined,
                comuna: datosEmpresa?.comuna?.nombre || undefined,
                region: datosEmpresa?.comuna?.region?.nombre || undefined,
                estado: 'Activa' as EmpresaEstado,
                fechaAlta: usuario.created_at || undefined,
            };
            console.log('Empresa mapeada:', this.empresa);
        } catch (error: any) {
            console.error('Error cargando empresa:', error);
            this.error = error?.error?.message || 'Error al cargar la empresa';
            this.empresa = undefined;
        } finally {
            this.loading = false;
        }
    }

    private async cargarHistorial(usuarioId: number): Promise<void> {
        this.loadingHistorial = true;
        try {
            const response = await this.http
                .get<PaginatedResponse<HistorialItem>>(`${environment.apiUrl}/empresas/${usuarioId}/historial`, {
                    params: { per_page: 50 }
                })
                .toPromise();

            this.historial = response?.data ?? [];
        } catch (error) {
            console.error('Error cargando historial:', error);
            this.historial = [];
        } finally {
            this.loadingHistorial = false;
        }
    }

    volver(): void {
        this.router.navigate(['/admin/empresa']);
    }

    editar(): void {
        this.router.navigate(['/admin/editarEmpresa']);
    }
}
