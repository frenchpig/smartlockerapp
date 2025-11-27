import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth';
import { UserMenuButtonComponent, MenuItem } from '../../../../shared/components/user-menu-button/user-menu-button.component';

@Component({
    standalone: true,
    selector: 'app-header-admin',
    imports: [CommonModule, RouterModule, UserMenuButtonComponent],
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

    menuItems: MenuItem[] = [
        {
            action: () => this.irPerfil(),
            icon: 'bi bi-person',
            label: 'Perfil'
        },
        {
            action: () => this.irHome(),
            icon: 'bi bi-speedometer2',
            label: 'Dashboard'
        },
        {
            action: () => this.irLockers(),
            icon: 'bi bi-box-seam',
            label: 'Lockers'
        },
        {
            action: () => this.irIncidencias(),
            icon: 'bi bi-exclamation-triangle',
            label: 'Incidencias'
        },
        {
            action: () => this.irEmpresas(),
            icon: 'bi bi-building',
            label: 'Empresas'
        },
        {
            action: () => this.irTarifas(),
            icon: 'bi bi-currency-dollar',
            label: 'Tarifas'
        }
    ];

    // ---- Navegación ----
    vistaActual: string = 'home';

    menuMobileAbierto = false;



    irHome() {
        this.vistaActual = 'home';
        this.router.navigate(['/admin']);
        this.cerrarMenuMobile();
    }

    irLockers() {
        this.vistaActual = 'lockers';
        this.router.navigate(['/admin/lockers']);
        this.cerrarMenuMobile();
    }

    irIncidencias() {
        this.vistaActual = 'incidencias';
        this.router.navigate(['/admin/AdminIncidencias']);
        this.cerrarMenuMobile();
    }

    irPerfil() {
        this.router.navigate(['/admin/perfilAdmin']);
    }


    irTarifas() {
        this.vistaActual = 'tarifas';
        console.log('Ir a /admin/tarifas');
        this.router.navigate(['/admin/tarifas']);
        this.cerrarMenuMobile();
    }

    irEmpresas() {
        this.vistaActual = 'empresas';
        console.log('Ir a /admin/empresas');
        this.router.navigate(['/admin/empresa']);
        this.cerrarMenuMobile();
    }

    // menú usuario
    async logout() {
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

