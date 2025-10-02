// src/app/features/auth/login/login.ts
import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',      
  styleUrls: ['./login.scss']       
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  currentYear = new Date().getFullYear();
  loading = signal(false);
  showPassword = signal(false);

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    remember: [true]
  });

  togglePassword() { this.showPassword.update(v => !v); }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    setTimeout(() => {
      this.loading.set(false);
      alert('Inicio de sesión OK');
    }, 900);
  }

  hasError(ctrl: 'email'|'password', err: string) {
    const c = this.form.controls[ctrl];
    return (c.touched || c.dirty) && c.hasError(err);
  }
}
