import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { HeaderEmpresaComponent } from '../shared/header-empresa/header-empresa.component';

type IncidenciaEstado = 'resuelto' | 'pendiente' | 'anulada' | string;
type IncidenciaTipo = 'locker' | 'pedido' | 'otro' | string;

interface Incidencia {
    id: number;
    tipo: IncidenciaTipo;
    problema_tipo: string | null;
    descripcion: string;
    estado: IncidenciaEstado;
    estadoLabel: string;
    fecha: Date;
    locker: string | null;
    ubicacion: string | null;
    reserva: {
        id: number;
        empresa?: { id: number; nombre: string; email: string } | null;
        repartidor?: { id: number; nombre_completo: string; email: string } | null;
        usuario?: { id: number; nombre: string; email: string } | null;
        articulos?: Array<{ id: number; nombre: string; cantidad: number }> | null;
    } | null;
}

interface IncidenciaResponse {
    id: number;
    tipo: string;
    problema_tipo?: string | null;
    descripcion: string;
    estado: string;
    created_at: string;
    locker?: {
        id: number;
        numero: string;
        ubicacion?: {
            nombre: string;
        } | null;
    } | null;
    reserva?: {
        id: number;
        empresa?: { id: number; nombre: string; email: string } | null;
        repartidor?: { id: number; nombre_completo: string; email: string } | null;
        usuario?: { id: number; nombre: string; email: string } | null;
        articulos?: Array<{ id: number; nombre: string; cantidad: number }> | null;
    } | null;
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
    selector: 'app-empresa-incidencias',
    imports: [CommonModule, RouterModule, FormsModule, HeaderEmpresaComponent],
    templateUrl: './incidenciasEmpresa.html',
    styleUrls: ['./incidenciasEmpresa.scss'],
})
export class EmpresaIncidencias implements OnInit {
    private http = inject(HttpClient);

    // Listado de incidencias
    private _incidencias = signal<Incidencia[]>([]);
    incidencias = this._incidencias.asReadonly();

    cargandoListado = signal(false);
    errorMsg = signal('');
    successMsg = signal('');

    // Paginación
    page = 1;
    pageSize = 10;
    lastPage = 1;
    total = 0;

    // Filtros
    filtroEstado = '';
    filtroTipo = '';
    filtroProblema = '';

    // Estados y tipos disponibles para filtros
    estadosDisponibles = [
        { value: '', label: 'Todos' },
        { value: 'pendiente', label: 'Pendiente' },
        { value: 'resuelto', label: 'Resuelta' },
        { value: 'anulada', label: 'Anulada' },
    ];

    tiposDisponibles = [
        { value: '', label: 'Todos' },
        { value: 'pedido', label: 'Pedido' },
    ];

    problemasDisponibles = [
        { value: '', label: 'Todos' },
        { value: 'pedido_incorrecto', label: 'Pedido Incorrecto' },
        { value: 'pedido_dañado', label: 'Pedido Dañado' },
        { value: 'pedido_faltante', label: 'Pedido Faltante' },
        { value: 'pedido_extraviado', label: 'Pedido Extraviado' },
        { value: 'pedido_no_es_el_solicitado', label: 'No es el Pedido Solicitado' },
        { value: 'articulos_faltantes', label: 'Artículos Faltantes' },
        { value: 'articulos_dañados', label: 'Artículos Dañados' },
        { value: 'pedido_retrasado', label: 'Pedido Retrasado' },
        { value: 'otro', label: 'Otro' },
    ];

    async ngOnInit(): Promise<void> {
        await this.cargarIncidencias();
    }

    async cargarIncidencias(page = 1): Promise<void> {
        this.cargandoListado.set(true);
        this.errorMsg.set('');
        this.successMsg.set('');

        try {
            const params: Record<string, string | number> = {
                page,
                per_page: this.pageSize,
            };

            // Agregar filtros si existen
            if (this.filtroEstado) params['estado'] = this.filtroEstado;
            if (this.filtroTipo) params['tipo'] = this.filtroTipo;
            if (this.filtroProblema) params['problema_tipo'] = this.filtroProblema;

            const resp = await firstValueFrom(
                this.http.get<PaginatedResponse<IncidenciaResponse>>(
                    `${environment.apiUrl}/incidencias/empresa/mis-incidencias`,
                    { params }
                )
            );

            const mapped = (resp?.data ?? []).map((inc) => this.mapIncidencia(inc));
            this._incidencias.set(mapped);
            this.page = Number(resp?.current_page ?? page) || 1;
            this.lastPage = Number(resp?.last_page ?? 1) || 1;
            this.total = Number(resp?.total ?? 0) || 0;
        } catch (err) {
            console.error('Error cargando incidencias:', err);
            this.errorMsg.set('No fue posible cargar tus incidencias.');
            this._incidencias.set([]);
        } finally {
            this.cargandoListado.set(false);
        }
    }

