import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

type Estado = 'Activo' | 'Entregado' | 'Cancelado';
interface Pedido {
  id: number;
  estado: Estado;
  locker: string;
  sede: string;
  latitud?: number | null;
  longitud?: number | null;
  creadoEl: string;
}

type EstadoCodigoResponse = {
  has_code: boolean;
  is_valid: boolean;
  expires_at?: string;
  code?: string;
};

type CodigoResponse = {
  code: string;
  expires_at: string;
  valid_for_seconds: number;
};

@Component({
  standalone: true,
  selector: 'app-pedido-clave',
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './pedido-clave.html',
  styleUrls: ['./pedido-clave.scss']
})
export class PedidoClave implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  pedido?: Pedido;
  codigo?: string;
  expiresAt?: string;
  errorMsg = '';
  loadingCodigo = false;
  private checkingEstado = false;
  private pollHandle?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);

    if (!idParam || Number.isNaN(id)) {
      this.router.navigate(['/cliente']);
      return;
    }

    this.pedido = { id, estado: 'Activo', locker: '#---', sede: '---', creadoEl: new Date().toISOString() };
    void this.inicializar(id);
  }

  ngOnDestroy(): void {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
    }
  }

  private async inicializar(id: number) {
    await this.cargarPedido(id);
    await this.ensureCodigoDisponible();
    this.iniciarPolling();

    if (!environment.production) {
      console.log('[DEV] Monitor de código temporal activo para reserva', id);
    }
  }

  private iniciarPolling(): void {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
    }

    this.pollHandle = setInterval(() => {
      void this.verificarEstadoCodigo();
    }, 5000);
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
      const r = await this.http
        .get<any>(`${environment.apiUrl}/reservas/${id}`)
        .toPromise();
      if (r) {
        this.pedido = {
          id: r.id,
          estado: this.mapEstado(r.estado),
          locker: `#${r.locker?.numero ?? r.locker?.id ?? r.locker_id ?? ''}`,
          sede: r.locker?.ubicacion?.nombre ?? '---',
          latitud: r.locker?.ubicacion?.latitud ?? null,
          longitud: r.locker?.ubicacion?.longitud ?? null,
          creadoEl: r.created_at ?? r.fecha_reserva ?? new Date().toISOString(),
        };
      }
    } catch (e) {
      console.error('No se pudo cargar la reserva', e);
    }
  }

  private async ensureCodigoDisponible() {
    if (!this.pedido) return;

    this.loadingCodigo = true;
    this.errorMsg = '';

    try {
      const tieneCodigo = await this.actualizarCodigoDesdeEstado();
      if (!tieneCodigo) {
        await this.generarNuevoCodigo();
      }
    } finally {
      this.loadingCodigo = false;
    }
  }

  private async actualizarCodigoDesdeEstado(): Promise<boolean> {
    if (!this.pedido) return false;

    try {
      const estado = await this.http
        .get<EstadoCodigoResponse>(`${environment.apiUrl}/reservas/${this.pedido.id}/codigo-temporal/estado`)
        .toPromise();

      if (estado?.has_code && estado.is_valid) {
        if (estado.code) {
          this.codigo = estado.code;
        }
        this.expiresAt = estado.expires_at;
        this.errorMsg = '';
        return true;
      }

      this.codigo = undefined;
      this.expiresAt = estado?.expires_at;
      return false;
    } catch (error: any) {
      console.error('No se pudo consultar el estado del código temporal', error);
      this.errorMsg = error?.error?.message ?? 'No se pudo consultar el estado del código temporal.';
      return false;
    }
  }

  private async generarNuevoCodigo(): Promise<boolean> {
    if (!this.pedido) return false;

    try {
      const data = await this.http
        .post<CodigoResponse>(`${environment.apiUrl}/reservas/${this.pedido.id}/codigo-temporal`, {})
        .toPromise();

      if (data?.code) {
        this.codigo = data.code;
        this.expiresAt = data.expires_at;
        this.errorMsg = '';
        return true;
      }

      this.errorMsg = 'No se pudo obtener un nuevo código temporal.';
      return false;
    } catch (error: any) {
      console.error('No se pudo generar un nuevo código temporal', error);
      this.errorMsg = error?.error?.message ?? 'No se pudo generar un nuevo código temporal.';
      return false;
    }
  }

  private async verificarEstadoCodigo() {
    if (!this.pedido || this.checkingEstado) return;

    this.checkingEstado = true;

    try {
      const vigente = await this.actualizarCodigoDesdeEstado();
      if (vigente) return;

      await this.cargarPedido(this.pedido.id);
      if (this.pedido?.estado !== 'Activo') {
        this.router.navigate(['/cliente']);
        return;
      }

      await this.generarNuevoCodigo();
    } finally {
      this.checkingEstado = false;
    }
  }

  get codigoDigits(): string[] {
    const digits = this.codigo ? this.codigo.split('') : [];
    return Array.from({ length: 6 }, (_, i) => digits[i] ?? '–');
  }
}
