import { Component, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HeaderAdmin } from '../shared/header-admin/headerAdmin';

type PlanEstado = 'Activo' | 'Inactivo';

interface PlanTarifa {
    id: number;
    code: 'smart-basic' | 'smart-pro' | 'smart-max' | string;
    nombre: string;
    descripcion: string;
    precio: number;
    periodicidad: 'mensual' | 'anual';
    maxSedes: number | 'ilimitado';
    maxLockersPorSede: number | 'ilimitado';
    incluye: string[];
    noIncluye: string[];
    estado: PlanEstado;
}

@Component({
    standalone: true,
    selector: 'app-admin-tarifas',
    imports: [CommonModule, FormsModule, RouterModule, HeaderAdmin],
    templateUrl: './tarifasAdmin.html',
    styleUrls: ['./tarifasAdmin.scss'],
})
export class AdminTarifas {
    private router = inject(Router);

    // Mock
    private _planes = signal<PlanTarifa[]>([
        {
            id: 1,
            code: 'smart-basic',
            nombre: 'Smart Basic',
            descripcion: 'Recomendado para empresas pequeñas',
            precio: 29000,
            periodicidad: 'mensual',
            maxSedes: 2,
            maxLockersPorSede: 10,
            incluye: [
                'Hasta 2 sedes',
                'Soporte en horario laboral',
                'Reportes básicos',
            ],
            noIncluye: [
                'Sedes extra',
                'Repostes avanzados',
            ],
            estado: 'Activo',
        },
        {
            id: 2,
            code: 'smart-pro',
            nombre: 'Smart Pro',
            descripcion: 'Para sedes dentro del metro',
            precio: 49000,
            periodicidad: 'mensual',
            maxSedes: 6,
            maxLockersPorSede: 20,
            incluye: [
                'Hasta 6 sedes',
                'Reportes avanzados',
                'Prioridad en soporte',
            ],
            noIncluye: [
                'Sedes ilimitadas',
            ],
            estado: 'Activo',
        },
        {
            id: 3,
            code: 'smart-max',
            nombre: 'Smart Max',
            descripcion: 'Cobertura completa',
            precio: 69000,
            periodicidad: 'mensual',
            maxSedes: 'ilimitado',
            maxLockersPorSede: 'ilimitado',
            incluye: [
                'Sedes ilimitadas',
                'Integraciones externas',
                'Reportes diarios',
                'Soporte extendido',
            ],
            noIncluye: [],
            estado: 'Inactivo',
        },
    ]);

    estadoFiltro = signal<'Todos' | PlanEstado>('Todos');
    busqueda = signal<string>('');

    planesFiltrados = computed(() => {
        const estado = this.estadoFiltro();
        const q = this.busqueda().toLowerCase().trim();

        return this._planes().filter((p) => {
            const matchEstado = estado === 'Todos' ? true : p.estado === estado;
            const matchTexto =
                p.nombre.toLowerCase().includes(q) ||
                p.descripcion.toLowerCase().includes(q) ||
                p.code.toLowerCase().includes(q);
            return matchEstado && matchTexto;
        });
    });

    kpiTotal = computed(() => this._planes().length);
    kpiActivos = computed(
        () => this._planes().filter((p) => p.estado === 'Activo').length
    );
    kpiInactivos = computed(
        () => this._planes().filter((p) => p.estado === 'Inactivo').length
    );

    onBuscar(event: Event) {
        const value = (event.target as HTMLInputElement).value;
        this.busqueda.set(value);
    }

    onChangeEstado(event: Event) {
        const value = (event.target as HTMLSelectElement).value as
            | 'Todos'
            | PlanEstado;
        this.estadoFiltro.set(value);
    }

    resetFiltros() {
        this.busqueda.set('');
        this.estadoFiltro.set('Todos');
    }

    activar(plan: PlanTarifa) {
        this._planes.update((list) =>
            list.map((p) =>
                p.id === plan.id ? { ...p, estado: 'Activo' } : p
            )
        );
    }

    desactivar(plan: PlanTarifa) {
        this._planes.update((list) =>
            list.map((p) =>
                p.id === plan.id ? { ...p, estado: 'Inactivo' } : p
            )
        );
    }

    editar(plan: PlanTarifa) {
        this.router.navigate(['/admin/editarTarifas']);
    }

    nuevaTarifa() {
        this.router.navigate(['/admin/crearTarifas']);
    }

    formatoPrecio(valor: number) {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            maximumFractionDigits: 0,
        }).format(valor);
    }

    trackById = (_: number, plan: PlanTarifa) => plan.id;
}
