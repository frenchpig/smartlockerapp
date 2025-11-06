import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Location } from '@angular/common';
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
    private location = inject(Location);
    private http = inject(HttpClient);

    loading = false;
    regiones: Region[] = [];
    comunas: Comuna[] = [];

    form = this.fb.group({
        // Datos de la persona encargada
        nombre: ['', [Validators.required, Validators.minLength(3)]],
        apellido: ['', [Validators.required, Validators.minLength(3)]],
        email: ['', [Validators.required, Validators.email]],
        telefono: ['', [Validators.pattern(/^\d{0,8}$/)]], // Solo números, máximo 8 dígitos
        contrasena: ['', [Validators.required, Validators.minLength(6)]],
        
        // Datos de la empresa
        nombreEmpresa: ['', [Validators.required, Validators.minLength(3)]],
        razonSocial: [''],
        rut: [''],
        direccion: [''],
        regionId: [''],
        comunaId: [''],
    });

    /**
     * Maneja la entrada del teléfono, solo permite números y máximo 8 dígitos
     */
    onTelefonoInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        let valor = input.value.replace(/[^0-9]/g, ''); // Solo números
        
        // Limitar a 8 dígitos
        if (valor.length > 8) {
            valor = valor.slice(0, 8);
        }
        
        input.value = valor;
        this.form.get('telefono')?.setValue(valor, { emitEvent: false });
    }

    /**
     * Preparar el teléfono para enviar al backend: combinar prefijo +569 con los dígitos ingresados
     */
    private prepararTelefono(telefono: string | null | undefined): string | null {
        if (!telefono || telefono.trim().length === 0) {
            return null;
        }
        
        // Limpiar el teléfono (solo números)
        const digitos = telefono.replace(/[^0-9]/g, '');
        
        // Si tiene 8 dígitos, combinar con prefijo
        if (digitos.length === 8) {
            return `569${digitos}`;
        }
        
        // Si tiene menos de 8 dígitos pero tiene algo, también combinar
        if (digitos.length > 0) {
            return `569${digitos}`;
        }
        
        return null;
    }

    /**
     * Formatea el RUT mientras el usuario escribe (ej: 761234567 -> 76.123.456-7, 76123456K -> 76.123.456-K)
     */
    formatearRut(input: HTMLInputElement): void {
        let valor = input.value.replace(/[^0-9kK]/g, ''); // Solo números y k/K
        
        if (valor.length === 0) {
            this.form.get('rut')?.setValue('', { emitEvent: false });
            input.value = '';
            return;
        }

        // Convertir k a K siempre
        valor = valor.replace(/k/g, 'K');

        // Separar el dígito verificador (último carácter, puede ser número o K)
        let rutSinVerificador = valor.slice(0, -1);
        let verificador = valor.slice(-1).toUpperCase(); // Asegurar K mayúscula

        // Formatear con puntos y guión solo si hay parte numérica
        if (rutSinVerificador.length > 0) {
            rutSinVerificador = rutSinVerificador.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            valor = `${rutSinVerificador}-${verificador}`;
        } else {
            // Si solo hay K, no formatear
            valor = verificador;
        }

        // Actualizar el input con el formato visual
        input.value = valor;
        // Guardar solo números y K en mayúscula en el formulario
        const rutLimpio = valor.replace(/[^0-9K]/g, '');
        this.form.get('rut')?.setValue(rutLimpio, { emitEvent: false });
    }

    /**
     * Limpia el RUT (solo números y k/K) para enviarlo al backend
     * Convierte k a K siempre
     */
    private limpiarRut(rut: string | null | undefined): string | null {
        if (!rut) return null;
        const limpio = rut.replace(/[^0-9kK]/g, '').toUpperCase(); // Convertir k a K
        return limpio.length > 0 ? limpio : null;
    }

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

    volver(): void {
        this.location.back();
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
                telefono: this.prepararTelefono(formValue.telefono),
                contrasena: formValue.contrasena,
                nombre_empresa: formValue.nombreEmpresa,
                razon_social: formValue.razonSocial || null,
                rut: this.limpiarRut(formValue.rut),
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
