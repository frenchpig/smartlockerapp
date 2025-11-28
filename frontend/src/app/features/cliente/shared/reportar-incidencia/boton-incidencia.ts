import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IncidenciaModalService, PedidoIncidencia } from './incidencia-modal.service';

@Component({
  standalone: true,
  selector: 'app-boton-incidencia',
  imports: [CommonModule],
  templateUrl: './boton-incidencia.html',
  styleUrls: ['./boton-incidencia.scss']
})
export class BotonIncidencia {
  @Input() pedido: PedidoIncidencia | null = null;

  constructor(private modalService: IncidenciaModalService) {}

  abrirModal() {
    if (!this.pedido) return;
    this.modalService.abrirModal(this.pedido);
  }
}

