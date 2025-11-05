import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HeaderAdmin } from '../../admin/shared/header-admin/headerAdmin';

type EmpresaEstado = 'Activa' | 'Inactiva';
type Plan = 'Smart Basic' | 'Smart Pro' | 'Smart Max';

@Component({
    standalone: true,
    selector: 'app-editar-empresa',
    imports: [CommonModule, ReactiveFormsModule, RouterModule, HeaderAdmin],
    templateUrl: './editarEmpresa.html',
    styleUrls: ['./editarEmpresa.scss']
})
export class EditarEmpresa implements OnInit {
    private route = inject(ActivatedRoute);
    private fb = inject(FormBuilder);
    private router = inject(Router);

    estados: EmpresaEstado[] = ['Activa', 'Inactiva'];
    planes: Plan[] = ['Smart Basic', 'Smart Pro', 'Smart Max'];

    form = this.fb.group({
        id: [{ value: 0, disabled: true }],
        nombre: ['', [Validators.required, Validators.minLength(3)]],
        razonSocial: [''],
        rut: [''],
        correo: ['', [Validators.required, Validators.email]],
        telefono: [''],
        direccion: [''],
        comuna: [''],
        region: [''],
        estado: ['Activa' as EmpresaEstado, Validators.required],
        plan: ['Smart Basic' as Plan],
        fechaAlta: [''],
        lockersAsignados: [0, [Validators.min(0)]],
        casillerosTotales: [0, [Validators.min(0)]],
        sedes: this.fb.array<string>([])
    });

    get sedesArr(): FormArray {
        return this.form.get('sedes') as FormArray;
    }

    ngOnInit(): void {
        const id = Number(this.route.snapshot.paramMap.get('id') ?? '1');

        // MOCK
        const mock = {
            id,
            nombre: 'Acme S.A.',
            razonSocial: 'Acme Sociedad Anónima',
            rut: '76.123.456-7',
            correo: 'contacto@acme.cl',
            telefono: '+56 9 5555 5555',
            direccion: 'Av. Siempre Viva 1234',
            comuna: 'Ñuñoa',
            region: 'Región Metropolitana',
            estado: 'Activa' as EmpresaEstado,
            plan: 'Smart Basic' as Plan,
            fechaAlta: '2025-08-10',
            lockersAsignados: 18,
            casillerosTotales: 216,
            sedes: ['Metro Ñuñoa', 'Ñuble', 'Vitacura']
        };

        this.form.patchValue({ ...mock });
        this.sedesArr.clear();
        mock.sedes.forEach(s => this.sedesArr.push(this.fb.control(s)));
    }

    volver(): void {
        this.router.navigate(['/admin/empresa']);
    }

    guardar(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const payload = this.form.getRawValue();
        console.log('EditarEmpresa → guardar()', payload);
        // TODO: Llamar API PUT /empresas/:id y manejar respuesta/toast
        this.router.navigate(['/admin/empresas']);
    }

    agregarSede(input: HTMLInputElement): void {
        const v = (input.value ?? '').trim();
        if (!v) return;
        this.sedesArr.push(this.fb.control(v));
        input.value = '';
    }

    eliminarSede(idx: number): void {
        this.sedesArr.removeAt(idx);
    }
}
