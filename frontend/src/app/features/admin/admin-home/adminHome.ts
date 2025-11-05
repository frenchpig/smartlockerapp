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
        this.router.navigate(['/admin/lockers']);
    }

    irEmpresas() {
        this.router.navigate(['/admin/empresa']);
    }

    irIncidencias() {
        console.log('Ir a /admin/incidencias');
        // this.router.navigate(['/admin/incidencias']);
    }

    irTarifas() {
        this.router.navigate(['/admin/tarifas']);
    }
}

