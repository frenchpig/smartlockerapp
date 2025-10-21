import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { AuthService } from '../../../core/auth/auth';
import { environment } from '../../../../environments/environment';

type EstadoReserva = 'pendiente' | 'completado' | 'anulado' | string;

type Kpi = { label: string; value: number; hint: string };

type PedidoEmpresa = {
  id: number;
  locker: string;
  ubicacion: string;
  estado: EstadoReserva;
  estadoLabel: string;
  badgeClass: string;
  destinatario: string;
  fechaIso: string;
};

@Component({
  standalone: true,
  selector: 'app-home-empresa',
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './home-empresa.html',
  styleUrls: ['./home-empresa.scss']
})
export class HomeEmpresa implements OnInit {
  kpis: Kpi[] = [];
  pedidos: PedidoEmpresa[] = [];
  loading = false;

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  private readonly badgeClassByEstado: Record<string, string> = {
    pendiente: 'bg-warning-subtle text-warning-emphasis',
    completado: 'bg-success-subtle text-success-emphasis',
    anulado: 'bg-secondary-subtle text-secondary-emphasis',
  };

  user = this.auth.user;

  async ngOnInit(): Promise<void> {
    await this.auth.fetchMe().catch(() => undefined);
    await this.cargarPedidos();
  }

  async onLogout() {
    try {
      await this.auth.logout();
    } finally {
      this.router.navigate(['/login']);
    }
  }

  private async cargarPedidos() {
    this.loading = true;
    try {
      const res = await this.http
        .get<any[]>(`${environment.apiUrl}/reservas/empresa/mis-ultimas`)
        .toPromise();

      const pedidos = (res ?? []).map((item) => this.mapPedido(item));
      this.pedidos = pedidos;
      this.kpis = this.buildKpis(pedidos);
    } catch (error) {
      console.error('Error cargando pedidos empresa', error);
      this.pedidos = [];
      this.kpis = this.buildKpis([]);
    } finally {
      this.loading = false;
    }
  }

  private mapPedido(data: any): PedidoEmpresa {
    const estado = String(data?.estado ?? 'pendiente').toLowerCase();
    const lockerNumero = data?.locker?.numero ?? data?.locker?.id ?? data?.locker_id ?? '';
    const locker = lockerNumero ? `#${lockerNumero}` : 'N/D';

    const ubicacion = data?.locker?.ubicacion ?? data?.locker_ubicacion ?? 'Sin ubicacion';

    const usuario = data?.usuario;
    const nombres = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ').trim();
    const destinatario = nombres || usuario?.email || 'Sin destinatario';

    const fechaIso = data?.fecha_reserva ?? data?.created_at ?? new Date().toISOString();

    return {
      id: data?.id ?? 0,
      locker,
      ubicacion,
      estado,
      estadoLabel: this.mapEstadoLabel(estado),
      badgeClass: this.badgeClassByEstado[estado] ?? 'bg-secondary-subtle text-secondary-emphasis',
      destinatario,
      fechaIso,
    };
  }

  private mapEstadoLabel(estado: string): string {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'completado':
        return 'Completado';
      case 'anulado':
        return 'Anulado';
      default:
        return estado ? estado.charAt(0).toUpperCase() + estado.slice(1) : 'Pendiente';
    }
  }

  private buildKpis(pedidos: PedidoEmpresa[]): Kpi[] {
    const total = pedidos.length;
    const pendientes = pedidos.filter((p) => p.estado === 'pendiente').length;
    const completados = pedidos.filter((p) => p.estado === 'completado').length;

    return [
      { label: 'Pedidos recientes', value: total, hint: 'Ultimos registros asociados a tu empresa' },
      { label: 'Pendientes', value: pendientes, hint: 'En proceso de retiro o entrega' },
      { label: 'Completados', value: completados, hint: 'Entregas realizadas recientemente' },
    ];
  }
}
