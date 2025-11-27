import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { HeaderEmpresaComponent } from '../shared/header-empresa/header-empresa.component';

interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
  sku: string | null;
  peso: number | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

@Component({
  standalone: true,
  selector: 'app-empresa-productos',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, HeaderEmpresaComponent],
  templateUrl: './productos.html',
  styleUrls: ['./productos.scss']
})
export class ProductosEmpresa implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  cargando = signal(false);
  error = signal('');
  successMsg = signal('');

  productos = signal<Producto[]>([]);
  page = 1;
  pageSize = 20;
  lastPage = 1;
  total = 0;

  // Filtros
  filtroBusqueda = '';
  filtroActivo: boolean | null = null;

  // Formulario
  mostrarFormulario = signal(false);
  editando = signal<Producto | null>(null);
  productoForm: FormGroup;

  constructor() {
    this.productoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
      descripcion: ['', [Validators.maxLength(1000)]],
      sku: ['', [Validators.maxLength(100)]],
      peso: ['', [Validators.min(0), Validators.max(9999.99)]],
      activo: [true],
    });
  }

  async ngOnInit(): Promise<void> {
    await this.cargarProductos();
  }

  async cargarProductos(page = 1): Promise<void> {
    this.cargando.set(true);
    this.error.set('');

    try {
      const params: Record<string, string | number | boolean> = {
        page,
        per_page: this.pageSize,
      };

      if (this.filtroBusqueda) {
        params['busqueda'] = this.filtroBusqueda;
      }

      if (this.filtroActivo !== null) {
        params['activo'] = this.filtroActivo;
      }

      const resp = await firstValueFrom(
        this.http.get<PaginatedResponse<Producto>>(
          `${environment.apiUrl}/empresa/productos`,
          { params }
        )
      );

      this.productos.set(resp?.data ?? []);
      this.page = Number(resp?.current_page ?? page) || 1;
      this.lastPage = Number(resp?.last_page ?? 1) || 1;
      this.total = Number(resp?.total ?? 0) || 0;
    } catch (err: any) {
      console.error('Error cargando productos:', err);
      this.error.set('No fue posible cargar los productos.');
      this.productos.set([]);
    } finally {
      this.cargando.set(false);
    }
  }

  abrirFormulario(producto?: Producto): void {
    this.editando.set(producto || null);
    this.error.set('');
    this.successMsg.set('');

    if (producto) {
      this.productoForm.patchValue({
        nombre: producto.nombre,
        descripcion: producto.descripcion || '',
        sku: producto.sku || '',
        peso: producto.peso || '',
        activo: producto.activo,
      });
    } else {
      this.productoForm.reset({
        nombre: '',
        descripcion: '',
        sku: '',
        peso: '',
        activo: true,
      });
    }

    this.mostrarFormulario.set(true);
  }

  cerrarFormulario(): void {
    this.mostrarFormulario.set(false);
    this.editando.set(null);
    this.productoForm.reset();
    this.error.set('');
    this.successMsg.set('');
  }

  async guardarProducto(): Promise<void> {
    if (this.productoForm.invalid) {
      this.productoForm.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.error.set('');
    this.successMsg.set('');

    try {
      const data = {
        nombre: this.productoForm.value.nombre,
        descripcion: this.productoForm.value.descripcion || null,
        sku: this.productoForm.value.sku || null,
        peso: this.productoForm.value.peso ? parseFloat(this.productoForm.value.peso) : null,
        activo: this.productoForm.value.activo ?? true,
      };

      if (this.editando()) {
        // Actualizar
        await firstValueFrom(
          this.http.put<Producto>(
            `${environment.apiUrl}/empresa/productos/${this.editando()!.id}`,
            data
          )
        );
        this.successMsg.set('Producto actualizado exitosamente.');
      } else {
        // Crear
        await firstValueFrom(
          this.http.post<Producto>(
            `${environment.apiUrl}/empresa/productos`,
            data
          )
        );
        this.successMsg.set('Producto creado exitosamente.');
      }

      // Recargar lista
      await this.cargarProductos(this.page);
      
      // Cerrar formulario después de un breve delay
      setTimeout(() => {
        this.cerrarFormulario();
      }, 1500);
    } catch (err: any) {
      console.error('Error guardando producto:', err);
      this.error.set(
        err?.error?.message || 
        err?.error?.errors?.sku?.[0] ||
        'No fue posible guardar el producto. Intenta nuevamente.'
      );
    } finally {
      this.cargando.set(false);
    }
  }

  async eliminarProducto(producto: Producto): Promise<void> {
    if (!confirm(`¿Estás seguro de que deseas eliminar el producto "${producto.nombre}"?`)) {
      return;
    }

    this.cargando.set(true);
    this.error.set('');
    this.successMsg.set('');

    try {
      await firstValueFrom(
        this.http.delete(`${environment.apiUrl}/empresa/productos/${producto.id}`)
      );

      this.successMsg.set('Producto eliminado exitosamente.');
      await this.cargarProductos(this.page);
    } catch (err: any) {
      console.error('Error eliminando producto:', err);
      this.error.set('No fue posible eliminar el producto. Intenta nuevamente.');
    } finally {
      this.cargando.set(false);
    }
  }

  async toggleActivo(producto: Producto): Promise<void> {
    this.cargando.set(true);
    this.error.set('');

    try {
      await firstValueFrom(
        this.http.put<Producto>(
          `${environment.apiUrl}/empresa/productos/${producto.id}`,
          { activo: !producto.activo }
        )
      );

      await this.cargarProductos(this.page);
    } catch (err: any) {
      console.error('Error actualizando estado:', err);
      this.error.set('No fue posible actualizar el estado del producto.');
    } finally {
      this.cargando.set(false);
    }
  }

  async aplicarFiltros(): Promise<void> {
    await this.cargarProductos(1);
  }

  async limpiarFiltros(): Promise<void> {
    this.filtroBusqueda = '';
    this.filtroActivo = null;
    await this.cargarProductos(1);
  }

  async paginaAnterior(): Promise<void> {
    if (this.page > 1) {
      await this.cargarProductos(this.page - 1);
    }
  }

  async paginaSiguiente(): Promise<void> {
    if (this.page < this.lastPage) {
      await this.cargarProductos(this.page + 1);
    }
  }

  totalPages(): number {
    return this.lastPage;
  }

  hasError(ctrl: string, err: string): boolean {
    const c = this.productoForm.controls[ctrl];
    return (c.touched || c.dirty) && c.hasError(err);
  }
}

