import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { AuthService } from '../../../core/auth/auth';
import { environment } from '../../../../environments/environment';
import { HeaderEmpresaComponent } from '../shared/header-empresa/header-empresa.component';

interface RepartidorItem {
  id: number;
  disponible: boolean;
  rut: string;
  nombre: string;
  apellido?: string | null;
  email: string;
  telefono?: string | null;
  creadoEn?: string | null;
  actualizadoEn?: string | null;
}

interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface PedidoRepartidor {
  id: number;
  estado: string;
  logistica_estado: string;
  fecha_reserva: string;
  hora_inicio: string;
  locker: {
    id: number;
    numero: number;
    ubicacion: {
      id: number;
      nombre: string;
    };
  };
  usuario: {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
  };
  articulos: Array<{
    id: number;
    nombre: string;
    cantidad: number;
  }>;
}

@Component({
  standalone: true,
  selector: 'app-empresa-repartidores',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HeaderEmpresaComponent, DatePipe],
  templateUrl: './repartidores.html',
  styleUrls: ['./repartidores.scss'],
})
export class EmpresaRepartidoresComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  repartidores: RepartidorItem[] = [];
  loading = false;
  saving = false;
  editingId: number | null = null;
  showEditModal = false;
  showCreateForm = false;
  showPedidosModal = false;
  repartidorSeleccionado: RepartidorItem | null = null;
  pedidosRepartidor: PedidoRepartidor[] = [];
  loadingPedidos = false;
  page = 1;
  perPage = 10;
  lastPage = 1;
  total = 0;
  searchTerm = '';
  errorMsg = '';
  successMsg = '';

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    apellido: ['', [Validators.required, Validators.maxLength(100)]],
    rut: ['', [Validators.required, Validators.pattern(/^\d{7,8}[0-9Kk]$/)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    telefono: ['', [Validators.pattern(/^(\d{8})?$/)]],
  });

  editForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    apellido: ['', [Validators.required, Validators.maxLength(100)]],
    rut: ['', [Validators.required, Validators.pattern(/^\d{7,8}[0-9Kk]$/)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    telefono: ['', [Validators.pattern(/^(\d{8})?$/)]],
    disponible: [true],
  });

  busquedaControl = this.fb.control('', { nonNullable: true });

  async ngOnInit(): Promise<void> {
    await this.auth.fetchMe().catch(() => undefined);
    await this.cargarRepartidores();
  }

  openCreateForm(): void {
    this.showCreateForm = true;
  }

  closeCreateForm(): void {
    this.showCreateForm = false;
    this.form.reset();
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  async cargarRepartidores(page = this.page): Promise<void> {
    this.loading = true;
    this.errorMsg = '';
    try {
      const params: Record<string, string | number> = {
        page,
        per_page: this.perPage,
      };

      if (this.searchTerm) {
        params['search'] = this.searchTerm;
      }

      const res = await this.http
        .get<PaginatedResponse<any>>(`${environment.apiUrl}/empresa/repartidores`, {
          params,
        })
        .toPromise();

      const items = res?.data ?? [];
      this.repartidores = items.map((item) => this.mapRepartidor(item));
      this.page = Number(res?.current_page ?? page) || 1;
      const perPage = Number(res?.per_page ?? this.perPage);
      this.perPage = Number.isFinite(perPage) && perPage > 0 ? perPage : this.perPage;
      this.total = Number(res?.total ?? items.length) || items.length;
      const lastPage = Number(res?.last_page ?? Math.ceil(this.total / Math.max(this.perPage, 1)));
      this.lastPage = Number.isFinite(lastPage) && lastPage > 0 ? lastPage : 1;
    } catch (error) {
      console.error('Error al cargar repartidores', error);
      this.errorMsg = 'No se pudieron cargar los repartidores. Intenta nuevamente.';
      this.repartidores = [];
      this.total = 0;
      this.lastPage = 1;
      this.page = 1;
    } finally {
      this.loading = false;
    }
  }

  private mapRepartidor(data: any): RepartidorItem {
    const rutRaw = data?.rut;
    const rut = typeof rutRaw === 'string' ? this.prepareRut(rutRaw) : '';
    const telefonoRaw = typeof data?.telefono === 'string' ? data.telefono : null;
    return {
      id: Number(data?.id ?? 0),
      disponible: Boolean(data?.disponible),
      rut,
      nombre: String(data?.nombre ?? '').trim(),
      apellido: data?.apellido ?? null,
      email: String(data?.email ?? '').trim(),
      telefono: telefonoRaw,
      creadoEn: data?.created_at ?? null,
      actualizadoEn: data?.updated_at ?? null,
    };
  }

  async crearRepartidor(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';

    const value = this.form.value;
    const rut = this.prepareRut(value.rut);
    const telefono = this.prepareTelefonoPayload(value.telefono);
    const payload: Record<string, unknown> = {
      nombre: (value.nombre ?? '').trim(),
      apellido: (value.apellido ?? '').trim(),
      rut,
      email: (value.email ?? '').trim(),
    };

    if (telefono !== null) {
      payload['telefono'] = telefono;
    }

    try {
      await this.http.post(`${environment.apiUrl}/empresa/repartidores`, payload).toPromise();
      this.successMsg = 'Repartidor creado correctamente.';
      this.closeCreateForm();
      await this.cargarRepartidores();
    } catch (error: any) {
      console.error('Error al crear repartidor', error);
      this.errorMsg = error?.error?.message ?? 'No se pudo crear el repartidor. Intenta nuevamente.';
    } finally {
      this.saving = false;
    }
  }

  iniciarEdicion(item: RepartidorItem): void {
    this.editingId = item.id;
    const telefonoSuffix = this.extractTelefonoSuffix(item.telefono);
    this.editForm.reset({
      nombre: item.nombre,
      apellido: item.apellido ?? '',
      rut: this.prepareRut(item.rut),
      email: item.email,
      telefono: telefonoSuffix,
      disponible: item.disponible,
    });
    this.successMsg = '';
    this.errorMsg = '';
    this.showEditModal = true;
  }

  cancelarEdicion(): void {
    this.editingId = null;
    this.editForm.reset();
    this.showEditModal = false;
  }

  async guardarEdicion(): Promise<void> {
    if (!this.editingId) {
      return;
    }

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';

    const value = this.editForm.value;
    const rut = this.prepareRut(value.rut);
    const telefono = this.prepareTelefonoPayload(value.telefono);

    const payload: Record<string, unknown> = {
      nombre: (value.nombre ?? '').trim(),
      apellido: (value.apellido ?? '').trim(),
      rut,
      email: (value.email ?? '').trim(),
      disponible: value.disponible ?? true,
    };

    if (value.telefono === '') {
      payload['telefono'] = null;
    } else if (telefono !== null) {
      payload['telefono'] = telefono;
    }

    try {
      await this.http
        .put(`${environment.apiUrl}/empresa/repartidores/${this.editingId}`, payload)
        .toPromise();

      this.successMsg = 'Repartidor actualizado correctamente.';
      this.editingId = null;
      this.editForm.reset();
      this.showEditModal = false;
      await this.cargarRepartidores();
    } catch (error: any) {
      console.error('Error al actualizar repartidor', error);
      this.errorMsg = error?.error?.message ?? 'No se pudo actualizar el repartidor.';
    } finally {
      this.saving = false;
    }
  }

  async eliminar(item: RepartidorItem): Promise<void> {
    const confirmado = window.confirm(
      `¿Seguro que deseas eliminar al repartidor ${item.nombre || ''} ${item.apellido || ''}?`,
    );

    if (!confirmado) {
      return;
    }

    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';

    try {
      await this.http
        .delete(`${environment.apiUrl}/empresa/repartidores/${item.id}`)
        .toPromise();

      this.successMsg = 'Repartidor eliminado correctamente.';
      if (this.editingId === item.id) {
        this.cancelarEdicion();
      }
      const nextPage =
        this.repartidores.length === 1 && this.page > 1 ? this.page - 1 : this.page;
      await this.cargarRepartidores(nextPage);
    } catch (error: any) {
      console.error('Error al eliminar repartidor', error);
      this.errorMsg = error?.error?.message ?? 'No se pudo eliminar el repartidor.';
    } finally {
      this.saving = false;
    }
  }

  async aplicarFiltro(): Promise<void> {
    this.searchTerm = this.busquedaControl.value.trim();
    await this.cargarRepartidores(1);
  }

  async limpiarFiltro(): Promise<void> {
    this.busquedaControl.setValue('');
    this.searchTerm = '';
    await this.cargarRepartidores(1);
  }

  async cambiarPerPage(value: number): Promise<void> {
    const parsed = Number(value);
    this.perPage = Number.isFinite(parsed) && parsed > 0 ? parsed : this.perPage;
    await this.cargarRepartidores(1);
  }

  async paginaAnterior(): Promise<void> {
    if (this.page > 1) {
      await this.cargarRepartidores(this.page - 1);
    }
  }

  async paginaSiguiente(): Promise<void> {
    if (this.page < this.lastPage) {
      await this.cargarRepartidores(this.page + 1);
    }
  }

  onTelefonoInput(formType: 'create' | 'edit', event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 8);
    input.value = digits;

    const control =
      formType === 'create'
        ? this.form.get('telefono')
        : this.editForm.get('telefono');

    control?.setValue(digits, { emitEvent: false });
  }

  onRutInput(formType: 'create' | 'edit', event: Event): void {
    const input = event.target as HTMLInputElement;
    const sanitized = input.value.replace(/[^0-9Kk]/g, '').toUpperCase().slice(0, 9);
    input.value = sanitized;

    const control =
      formType === 'create'
        ? this.form.get('rut')
        : this.editForm.get('rut');

    control?.setValue(sanitized, { emitEvent: false });
  }

  formatRut(rut: string | null | undefined): string {
    const sanitized = this.prepareRut(rut);
    if (!sanitized) {
      return 'Sin registrar';
    }

    const cuerpo = sanitized.slice(0, -1);
    const verificador = sanitized.slice(-1);
    const conPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${conPuntos}-${verificador}`;
  }

  formatTelefono(telefono: string | null | undefined): string {
    if (!telefono) {
      return 'Sin registro';
    }
    const digits = telefono.replace(/\D/g, '');
    if (digits.length !== 11 || !digits.startsWith('569')) {
      return telefono;
    }
    const cuerpo = digits.slice(3);
    return `+56 9 ${cuerpo.slice(0, 4)} ${cuerpo.slice(4)}`;
  }

  trackById(_index: number, item: RepartidorItem): number {
    return item.id;
  }

  private prepareRut(raw: string | null | undefined): string {
    return (raw ?? '').replace(/[^0-9Kk]/g, '').toUpperCase();
  }

  private extractTelefonoSuffix(raw: string | null | undefined): string {
    const digits = (raw ?? '').replace(/\D/g, '');
    if (digits.startsWith('569') && digits.length >= 11) {
      return digits.slice(-8);
    }
    if (digits.length === 8) {
      return digits;
    }
    return '';
  }

  private prepareTelefonoPayload(raw: string | null | undefined): string | null {
    const digits = (raw ?? '').replace(/\D/g, '');
    if (digits.length === 0) {
      return null;
    }
    if (digits.length !== 8) {
      return null;
    }
    return `569${digits}`;
  }

  async verPedidos(item: RepartidorItem): Promise<void> {
    this.repartidorSeleccionado = item;
    this.showPedidosModal = true;
    this.loadingPedidos = true;
    this.pedidosRepartidor = [];
    this.errorMsg = '';
    
    try {
      const res = await this.http
        .get<any>(`${environment.apiUrl}/empresa/repartidores/${item.id}/pedidos`)
        .toPromise();
      
      this.pedidosRepartidor = res?.reservas ?? [];
    } catch (error: any) {
      console.error('Error cargando pedidos del repartidor:', error);
      this.errorMsg = error?.error?.message || 'Error al cargar los pedidos';
      this.pedidosRepartidor = [];
    } finally {
      this.loadingPedidos = false;
    }
  }

  cerrarPedidosModal(): void {
    this.showPedidosModal = false;
    this.repartidorSeleccionado = null;
    this.pedidosRepartidor = [];
    this.errorMsg = '';
  }

  async marcarEnRuta(pedidoId: number): Promise<void> {
    if (this.saving) return;
    
    this.saving = true;
    this.errorMsg = '';
    
    try {
      await this.http
        .post(`${environment.apiUrl}/reservas/${pedidoId}/en-ruta`, {})
        .toPromise();
      
      // Recargar pedidos
      if (this.repartidorSeleccionado) {
        await this.verPedidos(this.repartidorSeleccionado);
      }
    } catch (error: any) {
      console.error('Error marcando en ruta:', error);
      this.errorMsg = error?.error?.message || 'Error al marcar como en ruta';
    } finally {
      this.saving = false;
    }
  }

  async marcarEntregado(pedidoId: number): Promise<void> {
    if (this.saving) return;
    
    this.saving = true;
    this.errorMsg = '';
    
    try {
      await this.http
        .post(`${environment.apiUrl}/reservas/${pedidoId}/entregar`, {})
        .toPromise();
      
      // Recargar pedidos
      if (this.repartidorSeleccionado) {
        await this.verPedidos(this.repartidorSeleccionado);
      }
    } catch (error: any) {
      console.error('Error marcando como entregado:', error);
      this.errorMsg = error?.error?.message || 'Error al marcar como entregado';
    } finally {
      this.saving = false;
    }
  }

  getEstadoLogisticaLabel(estado: string): string {
    const estados: Record<string, string> = {
      'pendiente_repartidor': 'Pendiente',
      'asignado': 'Asignado',
      'en_camino': 'En camino',
      'completado': 'Completado',
    };
    return estados[estado] || estado;
  }

  getEstadoLogisticaBadge(estado: string): string {
    const badges: Record<string, string> = {
      'pendiente_repartidor': 'badge-warning',
      'asignado': 'badge-info',
      'en_camino': 'badge-primary',
      'completado': 'badge-success',
    };
    return badges[estado] || 'badge-secondary';
  }

  puedeMarcarEnRuta(pedido: PedidoRepartidor): boolean {
    return pedido.estado === 'pendiente' && 
           (pedido.logistica_estado === 'asignado' || pedido.logistica_estado === 'pendiente_repartidor');
  }

  puedeMarcarEntregado(pedido: PedidoRepartidor): boolean {
    return pedido.logistica_estado === 'en_camino' || pedido.logistica_estado === 'asignado';
  }
}

