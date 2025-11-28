import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { HeaderTecnicoComponent } from '../shared/header-tecnico/header-tecnico.component';

interface Mantenimiento {
  id: number;
  descripcion: string;
  fecha_mantenimiento: string;
  es_urgente: boolean;
  estado: 'resuelta' | 'pendiente' | 'cancelado';
  comentarios?: string;
  tipo?: 'preventivo' | 'correctivo';
  locker?: {
    id: number;
    numero: number;
    ubicacion?: {
      id: number;
      nombre: string;
    };
  };
  incidencia?: {
    id: number;
    descripcion: string;
  };
}

@Component({
  standalone: true,
  selector: 'app-tecnico-detalle',
  imports: [CommonModule, RouterModule, DatePipe, ReactiveFormsModule, HeaderTecnicoComponent],
  templateUrl: './tecnico-detalle.html',
  styleUrls: ['./tecnico-detalle.scss']
})
export class TecnicoDetalle implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  mantenimiento = signal<Mantenimiento | null>(null);
  loading = signal<boolean>(true);
  guardando = signal<boolean>(false);

  form = this.fb.group({
    estado: ['pendiente', Validators.required],
    comentarios: [''],
    programarSiguientePreventivo: [false]
  });

  comentariosDefault = [
    'Problema solucionado',
    'Mantención realizada',
    'Reparación completada',
    'Sistema restaurado',
    'Mantención preventiva completada'
  ];

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      await this.cargarMantenimiento(parseInt(id));
    }

    // Deshabilitar checkbox de programar siguiente si el estado no es "resuelta"
    this.form.get('estado')?.valueChanges.subscribe(estado => {
      const programarControl = this.form.get('programarSiguientePreventivo');
      if (estado !== 'resuelta') {
        programarControl?.setValue(false);
      }
    });
  }

  private async cargarMantenimiento(id: number): Promise<void> {
    this.loading.set(true);
    try {
      const mantenimiento = await this.http
        .get<Mantenimiento>(`${environment.apiUrl}/tecnico/mantenciones/${id}`)
        .toPromise();

      this.mantenimiento.set(mantenimiento ?? null);
      if (mantenimiento) {
        this.form.patchValue({
          estado: mantenimiento.estado,
          comentarios: mantenimiento.comentarios || '',
          programarSiguientePreventivo: false
        });
      }
    } catch (error) {
      console.error('Error cargando mantención:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async guardar(): Promise<void> {
    if (this.form.invalid || !this.mantenimiento()) return;

    this.guardando.set(true);
    try {
      const mantenimiento = this.mantenimiento()!;
      const data = this.form.value;

      const payload: any = {
        estado: data.estado,
        comentarios: data.comentarios
      };

      // Si es un mantenimiento preventivo y se está resolviendo, incluir opción de programar siguiente
      if (mantenimiento.tipo === 'preventivo' && data.estado === 'resuelta' && data.programarSiguientePreventivo) {
        payload.programar_siguiente_preventivo = true;
      }

      await this.http
        .put(`${environment.apiUrl}/mantenimientos/${mantenimiento.id}`, payload)
        .toPromise();

      await this.cargarMantenimiento(mantenimiento.id);
      alert('Mantención actualizada correctamente' + (payload.programar_siguiente_preventivo ? '. Se ha programado el siguiente mantenimiento preventivo.' : ''));
    } catch (error) {
      console.error('Error guardando:', error);
      alert('Error al guardar la mantención');
    } finally {
      this.guardando.set(false);
    }
  }

  usarComentarioDefault(comentario: string) {
    this.form.patchValue({ comentarios: comentario });
  }

  puedeEditar(): boolean {
    const m = this.mantenimiento();
    return m !== null && m.estado === 'pendiente';
  }

  volver() {
    this.router.navigate(['/tecnico']);
  }
}

