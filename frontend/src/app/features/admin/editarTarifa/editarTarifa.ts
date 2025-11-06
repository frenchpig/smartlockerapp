import { Component, DestroyRef, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { HeaderAdmin } from '../shared/header-admin/headerAdmin';

@Component({
    standalone: true,
    selector: 'app-editar-tarifa',
    imports: [CommonModule, ReactiveFormsModule, RouterModule, HeaderAdmin],
    templateUrl: './editarTarifa.html',
    styleUrls: ['./editarTarifa.scss']
})
export class EditarTarifa implements OnInit {
    private fb = inject(FormBuilder);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private http = inject(HttpClient);
    private destroyRef = inject(DestroyRef);

    tarifaId?: number;

    form = this.fb.group({
        nombre: this.fb.control<string>('', {
            nonNullable: true,
            validators: [Validators.required, Validators.minLength(3)]
        }),
        codigo: this.fb.control({ value: '', disabled: true }, { nonNullable: true }),
        precio: this.fb.control<number | null>(null, {
            validators: [Validators.required, Validators.min(0)]
        }),
        // periodo: this.fb.control<'mensual' | 'anual' | 'trimestral'>('mensual', { nonNullable: true }),
        estado: this.fb.control<'Activo' | 'Inactivo'>('Activo', { nonNullable: true }),
        descripcion: this.fb.control<string>('', { nonNullable: true, validators: [Validators.maxLength(512)] }),

        sedes: this.fb.control<number | null>(null, { validators: [Validators.min(0)] }),
        lockersPorSede: this.fb.control<number | null>(null, { validators: [Validators.min(0)] }),
        soporte: this.fb.control<'normal' | 'prioritario'>('normal', { nonNullable: true }),

        incluye: this.fb.array<FormControl<string>>([]),
        noIncluye: this.fb.array<FormControl<string>>([]),
    });

    cargando = signal(false);
    guardando = signal(false);
    errorMessage = signal<string | null>(null);
    dynamicIncluye = signal<string[]>([]);
    dynamicNoIncluye = signal<string[]>([]);
    descripcionMax = 512;

    get incluye(): FormArray<FormControl<string>> {
        return this.form.get('incluye') as FormArray<FormControl<string>>;
    }

    get noIncluye(): FormArray<FormControl<string>> {
        return this.form.get('noIncluye') as FormArray<FormControl<string>>;
    }

    ngOnInit(): void {
        const idParam = this.route.snapshot.paramMap.get('id');
        if (idParam) {
            this.tarifaId = +idParam;
            this.cargarTarifa(+idParam);
        } else {
            this.router.navigate(['/admin/tarifas']);
            return;
        }

        effect(
            () => {
                this.actualizarListasAutomaticas();
            },
            { allowSignalWrites: true }
        );
    }

    private async cargarTarifa(id: number) {
        this.cargando.set(true);
        this.errorMessage.set(null);

        try {
            const tarifa = await firstValueFrom(
                this.http.get<TarifaResponse>(`${environment.apiUrl}/tarifas/${id}`)
            );

            this.form.patchValue({
                nombre: tarifa.nombre_publico,
                codigo: tarifa.codigo_interno,
                precio: tarifa.precio_mensual,
                estado: tarifa.estado,
                descripcion: tarifa.descripcion_corta ?? '',
                sedes: tarifa.sedes_permitidas ?? null,
                lockersPorSede: tarifa.lockers_por_sede ?? null,
                soporte: tarifa.prioridad_soporte === 'Prioritario' ? 'prioritario' : 'normal',
            });

            this.incluye.clear();
            (tarifa.incluye ?? []).forEach((txt) =>
                this.incluye.push(this.fb.control<string>(txt, { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }))
            );

            this.noIncluye.clear();
            (tarifa.no_incluye ?? []).forEach((txt) =>
                this.noIncluye.push(this.fb.control<string>(txt, { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }))
            );
        } catch (error) {
            console.error('Error cargando tarifa:', error);
            this.errorMessage.set('No fue posible cargar la tarifa seleccionada.');
        } finally {
            this.cargando.set(false);
        }
    }

    addIncluye() {
        this.incluye.push(
            this.fb.control<string>('', {
                nonNullable: true,
                validators: [Validators.required, Validators.maxLength(255)],
            })
        );
    }

    removeIncluye(i: number) {
        this.incluye.removeAt(i);
    }

    addNoIncluye() {
        this.noIncluye.push(
            this.fb.control<string>('', {
                nonNullable: true,
                validators: [Validators.required, Validators.maxLength(255)],
            })
        );
    }

    removeNoIncluye(i: number) {
        this.noIncluye.removeAt(i);
    }

    async guardar() {
        if (this.guardando()) {
            return;
        }

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        if (!this.tarifaId) {
            return;
        }

        const payload = this.buildPayload();
        this.guardando.set(true);
        this.errorMessage.set(null);

        try {
            await firstValueFrom(
                this.http.patch(`${environment.apiUrl}/tarifas/${this.tarifaId}`, payload)
            );

            this.router.navigate(['/admin/tarifas']);
        } catch (error) {
            console.error('Error guardando tarifa:', error);
            this.errorMessage.set(this.extractErrorMessage(error));
        } finally {
            this.guardando.set(false);
        }
    }

    cancelar() {
        this.router.navigate(['/admin/tarifas']);
    }

    private buildPayload() {
        const raw = this.form.getRawValue();

        const incluyeCustom = (raw.incluye ?? [])
            .map((item) => item.trim())
            .filter((item) => item.length > 0);

        const incluye = Array.from(
            new Set([
                ...this.dynamicIncluye(),
                ...incluyeCustom,
            ])
        );

        const noIncluyeCustom = (raw.noIncluye ?? [])
            .map((item) => item.trim())
            .filter((item) => item.length > 0);

        const noIncluye = Array.from(
            new Set([
                ...this.dynamicNoIncluye(),
                ...noIncluyeCustom,
            ])
        );

        const sedes = this.transformCantidad(raw.sedes);
        const lockers = this.transformCantidad(raw.lockersPorSede);
        const precio = Number(raw.precio ?? 0);

        return {
            nombre_publico: raw.nombre.trim(),
            precio_mensual: Number.isNaN(precio) ? 0 : precio,
            estado: raw.estado ?? 'Activo',
            descripcion_corta: raw.descripcion?.trim() || null,
            sedes_permitidas: sedes,
            lockers_por_sede: lockers,
            prioridad_soporte: raw.soporte === 'prioritario' ? 'Prioritario' : 'Normal',
            incluye,
            no_incluye: noIncluye,
        };
    }

    private transformCantidad(value: number | null | undefined): number {
        if (value === null || value === undefined) {
            return 0;
        }

        const parsed = Number(value);
        if (Number.isNaN(parsed) || parsed < 0) {
            return 0;
        }

        return parsed;
    }

    private extractErrorMessage(error: unknown): string {
        if (!error) {
            return 'No fue posible guardar la tarifa. Intenta nuevamente.';
        }

        const anyError = error as any;

        if (anyError?.error?.message) {
            return anyError.error.message;
        }

        const validationErrors = anyError?.error?.errors;
        if (validationErrors && typeof validationErrors === 'object') {
            const messages = Object.values(validationErrors)
                .flat()
                .filter((msg): msg is string => typeof msg === 'string');
            if (messages.length > 0) {
                return messages.join(' ');
            }
        }

        if (anyError?.message) {
            return anyError.message;
        }

        return 'No fue posible guardar la tarifa. Intenta nuevamente.';
    }

    private actualizarListasAutomaticas(): void {
        const sedes = this.form.controls.sedes.value;
        const soporte = this.form.controls.soporte.value;

        this.dynamicIncluye.set(this.computeDynamicIncluye(sedes, soporte));
        this.dynamicNoIncluye.set(this.computeDynamicNoIncluye(sedes, soporte));
    }

    private computeDynamicIncluye(
        sedes: number | null | undefined,
        soporte: 'normal' | 'prioritario' | null | undefined
    ): string[] {
        const items: string[] = [];
        const sedesValor = Number(sedes ?? 0);

        if (!sedes || sedesValor === 0) {
            items.push('Sedes ilimitadas');
        } else if (!Number.isNaN(sedesValor)) {
            items.push(`Hasta ${sedesValor} sedes`);
        }

        if (soporte === 'prioritario') {
            items.push('Soporte 24/7');
        } else {
            items.push('Soporte en horario laboral');
        }

        return items;
    }

    private computeDynamicNoIncluye(
        sedes: number | null | undefined,
        soporte: 'normal' | 'prioritario' | null | undefined
    ): string[] {
        const items: string[] = [];
        const sedesValor = Number(sedes ?? 0);

        if (sedes && !Number.isNaN(sedesValor) && sedesValor > 0) {
            items.push('Sedes ilimitadas');
        }

        if (soporte !== 'prioritario') {
            items.push('Soporte 24/7');
        }

        return items;
    }
}

interface TarifaResponse {
    id: number;
    nombre_publico: string;
    codigo_interno: string;
    precio_mensual: number;
    estado: 'Activo' | 'Inactivo';
    descripcion_corta: string | null;
    sedes_permitidas: number | null;
    lockers_por_sede: number | null;
    prioridad_soporte: 'Normal' | 'Prioritario';
    incluye: string[] | null;
    no_incluye: string[] | null;
}
