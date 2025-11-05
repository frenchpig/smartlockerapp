import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
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
        descripcion: this.fb.control<string>('', { nonNullable: true }),

        sedes: this.fb.control<number | null>(null),
        lockersPorSede: this.fb.control<number | null>(null),
        soporte: this.fb.control<'normal' | 'prioritario'>('normal', { nonNullable: true }),

        incluye: this.fb.array<FormControl<string>>([]),
        noIncluye: this.fb.array<FormControl<string>>([]),
    });

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
            this.cargarTarifa(1);
        }
    }

    private cargarTarifa(id: number) {
        // MOCK
        const mock = {
            nombre: 'Smart Pro',
            codigo: 'PRO_000',
            precio: 49000,
            // periodo: 'mensual' as const,
            estado: 'Activo' as const,
            descripcion: 'Para sedes dentro del metro.',
            sedes: 6,
            lockersPorSede: 20,
            soporte: 'prioritario' as const,
            incluye: ['Hasta 6 sedes', 'Reportes avanzados', 'Prioridad en soporte'],
            noIncluye: ['Sedes ilimitadas']
        };

        this.form.patchValue({
            nombre: mock.nombre,
            codigo: mock.codigo,
            precio: mock.precio,
            // periodo: mock.periodo,
            estado: mock.estado,
            descripcion: mock.descripcion,
            sedes: mock.sedes,
            lockersPorSede: mock.lockersPorSede,
            soporte: mock.soporte,
        });


        // limpiar arrays y volver a cargarlos
        this.incluye.clear();
        mock.incluye.forEach(txt => {
            this.incluye.push(this.fb.control<string>(txt, { nonNullable: true }));
        });

        this.noIncluye.clear();
        mock.noIncluye.forEach(txt => {
            this.noIncluye.push(this.fb.control<string>(txt, { nonNullable: true }));
        });
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
        console.log('editar tarifa →', payload);

        this.router.navigate(['/admin/tarifas']);
    }

    cancelar() {
        this.router.navigate(['/admin/tarifas']);
    }
}
