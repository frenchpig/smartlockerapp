import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { QRCodeComponent } from 'angularx-qrcode';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';


type Estado = 'Activo' | 'Entregado' | 'Cancelado';
interface Pedido {
  id: number;
  estado: Estado;
  locker: string;
  sede: string;
  creadoEl: string;
}

@Component({
  standalone: true,
  selector: 'app-pedido-clave',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, DatePipe, QRCodeComponent],
  templateUrl: './pedido-clave.html',
  styleUrls: ['./pedido-clave.scss']
})
export class PedidoClave implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  pedido?: Pedido;

  clave = new FormControl<string>('', [
    Validators.required,
    Validators.pattern(/^\d{6}$/),
  ]);

  enviando = false;
  errorMsg = '';
  qrData: string | null = null;
  expiresAt?: string;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);

    if (!idParam || Number.isNaN(id)) {
      this.router.navigate(['/cliente']);
      return;
    }

    this.pedido = { id, estado: 'Activo', locker: '#—', sede: '—', creadoEl: new Date().toISOString() };
    this.cargarPedido(id);

    // En entorno local, intentamos obtener el código vigente para mostrarlo por consola
    if (!environment.production) {
      this.http.get<{ has_code: boolean; is_valid: boolean; code?: string }>(
        `${environment.apiUrl}/reservas/${id}/codigo-temporal/estado`
      ).toPromise().then(r => {
        if (r?.has_code && r.is_valid && r.code) {
          // Solo log para facilitar pruebas locales
          // eslint-disable-next-line no-console
          console.log('[DEV] Código temporal vigente:', r.code);
        }
      }).catch(() => {});
    }
  }

  private mapEstado(estadoApi: string): Estado {
    switch (estadoApi) {
      case 'pendiente': return 'Activo';
      case 'completado': return 'Entregado';
      case 'anulado': return 'Cancelado';
      default: return 'Activo';
    }
  }

  private async cargarPedido(id: number) {
    try {
      const r: any | undefined = await this.http
        .get<any>(`${environment.apiUrl}/reservas/${id}`)
        .toPromise();
      if (r) {
        this.pedido = {
          id: r.id,
          estado: this.mapEstado(r.estado),
          locker: `#${r.locker?.numero ?? r.locker?.id ?? r.locker_id ?? ''}`,
          sede: r.locker?.ubicacion ?? '—',
          creadoEl: r.created_at ?? r.fecha_reserva ?? new Date().toISOString(),
        };
      }
    } catch (e) {
      console.error('No se pudo cargar la reserva', e);
    }
  }


  press(n: string) {
    if (this.enviando) return;
    const v = this.clave.value ?? '';
    if (v.length >= 6) return;
    this.clave.setValue(v + n);

    // Para ingresar sin usar el boton :p
    // if ((this.clave.value?.length ?? 0) === 6) {
    //   this.enviar();
    // }

  }


  borrar() {
    if (this.enviando) return;
    const v = this.clave.value ?? '';
    this.clave.setValue(v.slice(0, -1));
  }

  limpiar() {
    if (this.enviando) return;
    this.clave.setValue('');
    this.errorMsg = '';
    this.qrData = null;
    this.expiresAt = undefined;
  }

  async enviar() {
    if (this.enviando) return;
    if (!this.clave.valid) {
      this.errorMsg = 'Ingresa los 6 dígitos.';
      return;
    }

    this.enviando = true;
    this.errorMsg = '';
    this.qrData = null;

    try {
      await this.http.post(
        `${environment.apiUrl}/reservas/${this.pedido!.id}/codigo-temporal/verificar`,
        { code: this.clave.value }
      ).toPromise();

      // Éxito: volver a la lista del cliente
      this.router.navigate(['/cliente']);
    } catch (err: any) {
      const msg = err?.error?.message || 'Código inválido o vencido';
      this.errorMsg = msg;
    } finally {
      this.enviando = false;
    }
  }

  get lleno(): boolean { /* ... */ return (this.clave.value?.length ?? 0) === 6; }
}
