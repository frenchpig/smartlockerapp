import { Component, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

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
  selector: 'app-home',
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class Home {
  pedidos: Pedido[] = [
    { id: 18565, estado: 'Activo',    locker: '#12', sede: 'Metro Ñuñoa',  creadoEl: '2025-10-01T10:30:00Z' },
    { id: 17387, estado: 'Entregado', locker: '#03', sede: 'Metro Ñuble',  creadoEl: '2025-09-28T15:10:00Z' }
  ];

usuarioNombre = 'Ema';
private readonly router = inject(Router);

  abrirConClave(id: number) {
    this.router.navigate(['/cliente/pedido', id, 'clave']);
  }

  // verQr(id: number) {
  //   this.router.navigate(['/cliente/pedido', id, 'qr']);
  // }


  refrescar() {
    //llamar api
    this.pedidos = [...this.pedidos];
  }

  onLogout() {
    console.log('logout');
  }
}
