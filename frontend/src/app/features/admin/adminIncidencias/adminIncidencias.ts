import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { HeaderAdmin } from '../shared/header-admin/headerAdmin';

type IncidenciaEstado = 'resuelto' | 'pendiente' | 'anulada' | string;
type IncidenciaTipo = 'locker' | 'pedido' | 'otro' | string;

interface Incidencia {
  id: number;
  tipo: IncidenciaTipo;
  problema_tipo: string | null;
  problema_tipo_label: string | null;
  descripcion: string;
  estado: IncidenciaEstado;
  estadoLabel: string;
  fecha: Date;
  locker: string | null;
  ubicacion: string | null;
  usuario: {
    id: number;
    nombre: string;
    email: string;
  } | null;
  reserva: {
    id: number;
    empresa?: { id: number; nombre: string; email: string } | null;
  } | null;
  puedeGestionar: boolean; // Solo true para incidencias de tipo 'locker'
  tieneSoporte24_7?: boolean; // Si la empresa tiene plan con soporte 24/7
  tecnico?: {
    id: number;
    nombre: string;
    email: string;
  } | null;
  disponible_para_cerrar?: boolean;
}

interface IncidenciaResponse {
  id: number;
  tipo: string;
  problema_tipo?: string | null;
  descripcion: string;
  estado: string;
  created_at: string;
  locker?: {
    id: number;
    numero: string;
    ubicacion?: {
      nombre: string;
    } | null;
  } | null;
  usuario?: {
    id: number;
    nombre: string;
    email: string;
  } | null;
  reserva?: {
    id: number;
    empresa?: { id: number; nombre: string; email: string } | null;
    ubicacion_destino?: { id: number; nombre: string } | null;
  } | null;
  empresa_tiene_soporte_24_7?: boolean;
  tecnico?: {
    id: number;
    nombre: string;
    email: string;
  } | null;
  disponible_para_cerrar?: boolean;
}

interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

