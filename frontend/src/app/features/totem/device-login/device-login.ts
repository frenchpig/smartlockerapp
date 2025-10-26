import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DeviceAuthService } from '../../../core/auth/device-auth.service';

@Component({
  standalone: true,
  selector: 'app-device-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './device-login.html',
  styleUrls: ['./device-login.scss']
})
export class DeviceLoginComponent {
  private readonly deviceAuth = inject(DeviceAuthService);
  private readonly router = inject(Router);

  username = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  password = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  enviando = false;
  errorMsg = '';

  enviar() {
    if (this.enviando || !this.username.valid || !this.password.valid) return;

    this.enviando = true;
    this.errorMsg = '';

    this.doLogin();
  }

  private async doLogin() {
    try {
      console.log('Intentando login con:', { username: this.username.value });
      
      await this.deviceAuth.login({
        username: this.username.value,
        password: this.password.value,
      });
      
      console.log('Login exitoso, redirigiendo...');
      
      // Redirect to totem code entry
      await this.router.navigate(['/totem/codigo']);
    } catch (error: any) {
      console.error('Error en login:', error);
      this.errorMsg = error?.error?.message ?? error?.message ?? 'Credenciales inválidas';
    } finally {
      this.enviando = false;
    }
  }
}

