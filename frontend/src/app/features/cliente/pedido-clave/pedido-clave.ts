import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { QRCodeComponent } from 'angularx-qrcode';


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
  selector: 'app-pedido-clave',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, DatePipe, QRCodeComponent],
  templateUrl: './pedido-clave.html',
  styleUrls: ['./pedido-clave.scss']
})
export class PedidoClave implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  pedido?: Pedido;

  clave = new FormControl<string>('', [
    Validators.required,
    Validators.pattern(/^\d{6}$/),
  ]);

  enviando = false;
  errorMsg = '';
  qrData: string | null = null;
  expiresAt?: string;

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
  }

  press(n: string) {
    if (this.enviando) return;
    const v = this.clave.value ?? '';
    if (v.length >= 6) return;
    this.clave.setValue(v + n);

    // Para ingresar sin usar el boton :p
    // if ((this.clave.value?.length ?? 0) === 6) {
    //   this.enviar();
    // }

  }


  borrar() {
    if (this.enviando) return;
    const v = this.clave.value ?? '';
    this.clave.setValue(v.slice(0, -1));
  }

  limpiar() {
    if (this.enviando) return;
    this.clave.setValue('');
    this.errorMsg = '';
    this.qrData = null;
    this.expiresAt = undefined;
  }

  async enviar() {
    if (this.enviando) return;
    if (!this.clave.valid) {
      this.errorMsg = 'Ingresa los 6 dígitos.';
      return;
    }

    this.enviando = true;
    this.errorMsg = '';
    this.qrData = null;

    this.router.navigate(
      ['/cliente/pedido', this.pedido!.id, 'qr'],
      {
        queryParams: { from: 'clave' },
        state: { fromClave: true }
      }
    );

    this.enviando = false;
  }

  get lleno(): boolean { /* ... */ return (this.clave.value?.length ?? 0) === 6; }
}