@Component({
  standalone: true,
  selector: 'app-admin-incidencias',
  imports: [CommonModule, FormsModule, RouterModule, DatePipe, HeaderAdmin],
  templateUrl: './adminIncidencias.html',
  styleUrls: ['./adminIncidencias.scss'],
})
export class AdminIncidencias implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);

  // Listado de incidencias
  private _incidencias = signal<Incidencia[]>([]);
  incidencias = this._incidencias.asReadonly();

  cargando = signal(false);
  errorMsg = signal('');
  successMsg = signal('');

  // Modal de confirmación
  mostrarModalConfirmacion = signal(false);
  incidenciaSeleccionada: Incidencia | null = null;
  nuevoEstadoSeleccionado: 'resuelto' | 'pendiente' | 'anulada' | null = null;

  // Paginación
  page = 1;
  pageSize = 20;
  lastPage = 1;
  total = 0;

  // Filtros - Inicializar con filtro de tipo Locker activado
  filtroEstado = '';
  filtroTipo = 'locker'; // Filtro inicial activado
  filtroProblema = '';

  // Estados y tipos disponibles para filtros
  estadosDisponibles = [
    { value: '', label: 'Todos' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'resuelto', label: 'Resuelta' },
    { value: 'anulada', label: 'Anulada' },
  ];

  tiposDisponibles = [
    { value: '', label: 'Todos' },
    { value: 'locker', label: 'Locker' },
    { value: 'pedido', label: 'Pedido' },
    { value: 'otro', label: 'Otro' },
  ];

  problemasDisponibles = [
    { value: '', label: 'Todos' },
    { value: 'no_se_abre', label: 'No se Abre' },
    { value: 'no_se_cierra', label: 'No se Cierra' },
    { value: 'dañado', label: 'Dañado' },
    { value: 'bloqueado', label: 'Bloqueado' },
    { value: 'sin_energia', label: 'Sin Energía' },
    { value: 'codigo_no_funciona', label: 'Código no Funciona' },
    { value: 'sensor_defectuoso', label: 'Sensor Defectuoso' },
    { value: 'pedido_incorrecto', label: 'Pedido Incorrecto' },
    { value: 'pedido_dañado', label: 'Pedido Dañado' },
    { value: 'pedido_faltante', label: 'Pedido Faltante' },
    { value: 'pedido_extraviado', label: 'Pedido Extraviado' },
    { value: 'articulos_faltantes', label: 'Artículos Faltantes' },
    { value: 'articulos_dañados', label: 'Artículos Dañados' },
    { value: 'pedido_retrasado', label: 'Pedido Retrasado' },
    { value: 'problema_general', label: 'Problema General' },
    { value: 'otro', label: 'Otro' },
  ];

  // Estados disponibles para cambiar (solo para lockers)
  estadosDisponiblesCambio = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'resuelto', label: 'Resuelta' },
    { value: 'anulada', label: 'Anulada' },
  ];

  async ngOnInit(): Promise<void> {
    // El filtro de tipo 'locker' ya está activado por defecto
    // Cargar incidencias con el filtro aplicado
    await this.cargarIncidencias();
  }

  async cargarIncidencias(page = 1): Promise<void> {
    this.cargando.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');

    try {
      const params: Record<string, string | number> = {
        page,
        per_page: this.pageSize,
      };

      // Agregar filtros si existen
      if (this.filtroEstado) params['estado'] = this.filtroEstado;
      if (this.filtroTipo) params['tipo'] = this.filtroTipo;
      if (this.filtroProblema) params['problema_tipo'] = this.filtroProblema;

      const resp = await firstValueFrom(
        this.http.get<PaginatedResponse<IncidenciaResponse>>(
          `${environment.apiUrl}/incidencias`,
          { params }
        )
      );

      const mapped = (resp?.data ?? []).map((inc) => this.mapIncidencia(inc));
      
      // Ordenar: primero empresas con soporte 24/7 y pendientes, luego las demás
      const ordenadas = mapped.sort((a, b) => {
        // Prioridad 1: Empresas con soporte 24/7 y pendientes
        const aPrioritario = a.tieneSoporte24_7 && a.estado === 'pendiente';
        const bPrioritario = b.tieneSoporte24_7 && b.estado === 'pendiente';
        if (aPrioritario && !bPrioritario) return -1;
        if (!aPrioritario && bPrioritario) return 1;
        
        // Prioridad 2: Pendientes (sin soporte 24/7)
        if (a.estado === 'pendiente' && b.estado !== 'pendiente') return -1;
        if (a.estado !== 'pendiente' && b.estado === 'pendiente') return 1;
        
        // Prioridad 3: Empresas con soporte 24/7 (resueltas/anuladas) antes que otras
        if (a.tieneSoporte24_7 && !b.tieneSoporte24_7) return -1;
        if (!a.tieneSoporte24_7 && b.tieneSoporte24_7) return 1;
        
        // Si están en la misma categoría, ordenar por fecha (más recientes primero)
        return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
      });
      
      this._incidencias.set(ordenadas);
      this.page = Number(resp?.current_page ?? page) || 1;
      this.lastPage = Number(resp?.last_page ?? 1) || 1;
      this.total = Number(resp?.total ?? 0) || 0;
    } catch (err) {
      console.error('Error cargando incidencias:', err);
      this.errorMsg.set('No fue posible cargar las incidencias.');
      this._incidencias.set([]);
    } finally {
      this.cargando.set(false);
    }
  }

  private mapIncidencia(raw: IncidenciaResponse): Incidencia {
    const estadoLabels: Record<string, string> = {
      'resuelto': 'Resuelta',
      'pendiente': 'Pendiente',
      'anulada': 'Anulada',
    };

    const problemaLabels: Record<string, string> = {
      'pedido_incorrecto': 'Pedido Incorrecto',
      'pedido_dañado': 'Pedido Dañado',
      'pedido_faltante': 'Pedido Faltante',
      'pedido_extraviado': 'Pedido Extraviado',
      'pedido_no_es_el_solicitado': 'No es el Pedido Solicitado',
      'articulos_faltantes': 'Artículos Faltantes',
      'articulos_dañados': 'Artículos Dañados',
      'pedido_retrasado': 'Pedido Retrasado',
      'no_se_abre': 'No se Abre',
      'no_se_cierra': 'No se Cierra',
      'dañado': 'Dañado',
      'bloqueado': 'Bloqueado',
      'sin_energia': 'Sin Energía',
      'codigo_no_funciona': 'Código no Funciona',
      'sensor_defectuoso': 'Sensor Defectuoso',
      'problema_general': 'Problema General',
      'otro': 'Otro',
    };

    const tipo = (raw.tipo as IncidenciaTipo) || 'otro';
    const puedeGestionar = tipo === 'locker'; // Solo puede gestionar incidencias de lockers

    return {
      id: raw.id,
      tipo,
      problema_tipo: raw.problema_tipo ?? null,
      problema_tipo_label: raw.problema_tipo 
        ? (problemaLabels[raw.problema_tipo] || raw.problema_tipo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
        : null,
      descripcion: raw.descripcion || '',
      estado: (raw.estado as IncidenciaEstado) || 'pendiente',
      estadoLabel: estadoLabels[raw.estado] || raw.estado,
      fecha: raw.created_at ? new Date(raw.created_at) : new Date(),
      locker: raw.locker?.numero ?? null,
      ubicacion: raw.locker?.ubicacion?.nombre ?? raw.reserva?.ubicacion_destino?.nombre ?? null,
      usuario: raw.usuario ? {
        id: raw.usuario.id,
        nombre: raw.usuario.nombre,
        email: raw.usuario.email,
      } : null,
      reserva: raw.reserva ? {
        id: raw.reserva.id,
        empresa: raw.reserva.empresa ?? null,
      } : null,
      puedeGestionar,
      tieneSoporte24_7: raw.empresa_tiene_soporte_24_7 ?? false,
      tecnico: raw.tecnico ?? null,
      disponible_para_cerrar: raw.disponible_para_cerrar ?? false,
    };
  }

  async aplicarFiltros(): Promise<void> {
    await this.cargarIncidencias(1);
  }

  async limpiarFiltros(): Promise<void> {
    this.filtroEstado = '';
    this.filtroTipo = '';
    this.filtroProblema = '';
    await this.cargarIncidencias(1);
  }

  async paginaAnterior(): Promise<void> {
    if (this.page > 1) {
      await this.cargarIncidencias(this.page - 1);
    }
  }

  async paginaSiguiente(): Promise<void> {
    if (this.page < this.lastPage) {
      await this.cargarIncidencias(this.page + 1);
    }
  }

  totalPages(): number {
    return this.lastPage;
  }

  abrirModalConfirmacion(incidencia: Incidencia, nuevoEstado: 'resuelto' | 'pendiente' | 'anulada'): void {
    if (!incidencia.puedeGestionar) {
      this.errorMsg.set('Solo puedes gestionar incidencias de tipo Locker. Las incidencias de pedidos son gestionadas por las empresas.');
      return;
    }

    this.incidenciaSeleccionada = incidencia;
    this.nuevoEstadoSeleccionado = nuevoEstado;
    this.mostrarModalConfirmacion.set(true);
  }

  cerrarModalConfirmacion(): void {
    this.mostrarModalConfirmacion.set(false);
    this.incidenciaSeleccionada = null;
    this.nuevoEstadoSeleccionado = null;
  }

  async confirmarCambioEstado(): Promise<void> {
    if (!this.incidenciaSeleccionada || !this.nuevoEstadoSeleccionado) {
      return;
    }

    const incidencia = this.incidenciaSeleccionada;
    const nuevoEstado = this.nuevoEstadoSeleccionado;

    this.errorMsg.set('');
    this.successMsg.set('');

    try {
      await firstValueFrom(
        this.http.patch<IncidenciaResponse>(
          `${environment.apiUrl}/incidencias/${incidencia.id}`,
          { estado: nuevoEstado }
        )
      );

      this.successMsg.set(`Incidencia ${nuevoEstado === 'resuelto' ? 'marcada como resuelta' : nuevoEstado === 'anulada' ? 'anulada' : 'marcada como pendiente'} exitosamente.`);
      
      // Cerrar modal
      this.cerrarModalConfirmacion();
      
      // Recargar incidencias
      await this.cargarIncidencias(this.page);
    } catch (err: any) {
      console.error('Error actualizando incidencia:', err);
      this.errorMsg.set(
        err?.error?.message || 'No fue posible actualizar la incidencia. Intenta nuevamente.'
      );
    }
  }

  getEstadoLabel(estado: 'resuelto' | 'pendiente' | 'anulada' | null): string {
    if (!estado) return '';
    if (estado === 'resuelto') return 'Resuelta';
    if (estado === 'anulada') return 'Anulada';
    return 'Pendiente';
  }

  verDetalle(incidencia: Incidencia) {
    this.router.navigate(['/admin/IncidenciaDetalle', incidencia.id]);
  }

  trackById(_: number, row: Incidencia) {
    return row.id;
  }
}
