import { Component, OnInit } from '@angular/core';
// import { CommonModule, DatePipe } from '@angular/common';
import { CommonModule } from '@angular/common';

import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-home-empresa',
  // imports: [CommonModule, RouterModule, DatePipe],
  imports: [CommonModule, RouterModule],
  templateUrl: './home-empresa.html',
  styleUrls: ['./home-empresa.scss']
})
export class HomeEmpresa implements OnInit {
  kpis: { label: string; value: string | number; hint: string }[] = [];
  recientes: { id: number; locker: string; estado: string; destinatario: string; fecha: string }[] = [];

  ngOnInit(): void {
    this.cargarDashboard();
  }

  private cargarDashboard() {
    // AQUI LA APIII
    // Simulación de datos
    this.kpis = [
      { label: 'Pedidos de hoy', value: 36, hint: '+12% vs ayer' },
      { label: 'Lockers activos', value: 18, hint: 'de 24 totales' },
      { label: 'Ocupación', value: '74%', hint: 'últimas 24h' }
    ];

    this.recientes = [
      { id: 18655, locker: '#02', estado: 'Pendiente', destinatario: 'Ana Ruiz', fecha: '2025-10-12T09:10:00Z' },
      { id: 18654, locker: '#12', estado: 'En camino', destinatario: 'Juan P.', fecha: '2025-10-12T08:40:00Z' },
      { id: 18630, locker: '#07', estado: 'Entregado', destinatario: 'María L.', fecha: '2025-10-12T07:15:00Z' }
    ];
  }
}
