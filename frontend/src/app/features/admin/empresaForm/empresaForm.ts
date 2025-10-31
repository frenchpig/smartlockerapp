import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HeaderAdmin } from '../../admin/shared/header-admin/headerAdmin';

type EmpresaEstado = 'Activa' | 'Inactiva';
type Plan = 'Standard' | 'Pro' | 'Enterprise';

@Component({
    standalone: true,
    selector: 'app-nueva-empresa',
    imports: [CommonModule, ReactiveFormsModule, RouterModule, HeaderAdmin],
    templateUrl: './empresaForm.html',
    styleUrls: ['./empresaForm.scss']
})
export class EmpresaForm {
    private fb = inject(FormBuilder);
    private router = inject(Router);

    estados: EmpresaEstado[] = ['Activa', 'Inactiva'];
    planes: Plan[] = ['Standard', 'Pro', 'Enterprise'];

    form = this.fb.group({
        nombre: ['', [Validators.required, Validators.minLength(3)]],
        razonSocial: [''],
        rut: [''],
        correo: ['', [Validators.required, Validators.email]],
        telefono: [''],
        direccion: [''],
        comuna: [''],
        region: [''],
        estado: ['Activa' as EmpresaEstado, Validators.required],
        plan: ['Pro' as Plan],
        fechaAlta: [new Date().toISOString().substring(0, 10)],
        lockersAsignados: [0, [Validators.min(0)]],
        casillerosTotales: [0, [Validators.min(0)]],
        sedes: this.fb.array<string>([])
    });

    get sedesArr(): FormArray {
        return this.form.get('sedes') as FormArray;
    }

    cancelar(): void {
        this.router.navigate(['/admin/empresa']);
    }

    guardar(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const payload = this.form.getRawValue();
        console.log('NuevaEmpresa → guardar()', payload);
        // TODO: POST /empresas  -> manejar respuesta/toast
        this.router.navigate(['/admin/empresa']);
    }

    agregarSede(input: HTMLInputElement): void {
        const v = (input.value ?? '').trim();
        if (!v) return;
        this.sedesArr.push(this.fb.control(v));
        input.value = '';
    }
    eliminarSede(i: number): void {
        this.sedesArr.removeAt(i);
    }
}
