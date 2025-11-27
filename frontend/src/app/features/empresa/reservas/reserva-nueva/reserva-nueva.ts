import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../../../environments/environment";

type ClienteOption = { id: number; label: string; email: string };

@Component({
  standalone: true,
  selector: "app-reserva-nueva",
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
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

  loadingData = false;
  submitting = false;
  errorMsg = "";

  form = this.fb.group({
    usuario_id: ["", Validators.required],
    ubicacion_destino_id: ["", Validators.required],
    tamano_pedido: ["", Validators.required],
    fecha_reserva: ["", Validators.required],
    hora_inicio: ["", Validators.required],
    tipo_acceso: ["codigo_temporal", Validators.required],
  });

  async ngOnInit(): Promise<void> {
    await this.cargarDatosIniciales();
    const today = new Date();
    const fechaIso = today.toISOString().split("T")[0];
    this.form.patchValue({
      fecha_reserva: fechaIso,
      hora_inicio: "10:00",
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
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMsg = "";

    const value = this.form.value;
    const payload = {
      usuario_id: Number(value.usuario_id),
      ubicacion_destino_id: Number(value.ubicacion_destino_id),
      tamano_pedido: value.tamano_pedido,
      fecha_reserva: value.fecha_reserva,
      hora_inicio: value.hora_inicio,
      hora_fin: null,
      tipo_acceso: value.tipo_acceso,
    };

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

}
