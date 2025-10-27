import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { HeaderRepartidorComponent } from '../shared/header-repartidor/header-repartidor.component';

interface UserProfile {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  rol: string;
}

@Component({
  standalone: true,
  selector: 'app-perfil-repartidor',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, HeaderRepartidorComponent],
  templateUrl: './perfil.html',
  styleUrls: ['./perfil.scss'],
})
export class PerfilRepartidor implements OnInit {
  private router = inject(Router);
  private auth = inject(AuthService);
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  user: UserProfile = {
    id: 0,
    nombre: '',
    apellido: '',
    email: '',
    telefono: null,
    rol: ''
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
      apellido: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      telefono: [''],
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

    this.loadUserProfile();
  }

  async loadUserProfile() {
    this.loading = true;
    try {
      const profile = await this.http.get<UserProfile>(`${environment.apiUrl}/usuarios/${this.auth.user()?.id}`).toPromise();
      if (profile) {
        this.user = profile;
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      const currentUser = this.auth.user();
      if (currentUser) {
        this.user = {
          id: currentUser.id,
          nombre: currentUser.nombre,
          apellido: currentUser.apellido,
          email: currentUser.email,
          telefono: null,
          rol: currentUser.rol
        };
      }
    } finally {
      this.loading = false;
    }
  }

  editarPerfil() {
    this.editForm.patchValue({
      nombre: this.user.nombre,
      apellido: this.user.apellido,
      email: this.user.email,
      telefono: this.user.telefono || ''
    });
    this.showEditModal.set(true);
    this.errorMsg.set('');
  }

  async guardarPerfil() {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMsg.set('');

    try {
      const updated = await this.http.patch<UserProfile>(
        `${environment.apiUrl}/auth/profile`,
        this.editForm.value
      ).toPromise();

      if (updated) {
        this.user = updated;
        await this.auth.fetchMe();
        this.showEditModal.set(false);
      }
    } catch (err: any) {
      console.error('Error updating profile:', err);
      this.errorMsg.set(err?.error?.message || 'Error al actualizar el perfil');
    } finally {
      this.saving.set(false);
    }
  }

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
      await this.http.post(
        `${environment.apiUrl}/auth/change-password`,
        {
          current_password: this.passwordForm.value.current_password,
          new_password: this.passwordForm.value.new_password
        }
      ).toPromise();

      this.showPasswordModal.set(false);
      alert('Contraseña actualizada correctamente');
      this.passwordForm.reset();
    } catch (err: any) {
      console.error('Error changing password:', err);
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

