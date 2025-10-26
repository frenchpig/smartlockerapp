import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { DeviceAuthService } from '../../../core/auth/device-auth.service';

type TotemResponse = {
  message: string;
  reserva_id: number;
  locker?: {
    id?: number;
    numero?: number;
    ubicacion?: string;
  };
  completado_en?: string;
};

@Component({
  standalone: true,
  selector: 'app-totem-codigo',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './totem-codigo.html',
  styleUrls: ['./totem-codigo.scss']
})
export class TotemCodigoComponent implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly deviceAuth = inject(DeviceAuthService);
  private readonly router = inject(Router);

  clave = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
  });

  enviando = false;
  exito?: TotemResponse;
  errorMsg = '';
  private clearHandle?: ReturnType<typeof setTimeout>;

  // Computed signals from DeviceAuthService
  ubicacion = this.deviceAuth.ubicacion;

  async cerrarSesion() {
    await this.deviceAuth.logout();
    await this.router.navigate(['/totem/device-login']);
  }

  ngOnDestroy(): void {
    if (this.clearHandle) {
      clearTimeout(this.clearHandle);
    }
  }

  press(n: string) {
    if (this.enviando) return;
    const current = this.clave.value;
    if (current.length >= 6) return;
    this.clave.setValue(current + n);

    if (this.clave.value.length === 6) {
      void this.enviar();
    }
  }

  borrar() {
    if (this.enviando) return;
    const current = this.clave.value;
    this.clave.setValue(current.slice(0, -1));
  }

  limpiar() {
    if (this.enviando) return;
    this.clave.setValue('');
    this.errorMsg = '';
    this.exito = undefined;
  }

  async enviar() {
    if (this.enviando || !this.clave.valid) return;

    this.enviando = true;
    this.errorMsg = '';
    this.exito = undefined;

    try {
      const res = await this.http
        .post<TotemResponse>(`${environment.apiUrl}/totem/codigo-temporal/verificar`, { code: this.clave.value })
        .toPromise();

      if (res) {
        this.exito = res;
        this.scheduleClear();
      } else {
        this.errorMsg = 'No se recibió respuesta del servidor.';
      }
    } catch (error: any) {
      this.errorMsg = error?.error?.message ?? 'No se pudo validar el código. Intenta nuevamente.';
    } finally {
      this.enviando = false;
      this.clave.setValue('');
    }
  }

  get lleno(): boolean {
    return this.clave.valid;
  }

  private scheduleClear() {
    if (this.clearHandle) {
      clearTimeout(this.clearHandle);
    }
    this.clearHandle = setTimeout(() => {
      this.exito = undefined;
    }, 5000);
  }
}
