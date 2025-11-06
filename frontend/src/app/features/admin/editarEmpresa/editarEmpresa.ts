import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HeaderAdmin } from '../shared/header-admin/headerAdmin';
import { environment } from '../../../../environments/environment';

type EmpresaEstado = 'Activa' | 'Inactiva';

interface Region {
    id: number;
    nombre: string;
}

interface Comuna {
    id: number;
    nombre: string;
    region_id: number;
}

@Component({
    standalone: true,
    selector: 'app-editar-empresa',
    imports: [CommonModule, ReactiveFormsModule, RouterModule, HeaderAdmin],
    templateUrl: './editarEmpresa.html',
    styleUrls: ['./editarEmpresa.scss']
})
export class EditarEmpresa implements OnInit {
    private route = inject(ActivatedRoute);
    private fb = inject(FormBuilder);
    private router = inject(Router);
    private http = inject(HttpClient);

    loading = true;
    loadingSave = false;
    error?: string;
    regiones: Region[] = [];
    comunas: Comuna[] = [];
    empresaId?: number;

    estados: EmpresaEstado[] = ['Activa', 'Inactiva'];

    form = this.fb.group({
        id: [{ value: 0, disabled: true }],
        nombre: ['', [Validators.required, Validators.minLength(3)]],
        apellido: ['', [Validators.required, Validators.minLength(3)]],
        razonSocial: [''],
        rut: [''],
        correo: ['', [Validators.required, Validators.email]],
        telefono: ['', [Validators.pattern(/^\d{0,8}$/)]], // Solo números, máximo 8 dígitos
        direccion: [''],
        regionId: [''],
        comunaId: [''],
        estado: ['Activa' as EmpresaEstado, Validators.required],
    });

    /**
     * Maneja la entrada del teléfono, solo permite números y máximo 8 dígitos
     */
    onTelefonoInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        let valor = input.value.replace(/[^0-9]/g, ''); // Solo números
        
        // Limitar a 8 dígitos
        if (valor.length > 8) {
            valor = valor.slice(0, 8);
        }
        
