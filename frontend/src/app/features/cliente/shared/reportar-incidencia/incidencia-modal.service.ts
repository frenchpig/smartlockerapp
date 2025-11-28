import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface PedidoIncidencia {
  id: number;
  lockerId?: number;
}

export interface IncidenciaFormData {
  tipo: 'locker' | 'pedido' | 'otro';
  problema_tipo: string;
  descripcion: string;
}

@Injectable({
  providedIn: 'root'
})
export class IncidenciaModalService {
  private showModalSubject = new BehaviorSubject<boolean>(false);
  public showModal$ = this.showModalSubject.asObservable();

  private pedidoSubject = new BehaviorSubject<PedidoIncidencia | null>(null);
  public pedido$ = this.pedidoSubject.asObservable();

  private formSubject = new BehaviorSubject<IncidenciaFormData>({
    tipo: 'pedido',
    problema_tipo: '',
    descripcion: ''
  });
  public form$ = this.formSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  get showModal(): boolean {
    return this.showModalSubject.value;
  }

  get pedido(): PedidoIncidencia | null {
    return this.pedidoSubject.value;
  }

  get form(): IncidenciaFormData {
    return this.formSubject.value;
  }

  get loading(): boolean {
    return this.loadingSubject.value;
  }

  abrirModal(pedido: PedidoIncidencia) {
    this.resetForm();
    this.pedidoSubject.next(pedido);
    this.showModalSubject.next(true);
  }

  cerrarModal() {
    this.showModalSubject.next(false);
    this.resetForm();
    this.pedidoSubject.next(null);
  }

  setForm(form: Partial<IncidenciaFormData>) {
    this.formSubject.next({
      ...this.formSubject.value,
      ...form
    });
  }

  setLoading(loading: boolean) {
    this.loadingSubject.next(loading);
  }

  private resetForm() {
    this.formSubject.next({
      tipo: 'pedido',
      problema_tipo: '',
      descripcion: ''
    });
  }
}

