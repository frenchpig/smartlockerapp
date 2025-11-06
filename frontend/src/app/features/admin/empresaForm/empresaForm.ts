import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HeaderAdmin } from '../../admin/shared/header-admin/headerAdmin';
import { environment } from '../../../../environments/environment';

interface Region {
  id: number;
  nombre: string;
}

interface Comuna {
  id: number;
  nombre: string;
  region_id: number;
}

@Component({
    standalone: true,
    selector: 'app-nueva-empresa',
    imports: [CommonModule, ReactiveFormsModule, RouterModule, HeaderAdmin],
    templateUrl: './empresaForm.html',
    styleUrls: ['./empresaForm.scss']
})
export class EmpresaForm implements OnInit {
    private fb = inject(FormBuilder);
    private router = inject(Router);
    private http = inject(HttpClient);

    loading = false;
    regiones: Region[] = [];
    comunas: Comuna[] = [];

    form = this.fb.group({
        // Datos de la persona encargada
        nombre: ['', [Validators.required, Validators.minLength(3)]],
        apellido: ['', [Validators.required, Validators.minLength(3)]],
        email: ['', [Validators.required, Validators.email]],
        telefono: [''],
        contrasena: ['', [Validators.required, Validators.minLength(6)]],
        
        // Datos de la empresa
        nombreEmpresa: ['', [Validators.required, Validators.minLength(3)]],
        razonSocial: [''],
        rut: [''],
        direccion: [''],
        regionId: [''],
        comunaId: [''],
    });

    async ngOnInit(): Promise<void> {
        await this.cargarRegiones();
    }

    private async cargarRegiones(): Promise<void> {
        try {
            const response = await this.http
                .get<Region[]>(`${environment.apiUrl}/empresas/regiones`)
                .toPromise();
            this.regiones = response ?? [];
        } catch (error) {
            console.error('Error cargando regiones:', error);
        }
    }

    async onRegionChange(): Promise<void> {
        const regionId = this.form.get('regionId')?.value;
        this.form.get('comunaId')?.setValue('');
        
        if (!regionId) {
            this.comunas = [];
            return;
        }

        try {
            const response = await this.http
                .get<Comuna[]>(`${environment.apiUrl}/empresas/regiones/${regionId}/comunas`)
                .toPromise();
            this.comunas = response ?? [];
        } catch (error) {
            console.error('Error cargando comunas:', error);
            this.comunas = [];
        }
    }

    cancelar(): void {
        this.router.navigate(['/admin/empresa']);
    }

    async guardar(): Promise<void> {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.loading = true;
        try {
            const formValue = this.form.getRawValue();
            const payload = {
                nombre: formValue.nombre,
                apellido: formValue.apellido,
                email: formValue.email,
                telefono: formValue.telefono || null,
                contrasena: formValue.contrasena,
                nombre_empresa: formValue.nombreEmpresa,
                razon_social: formValue.razonSocial || null,
                rut: formValue.rut || null,
                direccion: formValue.direccion || null,
                comuna_id: formValue.comunaId ? parseInt(formValue.comunaId) : null,
            };

            await this.http
                .post(`${environment.apiUrl}/empresas`, payload)
                .toPromise();

            this.router.navigate(['/admin/empresa']);
        } catch (error: any) {
            console.error('Error guardando empresa:', error);
            alert('Error al guardar la empresa. Por favor, intenta nuevamente.');
        } finally {
            this.loading = false;
        }
    }
}
