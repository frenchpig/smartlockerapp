<?php

namespace App\Http\Controllers;

use App\Models\Incidencia;
use App\Models\Reserva;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class IncidenciaController extends Controller
{
    public function index()
    {
        return Incidencia::with(['locker', 'usuario', 'reserva.empresa', 'reserva.repartidor', 'reserva.articulos'])->paginate(20);
    }

    public function show(Incidencia $incidencia)
    {
        return $incidencia->load(['locker', 'usuario', 'reserva.empresa', 'reserva.repartidor', 'reserva.articulos']);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'tipo'       => ['required', Rule::in(['locker', 'pedido', 'otro'])],
            'locker_id'  => ['required','integer','exists:lockers,id'],
            'reserva_id' => ['nullable','integer','exists:reservas,id'],
            'usuario_id' => ['required','integer','exists:usuarios,id'],
            'descripcion'=> ['required','string','max:1000'],
            'estado'     => ['required', Rule::in(['resuelto','pendiente','anulada'])],
        ]);

        // Si es tipo pedido, validar que tenga reserva_id
        if ($data['tipo'] === 'pedido' && empty($data['reserva_id'])) {
            return response()->json([
                'message' => 'Las incidencias de tipo pedido deben tener un reserva_id asociado.'
            ], 422);
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

        return response()->json($incidencia->load(['locker', 'usuario', 'reserva.empresa', 'reserva.repartidor', 'reserva.articulos']), 201);
    }

    public function update(Request $request, Incidencia $incidencia)
    {
        $data = $request->validate([
            'tipo'       => ['sometimes', Rule::in(['locker', 'pedido', 'otro'])],
            'locker_id'  => ['sometimes','integer','exists:lockers,id'],
            'reserva_id' => ['nullable','integer','exists:reservas,id'],
            'usuario_id' => ['sometimes','integer','exists:usuarios,id'],
            'descripcion'=> ['sometimes','string','max:1000'],
            'estado'     => ['sometimes', Rule::in(['resuelto','pendiente','anulada'])],
        ]);

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

    public function destroy(Incidencia $incidencia)
    {
        $incidencia->delete();
        return response()->noContent();
    }
}