        input.value = valor;
        this.form.get('telefono')?.setValue(valor, { emitEvent: false });
    }

    /**
     * Preparar el teléfono para enviar al backend: combinar prefijo +569 con los dígitos ingresados
     */
    private prepararTelefono(telefono: string | null | undefined): string | null {
        if (!telefono || telefono.trim().length === 0) {
            return null;
        }
        
        // Limpiar el teléfono (solo números)
        const digitos = telefono.replace(/[^0-9]/g, '');
        
        // Si tiene 8 dígitos, combinar con prefijo
        if (digitos.length === 8) {
            return `569${digitos}`;
        }
        
        // Si tiene menos de 8 dígitos pero tiene algo, también combinar
        if (digitos.length > 0) {
            return `569${digitos}`;
        }
        
        return null;
    }

    /**
     * Extrae solo los 8 dígitos del teléfono si viene con prefijo desde el backend
     */
    private extraerDigitosTelefono(telefono: string | null | undefined): string {
        if (!telefono || telefono.trim().length === 0) {
            return '';
        }
        
        // Extraer solo números
        const digitos = telefono.replace(/[^0-9]/g, '');
        
        // Si tiene prefijo 569, extraer los últimos 8 dígitos
        if (digitos.length > 8 && digitos.startsWith('569')) {
            return digitos.slice(-8);
        }
        
        // Si tiene exactamente 8 dígitos o menos, devolverlos
        return digitos.slice(-8);
    }

    /**
     * Formatea el RUT mientras el usuario escribe
     */
    formatearRut(event: Event): void {
        const input = event.target as HTMLInputElement;
        let valor = input.value.replace(/[^0-9kK]/g, '').toUpperCase();
        
        if (valor.length === 0) {
            this.form.get('rut')?.setValue('', { emitEvent: false });
            return;
        }
        
        const rutSinVerificador = valor.slice(0, -1);
        const verificador = valor.slice(-1);
        
        if (rutSinVerificador.length === 0) {
            this.form.get('rut')?.setValue(verificador, { emitEvent: false });
            return;
        }
        
        const formateado = rutSinVerificador.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        const rutCompleto = `${formateado}-${verificador}`;
        
        input.value = rutCompleto;
        this.form.get('rut')?.setValue(rutCompleto, { emitEvent: false });
    }

    /**
     * Limpia el RUT dejando solo números y k/K para enviar al backend
     */
    private limpiarRut(rut: string | null | undefined): string | null {
        if (!rut || rut.trim().length === 0) {
            return null;
        }
        const limpio = rut.replace(/[^0-9kK]/g, '').toUpperCase();
        return limpio.length > 0 ? limpio : null;
    }

    async ngOnInit(): Promise<void> {
        const idParam = this.route.snapshot.paramMap.get('id');
        if (!idParam) {
            this.error = 'ID de empresa no proporcionado';
            this.loading = false;
            return;
        }
        const id = Number(idParam);
        if (isNaN(id) || id <= 0) {
            this.error = 'ID de empresa inválido';
            this.loading = false;
            return;
        }
        this.empresaId = id;
        
        await Promise.all([
            this.cargarRegiones(),
            this.cargarEmpresa(id)
        ]);
    }

    private async cargarRegiones(): Promise<void> {
        try {
            const regiones = await this.http
                .get<Region[]>(`${environment.apiUrl}/empresas/regiones`)
                .toPromise();
            this.regiones = regiones ?? [];
        } catch (error) {
            console.error('Error cargando regiones:', error);
        }
    }

    onRegionChange(): void {
        const regionId = this.form.get('regionId')?.value;
        if (regionId) {
            this.cargarComunasPorRegion(Number(regionId));
        } else {
            this.comunas = [];
            this.form.get('comunaId')?.setValue('');
        }
    }

    private async cargarComunasPorRegion(regionId: number): Promise<void> {
        try {
            const comunas = await this.http
                .get<Comuna[]>(`${environment.apiUrl}/empresas/regiones/${regionId}/comunas`)
                .toPromise();
            this.comunas = comunas ?? [];
            
            // Si la comuna actual no pertenece a la nueva región, limpiarla
            const comunaIdActual = this.form.get('comunaId')?.value;
            if (comunaIdActual) {
                const comunaExiste = this.comunas.some(c => c.id === Number(comunaIdActual));
                if (!comunaExiste) {
                    this.form.get('comunaId')?.setValue('');
                }
            }
        } catch (error) {
            console.error('Error cargando comunas:', error);
            this.comunas = [];
        }
    }

    private async cargarEmpresa(id: number): Promise<void> {
        this.loading = true;
        this.error = undefined;
        try {
            const usuario = await this.http
                .get<any>(`${environment.apiUrl}/usuarios/${id}`)
                .toPromise();

            if (!usuario) {
                this.error = 'Empresa no encontrada';
                this.loading = false;
                return;
            }

            if (usuario.rol !== 'empresa') {
                this.error = 'El usuario seleccionado no es una empresa';
                this.loading = false;
                return;
            }

            const datosEmpresa = usuario.datos_empresa || usuario.datosEmpresa;

            // Cargar comunas si hay comuna_id
            if (datosEmpresa?.comuna_id) {
                const comuna = datosEmpresa.comuna || datosEmpresa.comuna_id;
                if (comuna?.region_id) {
                    await this.cargarComunasPorRegion(comuna.region_id);
                }
            }

            this.form.patchValue({
                id: usuario.id,
                nombre: usuario.nombre || '',
                apellido: usuario.apellido || '',
                razonSocial: datosEmpresa?.razon_social || datosEmpresa?.razonSocial || '',
                rut: datosEmpresa?.rut || '',
                correo: usuario.email || '',
                telefono: this.extraerDigitosTelefono(usuario.telefono),
                direccion: datosEmpresa?.direccion || '',
                regionId: datosEmpresa?.comuna?.region?.id || datosEmpresa?.comuna?.region_id || '',
                comunaId: datosEmpresa?.comuna_id || datosEmpresa?.comuna?.id || '',
                estado: 'Activa' as EmpresaEstado,
            });
        } catch (error: any) {
            console.error('Error cargando empresa:', error);
            this.error = error?.error?.message || 'Error al cargar la empresa';
        } finally {
            this.loading = false;
        }
    }

    volver(): void {
        this.router.navigate(['/admin/empresa']);
    }

    async guardar(): Promise<void> {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        if (!this.empresaId) {
            this.error = 'ID de empresa no disponible';
            return;
        }

        this.loadingSave = true;
        this.error = undefined;

        try {
            const valores = this.form.getRawValue();
            
            const payload: any = {
                nombre: valores.nombre,
                apellido: valores.apellido,
                email: valores.correo,
                telefono: this.prepararTelefono(valores.telefono),
            };

            // Datos de la empresa
            payload.nombre_empresa = valores.razonSocial || valores.nombre + ' ' + valores.apellido;
            payload.razon_social = valores.razonSocial || null;
            payload.rut = this.limpiarRut(valores.rut);
            payload.direccion = valores.direccion || null;
            payload.comuna_id = valores.comunaId ? Number(valores.comunaId) : null;

            await this.http
                .put(`${environment.apiUrl}/empresas/${this.empresaId}`, payload)
                .toPromise();

            this.router.navigate(['/admin/empresa']);
        } catch (error: any) {
            console.error('Error guardando empresa:', error);
            this.error = error?.error?.message || 'Error al guardar los cambios';
        } finally {
            this.loadingSave = false;
        }
    }
}