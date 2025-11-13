import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { HeaderAdmin } from '../shared/header-admin/headerAdmin';

type IncidenciaEstado = 'Abierta' | 'Iniciada' | 'Cerrada';
type IncidenciaPrioridad = 'Baja' | 'Media' | 'Alta' | 'Crítica';
type IncidenciaOrigen = 'Locker' | 'Empresa' | 'Sistema' | 'Cliente';
type UsuarioTipo = 'Empresa' | 'Cliente';
type MenuTipo = 'prioridad' | 'estado' | '';

interface Incidencia {
    id: number;
    titulo: string;
    fecha: string;
    origen: IncidenciaOrigen;
    locker: string;
    sede: string;
    empresa: string;
    prioridad: IncidenciaPrioridad;
    estado: IncidenciaEstado;
    asignadoA?: string;
    descripcion?: string;
    tipoUsuario?: UsuarioTipo;
}

@Component({
    standalone: true,
    selector: 'app-admin-incidencia-detalle',
    imports: [CommonModule, FormsModule, RouterModule, HeaderAdmin],
    templateUrl: './adminIncidenciaDetalle.html',
    styleUrls: ['./adminIncidenciaDetalle.scss'],
})
export class AdminIncidenciaDetalle implements OnInit {
    private router = inject(Router);
    private route = inject(ActivatedRoute);

    PRIORIDADES: IncidenciaPrioridad[] = ['Baja', 'Media', 'Alta', 'Crítica'];
    ESTADOS: IncidenciaEstado[] = ['Abierta', 'Iniciada', 'Cerrada'];
    ASIGNABLES = ['Sin asignar', 'Soporte 1', 'Soporte 2', 'Técnico campo', 'Admin Finanzas'];

    incidencia: Incidencia | null = null;
    loading = true;

    menu = { abierto: false, tipo: '' as MenuTipo, id: 0 };

    ngOnInit(): void {
        const idParam = this.route.snapshot.paramMap.get('id');
        const id = idParam ? Number(idParam) : NaN;

        // TODO: reemplazar por llamada al backend
        const MOCK: Incidencia[] = [
            {
                id: 101,
                titulo: 'Locker no abre',
                fecha: '2025-11-10T10:15:00',
                origen: 'Locker',
                locker: 'LK-12',
                sede: 'Metro Ñuñoa',
                empresa: 'Acme S.A.',
                prioridad: 'Alta',
                estado: 'Abierta',
                asignadoA: 'Soporte 1',
                descripcion: 'Usuario reporta que el locker 12 no abre con el código entregado.',
                tipoUsuario: 'Cliente',
            },
            {
                id: 102,
                titulo: 'Cobro duplicado',
                fecha: '2025-11-10T08:43:00',
                origen: 'Empresa',
                locker: '—',
                sede: '—',
                empresa: 'Smart Cosmetics',
                prioridad: 'Media',
                estado: 'Iniciada',
                asignadoA: 'Admin Finanzas',
                descripcion: 'Empresa indica cargos duplicados en el pago del plan mensual.',
                tipoUsuario: 'Empresa',
            },
            {
                id: 103,
                titulo: 'Sensor de puerta',
                fecha: '2025-11-09T17:30:00',
                origen: 'Sistema',
                locker: 'LK-07',
                sede: 'Mall Vivo',
                empresa: '—',
                prioridad: 'Crítica',
                estado: 'Abierta',
                asignadoA: 'Técnico campo',
                descripcion: 'Alarma recurrente en sensor de puerta, posible daño de hardware.',
                tipoUsuario: 'Empresa',
            },
            {
                id: 104,
                titulo: 'Cliente no encuentra locker',
                fecha: '2025-11-09T12:05:00',
                origen: 'Cliente',
                locker: 'LK-02',
                sede: 'Metro Ñuble',
                empresa: '—',
                prioridad: 'Baja',
                estado: 'Cerrada',
                asignadoA: 'Sin asignar',
                descripcion: 'Cliente no encontraba la ubicación del locker, se le brindó apoyo remoto.',
                tipoUsuario: 'Cliente',
            },
        ];

        this.incidencia = MOCK.find((i) => i.id === id) ?? null;
        this.loading = false;

        if (!this.incidencia) {
            this.router.navigate(['/admin/incidencias']);
        }
    }

    volver() {
        this.router.navigate(['/admin/incidencias']);
    }


    abrirMenu(tipo: MenuTipo, incidencia: Incidencia) {
        if (this.menu.abierto && this.menu.tipo === tipo && this.menu.id === incidencia.id) {
            this.menu.abierto = false;
            return;
        }
        this.menu = { abierto: true, tipo, id: incidencia.id };
    }

    @HostListener('document:click', ['$event'])
    cerrarMenusSiClickAfuera(ev: MouseEvent) {
        const el = ev.target as HTMLElement;
        if (!el.closest('.chip-wrapper')) this.menu.abierto = false;
    }

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

    cambiarPrioridad(nueva: IncidenciaPrioridad) {
        if (!this.incidencia) return;
        this.incidencia.prioridad = nueva;
        this.menu.abierto = false;
    }

    cambiarEstado(nuevo: IncidenciaEstado) {
        if (!this.incidencia) return;
        this.incidencia.estado = nuevo;
        this.menu.abierto = false;
    }

    cambiarAsignado(nuevo: string) {
        if (!this.incidencia) return;
        this.incidencia.asignadoA = nuevo === 'Sin asignar' ? undefined : nuevo;
    }

    cambiarTipoUsuario(tipo: UsuarioTipo) {
        if (!this.incidencia) return;
        this.incidencia.tipoUsuario = tipo;
    }
}
