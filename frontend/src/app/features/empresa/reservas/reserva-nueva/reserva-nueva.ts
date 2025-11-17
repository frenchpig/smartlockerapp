import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../../../environments/environment";

type ClienteOption = { id: number; label: string; email: string };
type LockerOption = {
  id: number;
  label: string;
  numero: number;
  ubicacionId: number;
  ubicacionNombre: string;
  estado: string;
};

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

  lockers: LockerOption[] = [];
  ubicaciones: { id: number; nombre: string }[] = [];
  lockersFiltrados: LockerOption[] = [];

  loadingData = false;
  submitting = false;
  errorMsg = "";

  form = this.fb.group({
    usuario_id: ["", Validators.required],
    ubicacion_id: ["", Validators.required],
    locker_id: ["", Validators.required],
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
      const [clientesRes, lockersRes, misUbicacionesRes] = await Promise.all([
        this.http
          .get<any>(`${environment.apiUrl}/usuarios`, { params: { rol: "usuario", per_page: 100 } })
          .toPromise(),
        this.http.get<any>(`${environment.apiUrl}/lockers`, { params: { per_page: 100 } }).toPromise(),
        this.http.get<any>(`${environment.apiUrl}/empresa/mis-ubicaciones`).toPromise().catch(() => ({ ubicaciones: [] })),
      ]);

      this.clientes = (clientesRes?.data ?? []).map((c: any) => ({
        id: c.id,
        label: [c.nombre, c.apellido].filter(Boolean).join(" ").trim() || c.email || `Usuario #${c.id}`,
        email: c.email ?? "",
      }));
      this.clientesFiltrados = [...this.clientes];

      // Obtener IDs de ubicaciones seleccionadas
      const ubicacionesSeleccionadasIds = (misUbicacionesRes?.ubicaciones ?? []).map((u: any) => u.id);

      // Filtrar lockers solo de ubicaciones seleccionadas
      const todosLockers = (lockersRes?.data ?? []).map((l: any) => ({
        id: l.id,
        label: `Locker #${l.numero ?? l.id} - ${l.ubicacion?.nombre ?? "Sin ubicacion"}`,
        numero: Number(l.numero ?? l.id),
        ubicacionId: l.ubicacion_id ?? l.ubicacion?.id ?? 0,
        ubicacionNombre: l.ubicacion?.nombre ?? "Sin ubicacion",
        estado: l.estado ?? "desconocido",
      }));

      // Si hay ubicaciones seleccionadas, filtrar; si no, mostrar todas pero con advertencia
      if (ubicacionesSeleccionadasIds.length > 0) {
        this.lockers = todosLockers.filter((l: LockerOption) => ubicacionesSeleccionadasIds.includes(l.ubicacionId));
      } else {
        this.lockers = todosLockers;
        this.errorMsg = "Debes seleccionar ubicaciones antes de crear reservas. Ve a la sección de ubicaciones.";
      }

      // Obtener ubicaciones solo de las seleccionadas
      this.ubicaciones = this.lockers
        .reduce<{ id: number; nombre: string }[]>((acc, locker) => {
          if (!locker.ubicacionId) {
            return acc;
          }

          if (!acc.some(u => u.id === locker.ubicacionId)) {
            acc.push({ id: locker.ubicacionId, nombre: locker.ubicacionNombre });
          }

          return acc;
        }, [])
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
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
      locker_id: Number(value.locker_id),
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

  onUbicacionChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    const rawId = target?.value ?? "";
    const ubicacionId = Number(rawId || 0);

    this.form.patchValue({ ubicacion_id: rawId, locker_id: "" });
    this.lockersFiltrados = [];

    if (!ubicacionId) {
      return;
    }

    this.lockersFiltrados = this.lockers
      .filter(l => l.ubicacionId === ubicacionId)
      .sort((a, b) => a.numero - b.numero);

    const lockerControl = this.form.get("locker_id");
    lockerControl?.markAsPristine();
    lockerControl?.markAsUntouched();
    lockerControl?.updateValueAndValidity();
  }
}
