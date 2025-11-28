import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../core/auth/auth';
import { environment } from '../../../../../environments/environment';
import { IncidenciaModalService } from './incidencia-modal.service';
import { Subscription } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-modal-incidencia',
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-incidencia.html',
  styleUrls: ['./modal-incidencia.scss']
})
export class ModalIncidencia implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly modalService = inject(IncidenciaModalService);

  showModal = false;
  loading = false;
  pedido = this.modalService.pedido;
  form = this.modalService.form;

  private subscriptions: Subscription[] = [];

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
    switch (this.form.tipo) {
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

  get user() {
    return this.auth.user();
  }

  get soloLocker(): boolean {
    return !this.pedido;
  }

  ngOnInit(): void {
    // Suscribirse a los cambios del servicio
    this.subscriptions.push(
      this.modalService.showModal$.subscribe(show => {
        this.showModal = show;
      }),
      this.modalService.pedido$.subscribe(pedido => {
        this.pedido = pedido;
      }),
      this.modalService.form$.subscribe(form => {
        this.form = form;
      }),
      this.modalService.loading$.subscribe(loading => {
        this.loading = loading;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  cerrarModal() {
    this.modalService.cerrarModal();
  }

  onTipoChange(value: string) {
    this.modalService.setForm({ tipo: value as 'locker' | 'pedido' | 'otro', problema_tipo: '' });
  }

  onProblemaTipoChange(value: string) {
    this.modalService.setForm({ problema_tipo: value });
  }

  onDescripcionChange(value: string) {
    this.modalService.setForm({ descripcion: value });
  }

  async reportar() {
    if (!this.pedido || !this.user) {
      return;
    }

    if (!this.form.descripcion.trim()) {
      alert('Por favor, describe el problema.');
      return;
    }

    if (this.form.tipo === 'pedido' && !this.form.problema_tipo) {
      alert('Por favor, selecciona el tipo de problema.');
      return;
    }

    if (!this.pedido.lockerId) {
      alert('No se pudo identificar el locker. Por favor, intenta nuevamente.');
      return;
    }

    this.modalService.setLoading(true);

    try {
      const payload: any = {
        tipo: this.form.tipo,
        locker_id: this.pedido.lockerId,
        usuario_id: this.user.id,
        descripcion: this.form.descripcion.trim(),
        estado: 'pendiente'
      };

      if (this.form.problema_tipo) {
        payload.problema_tipo = this.form.problema_tipo;
      }

      if (this.form.tipo === 'pedido') {
        payload.reserva_id = this.pedido.id;
      }

      await this.http.post(`${environment.apiUrl}/incidencias`, payload).toPromise();
      
      alert('Incidencia reportada exitosamente. Nos pondremos en contacto contigo pronto.');
      this.cerrarModal();
    } catch (error: any) {
      console.error('Error reportando incidencia:', error);
      const mensaje = error?.error?.message || 'No se pudo reportar la incidencia. Intenta nuevamente.';
      alert(mensaje);
    } finally {
      this.modalService.setLoading(false);
    }
  }
}

