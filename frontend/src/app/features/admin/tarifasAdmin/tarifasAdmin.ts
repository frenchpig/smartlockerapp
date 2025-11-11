import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { HeaderAdmin } from '../shared/header-admin/headerAdmin';
import { environment } from '../../../../environments/environment';

type PlanEstado = 'Activo' | 'Inactivo';

interface PlanTarifa {
    id: number;
    code: string;
    nombre: string;
    descripcion: string;
    // precio: number;
    periodicidad: 'mensual' | 'anual';
    maxSedes: number | 'ilimitado';
    maxLockersPorSede: number | 'ilimitado';
    incluye: string[];
    noIncluye: string[];
    estado: PlanEstado;
}

interface TarifaResponse {
    id: number;
    nombre_publico: string;
    codigo_interno: string;
    // precio_mensual: number;
    estado: PlanEstado;
    descripcion_corta: string | null;
    sedes_permitidas: number;
    lockers_por_sede: number;
    prioridad_soporte: 'Normal' | 'Prioritario';
    incluye: string[] | null;
    no_incluye: string[] | null;
}

@Component({
    standalone: true,
    selector: 'app-admin-tarifas',
    imports: [CommonModule, FormsModule, RouterModule, HeaderAdmin],
    templateUrl: './tarifasAdmin.html',
    styleUrls: ['./tarifasAdmin.scss'],
})
export class AdminTarifas implements OnInit {
    private router = inject(Router);
    private http = inject(HttpClient);

    private _planes = signal<PlanTarifa[]>([]);
    private loading = signal<boolean>(false);

    estadoFiltro = signal<'Todos' | PlanEstado>('Todos');
    busqueda = signal<string>('');

    async ngOnInit(): Promise<void> {
        await this.cargarTarifas();
    }

    private async cargarTarifas(): Promise<void> {
        this.loading.set(true);
        try {
            const tarifas = await firstValueFrom(
                this.http.get<TarifaResponse[]>(`${environment.apiUrl}/tarifas`)
            );

            const mapped = (tarifas ?? []).map((t) => this.mapTarifa(t));
            this._planes.set(mapped);
        } catch (error) {
            console.error('Error cargando tarifas:', error);
            this._planes.set([]);
        } finally {
            this.loading.set(false);
        }
    }

    private mapTarifa(tarifa: TarifaResponse): PlanTarifa {
        return {
            id: tarifa.id,
            code: tarifa.codigo_interno,
            nombre: tarifa.nombre_publico,
            descripcion: tarifa.descripcion_corta ?? '—',
            // precio: tarifa.precio_mensual,
            periodicidad: 'mensual',
            maxSedes: this.transformCantidad(tarifa.sedes_permitidas),
            maxLockersPorSede: this.transformCantidad(tarifa.lockers_por_sede),
            incluye: tarifa.incluye ?? [],
            noIncluye: tarifa.no_incluye ?? [],
            estado: tarifa.estado,
        };
    }

    private transformCantidad(value: number): number | 'ilimitado' {
        return value === 0 ? 'ilimitado' : value;
    }

    planesFiltrados = computed(() => {
        const estado = this.estadoFiltro();
        const q = this.busqueda().toLowerCase().trim();
        const planes = this._planes();

        return planes.filter((p) => {
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

    async activar(plan: PlanTarifa) {
        await this.actualizarEstado(plan, 'Activo');
    }

    async desactivar(plan: PlanTarifa) {
        await this.actualizarEstado(plan, 'Inactivo');
    }

    private async actualizarEstado(plan: PlanTarifa, estado: PlanEstado) {
        if (this.loading()) {
            return;
        }

        this.loading.set(true);
        try {
            const tarifaActualizada = await firstValueFrom(
                this.http.patch<TarifaResponse>(
                    `${environment.apiUrl}/tarifas/${plan.id}`,
                    { estado }
                )
            );

            const planActualizado = this.mapTarifa(tarifaActualizada);
            this._planes.update((list) =>
                list.map((p) => (p.id === plan.id ? planActualizado : p))
            );
        } catch (error) {
            console.error('Error actualizando estado de la tarifa:', error);
            alert('No fue posible actualizar el estado de la tarifa.');
        } finally {
            this.loading.set(false);
        }
    }

    editar(plan: PlanTarifa) {
        this.router.navigate(['/admin/editarTarifas', plan.id]);
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
