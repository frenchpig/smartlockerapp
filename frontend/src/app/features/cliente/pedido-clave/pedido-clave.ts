// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-pedido-clave',
//   standalone: false,
//   templateUrl: './pedido-clave.html',
//   styleUrl: './pedido-clave.scss'
// })
// export class PedidoClave {

// }

import { Component, inject, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-pedido-clave',
  imports: [CommonModule, RouterModule],
  templateUrl: './pedido-clave.html',
  styleUrls: ['./pedido-clave.scss']
})
export class PedidoClave implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  pedidoId = Number(this.route.snapshot.paramMap.get('id'));
  clave = '';
  max = 6;

  addDigit(n: number) {
    if (this.clave.length < this.max) this.clave += String(n);
  }
  backspace() { this.clave = this.clave.slice(0, -1); }
  clear()     { this.clave = ''; }

  submit() {
    // MOCK: por ahora sólo navegamos al QR; backend vendrá después
    this.router.navigate(['/cliente/pedido', this.pedidoId, 'qr']);
  }

  ngOnDestroy(): void {
    // por si luego agregamos timers; dejamos el hook preparado
  }
}
