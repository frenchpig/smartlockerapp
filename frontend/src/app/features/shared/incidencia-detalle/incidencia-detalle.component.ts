import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';

type IncidenciaEstado = 'resuelto' | 'pendiente' | 'anulada' | string;
type IncidenciaTipo = 'locker' | 'pedido' | 'otro' | string;

export interface IncidenciaDetalle {
    id: number;
    tipo: IncidenciaTipo;
    problema_tipo: string | null;
    problema_tipo_label: string | null;
    descripcion: string;
    estado: IncidenciaEstado;
    estadoLabel: string;
    fecha: Date;
    fechaActualizacion: Date | null;
    comentario_cierre?: string | null;
    disponible_para_cerrar?: boolean;
    tecnico?: { id: number; nombre: string; email: string } | null;
    locker: {
        id: number;
        numero: string;
    } | null;
    ubicacion: string | null;
    usuario: {
        id: number;
        nombre: string;
        email: string;
    } | null;
    reserva: {
        id: number;
        empresa?: { id: number; nombre: string; email: string } | null;
        repartidor?: { 
            id: number; 
            nombre_completo?: string;
            nombre?: string;
            apellido?: string;
            email: string; 
            telefono?: string;
        } | null;
        usuario?: { id: number; nombre: string; email: string } | null;
        articulos?: Array<{ id: number; nombre: string; cantidad: number; descripcion?: string; sku?: string; peso?: number }> | null;
        fecha_reserva?: string;
        estado?: string;
        logistica_estado?: string;
        ubicacion_destino?: { id: number; nombre: string } | null;
    } | null;
    puedeGestionar?: boolean; // Para admin: solo true si es tipo 'locker'
    tieneSoporte24_7?: boolean; // Si la empresa tiene plan con soporte 24/7
    mantenimiento_correctivo?: {
        id: number;
        estado: string;
        descripcion: string;
        comentarios?: string | null;
        fecha_mantenimiento: string;
        tipo: string;
        usuario?: {
            id: number;
            nombre: string;
            apellido?: string;
            email: string;
        } | null;
    } | null;
}

interface IncidenciaResponse {
    id: number;
    tipo: string;
    problema_tipo?: string | null;
    descripcion: string;
    estado: string;
    created_at: string;
    updated_at: string;
    comentario_cierre?: string | null;
    disponible_para_cerrar?: boolean;
    tecnico?: { id: number; nombre: string; email: string } | null;
    tecnico_id?: number | null;
    locker?: {
        id: number;
        numero: string;
        ubicacion?: {
            nombre: string;
        } | null;
    } | null;
    usuario?: {
        id: number;
        nombre: string;
        email: string;
    } | null;
    reserva?: {
        id: number;
        empresa?: { id: number; nombre: string; email: string } | null;
        repartidor?: { 
            id: number; 
            nombre_completo?: string;
            nombre?: string;
            apellido?: string;
            email: string; 
            telefono?: string;
        } | null;
        usuario?: { id: number; nombre: string; email: string } | null;
        articulos?: Array<{ id: number; nombre: string; cantidad: number; descripcion?: string; sku?: string; peso?: number }> | null;
        fecha_reserva?: string;
        estado?: string;
        logistica_estado?: string;
        ubicacion_destino?: { id: number; nombre: string } | null;
    } | null;
    empresa_tiene_soporte_24_7?: boolean;
    mantenimiento_correctivo?: {
        id: number;
        estado: string;
        descripcion: string;
        comentarios?: string | null;
        fecha_mantenimiento: string;
        tipo: string;
        usuario?: {
            id: number;
            nombre: string;
            apellido?: string;
            email: string;
        } | null;
    } | null;
}

@Component({
    standalone: true,
    selector: 'app-incidencia-detalle',
    imports: [CommonModule, RouterModule, DatePipe, FormsModule],
    templateUrl: './incidencia-detalle.component.html',
    styleUrls: ['./incidencia-detalle.component.scss'],
})
export class IncidenciaDetalleComponent implements OnInit {
    private http = inject(HttpClient);

    @Input() incidenciaId!: number;
    @Input() mostrarAcciones: boolean = false; // Para mostrar botones de acción (admin)
    @Input() rutaVolver: string = ''; // Ruta para el botón volver

    incidencia = signal<IncidenciaDetalle | null>(null);
    cargando = signal(true);
    error = signal('');
    successMsg = signal('');

    // Modal de confirmación
    mostrarModalConfirmacion = signal(false);
    nuevoEstadoSeleccionado: 'resuelto' | 'pendiente' | 'anulada' | null = null;
    comentarioCierre = signal('');

    // Modal de derivar a técnico
    mostrarModalDerivar = signal(false);
    tecnicos: Array<{ id: number; nombre: string; apellido: string; email: string }> = [];
    tecnicoSeleccionado: number | null = null;
    fechaMantenimiento: string = '';
    descripcionMantenimiento: string = '';
    derivando = signal(false);

