<?php

namespace App\Http\Controllers;

use App\Models\Reserva;
use App\Models\Repartidor;
use App\Models\ArticuloReserva;
use App\Models\Locker;
use App\Models\HistorialLocker;
use App\Models\EmpresaUbicacion;
use App\Models\Ubicacion;
use App\Services\HistorialEmpresaService;
use App\Services\HistorialLockerService;
use App\Services\TarifaLimitacionService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class ReservaController extends Controller
{
    /**
     * Devuelve todas las reservas pendientes del usuario autenticado
     */
    public function myLatest(Request $request)
    {
        $user = $request->user();

        $items = Reserva::with(['locker.ubicacion'])
            ->where('usuario_id', $user->id)
            ->where('estado', 'pendiente')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($items);
    }

    /**
     * Devuelve todas las reservas del usuario autenticado
     */
    public function myHistory(Request $request)
    {
        $user = $request->user();
        $perPage = (int) $request->query('per_page', 5);
        $perPage = max(1, min(50, $perPage));

        $items = Reserva::with(['locker.ubicacion'])
            ->where('usuario_id', $user->id)
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json($items);
    }

    /**
     * Devuelve las reservas asociadas a la empresa autenticada con filtros y paginacion
     */
    public function companyLatest(Request $request)
    {
        $user = $request->user();

        if (!$user || $user->rol !== 'empresa') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $perPage = (int) $request->query('per_page', 5);
        $perPage = max(1, min(1000, $perPage)); // Aumentado límite para permitir obtener todos los datos

        // Por defecto, mostrar historial completo (todos los estados)
        // Si se especifica solo_activos=true, entonces excluir completados
        $soloActivos = $request->query('solo_activos', 'false');
        $mostrarHistorialCompleto = ($soloActivos !== 'true' && $soloActivos !== true);

        $query = Reserva::with(['usuario', 'locker.ubicacion', 'ubicacionDestino', 'repartidor'])
            ->where('empresa_id', $user->id)
            ->where(function ($q) use ($user) {
                // Incluir pedidos sin repartidor (pendiente_repartidor) O pedidos con repartidor de la empresa
                $q->whereNull('repartidor_id')
                  ->orWhereHas('repartidor', function ($repQuery) use ($user) {
                      $repQuery->where('empresa_id', $user->id);
                  });
            });

        // Solo excluir completados si se solicita solo activos
        if (!$mostrarHistorialCompleto) {
            $query->where('logistica_estado', '!=', 'completado');
        }

        $query->orderByDesc('created_at');

        if ($estado = $request->query('estado')) {
            $query->where('estado', $estado);
        }

        // Filtro por ubicación (por ID o nombre)
        if ($ubicacionId = $request->query('ubicacion_id')) {
            // Si se proporciona un ID, filtrar por ese ID específico
            // Buscar tanto en lockers asignados como en ubicación de destino
            $query->where(function ($q) use ($ubicacionId) {
                $q->whereHas('locker', function ($lockerQuery) use ($ubicacionId) {
                    $lockerQuery->where('ubicacion_id', $ubicacionId);
                })->orWhere('ubicacion_destino_id', $ubicacionId);
            });
        } elseif ($ubicacion = trim((string) $request->query('ubicacion', ''))) {
            // Si se proporciona texto, buscar por nombre
            $query->where(function ($q) use ($ubicacion) {
                $q->whereHas('locker.ubicacion', function ($ubicacionQuery) use ($ubicacion) {
                    $ubicacionQuery->where('nombre', 'like', "%{$ubicacion}%");
                })->orWhereHas('ubicacionDestino', function ($ubicacionQuery) use ($ubicacion) {
                    $ubicacionQuery->where('nombre', 'like', "%{$ubicacion}%");
                });
            });
        }

        if ($logistica = trim((string) $request->query('logistica_estado', ''))) {
            // Si se especifica logistica_estado, aplicar el filtro
            $query->where('logistica_estado', $logistica);
        }

        if ($email = trim((string) $request->query('email', ''))) {
            $query->whereHas('usuario', function ($usuarioQuery) use ($email) {
                $like = "%{$email}%";
                $usuarioQuery->where('email', 'like', $like);
            });
        }

        if ($fechaDesde = trim((string) $request->query('fecha_desde', ''))) {
            $query->where('created_at', '>=', $fechaDesde);
        }

        if ($fechaHasta = trim((string) $request->query('fecha_hasta', ''))) {
            $query->where('created_at', '<=', $fechaHasta . ' 23:59:59');
        }

        $items = $query->paginate($perPage);

        // Asegurar que todas las reservas tengan la relación ubicacionDestino cargada
        $reservas = $items->items();
        foreach ($reservas as $reserva) {
            // Si la relación no está cargada, cargarla manualmente
            if (!$reserva->relationLoaded('ubicacionDestino') && $reserva->ubicacion_destino_id) {
                $reserva->load('ubicacionDestino');
            }
        }

        // Reconstruir la respuesta con las reservas actualizadas
        $items->setCollection(collect($reservas));

        return response()->json($items);
    }

    /**
     * Devuelve las reservas asignadas al repartidor autenticado con filtros y paginación
     * Por defecto, solo muestra pedidos activos (no completados ni anulados)
     */
    public function repartidorMisReservas(Request $request)
    {
        $user = $request->user();

        if (!$user || $user->rol !== 'repartidor') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        // Obtener el repartidor asociado al usuario
        $repartidor = Repartidor::where('usuario_id', $user->id)->first();

        if (!$repartidor) {
            return response()->json(['message' => 'No se encontró el repartidor asociado'], 404);
        }

        $perPage = (int) $request->query('per_page', 10);
        $perPage = max(1, min(100, $perPage));

        $query = Reserva::with(['usuario', 'locker.ubicacion', 'ubicacionDestino', 'articulos'])
            ->where('repartidor_id', $repartidor->id)
            ->orderByDesc('created_at');

        // Por defecto, mostrar solo pedidos activos (no completados ni anulados)
        $soloActivos = $request->query('solo_activos', 'true');
        if ($soloActivos === 'true' || $soloActivos === true) {
            $query->where('estado', '!=', 'completado')
                  ->where('estado', '!=', 'anulado');
        }

        // Por defecto, excluir pedidos completados en logística si se solicita
        $excluirLogisticaCompletado = $request->query('excluir_logistica_completado', 'false');
        if ($excluirLogisticaCompletado === 'true' || $excluirLogisticaCompletado === true) {
            $query->where('logistica_estado', '!=', 'completado');
        }

        // Filtros opcionales
        if ($estado = $request->query('estado')) {
            $query->where('estado', $estado);
        }

        if ($logisticaEstado = $request->query('logistica_estado')) {
            $query->where('logistica_estado', $logisticaEstado);
        }

        // Filtro por ubicación (por ID o nombre)
        if ($ubicacionId = $request->query('ubicacion_id')) {
            // Si se proporciona un ID, filtrar por ese ID específico
            // Buscar tanto en lockers asignados como en ubicación de destino
            $query->where(function ($q) use ($ubicacionId) {
                $q->whereHas('locker', function ($lockerQuery) use ($ubicacionId) {
                    $lockerQuery->where('ubicacion_id', $ubicacionId);
                })->orWhere('ubicacion_destino_id', $ubicacionId);
            });
        } elseif ($ubicacion = trim((string) $request->query('ubicacion', ''))) {
            // Si se proporciona texto, buscar por nombre (compatibilidad hacia atrás)
            $query->where(function ($q) use ($ubicacion) {
                $q->whereHas('locker.ubicacion', function ($ubicacionQuery) use ($ubicacion) {
                    $ubicacionQuery->where('nombre', 'like', "%{$ubicacion}%");
                })->orWhereHas('ubicacionDestino', function ($ubicacionQuery) use ($ubicacion) {
                    $ubicacionQuery->where('nombre', 'like', "%{$ubicacion}%");
                });
            });
        }

        // Filtro por email del destinatario
        if ($email = trim((string) $request->query('email', ''))) {
            $query->whereHas('usuario', function ($usuarioQuery) use ($email) {
                $usuarioQuery->where('email', 'like', "%{$email}%");
            });
        }

        // Filtro por fecha desde
        if ($fechaDesde = trim((string) $request->query('fecha_desde', ''))) {
            $query->where('fecha_reserva', '>=', $fechaDesde);
        }

        // Filtro por fecha hasta
        if ($fechaHasta = trim((string) $request->query('fecha_hasta', ''))) {
            $query->where('fecha_reserva', '<=', $fechaHasta);
        }

        // Filtro por ID de reserva
        if ($reservaId = $request->query('reserva_id')) {
            $query->where('id', $reservaId);
        }

        $items = $query->paginate($perPage);

        // Asegurar que todas las reservas tengan la relación ubicacionDestino cargada
        $reservas = $items->items();
        foreach ($reservas as $reserva) {
            // Si la relación no está cargada, cargarla manualmente
            if (!$reserva->relationLoaded('ubicacionDestino') && $reserva->ubicacion_destino_id) {
                $reserva->load('ubicacionDestino');
            }
        }

        return response()->json([
            'reservas' => $reservas,
            'pagination' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    /**
     * Devuelve las ubicaciones asignadas a la empresa del repartidor autenticado
     */
    public function repartidorMisUbicaciones(Request $request)
    {
        $user = $request->user();

        if (!$user || $user->rol !== 'repartidor') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        // Obtener el repartidor asociado al usuario
        $repartidor = Repartidor::where('usuario_id', $user->id)->first();

        if (!$repartidor) {
            return response()->json(['message' => 'No se encontró el repartidor asociado'], 404);
        }

        if (!$repartidor->empresa_id) {
            return response()->json(['message' => 'El repartidor no tiene empresa asignada'], 404);
        }

        // Obtener las ubicaciones asignadas a la empresa del repartidor
        $ubicaciones = EmpresaUbicacion::where('empresa_id', $repartidor->empresa_id)
            ->with('ubicacion')
            ->get()
            ->map(function ($empresaUbicacion) {
                return [
                    'id' => $empresaUbicacion->ubicacion_id,
                    'nombre' => $empresaUbicacion->ubicacion->nombre,
                    'latitud' => $empresaUbicacion->ubicacion->latitud,
                    'longitud' => $empresaUbicacion->ubicacion->longitud,
                ];
            })
            ->sortBy('nombre')
            ->values();

        return response()->json([
            'ubicaciones' => $ubicaciones,
        ]);
    }

    /**
     * Obtiene los tamaños de lockers disponibles en una ubicación específica
     */
    public function tamanosDisponiblesUbicacion(Request $request)
    {
        $user = $request->user();

        if (!$user || !in_array($user->rol, ['empresa', 'repartidor'])) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'ubicacion_id' => ['required', 'integer', 'exists:ubicaciones,id'],
        ]);

        // Si es empresa, verificar que tiene acceso a esta ubicación
        if ($user->rol === 'empresa') {
            $tieneAcceso = EmpresaUbicacion::where('empresa_id', $user->id)
                ->where('ubicacion_id', $data['ubicacion_id'])
                ->exists();

            if (!$tieneAcceso) {
                return response()->json(['message' => 'No tienes acceso a esta ubicación'], 403);
            }
        } elseif ($user->rol === 'repartidor') {
            $repartidor = Repartidor::where('usuario_id', $user->id)->first();
            if (!$repartidor || !$repartidor->empresa_id) {
                return response()->json(['message' => 'No se encontró el repartidor asociado'], 404);
            }

            $tieneAcceso = EmpresaUbicacion::where('empresa_id', $repartidor->empresa_id)
                ->where('ubicacion_id', $data['ubicacion_id'])
                ->exists();

            if (!$tieneAcceso) {
                return response()->json(['message' => 'No tienes acceso a esta ubicación'], 403);
            }
        }

        // Obtener los tamaños únicos de lockers en esta ubicación
        $tamanos = Locker::where('ubicacion_id', $data['ubicacion_id'])
            ->whereNotNull('tamano')
            ->distinct()
            ->pluck('tamano')
            ->filter()
            ->sort()
            ->values()
            ->map(function ($tamano) {
                $labels = [
                    'S' => 'Pequeño (S)',
                    'M' => 'Mediano (M)',
                    'L' => 'Grande (L)',
                    'XL' => 'Extra Grande (XL)',
                ];
                return [
                    'valor' => $tamano,
                    'label' => $labels[$tamano] ?? $tamano,
                ];
            });

        return response()->json([
            'tamanos' => $tamanos,
        ]);
    }

    public function index()
    {
        return Reserva::with(['usuario','locker.ubicacion','repartidor.usuario'])->paginate(20);
    }

    public function createForCompany(Request $request)
    {
        $user = $request->user();

        if (!$user || $user->rol !== 'empresa') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        // Obtener tamaños válidos dinámicamente desde los lockers de la ubicación
        $ubicacionId = $request->input('ubicacion_destino_id');
        $tamanosValidos = [];
        if ($ubicacionId) {
            $tamanosValidos = Locker::where('ubicacion_id', $ubicacionId)
                ->whereNotNull('tamano')
                ->distinct()
                ->pluck('tamano')
                ->map(fn($t) => strtoupper(trim($t)))
                ->unique()
                ->values()
                ->toArray();
        }
        
        // Si no hay tamaños de la ubicación, usar los tamaños estándar
        if (empty($tamanosValidos)) {
            $tamanosValidos = Locker::TAMANOS_VALIDOS;
        }

        // Normalizar el tamaño del pedido antes de validar
        $tamanoPedido = $request->input('tamano_pedido');
        if ($tamanoPedido) {
            $tamanoPedido = strtoupper(trim($tamanoPedido));
            // Si el tamaño normalizado no está en los válidos, intentar extraerlo
            if (!in_array($tamanoPedido, $tamanosValidos)) {
                // Intentar extraer el tamaño del valor (por si viene como "Pequeño (S)" o similar)
                if (preg_match('/\b([SML]|XL)\b/i', $tamanoPedido, $matches)) {
                    $tamanoPedido = strtoupper($matches[1]);
                }
            }
            $request->merge(['tamano_pedido' => $tamanoPedido]);
        }

        $data = $request->validate([
            'usuario_id'   => ['required', 'integer', 'exists:usuarios,id'],
            'tamano_pedido' => ['required', 'string', Rule::in($tamanosValidos)],
            'ubicacion_destino_id' => ['required', 'integer', 'exists:ubicaciones,id'],
            'fecha_reserva'=> ['required', 'date'], // Fecha estimada de llegada
            'tipo_acceso'  => ['nullable', Rule::in(['qr','codigo_temporal'])],
            'repartidor_id' => ['nullable', 'integer', 'exists:repartidores,id'],
            'articulos'    => ['required', 'array', 'min:1'],
            'articulos.*.nombre' => ['required', 'string', 'max:255'],
            'articulos.*.cantidad' => ['required', 'integer', 'min:1'],
            'articulos.*.descripcion' => ['nullable', 'string', 'max:1000'],
            'articulos.*.sku' => ['nullable', 'string', 'max:100'],
            'articulos.*.peso' => ['nullable', 'numeric', 'min:0'],
        ]);

        // Si se proporciona repartidor_id, verificar que pertenece a la empresa
        if (!empty($data['repartidor_id'])) {
            $repartidor = Repartidor::where('id', $data['repartidor_id'])
                ->where('empresa_id', $user->id)
                ->first();
            
            if (!$repartidor) {
                return response()->json([
                    'message' => 'El repartidor seleccionado no pertenece a tu empresa'
                ], 422);
            }
        }

        // Validar limitaciones de tarifa antes de crear la reserva
        $ubicacion = Ubicacion::findOrFail($data['ubicacion_destino_id']);
        try {
            // Verificar que la empresa tiene acceso a esta ubicación
            $empresaUbicacion = EmpresaUbicacion::where('empresa_id', $user->id)
                ->where('ubicacion_id', $ubicacion->id)
                ->first();
            
            if (!$empresaUbicacion) {
                return response()->json([
                    'message' => 'No tienes acceso a esta ubicación. Verifica tu plan de tarifa.'
                ], 422);
            }
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage()
            ], 422);
        }

        $payload = array_merge($data, [
            'empresa_id' => $user->id,
            'locker_id' => null, // Se asignará cuando el repartidor marque en ruta
            'estado' => 'pendiente',
            'logistica_estado' => !empty($data['repartidor_id']) ? 'asignado' : 'pendiente_repartidor',
            'tipo_acceso' => $data['tipo_acceso'] ?? 'codigo_temporal',
            'codigo_acceso' => null,
            // hora_inicio se establecerá cuando el repartidor marque el pedido como 'en_camino'
            'hora_inicio' => null,
            // hora_fin se establecerá cuando el usuario retire el paquete del locker
            'hora_fin' => null,
        ]);

        $reserva = DB::transaction(function () use ($payload, $data, $ubicacion) {
            $reserva = Reserva::create($payload);
            
            // Crear artículos si se proporcionan
            if (!empty($data['articulos'])) {
                foreach ($data['articulos'] as $articulo) {
                    ArticuloReserva::create([
                        'reserva_id' => $reserva->id,
                        'nombre' => $articulo['nombre'],
                        'cantidad' => $articulo['cantidad'],
                        'descripcion' => $articulo['descripcion'] ?? null,
                        'sku' => $articulo['sku'] ?? null,
                        'peso' => $articulo['peso'] ?? null,
                    ]);
                }
            }

            // Registrar en historial de empresa
            if ($reserva->empresa_id) {
                HistorialEmpresaService::registrarReservaCreada(
                    $reserva->empresa_id,
                    $reserva->id,
                    $ubicacion->nombre
                );
            }
            
            // Solo asignar repartidor automáticamente si no se proporcionó uno manualmente
            if (empty($data['repartidor_id'])) {
            $this->asignarRepartidorDisponible($reserva);
            }
            
            return $reserva->load(['usuario','ubicacionDestino','repartidor','articulos']);
        });

        return response()->json($reserva, 201);
    }

    public function show(Reserva $reserva)
    {
        return $reserva->load(['usuario','locker.ubicacion','ubicacionDestino','repartidor','articulos']);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'usuario_id'   => ['required','integer','exists:usuarios,id'],
            'empresa_id'   => ['nullable','integer','exists:usuarios,id'],
            'locker_id'    => ['required','integer','exists:lockers,id'],
            'fecha_reserva'=> ['required','date'],
            'hora_inicio'  => ['nullable','date_format:H:i'],
            'hora_fin'     => ['nullable','date_format:H:i'],
            'estado'       => ['required', Rule::in(['pendiente','completado','anulado'])],
            'tipo_acceso'  => ['required', Rule::in(['qr','codigo_temporal'])],
            'codigo_acceso'=> ['nullable','string','max:120'],
            'logistica_estado' => ['sometimes','string','max:40'],
            'repartidor_id' => ['sometimes','nullable','integer','exists:repartidores,id'],
            'articulos'    => ['sometimes', 'array'],
            'articulos.*.nombre' => ['required', 'string', 'max:255'],
            'articulos.*.cantidad' => ['required', 'integer', 'min:1'],
            'articulos.*.descripcion' => ['nullable', 'string', 'max:1000'],
            'articulos.*.sku' => ['nullable', 'string', 'max:100'],
            'articulos.*.peso' => ['nullable', 'numeric', 'min:0'],
        ]);

        $data['logistica_estado'] = $data['logistica_estado'] ?? 'pendiente_repartidor';

        // Validar limitaciones de tarifa si la reserva es para una empresa
        if (!empty($data['empresa_id'])) {
            $empresa = \App\Models\Usuario::findOrFail($data['empresa_id']);
            $locker = Locker::with('ubicacion')->findOrFail($data['locker_id']);
            
            try {
                TarifaLimitacionService::validarYAsignarUbicacion($empresa, $locker);
            } catch (\Exception $e) {
                return response()->json([
                    'message' => $e->getMessage()
                ], 422);
            }
        }

        $reserva = DB::transaction(function () use ($data) {
            $reserva = Reserva::create($data);

            // Crear artículos si se proporcionan
            if (!empty($data['articulos'])) {
                foreach ($data['articulos'] as $articulo) {
                    ArticuloReserva::create([
                        'reserva_id' => $reserva->id,
                        'nombre' => $articulo['nombre'],
                        'cantidad' => $articulo['cantidad'],
                        'descripcion' => $articulo['descripcion'] ?? null,
                        'sku' => $articulo['sku'] ?? null,
                        'peso' => $articulo['peso'] ?? null,
                    ]);
                }
            }

            // Actualizar estado del locker a ocupado si la reserva está pendiente
            if ($reserva->estado === 'pendiente') {
                $this->actualizarEstadoLocker($reserva->locker_id);
                
                // Registrar en historial
                HistorialLockerService::registrarReservaCreada(
                    $reserva->locker_id,
                    $reserva->id,
                    Auth::id()
                );

                // Registrar en historial de empresa si existe empresa_id
                if ($reserva->empresa_id) {
                    $reserva->load('locker.ubicacion');
                    $lockerUbicacion = $reserva->locker->ubicacion?->nombre ?? null;
                    HistorialEmpresaService::registrarReservaCreada(
                        $reserva->empresa_id,
                        $reserva->id,
                        $lockerUbicacion
                    );
                }
            }

            if (empty($data['repartidor_id'])) {
                $this->asignarRepartidorDisponible($reserva);
            }

            return $reserva->load(['usuario','locker.ubicacion','repartidor','articulos']);
        });

        return response()->json($reserva, 201);
    }

    public function update(Request $request, Reserva $reserva)
    {
        $data = $request->validate([
            'usuario_id'   => ['sometimes','integer','exists:usuarios,id'],
            'empresa_id'   => ['sometimes','nullable','integer','exists:usuarios,id'],
            'locker_id'    => ['sometimes','integer','exists:lockers,id'],
            'fecha_reserva'=> ['sometimes','date'],
            'hora_inicio'  => ['sometimes','date_format:H:i'],
            'hora_fin'     => ['sometimes','date_format:H:i','after:hora_inicio'],
            'estado'       => ['sometimes', Rule::in(['pendiente','completado','anulado'])],
            'tipo_acceso'  => ['sometimes', Rule::in(['qr','codigo_temporal'])],
            'codigo_acceso'=> ['sometimes','nullable','string','max:120'],
        ]);

        $lockerIdAnterior = $reserva->locker_id;
        $estadoAnterior = $reserva->estado;

        $reserva->update($data);

        // Si cambió el locker, actualizar ambos lockers
        if (isset($data['locker_id']) && $data['locker_id'] !== $lockerIdAnterior) {
            $this->actualizarEstadoLocker($lockerIdAnterior);
            if ($reserva->estado === 'pendiente') {
                $this->actualizarEstadoLocker($reserva->locker_id);
            }
        } 
        // Si cambió el estado, actualizar el locker
        elseif (isset($data['estado']) && $data['estado'] !== $estadoAnterior) {
            $reserva->load(['usuario', 'locker']);
            $lockerEstadoAnterior = $reserva->locker->estado;
            $this->actualizarEstadoLocker($reserva->locker_id);
            $locker = Locker::find($reserva->locker_id);
            $lockerEstadoNuevo = $locker ? $locker->estado : $lockerEstadoAnterior;
            
            // Registrar cambio de estado en historial
            if ($data['estado'] === 'completado' && $estadoAnterior === 'pendiente') {
                $usuarioNombre = $reserva->usuario ? trim($reserva->usuario->nombre . ' ' . $reserva->usuario->apellido) : 'Usuario';
                
                HistorialLockerService::registrarReservaCompletada(
                    $reserva->locker_id,
                    $reserva->id,
                    $locker->numero,
                    $usuarioNombre,
                    $lockerEstadoAnterior,
                    $lockerEstadoNuevo,
                    $reserva->usuario_id
                );

                // Registrar en historial de empresa si existe empresa_id
                if ($reserva->empresa_id) {
                    HistorialEmpresaService::registrarReservaCompletada(
                        $reserva->empresa_id,
                        $reserva->id
                    );
                }
            } elseif ($data['estado'] === 'anulado' && $estadoAnterior === 'pendiente') {
                HistorialLockerService::registrarReservaAnulada(
                    $reserva->locker_id,
                    $reserva->id,
                    Auth::id()
                );

                // Registrar en historial de empresa si existe empresa_id
                if ($reserva->empresa_id) {
                    HistorialEmpresaService::registrarReservaCancelada(
                        $reserva->empresa_id,
                        $reserva->id,
                        null
                    );
                }
            }
        }

        return $reserva->load(['usuario','locker.ubicacion','repartidor']);
    }

    /**
     * Busca un locker disponible del tamaño especificado en la ubicación indicada
     * Un locker está disponible solo si:
     * - Está activo (no bloqueado ni en mantenimiento)
     * - No está marcado como ocupado
     * - No tiene reservas pendientes
     * - No tiene reservas en camino (logistica_estado = 'en_camino')
     * - No tiene reservas completadas en logística pero pendientes de retiro (estado='pendiente' y logistica_estado='completado')
     */
    private function buscarLockerDisponible(int $ubicacionId, string $tamano): ?Locker
    {
        // Buscar lockers disponibles: activos, del tamaño correcto, 
        // en la ubicación indicada y que no tengan reservas activas
        $locker = Locker::where('ubicacion_id', $ubicacionId)
            ->where('tamano', $tamano)
            ->where('estado', 'activo') // Solo buscar lockers activos (no ocupados, bloqueados ni en mantenimiento)
            ->whereDoesntHave('reservas', function ($query) {
                // Excluir lockers que tengan reservas pendientes
                $query->where('estado', 'pendiente');
            })
            ->whereDoesntHave('reservas', function ($query) {
                // Excluir lockers que tengan reservas en camino (pedido en ruta hacia el locker)
                $query->where('logistica_estado', 'en_camino');
            })
            ->whereDoesntHave('reservas', function ($query) {
                // Excluir lockers con reservas donde el repartidor entregó pero el cliente aún no retiró
                $query->where('estado', 'pendiente')
                      ->where('logistica_estado', 'completado');
            })
            ->first();

        return $locker;
    }

    public function marcarEnRuta(Request $request, Reserva $reserva)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        // Solo los repartidores pueden marcar como en ruta
        if ($user->rol !== 'repartidor') {
            return response()->json(['message' => 'Solo los repartidores pueden marcar pedidos como en ruta'], 403);
        }
        
        if ($user->rol === 'repartidor') {
            // Si es repartidor autenticado, verificar que es el asignado a la reserva
            $repartidor = Repartidor::where('usuario_id', $user->id)->first();
            
            if (!$repartidor) {
                return response()->json(['message' => 'No se encontró el repartidor asociado'], 404);
            }
            
            if ($reserva->repartidor_id !== $repartidor->id) {
                return response()->json(['message' => 'No tienes acceso a esta reserva'], 403);
            }
        } else {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if ($reserva->estado !== 'pendiente') {
            return response()->json(['message' => 'La reserva no puede actualizarse'], 422);
        }

        if (!in_array($reserva->logistica_estado, ['asignado', 'pendiente_repartidor'], true)) {
            return response()->json(['message' => 'La reserva ya fue marcada en ruta o finalizada'], 422);
        }

        // Si la reserva no tiene locker asignado, buscar uno disponible automáticamente
        if (!$reserva->locker_id) {
            if (!$reserva->tamano_pedido) {
                return response()->json(['message' => 'El pedido no tiene tamaño especificado'], 422);
            }

            if (!$reserva->ubicacion_destino_id) {
                return response()->json(['message' => 'El pedido no tiene ubicación de destino especificada'], 422);
            }

            // Buscar un locker disponible del tamaño correcto en la ubicación de destino
            $lockerDisponible = $this->buscarLockerDisponible(
                $reserva->ubicacion_destino_id,
                $reserva->tamano_pedido
            );

            if (!$lockerDisponible) {
                return response()->json([
                    'message' => "No hay lockers disponibles del tamaño '{$reserva->tamano_pedido}' en la ubicación de destino"
                ], 422);
            }

            // Asignar el locker a la reserva
            $reserva->locker_id = $lockerDisponible->id;
        }

        // SIEMPRE marcar el locker como ocupado cuando se marca en ruta
        // Esto asegura que el locker no pueda ser asignado a otro pedido mientras este está en camino
        if ($reserva->locker_id) {
            $locker = Locker::find($reserva->locker_id);
            if ($locker && !in_array($locker->estado, ['bloqueado', 'mantenimiento'], true)) {
                $locker->estado = 'ocupado';
                $locker->save();
            }
        }

        $reserva->logistica_estado = 'en_camino';
        // Establecer hora_inicio cuando el repartidor marca el pedido como en ruta (llegó al locker)
        if (!$reserva->hora_inicio) {
            $reserva->hora_inicio = now();
        }
        $reserva->save();

        return response()->json($reserva->load(['usuario','locker.ubicacion','repartidor']));
    }

    public function marcarEntregado(Request $request, Reserva $reserva)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        // Solo los repartidores pueden marcar como entregado
        if ($user->rol !== 'repartidor') {
            return response()->json(['message' => 'Solo los repartidores pueden marcar pedidos como entregados'], 403);
        }
        
        if ($user->rol === 'repartidor') {
            // Si es repartidor autenticado, verificar que es el asignado a la reserva
            $repartidor = Repartidor::where('usuario_id', $user->id)->first();
            
            if (!$repartidor) {
                return response()->json(['message' => 'No se encontró el repartidor asociado'], 404);
            }
            
            if ($reserva->repartidor_id !== $repartidor->id) {
                return response()->json(['message' => 'No tienes acceso a esta reserva'], 403);
            }
        } else {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if ($reserva->estado === 'completado') {
            return response()->json(['message' => 'La reserva ya fue finalizada'], 422);
        }

        // Solo se puede marcar como entregado si está en ruta (en_camino)
        if ($reserva->logistica_estado !== 'en_camino') {
            return response()->json(['message' => 'La reserva debe estar en ruta antes de marcarla como entregada. Primero márcala como en ruta.'], 422);
        }

        $reserva = DB::transaction(function () use ($reserva) {
            $repartidorId = $reserva->repartidor_id;
            
            $reserva->logistica_estado = 'completado';
            $reserva->save();

            // El locker debe permanecer ocupado porque el paquete está ahí
            // y el cliente aún no lo ha retirado (estado sigue siendo 'pendiente')
            // No actualizamos el estado del locker aquí, se actualizará cuando el cliente retire

            $this->liberarRepartidor($reserva);
            
            // Actualizar estado del repartidor
            $this->actualizarEstadoRepartidor($repartidorId);

            return $reserva->load(['usuario','locker.ubicacion','repartidor']);
        });

        return response()->json([
            'message' => 'Reserva marcada como entregada',
            'reserva' => $reserva,
        ]);
    }

    /**
     * Permite al repartidor cancelar la entrega de un pedido que está en ruta.
     * Esto anula el pedido y libera el locker asignado.
     */
    public function cancelarEntrega(Request $request, Reserva $reserva)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        // Solo los repartidores pueden cancelar entregas
        if ($user->rol !== 'repartidor') {
            return response()->json(['message' => 'Solo los repartidores pueden cancelar entregas'], 403);
        }

        // Verificar que el repartidor es el asignado a la reserva
        $repartidor = Repartidor::where('usuario_id', $user->id)->first();
        
        if (!$repartidor) {
            return response()->json(['message' => 'No se encontró el repartidor asociado'], 404);
        }
        
        if ($reserva->repartidor_id !== $repartidor->id) {
            return response()->json(['message' => 'No tienes acceso a esta reserva'], 403);
        }

        // Solo se puede cancelar si está en ruta (en_camino)
        if ($reserva->logistica_estado !== 'en_camino') {
            return response()->json(['message' => 'Solo se pueden cancelar pedidos que están en ruta'], 422);
        }

        if ($reserva->estado === 'anulado') {
            return response()->json(['message' => 'La reserva ya fue cancelada'], 422);
        }

        $data = $request->validate([
            'razon_cancelacion' => ['nullable', 'string', 'max:500'],
        ]);

        $reserva = DB::transaction(function () use ($reserva, $data) {
            $lockerId = $reserva->locker_id;
            $repartidorId = $reserva->repartidor_id;
            $estadoAnterior = $reserva->estado;
            
            // Anular la reserva
            $reserva->estado = 'anulado';
            $reserva->logistica_estado = 'completado'; // Marcar logística como completada para que no aparezca en listados activos
            $reserva->save();

            // Liberar el repartidor
            $this->liberarRepartidor($reserva);
            
            // Actualizar estado del repartidor
            $this->actualizarEstadoRepartidor($repartidorId);

            // Liberar el locker si estaba asignado
            if ($lockerId) {
                $this->actualizarEstadoLocker($lockerId);
            }

            // Registrar en historial del locker
            if ($lockerId && $estadoAnterior === 'pendiente') {
                HistorialLockerService::registrarReservaAnulada(
                    $lockerId,
                    $reserva->id,
                    auth()->id()
                );
            }

            // Registrar en historial de empresa
            if ($reserva->empresa_id) {
                $mensajeCancelacion = 'Entrega cancelada por repartidor';
                if (!empty($data['razon_cancelacion'])) {
                    $mensajeCancelacion .= ': ' . $data['razon_cancelacion'];
                }
                
                HistorialEmpresaService::registrarReservaCancelada(
                    $reserva->empresa_id,
                    $reserva->id,
                    $mensajeCancelacion
                );
            }

            return $reserva->load(['usuario','locker.ubicacion','repartidor']);
        });

        return response()->json([
            'message' => 'Entrega cancelada exitosamente. El pedido ha sido anulado.',
            'reserva' => $reserva,
        ]);
    }

    /**
     * Permite a la empresa cancelar una reserva pendiente antes de que esté en ruta
     */
    public function cancelarReserva(Request $request, Reserva $reserva)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        // Solo las empresas pueden cancelar reservas pendientes
        if ($user->rol !== 'empresa') {
            return response()->json(['message' => 'Solo las empresas pueden cancelar reservas pendientes'], 403);
        }

        // Verificar que la reserva pertenece a la empresa
        if ($reserva->empresa_id !== $user->id) {
            return response()->json(['message' => 'No tienes acceso a esta reserva'], 403);
        }

        // Solo se puede cancelar si está pendiente y no está en ruta
        if ($reserva->estado !== 'pendiente') {
            return response()->json(['message' => 'Solo se pueden cancelar reservas pendientes'], 422);
        }

        // No se puede cancelar si ya está en ruta
        if ($reserva->logistica_estado === 'en_camino') {
            return response()->json(['message' => 'No se puede cancelar una reserva que ya está en ruta. Contacta al repartidor para cancelar la entrega.'], 422);
        }

        if ($reserva->estado === 'anulado') {
            return response()->json(['message' => 'La reserva ya fue cancelada'], 422);
        }

        $reserva = DB::transaction(function () use ($reserva) {
            $lockerId = $reserva->locker_id;
            $repartidorId = $reserva->repartidor_id;
            $estadoAnterior = $reserva->estado;
            
            // Anular la reserva
            $reserva->estado = 'anulado';
            $reserva->logistica_estado = 'completado'; // Marcar logística como completada para que no aparezca en listados activos
            $reserva->save();

            // Liberar el repartidor si estaba asignado
            if ($repartidorId) {
                $this->liberarRepartidor($reserva);
                $this->actualizarEstadoRepartidor($repartidorId);
            }

            // Liberar el locker si estaba asignado
            if ($lockerId) {
                $this->actualizarEstadoLocker($lockerId);
            }

            // Registrar en historial del locker
            if ($lockerId && $estadoAnterior === 'pendiente') {
                HistorialLockerService::registrarReservaAnulada(
                    $lockerId,
                    $reserva->id,
                    auth()->id()
                );
            }

            // Registrar en historial de empresa
            if ($reserva->empresa_id) {
                HistorialEmpresaService::registrarReservaCancelada(
                    $reserva->empresa_id,
                    $reserva->id,
                    'Reserva cancelada por la empresa'
                );
            }

            return $reserva->load(['usuario','locker.ubicacion','repartidor']);
        });

        return response()->json([
            'message' => 'Reserva cancelada exitosamente.',
            'reserva' => $reserva,
        ]);
    }

    public function destroy(Reserva $reserva)
    {
        $lockerId = $reserva->locker_id;
        $reservaId = $reserva->id;
        $estadoReserva = $reserva->estado;
        $empresaId = $reserva->empresa_id;
        
        $this->liberarRepartidor($reserva);

        $reserva->delete();
        
        // Registrar en historial si la reserva estaba pendiente
        if ($estadoReserva === 'pendiente') {
            HistorialLockerService::registrarReservaAnulada(
                $lockerId,
                $reservaId,
                Auth::id()
            );

            // Registrar en historial de empresa si la reserva tenía empresa_id
            if ($empresaId) {
                HistorialEmpresaService::registrarReservaCancelada(
                    $empresaId,
                    $reservaId,
                    'Reserva eliminada'
                );
            }
        }
        
        // Actualizar estado del locker después de eliminar la reserva
        $this->actualizarEstadoLocker($lockerId);
        
        return response()->noContent();
    }

    /**
     * Genera un código temporal de 6 dígitos para la reserva indicada.
     * El código se guarda como SHA-256 en `codigo_acceso` y expira a los 5 minutos
     * (se toma como referencia el `updated_at` de la reserva).
     */
    public function generarCodigoTemporal(Request $request, Reserva $reserva)
    {
        $user = $request->user();

        if (!$user || $reserva->usuario_id !== $user->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        // Generar un código numérico de 6 dígitos
        $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Guardar hash y tipo de acceso (mantener tipo_acceso si ya es 'qr', sino usar 'codigo_temporal')
        $updateData = [
            'codigo_acceso' => hash('sha256', $code),
        ];
        
        // Solo cambiar tipo_acceso si no es 'qr' (para mantener consistencia cuando se muestra como QR)
        if ($reserva->tipo_acceso !== 'qr') {
            $updateData['tipo_acceso'] = 'codigo_temporal';
        }
        
        $reserva->update($updateData);

        $expiresAt = now()->addMinutes(5);
        Cache::put('reserva_code_'.$reserva->id, $code, $expiresAt);

        return response()->json([
            'code' => $code,
            'expires_at' => $expiresAt->toISOString(),
            'valid_for_seconds' => 5 * 60,
        ]);
    }

    /**
     * Estado del código temporal (existe y sigue vigente?).
     */
    public function estadoCodigoTemporal(Request $request, Reserva $reserva)
    {
        $user = $request->user();
        if (!$user || $reserva->usuario_id !== $user->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        [$has, $expiresAt, $isValid] = $this->calcularEstadoCodigoTemporal($reserva);
        $code = $isValid ? Cache::get('reserva_code_'.$reserva->id) : null;

        return response()->json([
            'has_code' => $has,
            'is_valid' => $isValid,
            'expires_at' => $expiresAt?->toISOString(),
            'code' => $code,
        ]);
    }

    /**
     * Verifica el código ingresado por el usuario y, si es válido, marca la reserva como completada.
     */
    public function verificarCodigoTemporal(Request $request, Reserva $reserva)
    {
        $data = $request->validate([
            'code' => ['required','regex:/^\d{6}$/'],
        ]);

        $user = $request->user();
        if (!$user || $reserva->usuario_id !== $user->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        [$has, $expiresAt, $isValidWindow] = $this->calcularEstadoCodigoTemporal($reserva);
        if (!$has || !$isValidWindow) {
            return response()->json(['message' => 'Código vencido o no generado'], 422);
        }

        $hash = hash('sha256', $data['code']);
        if (!hash_equals($reserva->codigo_acceso ?? '', $hash)) {
            return response()->json(['message' => 'Código inválido'], 422);
        }

        $reserva = $this->finalizarReserva($reserva);

        return response()->json([
            'message' => 'Reserva completada',
            'reserva' => $reserva,
        ]);
    }

    public function totemVerificarCodigo(Request $request)
    {
        $data = $request->validate([
            'code' => ['required','regex:/^\d{6}$/'],
        ]);

        // Obtener la ubicación del dispositivo autenticado
        $ubicacionDevice = $request->user();
        if (!$ubicacionDevice) {
            return response()->json(['message' => 'No autorizado'], 401);
        }

        $hash = hash('sha256', $data['code']);

        $reserva = Reserva::with(['locker.ubicacion','repartidor'])
            ->whereIn('tipo_acceso', ['codigo_temporal', 'qr'])
            ->where('codigo_acceso', $hash)
            ->first();

        if (!$reserva) {
            return response()->json(['message' => 'Código no reconocido'], 422);
        }

        // Validar que el locker pertenece a la ubicación del dispositivo
        if (!$reserva->locker || $reserva->locker->ubicacion_id !== $ubicacionDevice->id) {
            return response()->json(['message' => 'Código no reconocido'], 422);
        }

        [, , $isValidWindow] = $this->calcularEstadoCodigoTemporal($reserva);
        if (!$isValidWindow) {
            return response()->json(['message' => 'Código no reconocido'], 422);
        }

        $reserva = $this->finalizarReserva($reserva);

        return response()->json([
            'message' => 'Reserva completada',
            'reserva_id' => $reserva->id,
            'locker' => [
                'id' => $reserva->locker?->id,
                'numero' => $reserva->locker->numero ?? null,
                'ubicacion' => $reserva->locker->ubicacion?->nombre ?? null,
            ],
            'repartidor' => $reserva->repartidor ? [
                'id' => $reserva->repartidor->id,
                'nombre' => $reserva->repartidor->nombre,
                'apellido' => $reserva->repartidor->apellido,
                'email' => $reserva->repartidor->email,
            ] : null,
            'logistica_estado' => $reserva->logistica_estado,
            'completado_en' => now()->toISOString(),
        ]);
    }

    /**
     * DEV-ONLY: Genera/regenera el código sin requerir autenticación.
     * Solo disponible cuando APP_ENV=local. Útil para pruebas con Postman.
     */
    public function devGenerarCodigoTemporal(Request $request, Reserva $reserva)
    {
        if (!app()->environment('local')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $reserva->update([
            'tipo_acceso'   => 'codigo_temporal',
            'codigo_acceso' => hash('sha256', $code),
        ]);

        $expiresAt = now()->addMinutes(5);
        Cache::put('reserva_code_'.$reserva->id, $code, $expiresAt);

        return response()->json([
            'code' => $code,
            'expires_at' => $expiresAt->toISOString(),
            'valid_for_seconds' => 5 * 60,
        ]);
    }

    private function calcularEstadoCodigoTemporal(Reserva $reserva): array
    {
        $has = !empty($reserva->codigo_acceso) && in_array($reserva->tipo_acceso, ['codigo_temporal', 'qr']);
        $expiresAt = $reserva->updated_at?->copy()->addMinutes(5);
        $isValid = $has && $expiresAt && now()->lt($expiresAt);

        return [$has, $expiresAt, $isValid];
    }

    private function finalizarReserva(Reserva $reserva): Reserva
    {
        // Cargar relaciones necesarias antes de usarlas
        $reserva->load(['usuario', 'locker']);
        
        $reserva->estado = 'completado';
        $reserva->hora_fin = now();
        $reserva->codigo_acceso = null;
        $reserva->logistica_estado = 'completado';
        $reserva->save();

        // Actualizar estado del locker (puede volver a activo si no hay más reservas pendientes)
        $lockerEstadoAnterior = $reserva->locker->estado;
        $this->actualizarEstadoLocker($reserva->locker_id);
        $locker = Locker::find($reserva->locker_id);
        $lockerEstadoNuevo = $locker ? $locker->estado : $lockerEstadoAnterior;

        // Registrar en historial con mensaje más descriptivo
        $usuarioNombre = $reserva->usuario ? trim($reserva->usuario->nombre . ' ' . $reserva->usuario->apellido) : 'Usuario';
        $descripcion = "Usuario {$usuarioNombre} retiró sus productos de la Reserva #{$reserva->id}. ";
        
        if ($lockerEstadoAnterior === 'ocupado' && $lockerEstadoNuevo === 'activo') {
            $descripcion .= "Locker #{$locker->numero} desocupado y disponible nuevamente.";
        } else {
            $descripcion .= "Locker #{$locker->numero} actualizado.";
        }

        HistorialLockerService::registrarReservaCompletada(
            $reserva->locker_id,
            $reserva->id,
            $locker->numero,
            $usuarioNombre,
            $lockerEstadoAnterior,
            $lockerEstadoNuevo,
            $reserva->usuario_id
        );

        $this->liberarRepartidor($reserva);

        Cache::forget('reserva_code_'.$reserva->id);

        return $reserva->load(['locker.ubicacion','repartidor','usuario']);
    }

    private function asignarRepartidorDisponible(Reserva $reserva): void
    {
        if ($reserva->repartidor_id) {
            return;
        }

        // Solo asignar repartidor si la reserva tiene empresa_id (ahora es obligatorio)
        if (!$reserva->empresa_id) {
            return;
        }

        // Obtener todos los repartidores de la empresa (disponibles o no, ya que pueden tener múltiples pedidos)
        $repartidores = Repartidor::where('empresa_id', $reserva->empresa_id)
            ->get();

        if ($repartidores->isEmpty()) {
            return;
        }

        // Sistema rotativo: asignar al repartidor con menos pedidos activos
        // Si hay empate, usar el que fue asignado hace más tiempo (o nunca asignado)
        $repartidorAsignado = $repartidores->map(function ($repartidor) {
            $pedidosActivos = Reserva::where('repartidor_id', $repartidor->id)
                ->whereIn('logistica_estado', ['asignado', 'en_camino'])
                ->count();
            
            $ultimaAsignacion = Reserva::where('repartidor_id', $repartidor->id)
                ->whereIn('logistica_estado', ['asignado', 'en_camino'])
                ->orderByDesc('updated_at')
                ->value('updated_at');

            return [
                'repartidor' => $repartidor,
                'pedidos_activos' => $pedidosActivos,
                'ultima_asignacion' => $ultimaAsignacion ?? '1970-01-01 00:00:00', // Si nunca fue asignado, usar fecha muy antigua
            ];
        })
        ->sortBy([
            ['pedidos_activos', 'asc'],
            ['ultima_asignacion', 'asc'],
        ])
            ->first();

        if (!$repartidorAsignado) {
            return;
        }

        $reserva->repartidor()->associate($repartidorAsignado['repartidor']);
        $reserva->logistica_estado = 'asignado';
        $reserva->save();
    }

    /**
     * Forzar asignación de repartidor a una reserva
     */
    public function asignarRepartidor(Request $request, Reserva $reserva)
    {
        $user = $request->user();

        if (!$user || $user->rol !== 'empresa') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        // Verificar que la reserva pertenece a la empresa
        if ($reserva->empresa_id !== $user->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        // Si ya tiene repartidor, no hacer nada
        if ($reserva->repartidor_id) {
            return response()->json([
                'message' => 'La reserva ya tiene un repartidor asignado',
                'reserva' => $reserva->load(['usuario', 'locker.ubicacion', 'repartidor', 'articulos'])
            ]);
        }

        // Intentar asignar repartidor
        $this->asignarRepartidorDisponible($reserva);

        // Recargar la reserva
        $reserva->refresh();
        $reserva->load(['usuario', 'locker.ubicacion', 'repartidor', 'articulos']);

        if ($reserva->repartidor_id) {
            return response()->json([
                'message' => 'Repartidor asignado exitosamente',
                'reserva' => $reserva
            ]);
        } else {
            return response()->json([
                'message' => 'No hay repartidores disponibles en este momento',
                'reserva' => $reserva
            ], 422);
        }
    }

    private function liberarRepartidor(Reserva $reserva): void
    {
        // Ya no es necesario marcar repartidores como disponibles/no disponibles
        // Los repartidores pueden tener múltiples pedidos asignados simultáneamente
        // Este método se mantiene por compatibilidad pero no hace nada
    }

    /**
     * Actualiza el estado disponible del repartidor basado en si tiene pedidos activos
     */
    private function actualizarEstadoRepartidor(?int $repartidorId): void
    {
        if (!$repartidorId) {
            return;
        }

        $repartidor = Repartidor::find($repartidorId);
        if (!$repartidor) {
            return;
        }

        // Contar pedidos activos (asignados o en camino)
        $pedidosActivos = Reserva::where('repartidor_id', $repartidorId)
            ->whereIn('logistica_estado', ['asignado', 'en_camino'])
            ->where('estado', '!=', 'anulado')
            ->count();

        // Si no tiene pedidos activos, marcar como disponible
        // Si tiene pedidos activos, mantener el estado actual (no forzar a no disponible)
        $repartidor->disponible = $pedidosActivos === 0;
        $repartidor->save();
    }

    public function marcarEnRutaMasivo(Request $request)
    {
        $user = $request->user();
        
        // Solo los repartidores pueden marcar pedidos como en ruta
        if (!$user || $user->rol !== 'repartidor') {
            return response()->json(['message' => 'Solo los repartidores pueden marcar pedidos como en ruta'], 403);
        }

        $data = $request->validate([
            'reserva_ids' => ['required', 'array', 'min:1'],
            'reserva_ids.*' => ['required', 'integer', 'exists:reservas,id'],
        ]);

        $reservasIds = $data['reserva_ids'];
        $resultados = [
            'exitosos' => [],
            'fallidos' => []
        ];

        foreach ($reservasIds as $reservaId) {
            try {
                $reserva = Reserva::find($reservaId);
                
                if (!$reserva) {
                    $resultados['fallidos'][] = [
                        'id' => $reservaId,
                        'mensaje' => 'Reserva no encontrada'
                    ];
                    continue;
                }

                // Verificar que tiene repartidor asignado
                if (!$reserva->repartidor_id) {
                    $resultados['fallidos'][] = [
                        'id' => $reservaId,
                        'mensaje' => 'La reserva no tiene repartidor asignado'
                    ];
                    continue;
                }

                // Verificar que el repartidor es el asignado a la reserva
                $repartidor = Repartidor::where('usuario_id', $user->id)->first();
                    
                if (!$repartidor || $reserva->repartidor_id !== $repartidor->id) {
                    $resultados['fallidos'][] = [
                        'id' => $reservaId,
                        'mensaje' => 'No tienes acceso a esta reserva'
                    ];
                    continue;
                }

                // Verificar estado
                if ($reserva->estado !== 'pendiente') {
                    $resultados['fallidos'][] = [
                        'id' => $reservaId,
                        'mensaje' => 'La reserva no puede actualizarse'
                    ];
                    continue;
                }

                if (!in_array($reserva->logistica_estado, ['asignado', 'pendiente_repartidor'], true)) {
                    $resultados['fallidos'][] = [
                        'id' => $reservaId,
                        'mensaje' => 'La reserva ya fue marcada en ruta o finalizada'
                    ];
                    continue;
                }

                // Si la reserva no tiene locker asignado, buscar uno disponible automáticamente
                if (!$reserva->locker_id) {
                    if (!$reserva->tamano_pedido) {
                        $resultados['fallidos'][] = [
                            'id' => $reservaId,
                            'mensaje' => 'El pedido no tiene tamaño especificado'
                        ];
                        continue;
                    }

                    if (!$reserva->ubicacion_destino_id) {
                        $resultados['fallidos'][] = [
                            'id' => $reservaId,
                            'mensaje' => 'El pedido no tiene ubicación de destino especificada'
                        ];
                        continue;
                    }

                    // Buscar un locker disponible del tamaño correcto en la ubicación de destino
                    $lockerDisponible = $this->buscarLockerDisponible(
                        $reserva->ubicacion_destino_id,
                        $reserva->tamano_pedido
                    );

                    if (!$lockerDisponible) {
                        $resultados['fallidos'][] = [
                            'id' => $reservaId,
                            'mensaje' => "No hay lockers disponibles del tamaño '{$reserva->tamano_pedido}' en la ubicación de destino"
                        ];
                        continue;
                    }

                    // Asignar el locker a la reserva
                    $reserva->locker_id = $lockerDisponible->id;
                }

                // SIEMPRE marcar el locker como ocupado cuando se marca en ruta
                if ($reserva->locker_id) {
                    $locker = Locker::find($reserva->locker_id);
                    if ($locker && !in_array($locker->estado, ['bloqueado', 'mantenimiento'], true)) {
                        $locker->estado = 'ocupado';
                        $locker->save();
                    }
                }

                // Marcar como en ruta
                $reserva->logistica_estado = 'en_camino';
                if (!$reserva->hora_inicio) {
                    $reserva->hora_inicio = now();
                }
                $reserva->save();
                
                // No actualizamos el estado del repartidor aquí porque el pedido aún está activo (en camino)

                $resultados['exitosos'][] = $reservaId;
            } catch (\Exception $e) {
                $resultados['fallidos'][] = [
                    'id' => $reservaId,
                    'mensaje' => $e->getMessage()
                ];
            }
        }

        return response()->json([
            'message' => count($resultados['exitosos']) . ' reservas marcadas en ruta exitosamente',
            'resultados' => $resultados
        ]);
    }

    public function marcarEntregadoMasivo(Request $request)
    {
        $user = $request->user();
        
        // Solo los repartidores pueden marcar pedidos como entregados
        if (!$user || $user->rol !== 'repartidor') {
            return response()->json(['message' => 'Solo los repartidores pueden marcar pedidos como entregados'], 403);
        }

        $data = $request->validate([
            'reserva_ids' => ['required', 'array', 'min:1'],
            'reserva_ids.*' => ['required', 'integer', 'exists:reservas,id'],
        ]);

        $reservasIds = $data['reserva_ids'];
        $resultados = [
            'exitosos' => [],
            'fallidos' => []
        ];

        foreach ($reservasIds as $reservaId) {
            try {
                $reserva = Reserva::find($reservaId);
                
                if (!$reserva) {
                    $resultados['fallidos'][] = [
                        'id' => $reservaId,
                        'mensaje' => 'Reserva no encontrada'
                    ];
                    continue;
                }

                // Verificar que tiene repartidor asignado
                if (!$reserva->repartidor_id) {
                    $resultados['fallidos'][] = [
                        'id' => $reservaId,
                        'mensaje' => 'La reserva no tiene repartidor asignado'
                    ];
                    continue;
                }

                // Verificar que el repartidor es el asignado a la reserva
                $repartidor = Repartidor::where('usuario_id', $user->id)->first();
                    
                if (!$repartidor || $reserva->repartidor_id !== $repartidor->id) {
                    $resultados['fallidos'][] = [
                        'id' => $reservaId,
                        'mensaje' => 'No tienes acceso a esta reserva'
                    ];
                    continue;
                }

                // Verificar estado - solo permitir si está en ruta
                if ($reserva->estado === 'completado') {
                    $resultados['fallidos'][] = [
                        'id' => $reservaId,
                        'mensaje' => 'La reserva ya fue finalizada'
                    ];
                    continue;
                }

                if ($reserva->logistica_estado !== 'en_camino') {
                    $resultados['fallidos'][] = [
                        'id' => $reservaId,
                        'mensaje' => 'La reserva debe estar en ruta antes de marcarla como entregada'
                    ];
                    continue;
                }

                // Marcar como entregado
                DB::transaction(function () use ($reserva, $repartidor) {
                    $reserva->logistica_estado = 'completado';
                    $reserva->save();
                    $this->liberarRepartidor($reserva);
                    $this->actualizarEstadoRepartidor($repartidor->id);
                });

                $resultados['exitosos'][] = $reservaId;
            } catch (\Exception $e) {
                $resultados['fallidos'][] = [
                    'id' => $reservaId,
                    'mensaje' => $e->getMessage()
                ];
            }
        }

        return response()->json([
            'message' => count($resultados['exitosos']) . ' reservas marcadas como entregadas exitosamente',
            'resultados' => $resultados
        ]);
    }

    /**
     * Actualiza el estado del locker basado en las reservas pendientes.
     * Si hay reservas pendientes, el locker se marca como "ocupado".
     * Si no hay reservas pendientes y el locker no está bloqueado o en mantenimiento, se marca como "activo".
     */
    /**
     * Actualiza el estado de un locker según las reservas activas
     * Un locker está OCUPADO si:
     * - Tiene reservas pendientes (estado='pendiente')
     * - Tiene reservas en camino (logistica_estado='en_camino')
     * - Tiene reservas entregadas pero aún no retiradas (estado='pendiente' y logistica_estado='completado')
     * 
     * Un locker está ACTIVO si:
     * - No tiene reservas activas
     * - Todas sus reservas están completamente finalizadas (estado='completado' y logistica_estado='completado')
     */
    private function actualizarEstadoLocker(int $lockerId): void
    {
        $locker = Locker::find($lockerId);
        if (!$locker) {
            return;
        }

        // Si el locker está bloqueado o en mantenimiento, no cambiar su estado
        if (in_array($locker->estado, ['bloqueado', 'mantenimiento'], true)) {
            return;
        }

        // Verificar si hay reservas activas para este locker que lo mantengan ocupado
        $tieneReservasActivas = Reserva::where('locker_id', $lockerId)
            ->where(function ($query) {
                $query->where('estado', 'pendiente') // Reservas pendientes
                      ->orWhere('logistica_estado', 'en_camino') // Pedidos en ruta
                      ->orWhere(function ($q) {
                          // Reservas entregadas por repartidor pero cliente aún no retiró
                          $q->where('estado', 'pendiente')
                            ->where('logistica_estado', 'completado');
                      });
            })
            ->exists();

        // Actualizar el estado según si hay reservas activas
        if ($tieneReservasActivas) {
            $locker->estado = 'ocupado';
        } else {
            $locker->estado = 'activo';
        }

        $locker->save();
    }

    /**
     * Marca múltiples reservas como en ruta para repartidores autenticados
     */
    public function repartidorMarcarEnRutaMasivo(Request $request)
    {
        $user = $request->user();
        
        if (!$user || $user->rol !== 'repartidor') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $repartidor = Repartidor::where('usuario_id', $user->id)->first();
        if (!$repartidor) {
            return response()->json(['message' => 'No se encontró el repartidor asociado'], 404);
        }

        $data = $request->validate([
            'reserva_ids' => ['required', 'array', 'min:1'],
            'reserva_ids.*' => ['required', 'integer', 'exists:reservas,id'],
        ]);

        $reservasIds = $data['reserva_ids'];
        $resultados = [
            'exitosos' => [],
            'fallidos' => []
        ];

        foreach ($reservasIds as $reservaId) {
            try {
                $reserva = Reserva::find($reservaId);
                
                if (!$reserva) {
                    $resultados['fallidos'][] = [
                        'id' => $reservaId,
                        'mensaje' => 'Reserva no encontrada'
                    ];
                    continue;
                }

                // Verificar que la reserva está asignada a este repartidor
                if ($reserva->repartidor_id !== $repartidor->id) {
                    $resultados['fallidos'][] = [
                        'id' => $reservaId,
                        'mensaje' => 'No tienes acceso a esta reserva'
                    ];
                    continue;
                }

                // Verificar estado
                if ($reserva->estado !== 'pendiente') {
                    $resultados['fallidos'][] = [
                        'id' => $reservaId,
                        'mensaje' => 'La reserva no puede actualizarse'
                    ];
                    continue;
                }

                if (!in_array($reserva->logistica_estado, ['asignado', 'pendiente_repartidor'], true)) {
                    $resultados['fallidos'][] = [
                        'id' => $reservaId,
                        'mensaje' => 'La reserva ya fue marcada en ruta o finalizada'
                    ];
                    continue;
                }

                // Si la reserva no tiene locker asignado, buscar uno disponible automáticamente
                if (!$reserva->locker_id) {
                    if (!$reserva->tamano_pedido) {
                        $resultados['fallidos'][] = [
                            'id' => $reservaId,
                            'mensaje' => 'El pedido no tiene tamaño especificado'
                        ];
                        continue;
                    }

                    if (!$reserva->ubicacion_destino_id) {
                        $resultados['fallidos'][] = [
                            'id' => $reservaId,
                            'mensaje' => 'El pedido no tiene ubicación de destino especificada'
                        ];
                        continue;
                    }

                    // Buscar un locker disponible del tamaño correcto en la ubicación de destino
                    $lockerDisponible = $this->buscarLockerDisponible(
                        $reserva->ubicacion_destino_id,
                        $reserva->tamano_pedido
                    );

                    if (!$lockerDisponible) {
                        $resultados['fallidos'][] = [
                            'id' => $reservaId,
                            'mensaje' => "No hay lockers disponibles del tamaño '{$reserva->tamano_pedido}' en la ubicación de destino"
                        ];
                        continue;
                    }

                    // Asignar el locker a la reserva
                    $reserva->locker_id = $lockerDisponible->id;
                }

                // SIEMPRE marcar el locker como ocupado cuando se marca en ruta
                if ($reserva->locker_id) {
                    $locker = Locker::find($reserva->locker_id);
                    if ($locker && !in_array($locker->estado, ['bloqueado', 'mantenimiento'], true)) {
                        $locker->estado = 'ocupado';
                        $locker->save();
                    }
                }

                // Marcar como en ruta
                $reserva->logistica_estado = 'en_camino';
                $reserva->save();

                $resultados['exitosos'][] = $reservaId;
            } catch (\Exception $e) {
                $resultados['fallidos'][] = [
                    'id' => $reservaId,
                    'mensaje' => $e->getMessage()
                ];
            }
        }

        return response()->json([
            'message' => count($resultados['exitosos']) . ' reservas marcadas en ruta exitosamente',
            'resultados' => $resultados
        ]);
    }

    /**
     * Marca múltiples reservas como entregadas para repartidores autenticados
     */
    public function repartidorMarcarEntregadoMasivo(Request $request)
    {
        $user = $request->user();
        
        if (!$user || $user->rol !== 'repartidor') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $repartidor = Repartidor::where('usuario_id', $user->id)->first();
        if (!$repartidor) {
            return response()->json(['message' => 'No se encontró el repartidor asociado'], 404);
        }

        $data = $request->validate([
            'reserva_ids' => ['required', 'array', 'min:1'],
            'reserva_ids.*' => ['required', 'integer', 'exists:reservas,id'],
        ]);

        $reservasIds = $data['reserva_ids'];
        $resultados = [
            'exitosos' => [],
            'fallidos' => []
        ];

        foreach ($reservasIds as $reservaId) {
            try {
                $reserva = Reserva::find($reservaId);
                
                if (!$reserva) {
                    $resultados['fallidos'][] = [
                        'id' => $reservaId,
                        'mensaje' => 'Reserva no encontrada'
                    ];
                    continue;
                }

                // Verificar que la reserva está asignada a este repartidor
                if ($reserva->repartidor_id !== $repartidor->id) {
                    $resultados['fallidos'][] = [
                        'id' => $reservaId,
                        'mensaje' => 'No tienes acceso a esta reserva'
                    ];
                    continue;
                }

                if ($reserva->estado === 'completado') {
                    $resultados['fallidos'][] = [
                        'id' => $reservaId,
                        'mensaje' => 'La reserva ya fue finalizada'
                    ];
                    continue;
                }

                // Solo se puede marcar como entregado si está en ruta
                if ($reserva->logistica_estado !== 'en_camino') {
                    $resultados['fallidos'][] = [
                        'id' => $reservaId,
                        'mensaje' => 'La reserva debe estar en ruta antes de marcarla como entregada'
                    ];
                    continue;
                }

                // Marcar como entregado
                DB::transaction(function () use ($reserva) {
                    $reserva->logistica_estado = 'completado';
                    $reserva->save();
                    $this->liberarRepartidor($reserva);
                });

                $resultados['exitosos'][] = $reservaId;
            } catch (\Exception $e) {
                $resultados['fallidos'][] = [
                    'id' => $reservaId,
                    'mensaje' => $e->getMessage()
                ];
            }
        }

        return response()->json([
            'message' => count($resultados['exitosos']) . ' reservas marcadas como entregadas exitosamente',
            'resultados' => $resultados
        ]);
    }
}
