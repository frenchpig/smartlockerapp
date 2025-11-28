import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth';
import { QRCodeComponent } from 'angularx-qrcode';

type Estado = 'Activo' | 'Entregado' | 'Cancelado';
interface Pedido {
  id: number;
  estado: Estado;
  locker: string;
  lockerId?: number;
  sede: string;
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
  selector: 'app-pedido-qr',
  imports: [CommonModule, RouterModule, DatePipe, FormsModule, QRCodeComponent],
  templateUrl: './pedido-qr.html',
  styleUrls: ['./pedido-qr.scss']
})
export class PedidoQr implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  pedido?: Pedido;
  cargando = true;
  errorMsg = '';
  codigo?: string;
  expiresAt?: string;
  loadingCodigo = false;
  private checkingEstado = false;
  private pollHandle?: ReturnType<typeof setInterval>;

  // Modal de incidencia
  showIncidenciaModal = false;
  incidenciaLoading = false;
  incidenciaForm = {
    tipo: 'pedido' as 'locker' | 'pedido' | 'otro',
    problema_tipo: '',
    descripcion: ''
  };

  // Tipos de problemas según el tipo de incidencia
  problemasLocker = [
    { value: 'no_se_abre', label: 'No se abre' },
    { value: 'no_se_cierra', label: 'No se cierra' },
    { value: 'dañado', label: 'Dañado' },
    { value: 'bloqueado', label: 'Bloqueado' },
    { value: 'sin_energia', label: 'Sin energía' },
    { value: 'codigo_no_funciona', label: 'Código no funciona' },
    { value: 'sensor_defectuoso', label: 'Sensor defectuoso' },
    { value: 'otro', label: 'Otro' }
  ];

  problemasPedido = [
    { value: 'pedido_incorrecto', label: 'Pedido incorrecto' },
    { value: 'pedido_dañado', label: 'Pedido dañado' },
    { value: 'pedido_faltante', label: 'Pedido faltante' },
    { value: 'pedido_extraviado', label: 'Pedido extraviado' },
    { value: 'pedido_no_es_el_solicitado', label: 'No es el pedido solicitado' },
    { value: 'articulos_faltantes', label: 'Artículos faltantes' },
    { value: 'articulos_dañados', label: 'Artículos dañados' },
    { value: 'pedido_retrasado', label: 'Pedido retrasado' },
    { value: 'otro', label: 'Otro' }
  ];

  problemasOtro = [
    { value: 'problema_general', label: 'Problema general' },
    { value: 'otro', label: 'Otro' }
  ];

  get problemasDisponibles() {
    switch (this.incidenciaForm.tipo) {
      case 'locker':
        return this.problemasLocker;
      case 'pedido':
        return this.problemasPedido;
      case 'otro':
        return this.problemasOtro;
      default:
        return [];
    }
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);
    if (!idParam || Number.isNaN(id)) {
      this.router.navigate(['/cliente']);
      return;
    }

    this.pedido = {
      id,
      estado: 'Activo',
      locker: '#---',
      sede: '---',
      creadoEl: new Date().toISOString(),
    };
    
    void this.inicializar(id);
  }

  ngOnDestroy(): void {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
    }
  }

  private async inicializar(id: number) {
    await this.cargarPedido(id);
    
    // Validar que el pedido no esté cancelado o completado
    if (this.pedido?.estado === 'Cancelado' || this.pedido?.estado === 'Entregado') {
      alert('Este pedido no está disponible para obtener un código.');
      this.router.navigate(['/cliente']);
      return;
    }
    
    this.cargando = false;
    await this.ensureCodigoDisponible();
    this.iniciarPolling();
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

  private async cargarPedido(id: number): Promise<void> {
    try {
      const r = await this.http
        .get<any>(`${environment.apiUrl}/reservas/${id}`)
        .toPromise();
      if (r) {
        this.pedido = {
          id: r.id,
          estado: this.mapEstado(r.estado),
          locker: `#${r.locker?.numero ?? r.locker?.id ?? r.locker_id ?? ''}`,
          lockerId: r.locker?.id ?? r.locker_id ?? null,
          sede: r.locker?.ubicacion?.nombre ?? '---',
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
      // Si el pedido está cancelado o completado, redirigir
      if (this.pedido?.estado === 'Cancelado' || this.pedido?.estado === 'Entregado') {
        this.router.navigate(['/cliente']);
        return;
      }
      
      if (this.pedido?.estado !== 'Activo') {
        this.router.navigate(['/cliente']);
        return;
      }

      await this.generarNuevoCodigo();
    } finally {
      this.checkingEstado = false;
    }
  }

  volver() {
    this.router.navigate(['/cliente']);
  }

  reintentar() {
    this.errorMsg = '';
    void this.ensureCodigoDisponible();
  }

  abrirModalIncidencia() {
    this.incidenciaForm = {
      tipo: 'pedido',
      problema_tipo: '',
      descripcion: ''
    };
    this.showIncidenciaModal = true;
  }

  cerrarModalIncidencia() {
    this.showIncidenciaModal = false;
    this.incidenciaForm = {
      tipo: 'pedido',
      problema_tipo: '',
      descripcion: ''
    };
  }

  async reportarIncidencia() {
    if (!this.pedido || !this.auth.user()) {
      return;
    }

    if (!this.incidenciaForm.descripcion.trim()) {
      alert('Por favor, describe el problema.');
      return;
    }

    if (this.incidenciaForm.tipo === 'pedido' && !this.incidenciaForm.problema_tipo) {
      alert('Por favor, selecciona el tipo de problema.');
      return;
    }

    if (!this.pedido.lockerId) {
      alert('No se pudo identificar el locker. Por favor, intenta nuevamente.');
      return;
    }

    this.incidenciaLoading = true;

    try {
      const payload: any = {
        tipo: this.incidenciaForm.tipo,
        locker_id: this.pedido.lockerId,
        usuario_id: this.auth.user()!.id,
        descripcion: this.incidenciaForm.descripcion.trim(),
        estado: 'pendiente'
      };

      if (this.incidenciaForm.problema_tipo) {
        payload.problema_tipo = this.incidenciaForm.problema_tipo;
      }

      if (this.incidenciaForm.tipo === 'pedido') {
        payload.reserva_id = this.pedido.id;
      }

      await this.http.post(`${environment.apiUrl}/incidencias`, payload).toPromise();
      
      alert('Incidencia reportada exitosamente. Nos pondremos en contacto contigo pronto.');
      this.cerrarModalIncidencia();
    } catch (error: any) {
      console.error('Error reportando incidencia:', error);
      const mensaje = error?.error?.message || 'No se pudo reportar la incidencia. Intenta nuevamente.';
      alert(mensaje);
    } finally {
      this.incidenciaLoading = false;
    }
  }
}
