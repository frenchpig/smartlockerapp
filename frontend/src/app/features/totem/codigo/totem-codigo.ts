import { Component, OnDestroy, inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { DeviceAuthService } from '../../../core/auth/device-auth.service';
import { Html5Qrcode } from 'html5-qrcode';

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
export class TotemCodigoComponent implements OnDestroy, AfterViewInit {
  private readonly http = inject(HttpClient);
  private readonly deviceAuth = inject(DeviceAuthService);
  private readonly router = inject(Router);

  @ViewChild('qrReader', { static: false }) qrReaderElement?: ElementRef<HTMLDivElement>;

  clave = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
  });

  enviando = false;
  exito?: TotemResponse;
  errorMsg = '';
  private clearHandle?: ReturnType<typeof setTimeout>;

  // Modo: 'teclado' o 'qr'
  modo: 'teclado' | 'qr' = 'teclado';
  escaneando = false;
  private html5QrCode?: Html5Qrcode;
  readonly qrScannerId = 'qr-reader';

  // Computed signals from DeviceAuthService
  ubicacion = this.deviceAuth.ubicacion;

  async cerrarSesion() {
    await this.deviceAuth.logout();
    await this.router.navigate(['/totem/device-login']);
  }

  ngAfterViewInit(): void {
    // El lector QR se inicializará cuando se cambie al modo QR
  }

  ngOnDestroy(): void {
    if (this.clearHandle) {
      clearTimeout(this.clearHandle);
    }
    this.detenerLectorQR();
  }

  cambiarModo() {
    if (this.modo === 'teclado') {
      this.modo = 'qr';
      this.limpiar();
      setTimeout(() => this.iniciarLectorQR(), 100);
    } else {
      // Cambiar el modo primero para que el botón no esté deshabilitado
      this.modo = 'teclado';
      // Detener el lector QR de forma asíncrona
      this.detenerLectorQR();
    }
  }

  private async iniciarLectorQR() {
    if (this.escaneando || !this.qrReaderElement) return;

    try {
      this.escaneando = true;
      this.errorMsg = '';

      this.html5QrCode = new Html5Qrcode(this.qrScannerId);

      await this.html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          console.log('[QR Scanner] Código leído:', decodedText);
          
          // Validar que el código sea de 6 dígitos
          if (/^\d{6}$/.test(decodedText)) {
            console.log('[QR Scanner] Código válido, procesando...');
            this.detenerLectorQR();
            // Volver automáticamente al modo teclado
            this.modo = 'teclado';
            this.clave.setValue(decodedText);
            void this.enviar();
          } else {
            console.log('[QR Scanner] Código inválido - no tiene 6 dígitos');
            this.errorMsg = 'El código QR no es válido. Debe contener 6 dígitos.';
            setTimeout(() => {
              this.errorMsg = '';
            }, 3000);
          }
        },
        (errorMessage) => {
          // Ignorar errores de escaneo continuo
        }
      );
    } catch (error: any) {
      console.error('Error iniciando lector QR:', error);
      this.errorMsg = 'No se pudo iniciar la cámara. Verifica los permisos.';
      this.escaneando = false;
      this.modo = 'teclado';
    }
  }

  private detenerLectorQR() {
    // Cambiar el estado inmediatamente para que la UI responda
    this.escaneando = false;
    
    if (this.html5QrCode) {
      this.html5QrCode
        .stop()
        .then(() => {
          this.html5QrCode?.clear();
          this.html5QrCode = undefined;
        })
        .catch((err) => {
          console.error('Error deteniendo lector QR:', err);
          this.html5QrCode = undefined;
        });
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
