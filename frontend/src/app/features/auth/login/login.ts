import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private auth = inject(AuthService);

  currentYear = new Date().getFullYear();
  loading = signal(false);
  showPassword = signal(false);

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    remember: [true]
  });

  togglePassword() { this.showPassword.update(v => !v); }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    try {
      await this.auth.login({
        email: this.form.value.email,
        password: this.form.value.password,
        remember: !!this.form.value.remember
      });
      await this.router.navigate(['/dashboard']);
    } catch (err: any) {
      console.error(err);
      alert(err?.error?.message || 'Credenciales inválidas o error de servidor');
    } finally {
      this.loading.set(false);
    }
  }

  hasError(ctrl: 'email'|'password', err: string) {
    const c = this.form.controls[ctrl];
    return (c.touched || c.dirty) && c.hasError(err);
  }
}
