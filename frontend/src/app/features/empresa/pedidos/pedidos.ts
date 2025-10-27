import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

type EstadoPedido = 'Pendiente' | 'En camino' | 'Entregado';

interface PedidoEmpresa {
  id: number;
  locker: string;
  estado: EstadoPedido;
  destinatario: string;
  fecha: string;
}

@Component({
  standalone: true,
  selector: 'app-empresa-pedidos',
  imports: [CommonModule, RouterModule, DatePipe, FormsModule],
  templateUrl: './pedidos.html',
  styleUrls: ['./pedidos.scss']
})
export class Pedidos {

  q = '';
  estado: EstadoPedido | 'Todos' = 'Todos';

  page = 1;
  pageSize = 10;

  cargando = true;
  pedidos: PedidoEmpresa[] = [];
  filtrados: PedidoEmpresa[] = [];
  pageItems: PedidoEmpresa[] = [];

  ngOnInit(): void {
    this.cargarMock();
    this.aplicarFiltros();
  }

  // ===== Mock temporal (reemplazar por API) =====
  private cargarMock() {
    this.pedidos = [
      { id: 18655, locker: '#02', estado: 'Pendiente',  destinatario: 'Ana Ruiz',  fecha: '2025-10-12T09:10:00Z' },
      { id: 18654, locker: '#12', estado: 'En camino',  destinatario: 'Juan P.',   fecha: '2025-10-12T08:40:00Z' },
      { id: 18630, locker: '#07', estado: 'Entregado', destinatario: 'María L.',  fecha: '2025-10-12T07:15:00Z' },
      { id: 18622, locker: '#03', estado: 'Pendiente',  destinatario: 'Luis F.',   fecha: '2025-10-11T18:40:00Z' },
      { id: 18621, locker: '#05', estado: 'En camino',  destinatario: 'Javiera S.',fecha: '2025-10-11T17:10:00Z' },
    ];
    this.cargando = false;
  }

  aplicarFiltros() {
    const q = this.q.trim().toLowerCase();
    this.filtrados = this.pedidos.filter(p => {
      const coincideQ =
        !q ||
        p.id.toString().includes(q) ||
        p.locker.toLowerCase().includes(q) ||
        p.destinatario.toLowerCase().includes(q);

      const coincideEstado =
        this.estado === 'Todos' || p.estado === this.estado;

      return coincideQ && coincideEstado;
    });

    this.filtrados.sort((a, b) => b.fecha.localeCompare(a.fecha));

    this.page = 1;
    this.actualizarPagina();
  }

  actualizarPagina() {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.pageItems = this.filtrados.slice(start, end);
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.filtrados.length / this.pageSize));
  }

  go(n: number) {
    if (n < 1 || n > this.totalPages()) return;
    this.page = n;
    this.actualizarPagina();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  badgeClasses(estado: EstadoPedido) {
    switch (estado) {
      case 'Pendiente':
        return 'badge rounded-pill bg-secondary-subtle text-secondary-emphasis px-3 py-2';
      case 'En camino':
        return 'badge rounded-pill bg-warning-subtle text-warning-emphasis px-3 py-2';
      case 'Entregado':
        return 'badge rounded-pill bg-success-subtle text-success-emphasis px-3 py-2';
    }
  }
}
