import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth';

@Component({
    standalone: true,
    selector: 'app-header-admin',
    imports: [CommonModule, RouterModule],
    templateUrl: './headerAdmin.html',
    styleUrls: ['./headerAdmin.scss']
})
export class HeaderAdmin {
    private auth = inject(AuthService);
    private router = inject(Router);

    user = this.auth.user;

    menuUsuarioAbierto = false;
    menuBurgerAbierto = false;

    get nombreCompleto(): string {
        const u = this.user();
        if (!u) return 'Usuario';
        const nombre = u.nombre || '';
        const apellido = u.apellido || '';
        return (nombre + ' ' + apellido).trim() || 'Usuario';
    }

    get inicialAvatar(): string {
        const u = this.user();
        if (!u || !u.nombre) return 'A';
        return u.nombre.charAt(0).toUpperCase();
    }


    // ---- Navegación ----
    vistaActual: string = 'home';

    menuAbiertoUser = false;

    menuMobileAbierto = false;



    irHome() {
        this.vistaActual = 'home';
        this.router.navigate(['/admin']);
        this.cerrarMenuMobile();
        this.menuAbiertoUser = false;
    }

    irLockers() {
        this.vistaActual = 'lockers';
        this.router.navigate(['/admin/lockers']);
        this.cerrarMenuMobile();
        this.menuAbiertoUser = false;
    }

    irIncidencias() {
        this.vistaActual = 'incidencias';
        console.log('Ir a /admin/incidencias');
        // this.router.navigate(['/admin/incidencias']);
        this.cerrarMenuMobile();
        this.menuAbiertoUser = false;
    }

    irTarifas() {
        this.vistaActual = 'tarifas';
        console.log('Ir a /admin/tarifas');
        this.router.navigate(['/admin/tarifas']);
        this.cerrarMenuMobile();
        this.menuAbiertoUser = false;
    }

    irEmpresas() {
        this.vistaActual = 'empresas';
        console.log('Ir a /admin/empresas');
        this.router.navigate(['/admin/empresa']);
        this.cerrarMenuMobile();
        this.menuAbiertoUser = false;
    }

    // menú usuario

    toggleUserMenu() {
        this.menuAbiertoUser = !this.menuAbiertoUser;
    }

    async logout() {
        this.menuAbiertoUser = false;
        try {
            await this.auth.logout();
        } finally {
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

