import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { HeaderAdmin } from '../shared/header-admin/headerAdmin';
import { environment } from '../../../../environments/environment';

interface Ubicacion {
    id: number;
    nombre: string;
    latitud?: number | null;
    longitud?: number | null;
    device_username?: string | null;
    device_password?: string | null;
    lockers_count?: number;
}

interface Locker {
    id: number;
    numero: number;
    estado: string;
    tamano?: string | null;
}

@Component({
    standalone: true,
    selector: 'app-ubicacion-form',
    imports: [CommonModule, ReactiveFormsModule, RouterModule, HeaderAdmin],
    templateUrl: './ubicacionForm.html',
    styleUrls: ['./ubicacionForm.scss']
})
export class UbicacionForm implements OnInit {
    private fb = inject(FormBuilder);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private http = inject(HttpClient);

    loading = false;
    error = '';
    success = '';
    editando = false;
    ubicacionId: number | null = null;
    ubicacion: Ubicacion | null = null;
    
    // Gestión de lockers
    lockers: Locker[] = [];
    cargandoLockers = false;
    mostrarFormularioLocker = false;
    siguienteNumero = 1;
    lockerForm: FormGroup;

    ubicacionForm: FormGroup;

    showDevicePassword = false;

    constructor() {
        this.ubicacionForm = this.fb.group({
            nombre: ['', [Validators.required, Validators.maxLength(255)]],
            latitud: ['', [Validators.pattern(/^-?\d+\.?\d*$/)]],
            longitud: ['', [Validators.pattern(/^-?\d+\.?\d*$/)]],
            device_username: ['', [Validators.maxLength(255)]],
            device_password: ['', [Validators.maxLength(255)]],
        });

        this.lockerForm = this.fb.group({
            numero: [1, [Validators.required, Validators.min(1)]],
            cantidad: [1, [Validators.required, Validators.min(1), Validators.max(50)]],
            estado: ['activo', [Validators.required]],
            tamano: ['', [Validators.required]],
        });
    }

