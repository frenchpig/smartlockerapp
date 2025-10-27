import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

@Component({
    standalone: true,
    selector: 'app-empresa-pedido-detalle',
    imports: [CommonModule, RouterModule, DatePipe],
    templateUrl: './pedido-detalle.html',
    styleUrls: ['./pedido-detalle.scss']
})
export class EmpresaPedidoDetalle implements OnInit {
    private route = inject(ActivatedRoute);

    id!: number;
    pedido: any;

    ngOnInit(): void {
        this.id = Number(this.route.snapshot.paramMap.get('id'));

        //Mock temporal (para ver algo mientras conectas la APIIIIII)
        this.pedido = {
            id: this.id,
            locker: '#12',
            estado: 'Pendiente',
            destinatario: 'Ana Ruiz',
            fecha: '2025-10-12T09:10:00Z',
            items: [
                { nombre: 'Zapatos', cantidad: 1 },
                { nombre: 'Chaqueta', cantidad: 2 }
            ]
        };
    }
}
