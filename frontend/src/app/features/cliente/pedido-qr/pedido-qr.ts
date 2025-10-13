import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

type Estado = 'Activo' | 'Entregado' | 'Cancelado';
interface Pedido {
  id: number;
  estado: Estado;
  locker: string;
  sede: string;
  creadoEl: string;
}

@Component({
  standalone: true,
  selector: 'app-pedido-qr',
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './pedido-qr.html',
  styleUrls: ['./pedido-qr.scss']
})
export class PedidoQr implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  pedido?: Pedido;
  cargando = true;
  errorMsg = '';
  qrUrl?: string;

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
      locker: '#12',
      sede: 'Metro Ñuñoa',
      creadoEl: '2025-10-01T10:30:00Z',
    };

    // espera:
    setTimeout(() => {
      this.cargando = false;
    }, 600);
  }

  volver() {
    this.router.navigate(['/cliente']);
  }

  reintentar() {
    this.cargando = true;
    this.errorMsg = '';
    setTimeout(() => { this.cargando = false; }, 600);
  }
}
