// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-pedido-qr',
//   standalone: false,
//   templateUrl: './pedido-qr.html',
//   styleUrl: './pedido-qr.scss'
// })
// export class PedidoQr {

// }

import { Component, inject, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-pedido-qr',
  imports: [CommonModule, RouterModule],
  templateUrl: './pedido-qr.html',
  styleUrls: ['./pedido-qr.scss']
})
export class PedidoQr implements OnDestroy {
  private readonly route = inject(ActivatedRoute);

  pedidoId = Number(this.route.snapshot.paramMap.get('id'));

  total = 480;
  left = this.total;
  private timer?: any;

  ngOnInit(): void {
    this.timer = setInterval(() => {
      this.left = Math.max(0, this.left - 1);
      if (this.left === 0) clearInterval(this.timer);
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  get minutes(): number { return Math.floor(this.left / 60); }
  get seconds(): number { return this.left % 60; }

  get progress(): number {
    return Math.round((this.left / this.total) * 100);
  }

  get qrUrl(): string {
    // Reemplazar luego
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=Pedido%20${this.pedidoId}`;
  }
}
