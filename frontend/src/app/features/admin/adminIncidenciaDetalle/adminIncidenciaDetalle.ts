import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';

import { HeaderAdmin } from '../shared/header-admin/headerAdmin';
import { IncidenciaDetalleComponent } from '../../shared/incidencia-detalle/incidencia-detalle.component';

@Component({
    standalone: true,
    selector: 'app-admin-incidencia-detalle',
    imports: [CommonModule, RouterModule, HeaderAdmin, IncidenciaDetalleComponent],
    template: `
        <app-header-admin></app-header-admin>
        
        <main class="py-4">
            <div class="container">
                <div class="mb-4">
                    <button type="button" (click)="volver()" class="btn btn-outline-primary d-flex align-items-center gap-2">
                        <i class="bi bi-arrow-left"></i> Volver a Incidencias
                    </button>
                </div>
                
                <app-incidencia-detalle 
                    [incidenciaId]="id"
                    [mostrarAcciones]="true"
                    [rutaVolver]="'/admin/incidencias'">
                </app-incidencia-detalle>
            </div>
        </main>
    `,
    styleUrls: ['./adminIncidenciaDetalle.scss'],
})
export class AdminIncidenciaDetalle implements OnInit {
    private router = inject(Router);
    private route = inject(ActivatedRoute);

    id!: number;

    ngOnInit(): void {
        const idParam = this.route.snapshot.paramMap.get('id');
        this.id = idParam ? Number(idParam) : NaN;

        if (isNaN(this.id)) {
            this.router.navigate(['/admin/AdminIncidencias']);
        }
    }

    volver() {
        this.router.navigate(['/admin/AdminIncidencias']);
    }
}
