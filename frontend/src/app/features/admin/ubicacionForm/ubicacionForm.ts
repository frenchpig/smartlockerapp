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
            // Cargar ubicación primero para llenar el formulario
            await this.cargarUbicacion(this.ubicacionId);
            // Luego cargar lockers
            if (this.ubicacionId) {
                await this.cargarLockers();
            }
        }
    }

    async cargarUbicacion(id: number): Promise<void> {
        this.loading = true;
        this.error = '';

        try {
            const response: any = await firstValueFrom(
                this.http.get<Ubicacion>(`${environment.apiUrl}/ubicaciones/${id}`)
            );

            console.log('=== RESPUESTA COMPLETA DEL API ===');
            console.log(response);
            console.log('==================================');

            // Manejar respuesta que puede venir con o sin wrapper 'data'
            const ubicacion = response?.data || response;
            
            console.log('=== DATOS DE UBICACIÓN PARSEADOS ===');
            console.log(ubicacion);
            console.log('====================================');

            if (!ubicacion) {
                throw new Error('No se recibieron datos de la ubicación');
            }

            this.ubicacion = ubicacion;

            // Preparar los valores para el formulario
            const nombre = ubicacion.nombre || '';
            const latitud = (ubicacion.latitud !== null && ubicacion.latitud !== undefined && ubicacion.latitud !== '') 
                ? String(ubicacion.latitud) 
                : '';
            const longitud = (ubicacion.longitud !== null && ubicacion.longitud !== undefined && ubicacion.longitud !== '') 
                ? String(ubicacion.longitud) 
                : '';
            const deviceUsername = ubicacion.device_username || '';

            // Cargar todos los datos existentes de la ubicación en el formulario
            // Usar setTimeout para asegurar que el formulario esté completamente inicializado
            setTimeout(() => {
                this.ubicacionForm.setValue({
                    nombre: nombre,
                    latitud: latitud,
                    longitud: longitud,
                    device_username: deviceUsername,
                    device_password: '', // Siempre en blanco al cargar (la contraseña no se devuelve por seguridad)
                }, { emitEvent: false });
            }, 0);
        } catch (err: any) {
            console.error('Error cargando ubicación:', err);
            this.error = err?.error?.message || 'No se pudo cargar la ubicación.';
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
            const formValue = this.ubicacionForm.value;
            const data: any = {
                nombre: formValue.nombre,
                latitud: formValue.latitud && formValue.latitud.trim() !== '' 
                    ? parseFloat(formValue.latitud) 
                    : null,
                longitud: formValue.longitud && formValue.longitud.trim() !== '' 
                    ? parseFloat(formValue.longitud) 
                    : null,
            };

            // Incluir device_username (puede ser null o vacío)
            if (formValue.device_username !== null && formValue.device_username !== undefined && formValue.device_username.trim() !== '') {
                data.device_username = formValue.device_username.trim();
            } else {
                data.device_username = null;
            }

            // Manejar device_password:
            // - Si es creación: incluir siempre (puede ser null)
            // - Si es edición: solo incluir si el usuario escribió algo (no está vacío)
            const passwordValue = formValue.device_password?.trim() || '';
            if (this.editando) {
                // En edición, solo enviar la contraseña si el usuario escribió algo
                if (passwordValue !== '') {
                    data.device_password = passwordValue;
                }
                // Si está vacío, no incluir el campo para que el backend mantenga la contraseña actual
            } else {
                // En creación, siempre incluir el campo (puede ser null)
                data.device_password = passwordValue !== '' ? passwordValue : null;
            }

            if (this.editando && this.ubicacionId) {
                // Actualizar ubicación existente
                const response: any = await firstValueFrom(
                    this.http.put(`${environment.apiUrl}/ubicaciones/${this.ubicacionId}`, data)
                );
                this.success = 'Ubicación actualizada exitosamente.';
                
                // Recargar datos actualizados
                await Promise.all([
                    this.cargarUbicacion(this.ubicacionId),
                    this.cargarLockers()
                ]);
            } else {
                // Crear nueva ubicación
                const response: any = await firstValueFrom(
                    this.http.post<Ubicacion>(`${environment.apiUrl}/ubicaciones`, data)
                );
                const nuevaUbicacion = response?.data || response;
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