    async ngOnInit(): Promise<void> {
        if (!this.incidenciaId) {
            this.error.set('ID de incidencia no proporcionado.');
            this.cargando.set(false);
            return;
        }
        await Promise.all([
            this.cargarIncidencia(),
            this.cargarTecnicos()
        ]);
    }

    private async cargarTecnicos(): Promise<void> {
        try {
            const response: any = await firstValueFrom(
                this.http.get(`${environment.apiUrl}/tecnicos`, { params: { per_page: 1000 } })
            );
            this.tecnicos = (response?.data || response || []).map((t: any) => ({
                id: t.id,
                nombre: t.nombre || '',
                apellido: t.apellido || '',
                email: t.email || ''
            }));
        } catch (error) {
            console.error('Error cargando técnicos:', error);
        }
    }

    async cargarIncidencia(): Promise<void> {
        this.cargando.set(true);
        this.error.set('');

        try {
            const res = await firstValueFrom(
                this.http.get<IncidenciaResponse>(`${environment.apiUrl}/incidencias/${this.incidenciaId}`)
            );

            if (!res) {
                this.error.set('No se pudo cargar la incidencia');
                return;
            }

            this.incidencia.set(this.mapIncidencia(res));
        } catch (err: any) {
            console.error('Error al cargar incidencia', err);
            this.error.set(err?.error?.message || 'No se pudo cargar la incidencia. Intenta nuevamente.');
        } finally {
            this.cargando.set(false);
        }
    }

