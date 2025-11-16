import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { HeaderEmpresaComponent } from '../shared/header-empresa/header-empresa.component';

type IncidenciaEstado = 'Abierta' | 'En progreso' | 'Resuelta' | 'Cerrada' | string;
// type IncidenciaPrioridad = 'Baja' | 'Media' | 'Alta' | 'Crítica' | string;
type IncidenciaTipo = 'Locker' | 'Sede' | 'App' | 'Pago' | 'Otro' | string;

interface Incidencia {
    id: number;
    titulo: string;
    descripcion: string | null;
    origen: string | null;
    tipo: IncidenciaTipo | null;
    locker: string | null;
    sede: string | null;
    empresa: string | null;
    // prioridad: IncidenciaPrioridad;
    estado: IncidenciaEstado;
    fecha: Date;
}

interface IncidenciaResponse {
    id: number;
    titulo: string;
    descripcion?: string | null;
    origen?: string | null;
    tipo?: string | null;
    locker?: string | null;
    sede?: string | null;
    empresa?: string | null;
    prioridad?: string | null;
    estado?: string | null;
    created_at?: string;
}

@Component({
    standalone: true,
    selector: 'app-empresa-incidencias',
    imports: [CommonModule, RouterModule, ReactiveFormsModule, HeaderEmpresaComponent],
    templateUrl: './incidenciasEmpresa.html',
    styleUrls: ['./incidenciasEmpresa.scss'],
})
export class EmpresaIncidencias implements OnInit {
    private http = inject(HttpClient);
    private fb = inject(FormBuilder);

    // Listado de incidencias
    private _incidencias = signal<Incidencia[]>([]);
    incidencias = this._incidencias.asReadonly();

    mostrarFormulario = signal(false);
    cargandoEnvio = signal(false);
    cargandoListado = signal(false);
    errorMsg = signal('');

    incidenciaForm: FormGroup;

    constructor() {
        this.incidenciaForm = this.fb.group({
            titulo: ['', [Validators.required, Validators.maxLength(255)]],
            tipo: ['Locker', [Validators.required]], // nuevo campo
            locker: [''],
            sede: [''],
            descripcion: ['', [Validators.required, Validators.minLength(5)]],
        });
    }

    async ngOnInit(): Promise<void> {
        await this.cargarIncidencias();
    }

    private async cargarIncidencias(): Promise<void> {
        this.cargandoListado.set(true);
        this.errorMsg.set('');

        try {
            const resp = await firstValueFrom(
                this.http.get<IncidenciaResponse[]>(`${environment.apiUrl}/incidencias`)
            );

            const mapped = (resp ?? []).map((inc) => this.mapIncidencia(inc));
            this._incidencias.set(mapped);
        } catch (err) {
            console.error('Error cargando incidencias:', err);
            this.errorMsg.set('No fue posible cargar tus incidencias.');
            this._incidencias.set([]);
        } finally {
            this.cargandoListado.set(false);
        }
    }

    private mapIncidencia(raw: IncidenciaResponse): Incidencia {
        return {
            id: raw.id,
            titulo: raw.titulo,
            descripcion: raw.descripcion ?? null,
            origen: raw.origen ?? 'Empresa',
            tipo: (raw.tipo as IncidenciaTipo) ?? null,
            locker: raw.locker ?? null,
            sede: raw.sede ?? null,
            empresa: raw.empresa ?? null,
            // prioridad: (raw.prioridad as IncidenciaPrioridad) ?? 'Media',
            estado: (raw.estado as IncidenciaEstado) ?? 'Abierta',
            fecha: raw.created_at ? new Date(raw.created_at) : new Date(),
        };
    }

    // Formulario
    abrirFormulario() {
        this.incidenciaForm.reset({
            titulo: '',
            tipo: 'Locker',
            locker: '',
            sede: '',
            descripcion: '',
        });
        this.mostrarFormulario.set(true);
        this.errorMsg.set('');
    }

    cerrarFormulario() {
        this.mostrarFormulario.set(false);
        this.errorMsg.set('');
    }

    async enviarIncidencia() {
        if (this.incidenciaForm.invalid) {
            this.incidenciaForm.markAllAsTouched();
            return;
        }

        this.cargandoEnvio.set(true);
        this.errorMsg.set('');

        const formValue = this.incidenciaForm.value;

        // Origen
        const payload = {
            titulo: formValue.titulo,
            descripcion: formValue.descripcion,
            origen: 'Empresa',
            tipo: formValue.tipo,
            locker: formValue.locker || null,
            sede: formValue.sede || null,
        };

        try {
            const created = await firstValueFrom(
                this.http.post<IncidenciaResponse>(`${environment.apiUrl}/incidencias`, payload)
            );

            const nueva = this.mapIncidencia(created);
            this._incidencias.update((list) => [nueva, ...list]);

            this.mostrarFormulario.set(false);
            this.incidenciaForm.reset({
                titulo: '',
                tipo: 'Locker',
                locker: '',
                sede: '',
                descripcion: '',
            });
        } catch (err: any) {
            console.error('Error creando incidencia:', err);
            this.errorMsg.set(
                err?.error?.message || 'No fue posible enviar la incidencia. Intenta nuevamente.'
            );
        } finally {
            this.cargandoEnvio.set(false);
        }
    }

    // Utilidades
    trackById = (_: number, inc: Incidencia) => inc.id;
}
