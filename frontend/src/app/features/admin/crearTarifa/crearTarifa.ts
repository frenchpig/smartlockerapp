import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HeaderAdmin } from '../shared/header-admin/headerAdmin';

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

    form = this.fb.group({
        nombre: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3)] }),
        codigo: this.fb.control<string>('', { nonNullable: true }),
        precio: this.fb.control<number | null>(null, { validators: [Validators.required, Validators.min(0)] }),
        // periodo: this.fb.control<'mensual' | 'anual' | 'trimestral'>('mensual', { nonNullable: true }),
        estado: this.fb.control<'Activo' | 'Inactivo'>('Activo', { nonNullable: true }),
        descripcion: this.fb.control<string>('', { nonNullable: true }),

        sedes: this.fb.control<number | null>(null),
        lockersPorSede: this.fb.control<number | null>(null),
        soporte: this.fb.control<'normal' | 'prioritario'>('normal', { nonNullable: true }),

        incluye: this.fb.array<FormControl<string>>([
            this.fb.control<string>('Hasta 2 sedes', { nonNullable: true }),
            this.fb.control<string>('Soporte - horario laboral', { nonNullable: true })
        ]),
        noIncluye: this.fb.array<FormControl<string>>([
            this.fb.control<string>('Sedes ilimitadas', { nonNullable: true })
        ])
    });

    get incluye(): FormArray<FormControl<string>> {
        return this.form.get('incluye') as FormArray<FormControl<string>>;
    }

    get noIncluye(): FormArray<FormControl<string>> {
        return this.form.get('noIncluye') as FormArray<FormControl<string>>;
    }

    addIncluye() {
        this.incluye.push(this.fb.control<string>('', { nonNullable: true }));
    }

    removeIncluye(i: number) {
        this.incluye.removeAt(i);
    }

    addNoIncluye() {
        this.noIncluye.push(this.fb.control<string>('', { nonNullable: true }));
    }

    removeNoIncluye(i: number) {
        this.noIncluye.removeAt(i);
    }

    guardar() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const payload = this.form.getRawValue();
        this.router.navigate(['/admin/tarifas']);
    }

    cancelar() {
        this.router.navigate(['/admin/tarifas']);
    }
}
