import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { HeaderEmpresaComponent } from '../shared/header-empresa/header-empresa.component';
import { IncidenciaDetalleComponent } from '../../shared/incidencia-detalle/incidencia-detalle.component';

@Component({
    standalone: true,
    selector: 'app-empresa-incidencia-detalle',
    imports: [CommonModule, RouterModule, HeaderEmpresaComponent, IncidenciaDetalleComponent],
    template: `
        <app-header-empresa titulo="Detalle de Incidencia"></app-header-empresa>
        
        <main class="py-4">
            <div class="container">
                <div class="mb-4">
                    <button type="button" (click)="volver()" class="btn btn-outline-success d-flex align-items-center gap-2">
                        <i class="bi bi-arrow-left"></i> Volver
                    </button>
                </div>
                
                <app-incidencia-detalle 
                    [incidenciaId]="id"
                    [mostrarAcciones]="false"
                    [rutaVolver]="''">
                </app-incidencia-detalle>
            </div>
        </main>
    `,
    styleUrls: ['./incidencia-detalle.scss'],
})
export class EmpresaIncidenciaDetalle implements OnInit {
    private route = inject(ActivatedRoute);
    private location = inject(Location);

    id!: number;

    ngOnInit(): void {
        this.id = Number(this.route.snapshot.paramMap.get('id'));
        if (isNaN(this.id)) {
            this.location.back();
        }
    }

    volver() {
        this.location.back();
    }
}