    async ngOnInit(): Promise<void> {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.editando = true;
            this.ubicacionId = parseInt(id);
            await Promise.all([
                this.cargarUbicacion(this.ubicacionId),
                this.cargarLockers()
            ]);
        }
    }

    async cargarUbicacion(id: number): Promise<void> {
        this.loading = true;
        this.error = '';

        try {
            const ubicacion = await firstValueFrom(
                this.http.get<Ubicacion>(`${environment.apiUrl}/ubicaciones/${id}`)
            );

            this.ubicacion = ubicacion;

            // Cargar todos los datos existentes de la ubicación
            this.ubicacionForm.patchValue({
                nombre: ubicacion.nombre || '',
                latitud: ubicacion.latitud !== null && ubicacion.latitud !== undefined ? ubicacion.latitud.toString() : '',
                longitud: ubicacion.longitud !== null && ubicacion.longitud !== undefined ? ubicacion.longitud.toString() : '',
                device_username: ubicacion.device_username || '',
                device_password: '', // No cargar la contraseña por seguridad
            });
        } catch (err: any) {
            console.error('Error cargando ubicación:', err);
            this.error = 'No se pudo cargar la ubicación.';
        } finally {
            this.loading = false;
        }
    }

    async cargarLockers(): Promise<void> {
        if (!this.ubicacionId) return;

        this.cargandoLockers = true;
        try {
            const response: any = await firstValueFrom(
                this.http.get(`${environment.apiUrl}/lockers`, {
                    params: {
                        ubicacion_id: this.ubicacionId.toString(),
                        per_page: 1000
                    }
                })
            );

            this.lockers = (response?.data || []).map((l: any) => ({
                id: l.id,
                numero: l.numero,
                estado: l.estado,
                tamano: l.tamano,
            })).sort((a: Locker, b: Locker) => a.numero - b.numero);

            // Calcular siguiente número
            if (this.lockers.length > 0) {
                const numeros = this.lockers.map(l => l.numero);
                this.siguienteNumero = Math.max(...numeros) + 1;
            } else {
                this.siguienteNumero = 1;
            }

            // Actualizar formulario con siguiente número
            this.lockerForm.patchValue({ numero: this.siguienteNumero });
        } catch (err: any) {
            console.error('Error cargando lockers:', err);
        } finally {
            this.cargandoLockers = false;
        }
    }

    abrirFormularioLocker() {
        this.mostrarFormularioLocker = true;
        this.lockerForm.patchValue({
            numero: this.siguienteNumero,
            cantidad: 1,
            estado: 'activo',
            tamano: '',
        });
    }

    cerrarFormularioLocker() {
        this.mostrarFormularioLocker = false;
        this.lockerForm.reset({
            numero: this.siguienteNumero,
            cantidad: 1,
            estado: 'activo',
            tamano: '',
        });
    }

    async guardarLocker(): Promise<void> {
        if (this.lockerForm.invalid || !this.ubicacionId) {
            this.lockerForm.markAllAsTouched();
            return;
        }

        this.cargandoLockers = true;
        this.error = '';
        this.success = '';

        try {
            const formValue = this.lockerForm.value;
            const cantidad = formValue.cantidad || 1;
            const numeroInicial = formValue.numero || this.siguienteNumero;

            const lockersCreados: any[] = [];

            for (let i = 0; i < cantidad; i++) {
                const numeroActual = numeroInicial + i;
                
                const lockerData = {
                    numero: numeroActual,
                    ubicacion_id: this.ubicacionId,
                    estado: formValue.estado,
                    tamano: formValue.tamano
                };

                const locker = await firstValueFrom(
                    this.http.post<any>(`${environment.apiUrl}/lockers`, lockerData)
                );

                lockersCreados.push(locker);
            }

            this.success = cantidad > 1 
                ? `Se crearon ${cantidad} lockers exitosamente (números ${numeroInicial} a ${numeroInicial + cantidad - 1})`
                : `Se creó el locker #${numeroInicial} exitosamente`;

            // Recargar lockers y ubicación
            await Promise.all([
                this.cargarLockers(),
                this.cargarUbicacion(this.ubicacionId!)
            ]);

            this.cerrarFormularioLocker();

            setTimeout(() => {
                this.success = '';
            }, 3000);
        } catch (err: any) {
            console.error('Error creando lockers:', err);
            this.error = err?.error?.message || 'No se pudieron crear los lockers. Intenta nuevamente.';
        } finally {
            this.cargandoLockers = false;
        }
    }

    async eliminarLocker(locker: Locker): Promise<void> {
        if (!confirm(`¿Estás seguro de que deseas eliminar el locker #${locker.numero}?`)) {
            return;
        }

        this.cargandoLockers = true;
        this.error = '';

        try {
            await firstValueFrom(
                this.http.delete(`${environment.apiUrl}/lockers/${locker.id}`)
            );

            this.success = `Locker #${locker.numero} eliminado exitosamente.`;
            
            // Recargar lockers y ubicación
            await Promise.all([
                this.cargarLockers(),
                this.cargarUbicacion(this.ubicacionId!)
            ]);

            setTimeout(() => {
                this.success = '';
            }, 3000);
        } catch (err: any) {
            console.error('Error eliminando locker:', err);
            this.error = err?.error?.message || 'No se pudo eliminar el locker.';
        } finally {
            this.cargandoLockers = false;
        }
    }

    irDetalleLocker(locker: Locker) {
        this.router.navigate(['/admin/detalle', locker.id]);
    }

    hasErrorLocker(ctrl: string, err: string): boolean {
        const c = this.lockerForm.controls[ctrl];
        return (c.touched || c.dirty) && c.hasError(err);
    }

    async guardar(): Promise<void> {
        if (this.ubicacionForm.invalid) {
            this.ubicacionForm.markAllAsTouched();
            return;
        }

        this.loading = true;
        this.error = '';
        this.success = '';

        try {
            const data: any = {
                nombre: this.ubicacionForm.value.nombre,
                latitud: this.ubicacionForm.value.latitud ? parseFloat(this.ubicacionForm.value.latitud) : null,
                longitud: this.ubicacionForm.value.longitud ? parseFloat(this.ubicacionForm.value.longitud) : null,
            };

            // Solo incluir device_username si tiene valor
            if (this.ubicacionForm.value.device_username !== null && this.ubicacionForm.value.device_username !== '') {
                data.device_username = this.ubicacionForm.value.device_username;
            } else {
                data.device_username = null;
            }

            // Solo incluir device_password si tiene valor (para no sobrescribir al editar)
            if (this.ubicacionForm.value.device_password && this.ubicacionForm.value.device_password.trim() !== '') {
                data.device_password = this.ubicacionForm.value.device_password;
            } else if (!this.editando) {
                // Si es creación y no hay contraseña, enviar null
                data.device_password = null;
            }
            // Si es edición y no hay contraseña, no incluir el campo (no se actualiza)

            if (this.editando && this.ubicacionId) {
                // Actualizar
                await firstValueFrom(
                    this.http.put(`${environment.apiUrl}/ubicaciones/${this.ubicacionId}`, data)
                );
                this.success = 'Ubicación actualizada exitosamente.';
                
                // Recargar datos
                await Promise.all([
                    this.cargarUbicacion(this.ubicacionId),
                    this.cargarLockers()
                ]);
            } else {
                // Crear
                const nuevaUbicacion = await firstValueFrom(
                    this.http.post<Ubicacion>(`${environment.apiUrl}/ubicaciones`, data)
                );
                this.success = 'Ubicación creada exitosamente.';
                
                // Redirigir a la página de edición para poder gestionar lockers
                if (nuevaUbicacion?.id) {
                    setTimeout(() => {
                        this.router.navigate(['/admin/ubicaciones/editar', nuevaUbicacion.id]);
                    }, 1500);
                } else {
                    // Fallback: redirigir a lockers
                    setTimeout(() => {
                        this.router.navigate(['/admin/lockers']);
                    }, 1500);
                }
            }
        } catch (err: any) {
            console.error('Error guardando ubicación:', err);
            this.error = err?.error?.message || 
                err?.error?.errors?.nombre?.[0] ||
                'No se pudo guardar la ubicación. Intenta nuevamente.';
        } finally {
            this.loading = false;
        }
    }

    cancelar() {
        this.router.navigate(['/admin/lockers']);
    }

    hasError(ctrl: string, err: string): boolean {
        const c = this.ubicacionForm.controls[ctrl];
        return (c.touched || c.dirty) && c.hasError(err);
    }
}

