import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe, Location } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { HeaderEmpresaComponent } from '../shared/header-empresa/header-empresa.component';

type IncidenciaEstado = 'resuelto' | 'pendiente' | 'anulada' | string;
type IncidenciaTipo = 'locker' | 'pedido' | 'otro' | string;

interface IncidenciaDetalle {
    id: number;
    tipo: IncidenciaTipo;
    problema_tipo: string | null;
    problema_tipo_label: string | null;
    descripcion: string;
    estado: IncidenciaEstado;
    estadoLabel: string;
    fecha: Date;
    fechaActualizacion: Date | null;
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
    } | null;
}

@Component({
    standalone: true,
    selector: 'app-empresa-incidencia-detalle',
    imports: [CommonModule, RouterModule, DatePipe, HeaderEmpresaComponent],
    templateUrl: './incidencia-detalle.html',
    styleUrls: ['./incidencia-detalle.scss'],
})
export class EmpresaIncidenciaDetalle implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private http = inject(HttpClient);
    private location = inject(Location);

    id!: number;
    incidencia?: IncidenciaDetalle;
    cargando = true;
    error = '';

    ngOnInit(): void {
        this.id = Number(this.route.snapshot.paramMap.get('id'));
        void this.cargarIncidencia();
    }

    volver() {
        this.location.back();
    }

    async cargarIncidencia() {
        this.cargando = true;
        this.error = '';

        try {
            const res = await firstValueFrom(
                this.http.get<IncidenciaResponse>(`${environment.apiUrl}/incidencias/${this.id}`)
            );

            if (!res) {
                this.error = 'No se pudo cargar la incidencia';
                return;
            }

            this.incidencia = this.mapIncidencia(res);
        } catch (err: any) {
            console.error('Error al cargar incidencia', err);
            this.error = err?.error?.message || 'No se pudo cargar la incidencia. Intenta nuevamente.';
        } finally {
            this.cargando = false;
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

        return {
            id: raw.id,
            tipo: (raw.tipo as IncidenciaTipo) || 'otro',
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
            ubicacion: raw.locker?.ubicacion?.nombre ?? null,
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
            } : null,
        };
    }

    tieneArticulosConSku(): boolean {
        return this.incidencia?.reserva?.articulos?.some(art => !!art.sku) ?? false;
    }

    tieneArticulosConPeso(): boolean {
        return this.incidencia?.reserva?.articulos?.some(art => !!art.peso) ?? false;
    }
}

