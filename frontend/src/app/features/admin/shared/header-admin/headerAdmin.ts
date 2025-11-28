import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth';
import { UserMenuButtonComponent, MenuItem } from '../../../../shared/components/user-menu-button/user-menu-button.component';
import { filter, Subscription } from 'rxjs';

@Component({
    standalone: true,
    selector: 'app-header-admin',
    imports: [CommonModule, RouterModule, UserMenuButtonComponent],
    templateUrl: './headerAdmin.html',
    styleUrls: ['./headerAdmin.scss']
})
export class HeaderAdmin implements OnInit, OnDestroy {
    private auth = inject(AuthService);
    private router = inject(Router);
    private routerSubscription?: Subscription;

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
        },
        {
            action: () => this.irTecnicos(),
            icon: 'bi bi-tools',
            label: 'Técnicos'
        }
    ];

    // ---- Navegación ----
    vistaActual: string = 'home';

    menuMobileAbierto = false;

    ngOnInit() {
        // Determinar la vista actual al inicializar
        this.actualizarVistaActual();
        
        // Suscribirse a los cambios de ruta
        this.routerSubscription = this.router.events
            .pipe(filter(event => event instanceof NavigationEnd))
            .subscribe(() => {
                this.actualizarVistaActual();
            });
    }

    ngOnDestroy() {
        if (this.routerSubscription) {
            this.routerSubscription.unsubscribe();
        }
    }

    private actualizarVistaActual() {
        const url = this.router.url;
        
        if (url === '/admin' || url === '/admin/') {
            this.vistaActual = 'home';
        } else if (url.startsWith('/admin/lockers')) {
            this.vistaActual = 'lockers';
        } else if (url.startsWith('/admin/AdminIncidencias')) {
            this.vistaActual = 'incidencias';
        } else if (url.startsWith('/admin/tarifas')) {
            this.vistaActual = 'tarifas';
        } else if (url.startsWith('/admin/empresa')) {
            this.vistaActual = 'empresas';
        } else if (url.startsWith('/admin/tecnicos')) {
            this.vistaActual = 'tecnicos';
        } else {
            // Para otras rutas (perfil, detalle, etc.), mantener la última vista conocida
            // o establecer una por defecto
            if (!this.vistaActual) {
                this.vistaActual = 'home';
            }
        }
    }



    irHome() {
        this.router.navigate(['/admin']);
        this.cerrarMenuMobile();
    }

    irLockers() {
        this.router.navigate(['/admin/lockers']);
        this.cerrarMenuMobile();
    }

    irIncidencias() {
        this.router.navigate(['/admin/AdminIncidencias']);
        this.cerrarMenuMobile();
    }

    irPerfil() {
        this.router.navigate(['/admin/perfilAdmin']);
    }

    irTarifas() {
        this.router.navigate(['/admin/tarifas']);
        this.cerrarMenuMobile();
    }

    irEmpresas() {
        this.router.navigate(['/admin/empresa']);
        this.cerrarMenuMobile();
    }

    irTecnicos() {
        this.router.navigate(['/admin/tecnicos']);
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

