import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HeaderAdmin } from '../shared/header-admin/headerAdmin';

@Component({
    standalone: true,
    selector: 'app-admin-home',
    imports: [CommonModule, RouterModule, HeaderAdmin],
    templateUrl: './adminHome.html',
    styleUrls: ['./adminHome.scss']
})
export class AdminHomeComponent {

    constructor(private router: Router) { }

    irLockers() {
        console.log('ir a /admin/lockers');
        // this.router.navigate(['/admin/lockers']);
    }

    irEmpresas() {
        console.log('ir a /admin/empresas');
        // this.router.navigate(['/admin/empresas']);
    }

    irIncidencias() {
        console.log('ir a /admin/incidencias');
        // this.router.navigate(['/admin/incidencias']);
    }

    irTarifas() {
        console.log('ir a /admin/tarifas');
        // this.router.navigate(['/admin/tarifas']);
    }
}

