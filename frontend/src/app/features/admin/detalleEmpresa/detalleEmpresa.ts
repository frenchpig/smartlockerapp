import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
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
    imports: [CommonModule, RouterModule, HeaderAdmin, DatePipe, FormsModule],
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

    // Paginación y filtros del historial
    historialPage = 1;
    historialLastPage = 1;
    historialPerPage = 10;
    historialTotal = 0;
    filtroTipo = '';
    empresaId?: number;

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

    getTiposDisponibles(): Array<{ value: string; label: string }> {
        return [
            { value: '', label: 'Todos los tipos' },
            { value: 'creacion_cuenta', label: 'Inicio' },
            { value: 'reserva_creada', label: 'Reserva' },
            { value: 'reserva_cancelada', label: 'Cancelación' },
            { value: 'reserva_completada', label: 'Completado' },
            { value: 'datos_actualizados', label: 'Actualización' },
            { value: 'locker_asignado', label: 'Asignación' },
            { value: 'locker_liberado', label: 'Liberación' },
            { value: 'estado_cambiado', label: 'Cambio de Estado' }
        ];
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
        this.empresaId = id;
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

    private async cargarHistorial(usuarioId: number, page: number = 1): Promise<void> {
        this.loadingHistorial = true;
        try {
            const params: Record<string, string | number> = {
                page,
                per_page: this.historialPerPage
            };

            if (this.filtroTipo && this.filtroTipo.trim()) {
                params['tipo'] = this.filtroTipo.trim();
            }

            const response = await this.http
                .get<PaginatedResponse<HistorialItem>>(`${environment.apiUrl}/empresas/${usuarioId}/historial`, {
                    params
                })
                .toPromise();

            this.historial = response?.data ?? [];
            this.historialPage = Number(response?.current_page ?? page) || page;
            this.historialLastPage = Number(response?.last_page ?? 1) || 1;
            this.historialTotal = Number(response?.total ?? 0) || 0;
        } catch (error) {
            console.error('Error cargando historial:', error);
            this.historial = [];
            this.historialPage = 1;
            this.historialLastPage = 1;
            this.historialTotal = 0;
        } finally {
            this.loadingHistorial = false;
        }
    }

    aplicarFiltroTipo(): void {
        if (this.empresaId) {
            this.historialPage = 1;
            this.cargarHistorial(this.empresaId, 1);
        }
    }

    anteriorHistorial(): void {
        if (this.historialPage > 1 && this.empresaId) {
            this.cargarHistorial(this.empresaId, this.historialPage - 1);
        }
    }

    siguienteHistorial(): void {
        if (this.historialPage < this.historialLastPage && this.empresaId) {
            this.cargarHistorial(this.empresaId, this.historialPage + 1);
        }
    }

    irAPagina(page: number): void {
        if (this.empresaId && page >= 1 && page <= this.historialLastPage && page !== this.historialPage) {
            this.cargarHistorial(this.empresaId, page);
        }
    }

    getPaginasVisibles(): number[] {
        const paginas: number[] = [];
        const totalPaginas = this.historialLastPage;
        const paginaActual = this.historialPage;
        const maxVisible = 5; // Máximo de botones de página visibles

        if (totalPaginas <= maxVisible) {
            // Si hay pocas páginas, mostrar todas
            for (let i = 1; i <= totalPaginas; i++) {
                paginas.push(i);
            }
        } else {
            // Lógica para mostrar páginas alrededor de la actual
            let inicio = Math.max(1, paginaActual - 2);
            let fin = Math.min(totalPaginas, paginaActual + 2);

            // Ajustar si estamos cerca del inicio
            if (inicio === 1) {
                fin = Math.min(totalPaginas, maxVisible);
            }

            // Ajustar si estamos cerca del fin
            if (fin === totalPaginas) {
                inicio = Math.max(1, totalPaginas - maxVisible + 1);
            }

            for (let i = inicio; i <= fin; i++) {
                paginas.push(i);
            }
        }

        return paginas;
    }

    volver(): void {
        this.router.navigate(['/admin/empresa']);
    }

    editar(): void {
        if (this.empresaId) {
            this.router.navigate(['/admin/editarEmpresa', this.empresaId]);
        }
    }
}
