import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { HeaderEmpresaComponent } from '../shared/header-empresa/header-empresa.component';

type PlanEstado = 'Activo' | 'Inactivo';

interface PlanTarifa {
    id: number;
    code: string;
    nombre: string;
    descripcion: string;
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
    estado: PlanEstado;
    descripcion_corta: string | null;
    sedes_permitidas: number;
    lockers_por_sede: number;
    prioridad_soporte: 'Normal' | 'Prioritario';
    incluye: string[] | null;
    no_incluye: string[] | null;
}

interface PlanActualResponse {
    tarifa_id: number;
}

@Component({
    standalone: true,
    selector: 'app-empresa-tarifas',
    imports: [CommonModule, FormsModule, RouterModule, HeaderEmpresaComponent],
    templateUrl: './tarifaEmpresa.html',
    styleUrls: ['./tarifaEmpresa.scss'],
})
export class EmpresaTarifas implements OnInit {
    private router = inject(Router);
    private http = inject(HttpClient);

    private _planes = signal<PlanTarifa[]>([]);
    loading = signal<boolean>(false);

    // Filtros
    estadoFiltro = signal<'Todos' | PlanEstado>('Activo');
    busqueda = signal<string>('');

    // Plan actual
    private _planActual = signal<PlanTarifa | null>(null);
    planActual = computed(() => this._planActual());

    // Modales
    showConfirmModal = signal<boolean>(false);
    showAlertModal = signal<boolean>(false);
    showSuccessModal = signal<boolean>(false);
    modalTitle = signal<string>('');
    modalMessage = signal<string>('');
    planSeleccionado = signal<PlanTarifa | null>(null);

    async ngOnInit(): Promise<void> {
        await this.cargarTarifas();
        await this.cargarPlanActual();
    }

    // todas las tarifas
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

    // Listado filtrado
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

    // Eventos de filtros
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
        this.estadoFiltro.set('Activo');
    }

    // Plan actual de la empresa
    private async cargarPlanActual(): Promise<void> {
        try {
            const resp = await firstValueFrom(
                this.http.get<any>(
                    `${environment.apiUrl}/empresa/plan-actual`
                )
            );

            const id = resp?.tarifa_id;
            if (!id) {
                this._planActual.set(null);
                return;
            }

            // Esperar a que las tarifas estén cargadas
            if (this._planes().length === 0) {
                await this.cargarTarifas();
            }

            const plan = this._planes().find((p) => p.id === id) ?? null;
            this._planActual.set(plan);
        } catch (error) {
            console.error('Error cargando plan actual de la empresa:', error);
            this._planActual.set(null);
        }
    }

    esPlanActual(plan: PlanTarifa): boolean {
        return this._planActual()?.id === plan.id;
    }

    // Cambiar tarifa
    cambiarTarifa(plan: PlanTarifa): void {
        if (this.loading() || plan.estado !== 'Activo') {
            return;
        }

        if (this.esPlanActual(plan)) {
            this.mostrarAlerta('Información', 'Esta ya es tu tarifa actual');
            return;
        }

        this.planSeleccionado.set(plan);
        this.mostrarConfirmacion(
            'Confirmar cambio de tarifa',
            `¿Estás seguro de que deseas cambiar a la tarifa "${plan.nombre}"?`
        );
    }

    async confirmarCambioTarifa(): Promise<void> {
        const plan = this.planSeleccionado();
        if (!plan) {
            return;
        }

        this.cerrarModales();
        this.loading.set(true);
        
        try {
            await firstValueFrom(
                this.http.post<any>(
                    `${environment.apiUrl}/empresa/cambiar-tarifa`,
                    { tarifa_id: plan.id }
                )
            );

            // Recargar el plan actual
            await this.cargarPlanActual();
            
            this.mostrarExito('Éxito', 'Tarifa actualizada correctamente');
        } catch (error: any) {
            console.error('Error cambiando tarifa:', error);
            this.mostrarAlerta('Error', error?.error?.message || 'Error al cambiar la tarifa');
        } finally {
            this.loading.set(false);
            this.planSeleccionado.set(null);
        }
    }

    // Métodos para mostrar modales
    mostrarConfirmacion(titulo: string, mensaje: string): void {
        this.modalTitle.set(titulo);
        this.modalMessage.set(mensaje);
        this.showConfirmModal.set(true);
    }

    mostrarAlerta(titulo: string, mensaje: string): void {
        this.modalTitle.set(titulo);
        this.modalMessage.set(mensaje);
        this.showAlertModal.set(true);
    }

    mostrarExito(titulo: string, mensaje: string): void {
        this.modalTitle.set(titulo);
        this.modalMessage.set(mensaje);
        this.showSuccessModal.set(true);
    }

    cerrarModales(): void {
        this.showConfirmModal.set(false);
        this.showAlertModal.set(false);
        this.showSuccessModal.set(false);
        this.modalTitle.set('');
        this.modalMessage.set('');
    }

    // Botón Pagar (mantener por compatibilidad, pero ahora usamos cambiarTarifa)
    pagar(plan: PlanTarifa) {
        if (this.loading()) {
            return;
        }
        // Cambiar directamente la tarifa en lugar de ir a pago
        this.cambiarTarifa(plan);
    }

    trackById = (_: number, plan: PlanTarifa) => plan.id;
}
