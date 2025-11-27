import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../../../environments/environment";
import { DatePickerComponent } from "../../../../shared/components/date-picker/date-picker.component";

type ClienteOption = { id: number; label: string; email: string };
type ProductoEmpresa = { id: number; nombre: string; descripcion?: string; sku?: string; peso?: number; activo: boolean };
type ProductoSeleccionado = { producto: ProductoEmpresa; cantidad: number };
type RepartidorOption = { id: number; nombre: string; apellido?: string; email: string };

@Component({
  standalone: true,
  selector: "app-reserva-nueva",
  imports: [CommonModule, ReactiveFormsModule, RouterModule, DatePickerComponent],
  templateUrl: "./reserva-nueva.html",
  styleUrls: ["./reserva-nueva.scss"],
})
export class ReservaNuevaComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  clientes: ClienteOption[] = [];
  clientesFiltrados: ClienteOption[] = [];
  clienteFiltro = "";

  ubicaciones: { id: number; nombre: string }[] = [];
  tamanosDisponibles: { valor: string; label: string }[] = [];
  loadingTamanos = false;

  productos: ProductoEmpresa[] = [];
  productosFiltrados: ProductoEmpresa[] = [];
  productoFiltro = "";
  productosSeleccionados: ProductoSeleccionado[] = [];

  repartidores: RepartidorOption[] = [];
  loadingRepartidores = false;

  loadingData = false;
  loadingProductos = false;
  submitting = false;
  errorMsg = "";

  // Fecha mínima para el input de fecha (hoy) en formato ISO
  get fechaMinimaISO(): string {
    return new Date().toISOString().split("T")[0];
  }

  form = this.fb.group({
    usuario_id: ["", Validators.required],
    ubicacion_destino_id: ["", Validators.required],
    tamano_pedido: ["", Validators.required],
    fecha_estimada_llegada: ["", Validators.required], // El componente date picker emite en formato ISO (YYYY-MM-DD)
    tipo_acceso: ["codigo_temporal", Validators.required],
    repartidor_id: [""], // Opcional: si no se selecciona, se asignará automáticamente
  });

  async ngOnInit(): Promise<void> {
    await this.cargarDatosIniciales();
    // Establecer fecha estimada por defecto: mañana (para dar tiempo al repartidor) en formato ISO
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const fechaISO = tomorrow.toISOString().split("T")[0];
    this.form.patchValue({
      fecha_estimada_llegada: fechaISO, // El componente date picker espera formato ISO
    });
  }

  async cargarDatosIniciales(): Promise<void> {
    this.loadingData = true;
    try {
      const [clientesRes, misUbicacionesRes] = await Promise.all([
        this.http
          .get<any>(`${environment.apiUrl}/usuarios`, { params: { rol: "usuario", per_page: 100 } })
          .toPromise(),
        this.http.get<any>(`${environment.apiUrl}/empresa/mis-ubicaciones`).toPromise().catch(() => ({ ubicaciones: [] })),
      ]);

      this.clientes = (clientesRes?.data ?? []).map((c: any) => ({
        id: c.id,
        label: [c.nombre, c.apellido].filter(Boolean).join(" ").trim() || c.email || `Usuario #${c.id}`,
        email: c.email ?? "",
      }));
      this.clientesFiltrados = [...this.clientes];

      // Obtener ubicaciones disponibles según el plan de la empresa
      this.ubicaciones = (misUbicacionesRes?.ubicaciones ?? []).map((u: any) => ({
        id: u.id,
        nombre: u.nombre,
      })).sort((a: { id: number; nombre: string }, b: { id: number; nombre: string }) => a.nombre.localeCompare(b.nombre));

      if (this.ubicaciones.length === 0) {
        this.errorMsg = "Debes seleccionar ubicaciones antes de crear reservas. Ve a la sección de ubicaciones.";
      }
    } catch (error) {
      console.error("No se pudieron cargar los datos iniciales", error);
      this.errorMsg = "No se pudieron cargar los datos iniciales. Intenta nuevamente.";
    } finally {
      this.loadingData = false;
    }

    // Cargar productos de la empresa
    await this.cargarProductos();
    
    // Cargar repartidores de la empresa
    await this.cargarRepartidores();
  }

  async cargarRepartidores(): Promise<void> {
    this.loadingRepartidores = true;
    try {
      const res: any = await this.http
        .get<any>(`${environment.apiUrl}/empresa/repartidores`, { params: { per_page: 1000 } })
        .toPromise();

      this.repartidores = (res?.data ?? []).map((r: any) => ({
        id: r.id,
        nombre: r.nombre || "",
        apellido: r.apellido || "",
        email: r.email || "",
      }));
    } catch (error) {
      console.error("No se pudieron cargar los repartidores", error);
      // No mostrar error crítico, simplemente no habrá repartidores disponibles para selección manual
      this.repartidores = [];
    } finally {
      this.loadingRepartidores = false;
    }
  }

  async cargarProductos(): Promise<void> {
    this.loadingProductos = true;
    try {
      const res: any = await this.http
        .get<any>(`${environment.apiUrl}/empresa/productos`, { params: { activo: true, per_page: 1000 } })
        .toPromise();

      this.productos = (res?.data ?? []).map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        sku: p.sku,
        peso: p.peso,
        activo: p.activo,
      }));
      this.productosFiltrados = [...this.productos];
    } catch (error) {
      console.error("No se pudieron cargar los productos", error);
      // No mostrar error crítico, simplemente no habrá productos disponibles
      this.productos = [];
      this.productosFiltrados = [];
    } finally {
      this.loadingProductos = false;
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Validar que se hayan seleccionado productos
    if (this.productosSeleccionados.length === 0) {
      this.errorMsg = "Debes seleccionar al menos un producto para la reserva.";
      return;
    }

    this.submitting = true;
    this.errorMsg = "";

    const value = this.form.value;
    
    // Preparar artículos desde los productos seleccionados
    const articulos = this.productosSeleccionados.map(ps => ({
      nombre: ps.producto.nombre,
      cantidad: ps.cantidad,
      descripcion: ps.producto.descripcion || null,
      sku: ps.producto.sku || null,
      peso: ps.producto.peso || null,
    }));

    // Normalizar el tamaño del pedido
    if (!value.tamano_pedido) {
      this.errorMsg = "Debes seleccionar un tamaño de pedido válido.";
      this.submitting = false;
      return;
    }

    // El valor ya viene del select que solo muestra tamaños válidos de la ubicación
    // Solo normalizamos a mayúsculas para consistencia
    let tamanoPedido = String(value.tamano_pedido).trim().toUpperCase();
    
    // Verificar que el tamaño está en los disponibles para esta ubicación
    const tamanosValidos = this.tamanosDisponibles.map(t => t.valor.toUpperCase());
    if (!tamanosValidos.includes(tamanoPedido)) {
      console.error('Tamaño de pedido inválido recibido:', value.tamano_pedido, 'Tamaños válidos:', tamanosValidos);
      this.errorMsg = "El tamaño del pedido seleccionado no es válido. Por favor, selecciona un tamaño válido.";
      this.submitting = false;
      return;
    }

    // El componente date picker ya emite en formato ISO (YYYY-MM-DD)
    const fechaISO = value.fecha_estimada_llegada || '';
    if (!fechaISO) {
      this.errorMsg = "Debes seleccionar una fecha estimada de llegada.";
      this.submitting = false;
      return;
    }

    const payload: any = {
      usuario_id: Number(value.usuario_id),
      ubicacion_destino_id: Number(value.ubicacion_destino_id),
      tamano_pedido: tamanoPedido,
      fecha_reserva: fechaISO, // Ya viene en formato ISO (YYYY-MM-DD) del componente
      hora_inicio: null, // Ya no se requiere hora_inicio
      hora_fin: null,
      tipo_acceso: value.tipo_acceso,
      articulos: articulos, // Los artículos son obligatorios
    };

    // Incluir repartidor_id si se seleccionó uno manualmente
    if (value.repartidor_id) {
      payload.repartidor_id = Number(value.repartidor_id);
    }

    try {
      await this.http.post(`${environment.apiUrl}/reservas/empresa/solicitudes`, payload).toPromise();

      await this.router.navigate(["/empresa"]);
    } catch (error: any) {
      console.error("No se pudo crear la reserva", error);
      this.errorMsg = error?.error?.message ?? "No se pudo crear la reserva. Intenta nuevamente.";
    } finally {
      this.submitting = false;
    }
  }

  cancelar(): void {
    this.router.navigate(["/empresa"]);
  }

  onClienteFiltro(term: string): void {
    this.clienteFiltro = term;
    const normalized = term.trim().toLowerCase();

    if (!normalized) {
      this.clientesFiltrados = [...this.clientes];
      return;
    }

    this.clientesFiltrados = this.clientes.filter(c =>
      c.email.toLowerCase().includes(normalized) || c.label.toLowerCase().includes(normalized),
    );
  }

  async onUbicacionChange(event: Event): Promise<void> {
    const target = event.target as HTMLSelectElement | null;
    const ubicacionId = target?.value ? Number(target.value) : null;

    // Limpiar la selección de tamaño al cambiar de ubicación
    this.form.patchValue({ tamano_pedido: "" });
    this.tamanosDisponibles = [];

    if (!ubicacionId) {
      return;
    }

    // Cargar los tamaños disponibles para esta ubicación
    await this.cargarTamanosDisponibles(ubicacionId);
  }

  async cargarTamanosDisponibles(ubicacionId: number): Promise<void> {
    this.loadingTamanos = true;
    try {
      const res: any = await this.http
        .get(`${environment.apiUrl}/ubicaciones/tamanos-disponibles`, {
          params: { ubicacion_id: ubicacionId },
        })
        .toPromise();

      this.tamanosDisponibles = res?.tamanos || [];

      // Si no hay tamaños disponibles, mostrar mensaje
      if (this.tamanosDisponibles.length === 0) {
        this.errorMsg = "Esta ubicación no tiene lockers disponibles.";
      } else {
        this.errorMsg = "";
      }
    } catch (error: any) {
      console.error("Error cargando tamaños disponibles", error);
      this.tamanosDisponibles = [];
      this.errorMsg = error?.error?.message || "No se pudieron cargar los tamaños disponibles.";
    } finally {
      this.loadingTamanos = false;
    }
  }

  onProductoFiltro(term: string): void {
    this.productoFiltro = term;
    const normalized = term.trim().toLowerCase();

    if (!normalized) {
      this.productosFiltrados = [...this.productos];
      return;
    }

    this.productosFiltrados = this.productos.filter(p =>
      p.nombre.toLowerCase().includes(normalized) ||
      (p.sku && p.sku.toLowerCase().includes(normalized)) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(normalized))
    );
  }

  onProductoSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const productoId = target.value;
    if (!productoId) return;

    this.agregarProducto(Number(productoId));
    target.value = '';
  }

  agregarProducto(productoId: number): void {
    if (!productoId || isNaN(productoId)) return;

    const producto = this.productos.find(p => p.id === productoId);
    if (!producto) return;

    // Verificar si el producto ya está seleccionado
    const existente = this.productosSeleccionados.find(ps => ps.producto.id === producto.id);
    if (existente) {
      existente.cantidad += 1;
    } else {
      this.productosSeleccionados.push({ producto, cantidad: 1 });
    }
    // Limpiar filtro después de agregar
    this.productoFiltro = "";
    this.productosFiltrados = [...this.productos];
  }

  eliminarProducto(index: number): void {
    this.productosSeleccionados.splice(index, 1);
  }

  actualizarCantidad(index: number, cantidad: number): void {
    if (cantidad <= 0) {
      this.eliminarProducto(index);
    } else {
      this.productosSeleccionados[index].cantidad = cantidad;
    }
  }

}