    async aplicarFiltros(): Promise<void> {
        await this.cargarIncidencias(1);
    }

    async limpiarFiltros(): Promise<void> {
        this.filtroEstado = '';
        this.filtroTipo = '';
        this.filtroProblema = '';
        await this.cargarIncidencias(1);
    }

    async paginaAnterior(): Promise<void> {
        if (this.page > 1) {
            await this.cargarIncidencias(this.page - 1);
        }
    }

    async paginaSiguiente(): Promise<void> {
        if (this.page < this.lastPage) {
            await this.cargarIncidencias(this.page + 1);
        }
    }

    totalPages(): number {
        return this.lastPage;
    }

    async actualizarEstado(incidencia: Incidencia, nuevoEstado: 'resuelto' | 'anulada'): Promise<void> {
        if (!confirm(`¿Estás seguro de que deseas ${nuevoEstado === 'resuelto' ? 'marcar como resuelta' : 'anular'} esta incidencia?`)) {
            return;
        }

        this.errorMsg.set('');
        this.successMsg.set('');

        try {
            await firstValueFrom(
                this.http.patch<IncidenciaResponse>(
                    `${environment.apiUrl}/incidencias/${incidencia.id}`,
                    { estado: nuevoEstado }
                )
            );

            this.successMsg.set(`Incidencia ${nuevoEstado === 'resuelto' ? 'marcada como resuelta' : 'anulada'} exitosamente.`);
            
            // Recargar incidencias
            await this.cargarIncidencias(this.page);
        } catch (err: any) {
            console.error('Error actualizando incidencia:', err);
            this.errorMsg.set(
                err?.error?.message || 'No fue posible actualizar la incidencia. Intenta nuevamente.'
            );
        }
    }

    private mapIncidencia(raw: IncidenciaResponse): Incidencia {
        const estadoLabels: Record<string, string> = {
            'resuelto': 'Resuelta',
            'pendiente': 'Pendiente',
            'anulada': 'Anulada',
        };

        const tipoLabels: Record<string, string> = {
            'locker': 'Locker',
            'pedido': 'Pedido',
            'otro': 'Otro',
        };

        const problemaLabels: Record<string, string> = {
            'pedido_incorrecto': 'Pedido Incorrecto',
            'pedido_dañado': 'Pedido Dañado',
            'pedido_faltante': 'Pedido Faltante',
            'pedido_extraviado': 'Pedido Extraviado',
            'pedido_no_es_el_solicitado': 'No es el Pedido Solicitado',
            'articulos_faltantes': 'Artículos Faltantes',
            'articulos_dañados': 'Artículos Dañados',
            'pedido_retrasado': 'Pedido Retrasado',
            'no_se_abre': 'No se Abre',
            'no_se_cierra': 'No se Cierra',
            'dañado': 'Dañado',
            'bloqueado': 'Bloqueado',
            'sin_energia': 'Sin Energía',
            'codigo_no_funciona': 'Código no Funciona',
            'sensor_defectuoso': 'Sensor Defectuoso',
            'problema_general': 'Problema General',
            'otro': 'Otro',
        };

        return {
            id: raw.id,
            tipo: (raw.tipo as IncidenciaTipo) || 'otro',
            problema_tipo: raw.problema_tipo 
                ? (problemaLabels[raw.problema_tipo] || raw.problema_tipo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
                : null,
            descripcion: raw.descripcion || '',
            estado: (raw.estado as IncidenciaEstado) || 'pendiente',
            estadoLabel: estadoLabels[raw.estado] || raw.estado,
            fecha: raw.created_at ? new Date(raw.created_at) : new Date(),
            locker: raw.locker?.numero ?? null,
            ubicacion: raw.locker?.ubicacion?.nombre ?? null,
            reserva: raw.reserva ? {
                id: raw.reserva.id,
                empresa: raw.reserva.empresa ?? null,
                repartidor: raw.reserva.repartidor ?? null,
                usuario: raw.reserva.usuario ?? null,
                articulos: raw.reserva.articulos ?? null,
            } : null,
        };
    }

    // Utilidades
    trackById = (_: number, inc: Incidencia) => inc.id;
}
