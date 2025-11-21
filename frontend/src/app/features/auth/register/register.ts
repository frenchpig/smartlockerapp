import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private http = inject(HttpClient);

  currentYear = new Date().getFullYear();
  loading = signal(false);
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  error = signal('');
  success = signal(false);

  form: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    apellido: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: this.passwordMatchValidator });

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    
    if (!password || !confirmPassword) {
      return null;
    }
    
    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  togglePassword() { 
    this.showPassword.update(v => !v); 
  }

  toggleConfirmPassword() { 
    this.showConfirmPassword.update(v => !v); 
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');

    try {
      const data = {
        nombre: this.form.value.nombre,
        apellido: this.form.value.apellido,
        email: this.form.value.email,
        telefono: this.form.value.telefono || null,
        contrasena: this.form.value.password,
        rol: 'usuario', // Siempre se registra como usuario normal
      };

      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/auth/register`, data)
      );

      this.success.set(true);
      
      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
    } catch (err: any) {
      console.error(err);
      this.error.set(
        err?.error?.message || 
        err?.error?.errors?.email?.[0] ||
        'Error al registrar. Intenta nuevamente.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  hasError(ctrl: string, err: string) {
    const c = this.form.controls[ctrl];
    return (c.touched || c.dirty) && c.hasError(err);
  }

  hasPasswordMismatch() {
    return this.form.hasError('passwordMismatch') && 
           (this.form.controls['confirmPassword'].touched || this.form.controls['confirmPassword'].dirty);
  }
}

