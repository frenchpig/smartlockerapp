<?php

namespace App\Http\Controllers;

use App\Models\Locker;
use App\Models\Reserva;
use App\Models\HistorialLocker;
use App\Models\Mantenimiento;
use App\Models\Usuario;
use App\Services\HistorialLockerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class LockerController extends Controller
{
    public function index(Request $request)
    {
        $perPage = (int) $request->query('per_page', 20);
        $perPage = max(1, min(200, $perPage));

        $query = Locker::with('ubicacion');

        // Filtro por ubicación ID
        if ($ubicacionId = $request->query('ubicacion_id')) {
            $query->where('ubicacion_id', $ubicacionId);
        }

        // Filtro por nombre de ubicación
        if ($ubicacionNombre = trim((string) $request->query('ubicacion_nombre', ''))) {
            $query->whereHas('ubicacion', function ($q) use ($ubicacionNombre) {
                $q->where('nombre', $ubicacionNombre);
            });
        }

        // Filtro por estado
        if ($estado = trim((string) $request->query('estado', ''))) {
            $query->where('estado', $estado);
        }

        // Filtro de búsqueda (por número, ubicación, empresa)
        if ($busqueda = trim((string) $request->query('busqueda', ''))) {
            $query->where(function ($q) use ($busqueda) {
                // Buscar por número
                $q->where('numero', 'like', "%{$busqueda}%")
                  // Buscar por nombre de ubicación
                  ->orWhereHas('ubicacion', function ($ubicacionQuery) use ($busqueda) {
                      $ubicacionQuery->where('nombre', 'like', "%{$busqueda}%");
                  })
                  // Buscar por empresa en reservas activas
                  ->orWhereHas('reservas', function ($reservaQuery) use ($busqueda) {
                      $reservaQuery->where('estado', 'pendiente')
                          ->whereHas('empresa', function ($empresaQuery) use ($busqueda) {
                              $empresaQuery->where('nombre', 'like', "%{$busqueda}%")
                                          ->orWhere('apellido', 'like', "%{$busqueda}%");
                          });
                  });
            });
        }

        $lockers = $query->get();

        // Agregar información de empresa activa a cada locker
        $lockers->transform(function ($locker) {
            // Buscar la reserva activa más reciente
            $reservaActiva = Reserva::where('locker_id', $locker->id)
                ->where('estado', 'pendiente')
                ->with('empresa:id,nombre,apellido')
                ->orderBy('created_at', 'desc')
                ->first();
            
            $locker->empresa_actual = $reservaActiva && $reservaActiva->empresa ? [
                'id' => $reservaActiva->empresa->id ?? null,
                'nombre' => trim(($reservaActiva->empresa->nombre ?? '') . ' ' . ($reservaActiva->empresa->apellido ?? ''))
            ] : null;
            return $locker;
        });

        // Paginar manualmente
        $total = $lockers->count();
        $page = (int) $request->query('page', 1);
        $offset = ($page - 1) * $perPage;
        $items = $lockers->slice($offset, $perPage)->values();

        return response()->json([
            'data' => $items,
            'current_page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'last_page' => ceil($total / $perPage),
        ]);
    }

    public function show(Locker $locker)
    {
        $locker->load('ubicacion');

        // Obtener el mantenimiento con fecha programada más cercana
        $mantenimientoProximo = \App\Models\Mantenimiento::where('locker_id', $locker->id)
            ->whereNotNull('fecha_programada')
            ->where('fecha_programada', '>=', now())
            ->orderBy('fecha_programada', 'asc')
            ->with('usuario:id,nombre,apellido')
            ->first();

        $locker->mantenimiento_proximo = $mantenimientoProximo;

        return $locker;
    }

    public function historial(Request $request, Locker $locker)
    {
        $perPage = (int) $request->query('per_page', 5);
        $perPage = max(1, min(50, $perPage));

        $query = HistorialLocker::where('locker_id', $locker->id)
            ->with(['usuario:id,nombre,apellido', 'reserva', 'mantenimiento', 'incidencia']);

        // Filtro por acción
        if ($accion = $request->query('accion')) {
            $query->where('accion', $accion);
        }

        $historial = $query->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json($historial);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'numero'                 => ['required','integer','min:1'],
            'ubicacion_id'           => ['required','integer','exists:ubicaciones,id'],
            'estado'                 => ['required', Rule::in(Locker::ESTADOS)],
            'tamano'                 => ['required','string','max:100'],
            'codigo_acceso_temporal' => ['nullable','string','max:100'],
        ]);

        $locker = Locker::create($data);
        $locker->load('ubicacion');

        // Registrar en historial
        HistorialLockerService::registrarCreacion(
            $locker->id,
            $locker->numero,
            $locker->ubicacion->nombre ?? 'ubicación desconocida',
            Auth::id()
        );

        // Crear mantenimiento preventivo automático 1 mes después de la creación
        $this->crearMantenimientoPreventivo($locker->id, Auth::id());

        return response()->json($locker, 201);
    }

    public function update(Request $request, Locker $locker)
    {
        $data = $request->validate([
            'numero'                 => ['sometimes','integer','min:1'],
            'ubicacion_id'           => ['sometimes','integer','exists:ubicaciones,id'],
            'estado'                 => ['sometimes', Rule::in(Locker::ESTADOS)],
            'tamano'                 => ['sometimes','string','max:100'],
            'codigo_acceso_temporal' => ['sometimes','nullable','string','max:100'],
        ]);

        $datosAnteriores = $locker->only(['estado', 'numero', 'ubicacion_id', 'tamano']);
        $locker->update($data);
        $datosNuevos = $locker->fresh()->only(['estado', 'numero', 'ubicacion_id', 'tamano']);

        // Registrar cambio de estado si cambió
        if (isset($data['estado']) && $datosAnteriores['estado'] !== $datosNuevos['estado']) {
            HistorialLockerService::registrarCambioEstado(
                $locker->id,
                $datosAnteriores['estado'],
                $datosNuevos['estado'],
                Auth::id()
            );
        }

        return $locker->load('ubicacion');
    }

    public function destroy(Locker $locker)
    {
        $locker->delete();
        return response()->noContent();
    }

    /**
     * Crear mantenimiento preventivo automático para un locker
     * Se programa 1 mes después de la fecha actual
     */
    private function crearMantenimientoPreventivo(int $lockerId, ?int $usuarioId = null): void
    {
        // Buscar un técnico habilitado (el primero disponible)
        $tecnico = Usuario::where('rol', 'tecnico')
            ->where('habilitado', true)
            ->orderBy('id')
            ->first();

        // Si no hay técnico, no crear el mantenimiento (se puede asignar manualmente después)
        if (!$tecnico) {
            return;
        }

        // Calcular fecha: 1 mes después de hoy
        $fechaMantenimiento = now()->addMonth();

        Mantenimiento::create([
            'locker_id' => $lockerId,
            'usuario_id' => $tecnico->id,
            'descripcion' => 'Mantenimiento preventivo programado automáticamente',
            'fecha_mantenimiento' => $fechaMantenimiento,
            'fecha_programada' => $fechaMantenimiento, // mantener compatibilidad
            'es_urgente' => false,
            'estado' => 'pendiente',
            'tipo' => 'preventivo',
        ]);
    }
}
