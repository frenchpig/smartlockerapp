<?php

namespace App\Http\Controllers;

use App\Models\Mantenimiento;
use App\Models\HistorialLocker;
use App\Services\HistorialLockerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class MantenimientoController extends Controller
{
    public function index(Request $request)
    {
        $perPage = (int) $request->query('per_page', 20);
        $perPage = max(1, min(100, $perPage));

        $query = Mantenimiento::with(['locker.ubicacion', 'usuario', 'incidencia']);

        // Filtros
        if ($estado = trim((string) $request->query('estado', ''))) {
            $query->where('estado', $estado);
        }

        if ($esUrgente = $request->query('es_urgente')) {
            $query->where('es_urgente', filter_var($esUrgente, FILTER_VALIDATE_BOOLEAN));
        }

        if ($tecnicoId = $request->query('tecnico_id')) {
            $query->where('usuario_id', $tecnicoId);
        }

        // Ordenar: urgentes primero, luego por fecha más cercana
        $query->orderByDesc('es_urgente')
              ->orderBy('fecha_mantenimiento')
              ->orderByDesc('created_at');

        return $query->paginate($perPage);
    }

    public function show(Mantenimiento $mantenimiento)
    {
        return $mantenimiento->load(['locker.ubicacion', 'usuario', 'incidencia']);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'locker_id'          => ['required', 'integer', 'exists:lockers,id'],
            'usuario_id'         => ['required', 'integer', 'exists:usuarios,id'],
            'descripcion'        => ['required', 'string', 'max:1000'],
            'fecha_mantenimiento'=> ['required', 'date'],
            'es_urgente'         => ['sometimes', 'boolean'],
            'estado'             => ['sometimes', Rule::in(Mantenimiento::ESTADOS)],
            'comentarios'        => ['nullable', 'string', 'max:2000'],
            'incidencia_id'      => ['nullable', 'integer', 'exists:incidencias,id'],
            'tipo'               => ['sometimes', Rule::in(Mantenimiento::TIPOS)],
        ]);

        // Validar que el usuario sea técnico
        $tecnico = \App\Models\Usuario::find($data['usuario_id']);
        if (!$tecnico || $tecnico->rol !== 'tecnico') {
            return response()->json(['message' => 'El usuario asignado debe ser un técnico'], 422);
        }

        $data['estado'] = $data['estado'] ?? 'pendiente';
        $data['es_urgente'] = $data['es_urgente'] ?? false;
        $data['tipo'] = $data['tipo'] ?? 'correctivo';
        $data['fecha_programada'] = $data['fecha_mantenimiento']; // mantener compatibilidad

        $mantenimiento = Mantenimiento::create($data);

        // Registrar en historial del locker
        HistorialLockerService::registrarMantenimientoProgramado(
            $mantenimiento->locker_id,
            $mantenimiento->id,
            $mantenimiento->fecha_mantenimiento ? $mantenimiento->fecha_mantenimiento->format('Y-m-d') : null,
            Auth::id()
        );

        return response()->json($mantenimiento->load(['locker.ubicacion', 'usuario', 'incidencia']), 201);
    }

    public function update(Request $request, Mantenimiento $mantenimiento)
    {
        $data = $request->validate([
            'locker_id'          => ['sometimes', 'integer', 'exists:lockers,id'],
            'usuario_id'         => ['sometimes', 'integer', 'exists:usuarios,id'],
            'descripcion'        => ['sometimes', 'string', 'max:1000'],
            'fecha_mantenimiento'=> ['sometimes', 'date'],
            'fecha_programada'   => ['sometimes', 'date'],
            'fecha_real'         => ['sometimes', 'date'],
            'es_urgente'         => ['sometimes', 'boolean'],
            'estado'             => ['sometimes', Rule::in(Mantenimiento::ESTADOS)],
            'comentarios'        => ['nullable', 'string', 'max:2000'],
            'incidencia_id'      => ['nullable', 'integer', 'exists:incidencias,id'],
            'tipo'               => ['sometimes', Rule::in(Mantenimiento::TIPOS)],
            'programar_siguiente_preventivo' => ['sometimes', 'boolean'],
        ]);

        // Si se actualiza usuario_id, validar que sea técnico
        if (isset($data['usuario_id'])) {
            $tecnico = \App\Models\Usuario::find($data['usuario_id']);
            if (!$tecnico || $tecnico->rol !== 'tecnico') {
                return response()->json(['message' => 'El usuario asignado debe ser un técnico'], 422);
            }
        }

        // Si se actualiza fecha_mantenimiento, también actualizar fecha_programada para compatibilidad
        if (isset($data['fecha_mantenimiento'])) {
            $data['fecha_programada'] = $data['fecha_mantenimiento'];
        }

        // Si se completa un mantenimiento preventivo y se solicita programar el siguiente
        $nuevoEstado = $data['estado'] ?? $mantenimiento->estado;
        $esPreventivo = ($data['tipo'] ?? $mantenimiento->tipo) === 'preventivo';
        $programarSiguiente = $data['programar_siguiente_preventivo'] ?? false;

        // Remover el campo programar_siguiente_preventivo antes de actualizar
        unset($data['programar_siguiente_preventivo']);

        $mantenimiento->update($data);

        // Si se completó un mantenimiento preventivo y se solicita programar el siguiente
        if ($nuevoEstado === 'resuelta' && $esPreventivo && $programarSiguiente) {
            $this->programarSiguienteMantenimientoPreventivo($mantenimiento);
        }

        // Si se resuelve o cancela un mantenimiento correctivo con incidencia asociada, marcar como disponible para cerrar
        if (in_array($nuevoEstado, ['resuelta', 'cancelado']) && $mantenimiento->incidencia_id) {
            $incidencia = \App\Models\Incidencia::find($mantenimiento->incidencia_id);
            if ($incidencia && $incidencia->estado === 'pendiente') {
                $incidencia->disponible_para_cerrar = true;
                $incidencia->save();
            }
        }

        return $mantenimiento->load(['locker.ubicacion', 'usuario', 'incidencia']);
    }

    public function destroy(Mantenimiento $mantenimiento)
    {
        $mantenimiento->delete();
        return response()->noContent();
    }

    /**
     * Obtener mantenciones del técnico autenticado (Home del técnico)
     * Ordenadas por urgencia y fecha más cercana
     */
    public function misMantenciones(Request $request)
    {
        $user = Auth::user();
        
        if (!$user || $user->rol !== 'tecnico') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $perPage = (int) $request->query('per_page', 20);
        $perPage = max(1, min(100, $perPage));

        $query = Mantenimiento::with(['locker.ubicacion', 'incidencia'])
            ->where('usuario_id', $user->id)
            ->whereIn('estado', ['pendiente', 'resuelta']); // Solo pendientes y resueltas

        // Filtrar por fecha del día actual (incluye todo el día de hoy)
        $hoy = now()->startOfDay();
        $manana = now()->copy()->addDay()->startOfDay();
        $query->where('fecha_mantenimiento', '>=', $hoy)
              ->where('fecha_mantenimiento', '<', $manana);

        // Ordenar: urgentes primero, luego por fecha más cercana
        $query->orderByDesc('es_urgente')
              ->orderBy('fecha_mantenimiento')
              ->orderByDesc('created_at');

        return $query->paginate($perPage);
    }

    /**
     * Mostrar detalle de una mantención para el técnico autenticado
     */
    public function showMantenimiento(Request $request, Mantenimiento $mantenimiento)
    {
        $user = Auth::user();
        
        if (!$user || $user->rol !== 'tecnico') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if ($mantenimiento->usuario_id !== $user->id) {
            return response()->json(['message' => 'No autorizado para ver esta mantención'], 403);
        }

        return $mantenimiento->load(['locker.ubicacion', 'incidencia']);
    }

    /**
     * Programar siguiente mantenimiento preventivo después de completar uno
     * Máximo 1 mes después de la fecha actual
     */
    private function programarSiguienteMantenimientoPreventivo(Mantenimiento $mantenimientoCompletado): void
    {
        // Calcular fecha: 1 mes después de la fecha de mantenimiento completado (usar copy para no modificar el original)
        $fechaBase = $mantenimientoCompletado->fecha_mantenimiento 
            ? $mantenimientoCompletado->fecha_mantenimiento->copy()
            : now();
        
        $fechaMantenimiento = $fechaBase->copy()->addMonth();

        // Validar que no sea más de 1 mes desde hoy
        $fechaMaxima = now()->copy()->addMonth();
        if ($fechaMantenimiento->gt($fechaMaxima)) {
            $fechaMantenimiento = $fechaMaxima;
        }

        Mantenimiento::create([
            'locker_id' => $mantenimientoCompletado->locker_id,
            'usuario_id' => $mantenimientoCompletado->usuario_id, // Mismo técnico
            'descripcion' => 'Mantenimiento preventivo programado',
            'fecha_mantenimiento' => $fechaMantenimiento,
            'fecha_programada' => $fechaMantenimiento,
            'es_urgente' => false,
            'estado' => 'pendiente',
            'tipo' => 'preventivo',
        ]);
    }

    /**
     * Obtener mantenciones históricas del técnico autenticado
     */
    public function mantencionesHistoricas(Request $request)
    {
        $user = Auth::user();
        
        if (!$user || $user->rol !== 'tecnico') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $perPage = (int) $request->query('per_page', 20);
        $perPage = max(1, min(100, $perPage));

        $query = Mantenimiento::with(['locker.ubicacion', 'incidencia'])
            ->where('usuario_id', $user->id);

        // Filtro por estado
        if ($estado = trim((string) $request->query('estado', ''))) {
            $query->where('estado', $estado);
        }

        // Obtener todos los resultados primero (sin paginación para poder ordenar correctamente)
        $mantenciones = $query->get();
        
        // Ordenar manualmente: pendientes futuras primero, luego por fecha
        $hoy = now()->startOfDay();
        $mantenciones = $mantenciones->sort(function ($a, $b) use ($hoy) {
            // Primero: pendientes futuras primero
            $aEsPendienteFutura = $a->estado === 'pendiente' 
                && $a->fecha_mantenimiento 
                && $a->fecha_mantenimiento >= $hoy;
            $bEsPendienteFutura = $b->estado === 'pendiente' 
                && $b->fecha_mantenimiento 
                && $b->fecha_mantenimiento >= $hoy;
            
            if ($aEsPendienteFutura && !$bEsPendienteFutura) return -1;
            if (!$aEsPendienteFutura && $bEsPendienteFutura) return 1;
            
            // Segundo: ordenar por fecha descendente
            $aFecha = $a->fecha_mantenimiento ? $a->fecha_mantenimiento->timestamp : 0;
            $bFecha = $b->fecha_mantenimiento ? $b->fecha_mantenimiento->timestamp : 0;
            
            return $bFecha <=> $aFecha; // Descendente
        })->values();
        
        // Paginar manualmente
        $total = $mantenciones->count();
        $page = (int) $request->query('page', 1);
        $offset = ($page - 1) * $perPage;
        $items = $mantenciones->slice($offset, $perPage)->values()->all();
        
        return response()->json([
            'data' => $items,
            'current_page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'last_page' => ceil($total / $perPage),
        ]);
    }
}
