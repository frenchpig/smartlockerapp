import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { AuthService } from '../../../core/auth/auth';
import { environment } from '../../../../environments/environment';
import { HeaderEmpresaComponent } from '../shared/header-empresa/header-empresa.component';

type EstadoEmpresa = 'Activa' | 'Inactiva';

interface EmpresaProfile {
    id: number;
    nombre: string;
    rut: string | null;
    razonSocial: string | null;
    direccion: string | null;
    region: string | null;
    ciudad: string | null;
    correo: string | null;
    telefono: string | null;
    estado: EstadoEmpresa;
}

@Component({
    standalone: true,
    selector: 'app-perfil-empresa',
    imports: [CommonModule, RouterModule, ReactiveFormsModule, HeaderEmpresaComponent],
    templateUrl: './perfilEmpresa.html',
    styleUrls: ['./perfilEmpresa.scss'],
})
export class PerfilEmpresa implements OnInit {
    private router = inject(Router);
    private auth = inject(AuthService);
    private http = inject(HttpClient);
    private fb = inject(FormBuilder);

    empresa: EmpresaProfile = {
        id: 0,
        nombre: '',
        rut: null,
        razonSocial: null,
        direccion: null,
        region: null,
        ciudad: null,
        correo: null,
        telefono: null,
        estado: 'Activa',
    };

    loading = false;

    showEditModal = signal(false);
    showPasswordModal = signal(false);
    saving = signal(false);
    errorMsg = signal('');

    editForm: FormGroup;
    passwordForm: FormGroup;

    constructor() {
        this.editForm = this.fb.group({
            nombre: ['', [Validators.required]],
            rut: [''],
            razonSocial: [''],
            direccion: [''],
            region: [''],
            ciudad: [''],
            correo: ['', [Validators.required, Validators.email]],
            telefono: [''],
            estado: ['Activa' as EstadoEmpresa, [Validators.required]],
        });

        this.passwordForm = this.fb.group({
            current_password: ['', [Validators.required]],
            new_password: ['', [Validators.required, Validators.minLength(6)]],
            confirm_password: ['', [Validators.required]],
        });
    }

    ngOnInit(): void {
        const currentUser = this.auth.user();
        if (!currentUser) {
            this.router.navigate(['/login']);
            return;
        }

        this.loadEmpresaProfile();
    }

    async loadEmpresaProfile() {
        this.loading = true;
        try {
            const profile = await this.http
                .get<EmpresaProfile>(`${environment.apiUrl}/empresa/profile`)
                .toPromise();

            if (profile) {
                this.empresa = profile;
            }
        } catch (err) {
            console.error('Error cargando perfil de empresa:', err);

            const currentUser = this.auth.user();
            if (currentUser) {
                this.empresa = {
                    id: currentUser.id,
                    nombre: currentUser.nombre || 'Empresa',
                    rut: null,
                    razonSocial: null,
                    direccion: null,
                    region: null,
                    ciudad: null,
                    correo: currentUser.email || null,
                    telefono: null,
                    estado: 'Activa',
                };
            }
        } finally {
            this.loading = false;
        }
    }

    // ========= Editar empresa =========
    editarEmpresa() {
        this.editForm.patchValue({
            nombre: this.empresa.nombre,
            rut: this.empresa.rut || '',
            razonSocial: this.empresa.razonSocial || '',
            direccion: this.empresa.direccion || '',
            region: this.empresa.region || '',
            ciudad: this.empresa.ciudad || '',
            correo: this.empresa.correo || '',
            telefono: this.empresa.telefono || '',
            // estado: this.empresa.estado,
        });

        this.showEditModal.set(true);
        this.errorMsg.set('');
    }

    async guardarEmpresa() {
        if (this.editForm.invalid) {
            this.editForm.markAllAsTouched();
            return;
        }

        this.saving.set(true);
        this.errorMsg.set('');

        try {
            const updated = await this.http
                .patch<EmpresaProfile>(`${environment.apiUrl}/empresa/profile`, this.editForm.value)
                .toPromise();

            if (updated) {
                this.empresa = updated;
                await this.auth.fetchMe();
                this.showEditModal.set(false);
            }
        } catch (err: any) {
            console.error('Error actualizando empresa:', err);
            this.errorMsg.set(err?.error?.message || 'Error al actualizar los datos de la empresa');
        } finally {
            this.saving.set(false);
        }
    }

    // ========= Cambiar contraseña =========
    cambiarPassword() {
        this.passwordForm.reset();
        this.showPasswordModal.set(true);
        this.errorMsg.set('');
    }

    async guardarPassword() {
        if (this.passwordForm.invalid) {
            if (this.passwordForm.value.new_password !== this.passwordForm.value.confirm_password) {
                this.errorMsg.set('Las contraseñas no coinciden');
                return;
            }
            this.passwordForm.markAllAsTouched();
            return;
        }

        if (this.passwordForm.value.new_password !== this.passwordForm.value.confirm_password) {
            this.errorMsg.set('Las contraseñas no coinciden');
            return;
        }

        this.saving.set(true);
        this.errorMsg.set('');

        try {
            await this.http
                .post(`${environment.apiUrl}/auth/change-password`, {
                    current_password: this.passwordForm.value.current_password,
                    new_password: this.passwordForm.value.new_password,
                })
                .toPromise();

            this.showPasswordModal.set(false);
            alert('Contraseña actualizada correctamente');
            this.passwordForm.reset();
        } catch (err: any) {
            console.error('Error al cambiar la contraseña:', err);
            this.errorMsg.set(err?.error?.message || 'Error al cambiar la contraseña');
        } finally {
            this.saving.set(false);
        }
    }

    cerrarModales() {
        this.showEditModal.set(false);
        this.showPasswordModal.set(false);
        this.errorMsg.set('');
    }

    async logout() {
        try {
            await this.auth.logout();
            await this.router.navigate(['/login']);
        } catch (err) {
            console.error('Error during logout:', err);
            await this.router.navigate(['/login']);
        }
    }
}
