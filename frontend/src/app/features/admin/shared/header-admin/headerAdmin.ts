import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
    standalone: true,
    selector: 'app-header-admin',
    imports: [CommonModule, RouterModule],
    templateUrl: './headerAdmin.html',
    styleUrls: ['./headerAdmin.scss']
})
export class HeaderAdmin {
    adminNombre = 'Ari';
    adminRol = 'Administrador';

    menuUsuarioAbierto = false;
    menuBurgerAbierto = false;


    // ---- Navegación ----
    vistaActual: string = 'home';

    menuAbiertoUser = false;

    menuMobileAbierto = false;

    constructor(private router: Router) { }


    irHome() {
        this.vistaActual = 'home';
        this.router.navigate(['/admin/home']);
        this.cerrarMenuMobile();
    }

    irLockers() {

        this.vistaActual = 'lockers';
        this.router.navigate(['/admin/lockers']);
        this.cerrarMenuMobile();

    }

    irIncidencias() {
        this.vistaActual = 'incidencias';
        console.log('Ir a /admin/incidencias');
        // this.router.navigate(['/admin/incidencias']);
        this.cerrarMenuMobile();
    }

    irTarifas() {
        this.vistaActual = 'tarifas';
        console.log('Ir a /admin/tarifas');
        // this.router.navigate(['/admin/tarifas']);
        this.cerrarMenuMobile();
    }

    irEmpresas() {
        this.vistaActual = 'empresas';
        console.log('Ir a /admin/empresas');
        // this.router.navigate(['/admin/empresas']);
        this.cerrarMenuMobile();
    }

    // menú usuario

    toggleUserMenu() {
        this.menuAbiertoUser = !this.menuAbiertoUser;
    }

    irPerfil() {
        console.log('Ir a /admin/perfil');
        // this.router.navigate(['/admin/perfil']);
        this.menuAbiertoUser = false;
    }

    async logout() {
        try {
            // await this.auth.logout();
            await this.router.navigate(['/login']);
        } catch (err) {
            console.error('Error during logout:', err);
            await this.router.navigate(['/login']);
        }
    }

    toggleMenuMobile() {
        this.menuMobileAbierto = !this.menuMobileAbierto;
    }

    cerrarMenuMobile() {
        this.menuMobileAbierto = false;
    }
}

