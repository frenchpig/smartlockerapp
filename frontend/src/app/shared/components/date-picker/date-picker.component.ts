import { Component, forwardRef, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-date-picker',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './date-picker.component.html',
  styleUrls: ['./date-picker.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatePickerComponent),
      multi: true
    }
  ]
})
export class DatePickerComponent implements OnInit, ControlValueAccessor {
  @Input() label: string = '';
  @Input() placeholder: string = 'DD/MM/YYYY';
  @Input() minDate: string = '';
  @Input() maxDate: string = '';
  @Input() disabled: boolean = false;
  @Input() required: boolean = false;
  @Input() id: string = '';

  // Valor interno en formato DD/MM/YYYY (para mostrar)
  displayValue: string = '';
  // Valor interno en formato ISO (YYYY-MM-DD) para el date picker nativo
  isoValue: string = '';

  private onChange = (value: string) => {};
  private onTouched = () => {};

  ngOnInit(): void {
    // Si hay un valor inicial, convertirlo
    if (this.isoValue) {
      this.updateDisplayValue(this.isoValue);
    }
  }

  // Convertir fecha de YYYY-MM-DD a DD/MM/YYYY (formato para mostrar)
  private fechaToDDMMYYYY(fecha: string): string | null {
    if (!fecha) return null;
    const partes = fecha.split('-');
    if (partes.length !== 3) return null;
    const [anio, mes, dia] = partes;
    return `${dia}/${mes}/${anio}`;
  }

  // Convertir fecha de DD/MM/YYYY a YYYY-MM-DD (formato ISO para backend)
  private fechaToISO(fecha: string): string | null {
    if (!fecha) return null;
    const partes = fecha.split('/');
    if (partes.length !== 3) return null;
    const [dia, mes, anio] = partes;
    return `${anio}-${mes}-${dia}`;
  }

  // Actualizar el valor de visualización desde ISO
  private updateDisplayValue(isoDate: string): void {
    if (isoDate) {
      const ddmmyyyy = this.fechaToDDMMYYYY(isoDate);
      if (ddmmyyyy) {
        this.displayValue = ddmmyyyy;
      }
    } else {
      this.displayValue = '';
    }
  }

  // Cuando el usuario selecciona una fecha del date picker nativo
  onDatePickerChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const fechaISO = input.value;
    
    if (fechaISO) {
      this.isoValue = fechaISO;
      this.updateDisplayValue(fechaISO);
      this.onChange(fechaISO); // Emitir en formato ISO para el formulario
      this.onTouched();
    } else {
      this.isoValue = '';
      this.displayValue = '';
      this.onChange('');
      this.onTouched();
    }
  }

  // Cuando el usuario escribe manualmente en el input de texto
  onTextInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, ''); // Solo números
    
    // Formatear automáticamente mientras el usuario escribe
    if (value.length > 0) {
      if (value.length <= 2) {
        value = value;
      } else if (value.length <= 4) {
        value = value.slice(0, 2) + '/' + value.slice(2);
      } else {
        value = value.slice(0, 2) + '/' + value.slice(2, 4) + '/' + value.slice(4, 8);
      }
    }
    
    // Actualizar el valor del input
    input.value = value;
    this.displayValue = value;
    
    // Actualizar también el date picker oculto si la fecha es válida
    const fechaISO = this.fechaToISO(value);
    if (fechaISO) {
      this.isoValue = fechaISO;
      this.onChange(fechaISO);
    } else {
      this.isoValue = '';
      this.onChange('');
    }
    this.onTouched();
  }

  // Abrir el date picker cuando se hace clic en el input de texto o en el icono
  openDatePicker(): void {
    if (this.disabled) return;
    const datePicker = document.getElementById(`${this.id || 'datePicker'}_native`) as HTMLInputElement;
    if (datePicker) {
      if (typeof datePicker.showPicker === 'function') {
        datePicker.showPicker();
      } else {
        datePicker.click();
      }
    }
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    if (value) {
      // Si el valor viene en formato ISO (YYYY-MM-DD)
      if (value.includes('-') && value.length === 10) {
        this.isoValue = value;
        this.updateDisplayValue(value);
      } else {
        // Si viene en formato DD/MM/YYYY, convertir a ISO
        const iso = this.fechaToISO(value);
        if (iso) {
          this.isoValue = iso;
          this.displayValue = value;
        }
      }
    } else {
      this.isoValue = '';
      this.displayValue = '';
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}