    private mapIncidencia(raw: IncidenciaResponse): IncidenciaDetalle {
        const estadoLabels: Record<string, string> = {
            'resuelto': 'Resuelta',
            'pendiente': 'Pendiente',
            'anulada': 'Anulada',
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

        const tipo = (raw.tipo as IncidenciaTipo) || 'otro';
        const puedeGestionar = tipo === 'locker'; // Solo admin puede gestionar lockers

        return {
            id: raw.id,
            tipo,
            problema_tipo: raw.problema_tipo ?? null,
            problema_tipo_label: raw.problema_tipo 
                ? (problemaLabels[raw.problema_tipo] || raw.problema_tipo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
                : null,
            descripcion: raw.descripcion || '',
            estado: (raw.estado as IncidenciaEstado) || 'pendiente',
            estadoLabel: estadoLabels[raw.estado] || raw.estado,
            fecha: raw.created_at ? new Date(raw.created_at) : new Date(),
            fechaActualizacion: raw.updated_at ? new Date(raw.updated_at) : null,
            locker: raw.locker ? {
                id: raw.locker.id,
                numero: raw.locker.numero,
            } : null,
            ubicacion: raw.locker?.ubicacion?.nombre ?? raw.reserva?.ubicacion_destino?.nombre ?? null,
            usuario: raw.usuario ? {
                id: raw.usuario.id,
                nombre: raw.usuario.nombre,
                email: raw.usuario.email,
            } : null,
            reserva: raw.reserva ? {
                id: raw.reserva.id,
                empresa: raw.reserva.empresa ?? null,
                repartidor: raw.reserva.repartidor ? {
                    id: raw.reserva.repartidor.id,
                    nombre_completo: raw.reserva.repartidor.nombre_completo 
                        || (raw.reserva.repartidor.nombre && raw.reserva.repartidor.apellido 
                            ? `${raw.reserva.repartidor.nombre} ${raw.reserva.repartidor.apellido}`.trim()
                            : raw.reserva.repartidor.nombre || 'Sin nombre'),
                    email: raw.reserva.repartidor.email,
                    telefono: raw.reserva.repartidor.telefono,
                } : null,
                usuario: raw.reserva.usuario ?? null,
                articulos: raw.reserva.articulos ?? null,
                fecha_reserva: raw.reserva.fecha_reserva,
                estado: raw.reserva.estado,
                logistica_estado: raw.reserva.logistica_estado,
                ubicacion_destino: raw.reserva.ubicacion_destino ? {
                    id: raw.reserva.ubicacion_destino.id,
                    nombre: raw.reserva.ubicacion_destino.nombre,
                } : null,
            } : null,
            puedeGestionar,
            tieneSoporte24_7: raw.empresa_tiene_soporte_24_7 ?? false,
            comentario_cierre: raw.comentario_cierre ?? null,
            disponible_para_cerrar: raw.disponible_para_cerrar ?? false,
            tecnico: raw.tecnico ?? null,
            mantenimiento_correctivo: raw.mantenimiento_correctivo ?? null,
        };
    }

    tieneArticulosConSku(): boolean {
        return this.incidencia()?.reserva?.articulos?.some(art => !!art.sku) ?? false;
    }

    tieneArticulosConPeso(): boolean {
        return this.incidencia()?.reserva?.articulos?.some(art => !!art.peso) ?? false;
    }

    abrirModalConfirmacion(nuevoEstado: 'resuelto' | 'pendiente' | 'anulada'): void {
        const incidencia = this.incidencia();
        if (!incidencia || !incidencia.puedeGestionar) {
            this.error.set('Solo puedes gestionar incidencias de tipo Locker.');
            return;
        }

        this.nuevoEstadoSeleccionado = nuevoEstado;
        this.mostrarModalConfirmacion.set(true);
    }

    cerrarModalConfirmacion(): void {
        this.mostrarModalConfirmacion.set(false);
        this.nuevoEstadoSeleccionado = null;
        this.comentarioCierre.set('');
    }

    async confirmarCambioEstado(): Promise<void> {
        const incidencia = this.incidencia();
        if (!incidencia || !this.nuevoEstadoSeleccionado) {
            return;
        }

        const nuevoEstado = this.nuevoEstadoSeleccionado;

        this.error.set('');
        this.successMsg.set('');

        try {
            const payload: any = { estado: nuevoEstado };
            
            // Si se está resolviendo o anulando, incluir comentario de cierre si existe
            if ((nuevoEstado === 'resuelto' || nuevoEstado === 'anulada') && this.comentarioCierre().trim()) {
                payload.comentario_cierre = this.comentarioCierre().trim();
            }

            await firstValueFrom(
                this.http.patch<IncidenciaResponse>(
                    `${environment.apiUrl}/incidencias/${incidencia.id}`,
                    payload
                )
            );

            this.successMsg.set(`Incidencia ${nuevoEstado === 'resuelto' ? 'marcada como resuelta' : nuevoEstado === 'anulada' ? 'anulada' : 'marcada como pendiente'} exitosamente.`);
            
            // Cerrar modal
            this.cerrarModalConfirmacion();
            
            // Recargar incidencia
            await this.cargarIncidencia();
        } catch (err: any) {
            console.error('Error actualizando incidencia:', err);
            this.error.set(
                err?.error?.message || 'No fue posible actualizar la incidencia. Intenta nuevamente.'
            );
        }
    }

    getEstadoLabel(estado: 'resuelto' | 'pendiente' | 'anulada' | null): string {
        if (!estado) return '';
        if (estado === 'resuelto') return 'Resuelta';
        if (estado === 'anulada') return 'Anulada';
        return 'Pendiente';
    }

    getEstadoMantenimientoBadge(estado: string): string {
        switch (estado) {
            case 'resuelta': return 'bg-success';
            case 'pendiente': return 'bg-warning';
            case 'cancelado': return 'bg-danger';
            default: return 'bg-secondary';
        }
    }

    getEstadoMantenimientoLabel(estado: string): string {
        switch (estado) {
            case 'resuelta': return 'Resuelta';
            case 'pendiente': return 'Pendiente';
            case 'cancelado': return 'Cancelado';
            default: return estado;
        }
    }

    abrirModalDerivar(): void {
        const incidencia = this.incidencia();
        if (!incidencia || incidencia.tipo !== 'locker' || !incidencia.locker) {
            this.error.set('Solo las incidencias de locker pueden derivarse a técnico');
            return;
        }

        // Establecer fecha por defecto (hoy)
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        this.fechaMantenimiento = hoy.toISOString().split('T')[0];
        
        // Establecer descripción por defecto
        this.descripcionMantenimiento = `Mantenimiento correctivo derivado de incidencia #${incidencia.id}: ${incidencia.descripcion}`;
        
        this.tecnicoSeleccionado = null;
        this.mostrarModalDerivar.set(true);
    }

    cerrarModalDerivar(): void {
        this.mostrarModalDerivar.set(false);
        this.tecnicoSeleccionado = null;
        this.fechaMantenimiento = '';
        this.descripcionMantenimiento = '';
    }

    async derivarATecnico(): Promise<void> {
        if (!this.tecnicoSeleccionado) {
            this.error.set('Debes seleccionar un técnico');
            return;
        }

        const incidencia = this.incidencia();
        if (!incidencia) return;

        this.derivando.set(true);
        this.error.set('');
        this.successMsg.set('');

        try {
            const payload: any = {
                tecnico_id: this.tecnicoSeleccionado
            };

            if (this.fechaMantenimiento) {
                payload.fecha_mantenimiento = this.fechaMantenimiento;
            }

            if (this.descripcionMantenimiento.trim()) {
                payload.descripcion_mantenimiento = this.descripcionMantenimiento.trim();
            }

            await firstValueFrom(
                this.http.post(
                    `${environment.apiUrl}/incidencias/${incidencia.id}/derivar-tecnico`,
                    payload
                )
            );

            this.successMsg.set('Incidencia derivada a técnico y mantenimiento correctivo creado exitosamente.');
            this.cerrarModalDerivar();
            await this.cargarIncidencia();
        } catch (err: any) {
            console.error('Error derivando incidencia:', err);
            this.error.set(
                err?.error?.message || 'No fue posible derivar la incidencia. Intenta nuevamente.'
            );
        } finally {
            this.derivando.set(false);
        }
    }
}

