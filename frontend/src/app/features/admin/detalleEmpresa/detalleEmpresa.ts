import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HeaderAdmin } from '../shared/header-admin/headerAdmin';

type EmpresaEstado = 'Activa' | 'Inactiva';

interface EmpresaDetalle {
    id: number;
    nombre: string;
    razonSocial?: string;
    rut?: string;
    correo: string;
    telefono?: string;
    direccion?: string;
    comuna?: string;
    region?: string;
    estado: EmpresaEstado;
    creadosUlt7d?: number;

    sedes: string[];
    lockersAsignados: number;
    casillerosTotales: number;
    fechaAlta?: string;
    plan?: 'Standard' | 'Pro' | 'Enterprise';
}

@Component({
    standalone: true,
    selector: 'app-detalle-empresa',
    imports: [CommonModule, RouterModule, HeaderAdmin],
    templateUrl: './detalleEmpresa.html',
    styleUrls: ['./detalleEmpresa.scss']
})
export class DetalleEmpresa implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);

    empresa?: EmpresaDetalle;

    ngOnInit(): void {
        const id = Number(this.route.snapshot.paramMap.get('id') ?? '1');

        // MOCK:
        this.empresa = {
            id,
            nombre: 'Acme S.A.',
            razonSocial: 'Acme Sociedad Anónima',
            rut: '76.123.456-7',
            correo: 'contacto@acme.cl',
            telefono: '+56 9 5555 5555',
            direccion: 'Av. Siempre Viva 1234',
            comuna: 'Ñuñoa',
            region: 'Región Metropolitana',
            estado: 'Activa',
            creadosUlt7d: 42,

            sedes: ['Metro Ñuñoa', 'Ñuble', 'Vitacura'],
            lockersAsignados: 18,
            casillerosTotales: 216,
            fechaAlta: '2025-08-10',
            plan: 'Pro'
        };
    }

    volver(): void {
        this.router.navigate(['/admin/empresa']);
    }

    editar(): void {
        this.router.navigate(['/admin/editarEmpresa']);
    }
}
