import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { HeaderAdmin } from '../shared/header-admin/headerAdmin';
import { environment } from '../../../../environments/environment';

@Component({
    standalone: true,
    selector: 'app-tecnico-form',
    imports: [CommonModule, ReactiveFormsModule, RouterModule, HeaderAdmin],
    templateUrl: './tecnicoForm.html',
    styleUrls: ['./tecnicoForm.scss']
})
export class TecnicoForm implements OnInit {
    private fb = inject(FormBuilder);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private location = inject(Location);
    private http = inject(HttpClient);

    loading = false;
    isEditMode = false;
    tecnicoId?: number;

    form = this.fb.group({
        nombre: ['', [Validators.required, Validators.minLength(3)]],
        apellido: ['', [Validators.required, Validators.minLength(3)]],
        email: ['', [Validators.required, Validators.email]],
        telefono: ['', [Validators.pattern(/^\d{0,8}$/)]],
        contrasena: ['', [Validators.required, Validators.minLength(6)]],
        habilitado: [true]
    });

    /**
     * Maneja la entrada del teléfono, solo permite números y máximo 8 dígitos
     */
    onTelefonoInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        let valor = input.value.replace(/[^0-9]/g, '');
        
        if (valor.length > 8) {
            valor = valor.slice(0, 8);
        }
        
        input.value = valor;
        this.form.get('telefono')?.setValue(valor, { emitEvent: false });
    }

    /**
     * Preparar el teléfono para enviar al backend
     */
    private prepararTelefono(telefono: string | null | undefined): string | null {
        if (!telefono || telefono.trim().length === 0) {
            return null;
        }
        
        const digitos = telefono.replace(/[^0-9]/g, '');
        
        if (digitos.length === 8) {
            return `569${digitos}`;
        }
        
        if (digitos.length > 0) {
            return `569${digitos}`;
        }
        
        return null;
    }

    async ngOnInit(): Promise<void> {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.isEditMode = true;
            this.tecnicoId = parseInt(id);
            await this.cargarTecnico(this.tecnicoId);
        }
    }

    private async cargarTecnico(id: number): Promise<void> {
        this.loading = true;
        try {
            const tecnico = await this.http
                .get<any>(`${environment.apiUrl}/tecnicos/${id}`)
                .toPromise();

            if (tecnico) {
                // Formatear teléfono si tiene prefijo
                let telefono = tecnico.telefono || '';
                if (telefono.startsWith('569') && telefono.length > 3) {
                    telefono = telefono.substring(3);
                }

                this.form.patchValue({
                    nombre: tecnico.nombre || '',
                    apellido: tecnico.apellido || '',
                    email: tecnico.email || '',
                    telefono: telefono,
                    habilitado: tecnico.habilitado ?? true
                });

                // En modo edición, la contraseña no es requerida
                this.form.get('contrasena')?.clearValidators();
                this.form.get('contrasena')?.setValidators([]);
                this.form.get('contrasena')?.updateValueAndValidity();
            }
        } catch (error) {
            console.error('Error cargando técnico:', error);
            alert('Error al cargar el técnico');
        } finally {
            this.loading = false;
        }
    }

    async guardar(): Promise<void> {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.loading = true;
        try {
            const data = this.form.value;
            const payload: any = {
                nombre: data.nombre,
                apellido: data.apellido,
                email: data.email,
                telefono: this.prepararTelefono(data.telefono),
                habilitado: data.habilitado ?? true
            };

            // Solo incluir contraseña si se proporcionó (y no está vacía)
            if (data.contrasena && data.contrasena.trim().length > 0) {
                payload.contrasena = data.contrasena;
            }

            if (this.isEditMode && this.tecnicoId) {
                // En edición, solo incluir contraseña si se proporcionó
                if (!payload.contrasena) {
                    delete payload.contrasena;
                }
                await this.http
                    .put(`${environment.apiUrl}/tecnicos/${this.tecnicoId}`, payload)
                    .toPromise();
                alert('Técnico actualizado correctamente');
            } else {
                // En creación siempre se requiere contraseña
                if (!data.contrasena || data.contrasena.trim().length === 0) {
                    alert('La contraseña es requerida para crear un técnico');
                    this.loading = false;
                    return;
                }
                payload.contrasena = data.contrasena;
                await this.http
                    .post(`${environment.apiUrl}/tecnicos`, payload)
                    .toPromise();
                alert('Técnico creado correctamente');
            }

            this.volver();
        } catch (error: any) {
            console.error('Error guardando técnico:', error);
            const errorMessage = error?.error?.message || error?.message || 'Error desconocido';
            alert(`Error al guardar el técnico: ${errorMessage}`);
        } finally {
            this.loading = false;
        }
    }

    volver() {
        this.router.navigate(['/admin/tecnicos']);
    }
}

