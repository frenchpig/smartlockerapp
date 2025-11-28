import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HeaderAdmin } from '../../admin/shared/header-admin/headerAdmin';
import { AuthService } from '../../../core/auth/auth';
import { environment } from '../../../../environments/environment';

type LockerEstado = 'activo' | 'bloqueado' | 'mantenimiento';

interface Ubicacion {
    id: number;
    nombre: string;
}

interface Tecnico {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
}

@Component({
    standalone: true,
    selector: 'app-crear-lockers',
    imports: [CommonModule, ReactiveFormsModule, RouterModule, HeaderAdmin],
    templateUrl: './crearLockers.html',
    styleUrls: ['./crearLockers.scss']
})
export class CrearLockers implements OnInit {
    private fb = inject(FormBuilder);
    private router = inject(Router);
    private location = inject(Location);
    private http = inject(HttpClient);
    private auth = inject(AuthService);

    ubicaciones: Ubicacion[] = [];
    tecnicos: Tecnico[] = [];
    loading = false;
    loadingUbicaciones = false;
    loadingTecnicos = false;

    get hayTecnicos(): boolean {
        return this.tecnicos.length > 0;
    }
    siguienteNumero: number | null = null;
    cantidad = 1;

    form = this.fb.group({
        numero: [null as number | null, [Validators.required, Validators.min(1)]],
        ubicacion_id: [null, Validators.required],
        estado: ['activo' as LockerEstado],
        tamano: ['', Validators.required],
        cantidad: [1, [Validators.required, Validators.min(1), Validators.max(50)]]
    });

    async ngOnInit(): Promise<void> {
        await Promise.all([
            this.cargarUbicaciones(),
            this.cargarTecnicos()
        ]);
        
        // Suscribirse a cambios en ubicacion_id para calcular siguiente número
        this.form.get('ubicacion_id')?.valueChanges.subscribe(async (ubicacionId) => {
            if (ubicacionId) {
                await this.calcularSiguienteNumero(ubicacionId);
            } else {
                this.siguienteNumero = null;
            }
        });

        // Suscribirse a cambios en cantidad
        this.form.get('cantidad')?.valueChanges.subscribe((cantidad) => {
            this.cantidad = cantidad || 1;
        });
    }

    private async cargarUbicaciones(): Promise<void> {
        this.loadingUbicaciones = true;
        try {
            const response: any = await this.http
                .get<any>(`${environment.apiUrl}/ubicaciones`, { params: { per_page: 1000 } })
                .toPromise();

            this.ubicaciones = (response?.data || response || []).map((u: any) => ({
                id: u.id,
                nombre: u.nombre
            }));
        } catch (error) {
            console.error('Error cargando ubicaciones:', error);
            alert('No se pudieron cargar las ubicaciones');
        } finally {
            this.loadingUbicaciones = false;
        }
    }

    private async cargarTecnicos(): Promise<void> {
        this.loadingTecnicos = true;
        try {
            const response: any = await this.http
                .get<any>(`${environment.apiUrl}/usuarios`, { params: { rol: 'tecnico', per_page: 1000 } })
                .toPromise();

            this.tecnicos = (response?.data || response || []).map((u: any) => ({
                id: u.id,
                nombre: u.nombre,
                apellido: u.apellido,
                email: u.email
            }));
        } catch (error) {
            console.error('Error cargando técnicos:', error);
        } finally {
            this.loadingTecnicos = false;
        }
    }

    private async calcularSiguienteNumero(ubicacionId: number): Promise<void> {
        try {
            const response: any = await this.http
                .get<any>(`${environment.apiUrl}/lockers`, { 
                    params: { 
                        ubicacion_id: ubicacionId.toString(),
                        per_page: 1000 
                    } 
                })
                .toPromise();

            const lockers = response?.data || response || [];
            const numerosExistentes = lockers
                .map((l: any) => l.numero)
                .filter((n: number) => n != null && !isNaN(n));

            // Encontrar el siguiente número disponible (máximo + 1, o 1 si no hay lockers)
            const siguiente = numerosExistentes.length > 0
                ? Math.max(...numerosExistentes) + 1
                : 1;

            this.siguienteNumero = siguiente;
            
            // Actualizar el valor del formulario si no tiene valor
            if (!this.form.get('numero')?.value) {
                this.form.patchValue({ numero: siguiente as number });
            }
        } catch (error) {
            console.error('Error calculando siguiente número:', error);
            this.siguienteNumero = 1;
        }
    }

    async guardar() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const formValue = this.form.value;
        const user = this.auth.user();

        if (!user) {
            alert('No hay usuario autenticado');
            this.router.navigate(['/login']);
            return;
        }

        this.loading = true;
        try {
            const cantidad = formValue.cantidad || 1;
            const numeroInicial = formValue.numero || 1;

            const lockersCreados: any[] = [];

            // Crear múltiples lockers
            for (let i = 0; i < cantidad; i++) {
                const numeroActual = numeroInicial + i;
                
                const lockerData = {
                    numero: numeroActual,
                    ubicacion_id: formValue.ubicacion_id,
                    estado: formValue.estado,
                    tamano: formValue.tamano
                };

                const locker: any = await this.http
                    .post<any>(`${environment.apiUrl}/lockers`, lockerData)
                    .toPromise();

                lockersCreados.push(locker);

                // El mantenimiento preventivo se crea automáticamente en el backend
                // 1 mes después de la creación del locker
            }

            const mensaje = cantidad > 1 
                ? `Se crearon ${cantidad} lockers exitosamente (números ${numeroInicial} a ${numeroInicial + cantidad - 1})`
                : `Se creó el locker #${numeroInicial} exitosamente`;
            
            alert(mensaje);
            this.router.navigate(['/admin/lockers']);
        } catch (error: any) {
            console.error('Error creando lockers:', error);
            alert(error?.error?.message || 'No se pudieron crear los lockers. Intenta nuevamente.');
        } finally {
            this.loading = false;
        }
    }

    cancelar() {
        this.router.navigate(['/admin/lockers']);
    }

    volver() {
        this.location.back();
    }
}
