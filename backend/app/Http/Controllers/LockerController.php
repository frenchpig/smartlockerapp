<?php

namespace App\Http\Controllers;

use App\Models\Locker;
use App\Models\Reserva;
use App\Models\HistorialLocker;
use App\Services\HistorialLockerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class LockerController extends Controller
{
    public function index(Request $request)
    {
        $perPage = (int) $request->query('per_page', 20);
        $perPage = max(1, min(200, $perPage));

        $query = Locker::with('ubicacion');

        if ($ubicacionId = $request->query('ubicacion_id')) {
            $query->where('ubicacion_id', $ubicacionId);
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
}
