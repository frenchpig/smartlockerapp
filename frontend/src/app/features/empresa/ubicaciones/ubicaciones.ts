import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../../core/auth/auth';
import { environment } from '../../../../environments/environment';
import { HeaderEmpresaComponent } from '../shared/header-empresa/header-empresa.component';

interface Ubicacion {
  id: number;
  nombre: string;
  latitud: number;
  longitud: number;
}

interface Limitaciones {
  tiene_tarifa: boolean;
  tarifa?: {
    id: number;
    nombre: string;
    sedes_permitidas: number;
    lockers_por_sede: number;
  };
  uso_actual?: {
    sedes_asignadas: number;
    sedes_disponibles: number;
    lockers_por_sede: Array<{
      ubicacion_id: number;
      ubicacion_nombre: string;
      lockers_en_uso: number;
      lockers_permitidos: number;
    }>;
  };
}

@Component({
  standalone: true,
  selector: 'app-ubicaciones-empresa',
  imports: [CommonModule, RouterModule, FormsModule, HeaderEmpresaComponent],
  templateUrl: './ubicaciones.html',
  styleUrls: ['./ubicaciones.scss']
})
export class UbicacionesEmpresa implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  ubicacionesDisponibles: Ubicacion[] = [];
  ubicacionesSeleccionadas: number[] = [];
  limitaciones: Limitaciones | null = null;

  loading = false;
  saving = false;
  errorMsg = '';
  successMsg = '';

  ngOnInit(): void {
    this.cargarDatos();
  }

  async cargarDatos(): Promise<void> {
    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';

    try {
      const [ubicacionesRes, misUbicacionesRes] = await Promise.all([
        this.http.get<Ubicacion[]>(`${environment.apiUrl}/empresa/ubicaciones-disponibles`).toPromise(),
        this.http.get<any>(`${environment.apiUrl}/empresa/mis-ubicaciones`).toPromise()
      ]);

      this.ubicacionesDisponibles = ubicacionesRes ?? [];
      
      if (misUbicacionesRes?.ubicaciones) {
        this.ubicacionesSeleccionadas = (misUbicacionesRes.ubicaciones as Ubicacion[]).map(u => u.id);
      }

      if (misUbicacionesRes?.limitaciones) {
        this.limitaciones = misUbicacionesRes.limitaciones;
      }
    } catch (error: any) {
      console.error('Error cargando datos:', error);
      this.errorMsg = error?.error?.message || 'Error al cargar los datos';
    } finally {
      this.loading = false;
    }
  }

  toggleUbicacion(ubicacionId: number): void {
    const index = this.ubicacionesSeleccionadas.indexOf(ubicacionId);
    
    if (index > -1) {
      // Deseleccionar
      this.ubicacionesSeleccionadas.splice(index, 1);
    } else {
      // Verificar límite antes de seleccionar
      const sedesPermitidas = this.limitaciones?.tarifa?.sedes_permitidas ?? 0;
      
      if (sedesPermitidas > 0 && this.ubicacionesSeleccionadas.length >= sedesPermitidas) {
        this.errorMsg = `Tu tarifa permite máximo ${sedesPermitidas} sede(s). Deselecciona una ubicación antes de seleccionar otra.`;
        return;
      }

      // Seleccionar
      this.ubicacionesSeleccionadas.push(ubicacionId);
    }

    this.errorMsg = '';
    this.successMsg = '';
  }

  isSelected(ubicacionId: number): boolean {
    return this.ubicacionesSeleccionadas.includes(ubicacionId);
  }

  async guardar(): Promise<void> {
    if (this.ubicacionesSeleccionadas.length === 0) {
      this.errorMsg = 'Debes seleccionar al menos una ubicación';
      return;
    }

    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';

    try {
      const res = await this.http.post<any>(`${environment.apiUrl}/empresa/seleccionar-ubicaciones`, {
        ubicaciones: this.ubicacionesSeleccionadas
      }).toPromise();

      this.successMsg = res?.message || 'Ubicaciones guardadas correctamente';
      
      // Recargar datos para actualizar limitaciones
      await this.cargarDatos();

      // Redirigir después de 1 segundo
      setTimeout(() => {
        this.router.navigate(['/empresa']);
      }, 1000);
    } catch (error: any) {
      console.error('Error guardando ubicaciones:', error);
      this.errorMsg = error?.error?.message || 'Error al guardar las ubicaciones';
    } finally {
      this.saving = false;
    }
  }

  cancelar(): void {
    this.router.navigate(['/empresa']);
  }

  get sedesPermitidas(): number {
    return this.limitaciones?.tarifa?.sedes_permitidas ?? 0;
  }

  get sedesDisponibles(): number {
    return this.limitaciones?.uso_actual?.sedes_disponibles ?? 0;
  }

  get puedeSeleccionarMas(): boolean {
    if (this.sedesPermitidas === 0) return false;
    return this.ubicacionesSeleccionadas.length < this.sedesPermitidas;
  }

  transformCantidad(value: number): number | 'ilimitado' {
    return value === 0 ? 'ilimitado' : value;
  }
}

