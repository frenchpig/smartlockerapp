import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HeaderAdmin } from '../shared/header-admin/headerAdmin';

type EmpresaEstado = 'Activa' | 'Inactiva';

interface Empresa {
  id: number;
  nombre: string;
  rut?: string;
  correo: string;
  telefono?: string;
  ubicacion?: string;
  estado: EmpresaEstado;
  creadaEl?: string;
}

@Component({
  standalone: true,
  selector: 'app-admin-empresas',
  imports: [CommonModule, RouterModule, HeaderAdmin],
  templateUrl: './adminEmpresas.html',
  styleUrls: ['./adminEmpresas.scss']
})
export class AdminEmpresas {
  private router = inject(Router);

  empresas = signal<Empresa[]>([
    { id: 1, nombre: 'ejemplo1', rut: '76.123.456-7', correo: 'contacto@acme.cl', ubicacion: 'Centro', estado: 'Activa', creadaEl: '2025-10-28' },
    { id: 2, nombre: 'ejemplo2', correo: 'hola@beta.cl', ubicacion: 'Ñuñoa', estado: 'Inactiva', creadaEl: '2025-10-15' },
    { id: 3, nombre: 'ejemplo3', correo: 'admin@smart.com', ubicacion: 'Las Condes', estado: 'Activa', creadaEl: '2025-10-25' },
  ]);

  private q = signal<string>('');
  private estado = signal<'Todos' | EmpresaEstado>('Todos');

  filtradas = computed(() => {
    const q = this.q().toLowerCase().trim();
    const estado = this.estado();

    return this.empresas().filter(e => {
      const matchTexto =
        e.nombre.toLowerCase().includes(q) ||
        (e.rut ?? '').toLowerCase().includes(q) ||
        e.correo.toLowerCase().includes(q) ||
        (e.ubicacion ?? '').toLowerCase().includes(q);
      const matchEstado = estado === 'Todos' ? true : e.estado === estado;
      return matchTexto && matchEstado;
    });
  });

  kpiTotal = computed(() => this.empresas().length);
  kpiActivas = computed(() => this.empresas().filter(e => e.estado === 'Activa').length);
  kpiInactivas = computed(() => this.empresas().filter(e => e.estado === 'Inactiva').length);
  kpiNuevas7d = computed(() => {
    const now = new Date().getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return this.empresas().filter(e => {
      const fecha = e.creadaEl ? new Date(e.creadaEl).getTime() : NaN;
      return !isNaN(fecha) && (now - fecha) <= sevenDays;
    }).length;
  });

  onBuscar(event: Event) {
    const input = event.target as HTMLInputElement;
    this.q.set(input.value);
  }

  onEstadoChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.estado.set(select.value as 'Todos' | EmpresaEstado);
  }

  limpiarFiltros() {
    this.q.set('');
    this.estado.set('Todos');
  }

  nuevaEmpresa() {
    this.router.navigate(['/admin/empresaForm']);
  }

  editar() {
    this.router.navigate(['/admin/editarEmpresa']);
  }

  verDetalle() {
    this.router.navigate(['/admin/detalleEmpresa']);
  }

  private cambiarEstado(id: number, nuevo: EmpresaEstado) {
    this.empresas.update(lista =>
      lista.map(emp => emp.id === id ? { ...emp, estado: nuevo } : emp)
    );
  }

  activar(e: Empresa) {
    if (e.estado === 'Activa') return;
    this.cambiarEstado(e.id, 'Activa');
  }

  desactivar(e: Empresa) {
    if (e.estado === 'Inactiva') return;
    this.cambiarEstado(e.id, 'Inactiva');
  }

  trackById = (_: number, e: Empresa) => e.id;
}
