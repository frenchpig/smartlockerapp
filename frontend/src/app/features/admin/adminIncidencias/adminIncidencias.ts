import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HeaderAdmin } from '../shared/header-admin/headerAdmin';

type IncidenciaEstado = 'Abierta' | 'Iniciada' | 'Cerrada';
type IncidenciaPrioridad = 'Baja' | 'Media' | 'Alta' | 'Crítica';
type IncidenciaOrigen = 'Locker' | 'Empresa' | 'Sistema' | 'Cliente';

interface Incidencia {
  id: number;
  titulo: string;
  fecha: string;
  origen: IncidenciaOrigen;
  locker: string;
  sede: string;
  empresa: string;
  prioridad: IncidenciaPrioridad;
  estado: IncidenciaEstado;
  asignadoA?: string;
}

@Component({
  standalone: true,
  selector: 'app-admin-incidencias',
  imports: [CommonModule, FormsModule, RouterModule, HeaderAdmin],
  templateUrl: './adminIncidencias.html',
  styleUrls: ['./adminIncidencias.scss'],
})
export class AdminIncidencias {
  private router = inject(Router);

  PRIORIDADES: IncidenciaPrioridad[] = ['Baja', 'Media', 'Alta', 'Crítica'];
  ESTADOS: IncidenciaEstado[] = ['Abierta', 'Iniciada', 'Cerrada'];
  ASIGNABLES = ['Sin asignar', 'Soporte 1', 'Soporte 2', 'Técnico campo', 'Admin Finanzas'];

  incidencias: Incidencia[] = [
    {
      id: 101,
      titulo: 'Locker no abre',
      fecha: '2025-11-10T10:15:00',
      origen: 'Locker',
      locker: 'LK-12',
      sede: 'Metro Ñuñoa',
      empresa: 'Acme S.A.',
      prioridad: 'Alta',
      estado: 'Abierta',
      asignadoA: 'Soporte 1',
    },
    {
      id: 102,
      titulo: 'Cobro duplicado',
      fecha: '2025-11-10T08:43:00',
      origen: 'Empresa',
      locker: '—',
      sede: '—',
      empresa: 'Smart Cosmetics',
      prioridad: 'Media',
      estado: 'Iniciada',
      asignadoA: 'Admin Finanzas',
    },
    {
      id: 103,
      titulo: 'Sensor de puerta',
      fecha: '2025-11-09T17:30:00',
      origen: 'Sistema',
      locker: 'LK-07',
      sede: 'Mall Vivo',
      empresa: '—',
      prioridad: 'Crítica',
      estado: 'Abierta',
      asignadoA: 'Técnico campo',
    },
    {
      id: 104,
      titulo: 'Cliente no encuentra locker',
      fecha: '2025-11-09T12:05:00',
      origen: 'Cliente',
      locker: 'LK-02',
      sede: 'Metro Ñuble',
      empresa: '—',
      prioridad: 'Baja',
      estado: 'Cerrada',
      asignadoA: 'Sin asignar',
    },
  ];

  // menú mock
  menu = { abierto: false, tipo: '' as 'prioridad' | 'estado' | '', id: 0 };

  abrirMenu(tipo: 'prioridad' | 'estado', i: Incidencia) {
    if (this.menu.abierto && this.menu.tipo === tipo && this.menu.id === i.id) {
      this.menu.abierto = false;
      return;
    }
    this.menu = { abierto: true, tipo, id: i.id };
  }

  @HostListener('document:click', ['$event'])
  cerrarMenusSiClickAfuera(ev: MouseEvent) {
    const el = ev.target as HTMLElement;
    if (!el.closest('.cell-chip')) this.menu.abierto = false;
  }

  prioridadClase(p: IncidenciaPrioridad) {
    return {
      'chip-low': p === 'Baja',
      'chip-medium': p === 'Media',
      'chip-high': p === 'Alta',
      'chip-critical': p === 'Crítica',
    };
  }
  estadoClase(e: IncidenciaEstado) {
    return {
      'chip-danger': e === 'Abierta',
      'chip-warn': e === 'Iniciada',
      'chip-success': e === 'Cerrada',
    };
  }

  cambiarPrioridad(i: Incidencia, nueva: IncidenciaPrioridad) {
    i.prioridad = nueva;
    this.menu.abierto = false;
  }
  cambiarEstado(i: Incidencia, nuevo: IncidenciaEstado) {
    i.estado = nuevo;
    this.menu.abierto = false;
  }
  cambiarAsignado(i: Incidencia, nuevo: string) {
    i.asignadoA = nuevo;
  }

  verDetalle(i: Incidencia) {
    this.router.navigate(['/admin/IncidenciaDetalle', i.id]);
  }

  trackById(_: number, row: Incidencia) {
    return row.id;
  }
}
