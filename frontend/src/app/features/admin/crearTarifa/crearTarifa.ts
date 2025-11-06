import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HeaderAdmin } from '../shared/header-admin/headerAdmin';
import { environment } from '../../../../environments/environment';

@Component({
    standalone: true,
    selector: 'app-crear-tarifa',
    imports: [CommonModule, ReactiveFormsModule, RouterModule, HeaderAdmin],
    templateUrl: './crearTarifa.html',
    styleUrls: ['./crearTarifa.scss']
})
export class CrearTarifa {
    private fb = inject(FormBuilder);
    private router = inject(Router);
    private http = inject(HttpClient);
    private destroyRef = inject(DestroyRef);

    form = this.fb.group({
        nombre: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3)] }),
        codigo: this.fb.control<string>('', {
            nonNullable: true,
            validators: [Validators.required]
        }),
        precio: this.fb.control<number | null>(null, { validators: [Validators.required, Validators.min(0)] }),
        estado: this.fb.control<'Activo' | 'Inactivo'>('Activo', { nonNullable: true }),
        descripcion: this.fb.control<string>('', { nonNullable: true, validators: [Validators.maxLength(512)] }),

        sedes: this.fb.control<number | null>(null, { validators: [Validators.min(0)] }),
        lockersPorSede: this.fb.control<number | null>(null, { validators: [Validators.min(0)] }),
        soporte: this.fb.control<'normal' | 'prioritario'>('normal', { nonNullable: true }),

        incluye: this.fb.array<FormControl<string>>([]),
        noIncluye: this.fb.array<FormControl<string>>([])
    });

    saving = signal(false);
    errorMessage = signal<string | null>(null);
    dynamicIncluye = signal<string[]>([]);
    dynamicNoIncluye = signal<string[]>([]);

    constructor() {
        this.updateDynamicItems();

        this.form.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.updateDynamicItems());
    }

    get incluye(): FormArray<FormControl<string>> {
        return this.form.get('incluye') as FormArray<FormControl<string>>;
    }

    get noIncluye(): FormArray<FormControl<string>> {
        return this.form.get('noIncluye') as FormArray<FormControl<string>>;
    }

    addIncluye() {
        this.incluye.push(this.fb.control<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }));
    }

    removeIncluye(i: number) {
        this.incluye.removeAt(i);
    }

    addNoIncluye() {
        this.noIncluye.push(this.fb.control<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }));
    }

    removeNoIncluye(i: number) {
        this.noIncluye.removeAt(i);
    }

    async guardar() {
        if (this.saving()) {
            return;
        }

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.errorMessage.set(null);
        this.saving.set(true);

        const payload = this.buildPayload();

        try {
            await firstValueFrom(
                this.http.post(`${environment.apiUrl}/tarifas`, payload)
            );

            this.router.navigate(['/admin/tarifas']);
        } catch (error) {
            console.error('Error creando la tarifa:', error);
            this.errorMessage.set(this.extractErrorMessage(error));
        } finally {
            this.saving.set(false);
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
                ...incluyeCustom
            ])
        );

        const noIncluyeCustom = (raw.noIncluye ?? [])
            .map((item) => item.trim())
            .filter((item) => item.length > 0);

        const noIncluye = Array.from(
            new Set([
                ...this.dynamicNoIncluye(),
                ...noIncluyeCustom
            ])
        );

        const precio = Number(raw.precio ?? 0);

        return {
            nombre_publico: raw.nombre.trim(),
            codigo_interno: this.normalizeCodigo(raw.codigo),
            precio_mensual: Number.isNaN(precio) ? 0 : precio,
            estado: raw.estado,
            descripcion_corta: raw.descripcion?.trim() || null,
            sedes_permitidas: this.transformCantidad(raw.sedes),
            lockers_por_sede: this.transformCantidad(raw.lockersPorSede),
            prioridad_soporte: raw.soporte === 'prioritario' ? 'Prioritario' : 'Normal',
            incluye,
            no_incluye: noIncluye,
        };
    }

    private transformCantidad(value: number | null): number {
        if (value === null || value === undefined) {
            return 0;
        }

        const parsed = Number(value);
        if (Number.isNaN(parsed) || parsed < 0) {
            return 0;
        }

        return parsed;
    }

    private normalizeCodigo(codigo: string): string {
        const trimmed = codigo.trim();
        if (!trimmed) {
            return trimmed;
        }
        const slug = trimmed
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9\-_]/g, '');

        return slug || trimmed;
    }

    private extractErrorMessage(error: unknown): string {
        if (!error) {
            return 'No fue posible crear la tarifa. Intenta nuevamente.';
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

        return 'No fue posible crear la tarifa. Intenta nuevamente.';
    }

    private updateDynamicItems(): void {
        const raw = this.form.getRawValue();
        const incluye = this.computeDynamicIncluye(raw.sedes, raw.soporte);
        const noIncluye = this.computeDynamicNoIncluye(raw.sedes, raw.soporte);
        this.dynamicIncluye.set(incluye);
        this.dynamicNoIncluye.set(noIncluye);
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
