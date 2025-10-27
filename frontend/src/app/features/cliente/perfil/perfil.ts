import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
    standalone: true,
    selector: 'app-perfil-cliente',
    imports: [CommonModule, RouterModule],
    templateUrl: './perfil.html',
    styleUrls: ['./perfil.scss'],
})
export class Perfil {

    // temporal
    user = {
        nombre: 'Ema',
        apellido: 'Gonzalez',
        rut: '12.345.678-9',
        correo: 'ema@example.com',
        telefono: '+56 9 7777 8888',
        fechaNac: '06/11/2002',
        genero: 'Femenino' // Lo podemos borrar si no es necesario :p
    };


    constructor(private router: Router) { }

    editarPerfil() {
        console.log('Editar perfil (pendiente)');
    }

    cambiarPassword() {
        console.log('Cambiar contraseña (pendiente)');
    }

    logout() {
        console.log('Logout');
        this.router.navigate(['/login']);
    }
}
