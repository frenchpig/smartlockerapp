<?php

namespace App\Http\Controllers;

use App\Models\Incidencia;
use App\Models\Reserva;
use App\Models\Locker;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class IncidenciaController extends Controller
{
    public function index(Request $request)
    {
        $perPage = (int) $request->query('per_page', 20);
        $perPage = max(1, min(100, $perPage));

        $query = Incidencia::with([
            'locker', 
            'usuario', 
            'reserva.empresa.datosEmpresa.tarifa', 
            'reserva.repartidor', 
            'reserva.articulos',
            'reserva.ubicacionDestino'
        ]);

        // Filtros
        if ($estado = trim((string) $request->query('estado', ''))) {
            $query->where('estado', $estado);
        }

        if ($tipo = trim((string) $request->query('tipo', ''))) {
            $query->where('tipo', $tipo);
        }

        if ($problemaTipo = trim((string) $request->query('problema_tipo', ''))) {
            $query->where('problema_tipo', $problemaTipo);
        }

        $query->orderByDesc('created_at');

        $incidencias = $query->paginate($perPage);

        // Agregar información de soporte 24/7 para cada incidencia
        $incidencias->getCollection()->transform(function ($incidencia) {
            if ($incidencia->reserva && $incidencia->reserva->empresa) {
                $empresa = $incidencia->reserva->empresa;
                // Cargar datos de empresa si no están cargados
                if (!$empresa->relationLoaded('datosEmpresa')) {
                    $empresa->load('datosEmpresa.tarifa');
                }
                
                $tarifa = $empresa->datosEmpresa->tarifa ?? null;
                $incidencia->empresa_tiene_soporte_24_7 = $tarifa && $tarifa->prioridad_soporte === 'Prioritario';
            } else {
                $incidencia->empresa_tiene_soporte_24_7 = false;
            }
            return $incidencia;
        });

        return $incidencias;
    }

    /**
     * Obtener incidencias relacionadas con pedidos enviados por la empresa autenticada
     */
    public function empresaIncidencias(Request $request)
    {
        $user = $request->user();

        if (!$user || $user->rol !== 'empresa') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $perPage = (int) $request->query('per_page', 20);
        $perPage = max(1, min(100, $perPage));

        $query = Incidencia::with(['locker', 'usuario', 'reserva.empresa', 'reserva.repartidor', 'reserva.articulos', 'reserva.ubicacionDestino'])
            ->where('tipo', 'pedido') // Solo incidencias de tipo pedido
            ->whereNotNull('reserva_id') // Solo incidencias relacionadas con pedidos
            ->whereHas('reserva', function ($q) use ($user) {
                $q->where('empresa_id', $user->id); // Solo pedidos de esta empresa
            });

        // Filtros
        if ($estado = trim((string) $request->query('estado', ''))) {
            $query->where('estado', $estado);
        }

        if ($tipo = trim((string) $request->query('tipo', ''))) {
            $query->where('tipo', $tipo);
        }

        if ($problemaTipo = trim((string) $request->query('problema_tipo', ''))) {
            $query->where('problema_tipo', $problemaTipo);
        }

        $query->orderByDesc('created_at');

        return $query->paginate($perPage);
    }

    public function show(Incidencia $incidencia)
    {
        $incidencia->load(['locker', 'usuario', 'reserva.empresa.datosEmpresa.tarifa', 'reserva.repartidor', 'reserva.articulos', 'reserva.ubicacionDestino']);
        
        // Agregar información de soporte 24/7
        if ($incidencia->reserva && $incidencia->reserva->empresa) {
            $empresa = $incidencia->reserva->empresa;
            $tarifa = $empresa->datosEmpresa->tarifa ?? null;
            $incidencia->empresa_tiene_soporte_24_7 = $tarifa && $tarifa->prioridad_soporte === 'Prioritario';
        } else {
            $incidencia->empresa_tiene_soporte_24_7 = false;
        }
        
        return $incidencia;
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'tipo'         => ['required', Rule::in(Incidencia::TIPOS)],
            'problema_tipo' => ['nullable', 'string', 'max:100'],
            'locker_id'    => ['required','integer','exists:lockers,id'],
            'reserva_id'   => ['nullable','integer','exists:reservas,id'],
            'usuario_id'   => ['required','integer','exists:usuarios,id'],
            'descripcion'  => ['required','string','max:1000'],
            'estado'       => ['required', Rule::in(Incidencia::ESTADOS)],
        ]);

        // Validar problema_tipo según el tipo de incidencia
        if (!empty($data['problema_tipo'])) {
            $problemasValidos = Incidencia::getProblemasByTipo($data['tipo']);
            if (!in_array($data['problema_tipo'], $problemasValidos)) {
                return response()->json([
                    'message' => 'El problema_tipo no es válido para el tipo de incidencia seleccionado.',
                    'problemas_validos' => $problemasValidos
                ], 422);
            }
        }

        // Si es tipo pedido, validar que tenga reserva_id
        if ($data['tipo'] === 'pedido' && empty($data['reserva_id'])) {
            return response()->json([
                'message' => 'Las incidencias de tipo pedido deben tener un reserva_id asociado.'
            ], 422);
        }

        // Si hay reserva_id y es tipo locker, intentar asignar un nuevo locker
        // SOLO si el reportante es un repartidor
        $nuevoLockerAsignado = false;
        $mensajeLocker = null;
        
        // Verificar si el usuario que reporta es un repartidor
        $usuarioReportante = \App\Models\Usuario::find($data['usuario_id']);
        $esRepartidor = $usuarioReportante && $usuarioReportante->rol === 'repartidor';
        
        if (!empty($data['reserva_id']) && $data['tipo'] === 'locker' && $esRepartidor) {
            $reserva = Reserva::with(['empresa', 'repartidor', 'usuario', 'articulos', 'locker.ubicacion'])->find($data['reserva_id']);
            
            if ($reserva && $reserva->logistica_estado === 'en_camino' && $reserva->ubicacion_destino_id && $reserva->tamano_pedido) {
                // Verificar que el repartidor que reporta es el asignado a la reserva
                $repartidorReportante = \App\Models\Repartidor::where('usuario_id', $data['usuario_id'])->first();
                
                if ($repartidorReportante && $reserva->repartidor_id === $repartidorReportante->id) {
                    // Intentar buscar un nuevo locker disponible del mismo tamaño en la misma ubicación
                    $nuevoLocker = $this->buscarLockerDisponible($reserva->ubicacion_destino_id, $reserva->tamano_pedido);
                    
                    if ($nuevoLocker) {
                        // Guardar el locker anterior antes de cambiar
                        $lockerAnterior = $reserva->locker;
                        
                        // Asignar el nuevo locker a la reserva y liberar el anterior
                        DB::transaction(function () use ($reserva, $nuevoLocker, $lockerAnterior) {
                            // Asignar el nuevo locker
                            $reserva->locker_id = $nuevoLocker->id;
                            $nuevoLocker->estado = 'ocupado';
                            $nuevoLocker->save();
                            
                            // Liberar el locker anterior si existe
                            if ($lockerAnterior) {
                                $lockerAnterior->estado = 'activo';
                                $lockerAnterior->save();
                            }
                            
                            $reserva->save();
                        });
                        $nuevoLockerAsignado = true;
                        $mensajeLocker = "Se asignó un nuevo locker (#{$nuevoLocker->numero}) a la reserva.";
                    } else {
                        // No hay lockers disponibles
                        $mensajeLocker = "No hay lockers disponibles del tamaño '{$reserva->tamano_pedido}' en esta ubicación. Deberás cancelar la entrega del pedido.";
                    }
                }
            }
        }

        // Si hay reserva_id, cargar y almacenar todos los datos del pedido
        if (!empty($data['reserva_id'])) {
            $reserva = Reserva::with(['empresa', 'repartidor', 'usuario', 'articulos', 'locker.ubicacion'])->find($data['reserva_id']);
            
            if ($reserva) {
                $data['datos_pedido'] = [
                    'reserva_id' => $reserva->id,
                    'empresa' => [
                        'id' => $reserva->empresa->id ?? null,
                        'nombre' => $reserva->empresa->nombre ?? null,
                        'email' => $reserva->empresa->email ?? null,
                    ],
                    'repartidor' => $reserva->repartidor ? [
                        'id' => $reserva->repartidor->id,
                        'nombre' => $reserva->repartidor->nombre ?? null,
                        'apellido' => $reserva->repartidor->apellido ?? null,
                        'nombre_completo' => $reserva->repartidor->nombre_completo ?? null,
                        'email' => $reserva->repartidor->email ?? null,
                        'telefono' => $reserva->repartidor->telefono ?? null,
                        'rut' => $reserva->repartidor->rut ?? null,
                    ] : null,
                    'usuario_destino' => [
                        'id' => $reserva->usuario->id ?? null,
                        'nombre' => $reserva->usuario->nombre ?? null,
                        'email' => $reserva->usuario->email ?? null,
                    ],
                    'locker' => [
                        'id' => $reserva->locker->id ?? null,
                        'numero' => $reserva->locker->numero ?? null,
                        'ubicacion' => $reserva->locker->ubicacion->nombre ?? null,
                    ],
                    'articulos' => $reserva->articulos->map(function ($articulo) {
                        return [
                            'id' => $articulo->id,
                            'nombre' => $articulo->nombre,
                            'cantidad' => $articulo->cantidad,
                            'descripcion' => $articulo->descripcion,
                            'sku' => $articulo->sku,
                            'peso' => $articulo->peso,
                        ];
                    })->toArray(),
                    'fecha_reserva' => $reserva->fecha_reserva?->toDateTimeString(),
                    'estado_pedido' => $reserva->estado,
                    'logistica_estado' => $reserva->logistica_estado,
                ];
            }
        }

        $incidencia = Incidencia::create($data);

        $response = [
            'incidencia' => $incidencia->load(['locker', 'usuario', 'reserva.empresa', 'reserva.repartidor', 'reserva.articulos']),
            'nuevo_locker_asignado' => $nuevoLockerAsignado,
            'mensaje' => $mensajeLocker,
        ];

        // Si no se pudo asignar un nuevo locker, retornar un código especial
        if (!$nuevoLockerAsignado && $mensajeLocker) {
            return response()->json($response, 422);
        }

        return response()->json($response, 201);
    }

    public function update(Request $request, Incidencia $incidencia)
    {
        $data = $request->validate([
            'tipo'         => ['sometimes', Rule::in(Incidencia::TIPOS)],
            'problema_tipo' => ['nullable', 'string', 'max:100'],
            'locker_id'    => ['sometimes','integer','exists:lockers,id'],
            'reserva_id'   => ['nullable','integer','exists:reservas,id'],
            'usuario_id'   => ['sometimes','integer','exists:usuarios,id'],
            'descripcion'  => ['sometimes','string','max:1000'],
            'estado'       => ['sometimes', Rule::in(Incidencia::ESTADOS)],
        ]);

        // Determinar el tipo a usar para validación (el nuevo o el existente)
        $tipoParaValidar = $data['tipo'] ?? $incidencia->tipo;

        // Validar problema_tipo según el tipo de incidencia
        if (isset($data['problema_tipo']) && !empty($data['problema_tipo'])) {
            $problemasValidos = Incidencia::getProblemasByTipo($tipoParaValidar);
            if (!in_array($data['problema_tipo'], $problemasValidos)) {
                return response()->json([
                    'message' => 'El problema_tipo no es válido para el tipo de incidencia seleccionado.',
                    'problemas_validos' => $problemasValidos
                ], 422);
            }
        }

        // Si se actualiza el tipo a pedido o se agrega/modifica reserva_id, actualizar datos_pedido
        if (isset($data['tipo']) && $data['tipo'] === 'pedido' && empty($data['reserva_id']) && empty($incidencia->reserva_id)) {
            return response()->json([
                'message' => 'Las incidencias de tipo pedido deben tener un reserva_id asociado.'
            ], 422);
        }

        // Si se actualiza reserva_id o el tipo cambia a pedido, actualizar datos_pedido
        $reservaId = $data['reserva_id'] ?? $incidencia->reserva_id;
        $tipo = $data['tipo'] ?? $incidencia->tipo;

        if ($reservaId && ($tipo === 'pedido' || isset($data['reserva_id']))) {
            $reserva = Reserva::with(['empresa', 'repartidor', 'usuario', 'articulos', 'locker.ubicacion'])->find($reservaId);
            
            if ($reserva) {
                $data['datos_pedido'] = [
                    'reserva_id' => $reserva->id,
                    'empresa' => [
                        'id' => $reserva->empresa->id ?? null,
                        'nombre' => $reserva->empresa->nombre ?? null,
                        'email' => $reserva->empresa->email ?? null,
                    ],
                    'repartidor' => $reserva->repartidor ? [
                        'id' => $reserva->repartidor->id,
                        'nombre' => $reserva->repartidor->nombre ?? null,
                        'apellido' => $reserva->repartidor->apellido ?? null,
                        'nombre_completo' => $reserva->repartidor->nombre_completo ?? null,
                        'email' => $reserva->repartidor->email ?? null,
                        'telefono' => $reserva->repartidor->telefono ?? null,
                        'rut' => $reserva->repartidor->rut ?? null,
                    ] : null,
                    'usuario_destino' => [
                        'id' => $reserva->usuario->id ?? null,
                        'nombre' => $reserva->usuario->nombre ?? null,
                        'email' => $reserva->usuario->email ?? null,
                    ],
                    'locker' => [
                        'id' => $reserva->locker->id ?? null,
                        'numero' => $reserva->locker->numero ?? null,
                        'ubicacion' => $reserva->locker->ubicacion->nombre ?? null,
                    ],
                    'articulos' => $reserva->articulos->map(function ($articulo) {
                        return [
                            'id' => $articulo->id,
                            'nombre' => $articulo->nombre,
                            'cantidad' => $articulo->cantidad,
                            'descripcion' => $articulo->descripcion,
                            'sku' => $articulo->sku,
                            'peso' => $articulo->peso,
                        ];
                    })->toArray(),
                    'fecha_reserva' => $reserva->fecha_reserva?->toDateTimeString(),
                    'estado_pedido' => $reserva->estado,
                    'logistica_estado' => $reserva->logistica_estado,
                ];
            }
        }

        $incidencia->update($data);

        return $incidencia->load(['locker', 'usuario', 'reserva.empresa', 'reserva.repartidor', 'reserva.articulos']);
    }

    /**
     * Busca un locker disponible del tamaño especificado en la ubicación indicada
     * (Mismo método que en ReservaController)
     */
    private function buscarLockerDisponible(int $ubicacionId, string $tamano): ?Locker
    {
        $locker = Locker::where('ubicacion_id', $ubicacionId)
            ->where('tamano', $tamano)
            ->where('estado', 'activo')
            ->whereDoesntHave('reservas', function ($query) {
                $query->where('estado', 'pendiente');
            })
            ->whereDoesntHave('reservas', function ($query) {
                $query->where('logistica_estado', 'en_camino');
            })
            ->whereDoesntHave('reservas', function ($query) {
                $query->where('estado', 'pendiente')
                      ->where('logistica_estado', 'completado');
            })
            ->first();

        return $locker;
    }

    public function destroy(Incidencia $incidencia)
    {
        $incidencia->delete();
        return response()->noContent();
    }
}
