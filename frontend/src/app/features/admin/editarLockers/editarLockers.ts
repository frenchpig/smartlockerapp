import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HeaderAdmin } from '../../admin/shared/header-admin/headerAdmin';

type LockerEstado = 'Activo' | 'Ocupado' | 'En revisión' | 'Bloqueado';
type PoliticaCapacidad = 'Libre' | 'Exclusiva' | 'Mixta';

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

  // (mock)
  empresas = [{ id: 1, nombre: 'Empresa A' }, { id: 2, nombre: 'Empresa B' }];
  sedes: string[] = ['Metro Ñuñoa', 'Ñuble'];
  politicas: PoliticaCapacidad[] = ['Libre', 'Exclusiva', 'Mixta'];

  // Lista de días
diasList = [
  { key: 'lu', label: 'Lu' },
  { key: 'ma', label: 'Ma' },
  { key: 'mi', label: 'Mi' },
  { key: 'ju', label: 'Ju' },
  { key: 'vi', label: 'Vi' },
  { key: 'sa', label: 'Sa' },
  { key: 'do', label: 'Do' },
];

// días
setDias(mode: 'all' | 'weekday' | 'none') {
  const dias = this.form.get('operacion.dias');
  if (!dias) return;
  const set = (k: string, v: boolean) => dias.get(k)?.setValue(v);
  const keys = this.diasList.map(d => d.key);

  if (mode === 'all') keys.forEach(k => set(k, true));
  if (mode === 'weekday') keys.forEach(k => set(k, ['lu', 'ma', 'mi', 'ju', 'vi'].includes(k)));
  if (mode === 'none') keys.forEach(k => set(k, false));
}


  form = this.fb.group({
    // Datos generales
    id: this.fb.control<number | null>({ value: 12, disabled: true }),
    codigo: this.fb.control<string | null>({ value: 'LK-012', disabled: true }),
    nombre: this.fb.control<string>('Locker #12', {
      validators: [Validators.required, Validators.minLength(3)]
    }),
    empresaId: this.fb.control<number>(1, { validators: [Validators.required] }),
    sede: this.fb.control<string>('Metro Ñuñoa', { validators: [Validators.required] }),
    estado: this.fb.control<LockerEstado>('Activo', { validators: [Validators.required] }),
    motivoBloqueo: this.fb.control<string>(''),

    // Operación
    operacion: this.fb.group({
      modoQR: this.fb.control<boolean>(true),
      modoCodigo: this.fb.control<boolean>(true),
      modoRemoto: this.fb.control<boolean>(false),
      tiempoAperturaSeg: this.fb.control<number>(8, { validators: [Validators.min(1), Validators.max(30)] }),
      reintentos: this.fb.control<number>(3, { validators: [Validators.min(1), Validators.max(5)] }),
      timeoutCierreSeg: this.fb.control<number>(15, { validators: [Validators.min(5), Validators.max(120)] }),
      dias: this.fb.group({
        lu: true, ma: true, mi: true, ju: true, vi: true, sa: false, do: false
      }),
      horaDesde: this.fb.control<string>('08:00'),
      horaHasta: this.fb.control<string>('20:00'),
    }),

    // Capacidad
    capacidad: this.fb.group({
      casilleros: this.fb.control<number>(12, { validators: [Validators.required, Validators.min(1)] }),
      politica: this.fb.control<PoliticaCapacidad>('Libre')
    }),

    // Mantenimiento
    mantenimiento: this.fb.group({
      proximaFecha: this.fb.control<string>(''),
      responsable: this.fb.control<string>(''),
      notas: this.fb.control<string>(''),
    })
  });

  ngOnInit(): void {
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload = this.form.getRawValue();
    console.log('Guardar', payload);
    // TODO: call API → toast → volver
    this.router.navigate(['/admin/lockers']);
  }

  cancelar(): void {
    this.router.navigate(['/admin/lockers']);
  }
}
