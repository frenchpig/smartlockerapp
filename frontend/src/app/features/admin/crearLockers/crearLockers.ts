import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HeaderAdmin } from '../../admin/shared/header-admin/headerAdmin';

type LockerEstado = 'Activo' | 'Ocupado' | 'En revisión' | 'Bloqueado';
type PoliticaCapacidad = 'Libre' | 'Exclusiva' | 'Mixta';

@Component({
    standalone: true,
    selector: 'app-crear-lockers',
    imports: [CommonModule, ReactiveFormsModule, RouterModule, HeaderAdmin],
    templateUrl: './crearLockers.html',
    styleUrls: ['./crearLockers.scss']
})
export class CrearLockers {
    private fb = inject(FormBuilder);
    private router = inject(Router);

    empresas = [{ id: 1, nombre: 'Empresa A' }, { id: 2, nombre: 'Empresa B' }];
    sedes: string[] = ['Metro Ñuñoa', 'Metro Ñuble'];
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
        nombre: ['', [Validators.required, Validators.minLength(3)]],
        empresaId: [null, Validators.required],
        sede: ['', Validators.required],
        estado: ['Activo' as LockerEstado],
        operacion: this.fb.group({
            modoQR: [true],
            modoCodigo: [true],
            modoRemoto: [false],
            tiempoAperturaSeg: [8, [Validators.min(1), Validators.max(30)]],
            reintentos: [3, [Validators.min(1), Validators.max(5)]],
            timeoutCierreSeg: [15, [Validators.min(5), Validators.max(120)]],
            dias: this.fb.group({ lu: true, ma: true, mi: true, ju: true, vi: true, sa: false, do: false }),
            horaDesde: ['08:00'],
            horaHasta: ['20:00']
        }),
        capacidad: this.fb.group({
            casilleros: [12, [Validators.required, Validators.min(1)]],
            politica: ['Libre' as PoliticaCapacidad]
        }),
        mantenimiento: this.fb.group({
            proximaFecha: [''],
            responsable: [''],
            notas: ['']
        })
    });

    guardar() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        console.log('Nuevo locker:', this.form.value);
        this.router.navigate(['/admin/lockers']);
    }

    cancelar() {
        this.router.navigate(['/admin/lockers']);
    }
}
