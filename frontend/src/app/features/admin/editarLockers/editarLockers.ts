import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HeaderAdmin } from '../../admin/shared/header-admin/headerAdmin';
import { environment } from '../../../../environments/environment';

type LockerEstado = 'activo' | 'bloqueado' | 'mantenimiento' | 'ocupado';

interface Ubicacion {
  id: number;
  nombre: string;
}

interface Mantenimiento {
  id: number;
  fecha_programada: string;
  descripcion: string;
  usuario?: { id: number; nombre: string; apellido: string };
}

interface Tecnico {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
}

@Component({
  standalone: true,
  selector: 'app-editar-lockers',
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HeaderAdmin],
  templateUrl: './editarLockers.html',
  styleUrls: ['./editarLockers.scss']
})
export class EditarLockers implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private http = inject(HttpClient);

  ubicaciones: Ubicacion[] = [];
  tecnicos: Tecnico[] = [];
  loading = false;
  loadingUbicaciones = false;
  loadingTecnicos = false;
  locker: any = null;

  form = this.fb.group({
    numero: [null as number | null, [Validators.required, Validators.min(1)]],
    ubicacion_id: [null as number | null, Validators.required],
    estado: ['activo' as LockerEstado, Validators.required],
    tamano: ['', Validators.required],
    mantenimiento: this.fb.group({
      fecha_programada: [''],
      descripcion: [''],
      tecnico_id: [null as number | null]
    })
  });

    async ngOnInit(): Promise<void> {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        await Promise.all([
          this.cargarUbicaciones(),
          this.cargarTecnicos(),
          this.cargarLocker(parseInt(id))
        ]);
      }
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

  private async cargarLocker(id: number): Promise<void> {
    this.loading = true;
    try {
      const response: any = await this.http
        .get<any>(`${environment.apiUrl}/lockers/${id}`)
        .toPromise();

      this.locker = response;

      // Cargar datos en el formulario
      const fechaMantenimiento = response.mantenimiento_proximo?.fecha_programada 
        ? new Date(response.mantenimiento_proximo.fecha_programada).toISOString().split('T')[0]
        : '';

      // Asignar técnico automáticamente si no hay mantenimiento próximo
      const tecnicoIdDefault = response.mantenimiento_proximo?.usuario_id || 
        (this.tecnicos.length > 0 ? this.tecnicos[0].id : null);

      this.form.patchValue({
        numero: response.numero,
        ubicacion_id: response.ubicacion_id,
        estado: response.estado,
        tamano: response.tamano || '',
        mantenimiento: {
          fecha_programada: fechaMantenimiento,
          descripcion: response.mantenimiento_proximo?.descripcion || '',
          tecnico_id: tecnicoIdDefault
        }
      });
    } catch (error) {
      console.error('Error cargando locker:', error);
      alert('No se pudo cargar la información del locker');
      this.volver();
    } finally {
      this.loading = false;
    }
  }

  get nombreLocker(): string {
    return this.locker ? `Locker #${this.locker.numero}` : 'Locker';
  }

  get mantenimientoProximo(): Mantenimiento | null {
    return this.locker?.mantenimiento_proximo || null;
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.locker) return;

    this.loading = true;
    try {
      const formValue = this.form.value;

      // Actualizar el locker
      const lockerData = {
        numero: formValue.numero,
        ubicacion_id: formValue.ubicacion_id,
        estado: formValue.estado,
        tamano: formValue.tamano
      };

      await this.http
        .patch(`${environment.apiUrl}/lockers/${this.locker.id}`, lockerData)
        .toPromise();

      // Si hay datos de mantenimiento, crear o actualizar
      if (formValue.mantenimiento?.fecha_programada || formValue.mantenimiento?.descripcion) {
        const tecnicoId = formValue.mantenimiento.tecnico_id || this.tecnicos[0]?.id;
        if (!tecnicoId) {
          alert('No hay técnicos disponibles. Por favor, crea al menos un técnico.');
          return;
        }
        
        const descripcion = formValue.mantenimiento.descripcion?.trim() || 'Mantenimiento programado';
        const mantenimientoData: any = {
          locker_id: this.locker.id,
          usuario_id: tecnicoId,
          descripcion: descripcion,
          estado: 'programado'
        };
        
        if (formValue.mantenimiento.fecha_programada) {
          mantenimientoData.fecha_programada = formValue.mantenimiento.fecha_programada;
        }

        if (this.mantenimientoProximo) {
          // Actualizar mantenimiento existente
          await this.http
            .patch(`${environment.apiUrl}/mantenimientos/${this.mantenimientoProximo.id}`, mantenimientoData)
            .toPromise();
        } else {
          // Crear nuevo mantenimiento
          await this.http
            .post(`${environment.apiUrl}/mantenimientos`, mantenimientoData)
            .toPromise();
        }
      }

      alert('Locker actualizado exitosamente');
      this.router.navigate(['/admin/lockers']);
    } catch (error: any) {
      console.error('Error actualizando locker:', error);
      alert(error?.error?.message || 'No se pudo actualizar el locker');
    } finally {
      this.loading = false;
    }
  }

  cancelar(): void {
    this.volver();
  }

  volver(): void {
    this.location.back();
  }
}
