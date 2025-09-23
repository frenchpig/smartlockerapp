<?php

namespace App\Http\Controllers;

use App\Models\HistorialEnvio;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class HistorialEnvioController extends Controller
{
    public function index()
    {
        return HistorialEnvio::with(['usuario','lockerOrigen','lockerDestino'])->paginate(20);
    }

    public function show(HistorialEnvio $historial_envio)
    {
        return $historial_envio->load(['usuario','lockerOrigen','lockerDestino']);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'usuario_id'        => ['required','integer','exists:usuarios,id'],
            'locker_origen_id'  => ['required','integer','exists:lockers,id'],
            'locker_destino_id' => ['required','integer','exists:lockers,id','different:locker_origen_id'],
            'fecha_envio'       => ['required','date'],
            'fecha_recepcion'   => ['nullable','date','after_or_equal:fecha_envio'],
            'estado'            => ['required', Rule::in(['recibido','cancelado','pendiente'])],
            'codigo_seguimiento'=> ['required','string','max:120','unique:historial_envios,codigo_seguimiento'],
        ]);

        $envio = HistorialEnvio::create($data);

        return response()->json($envio->load(['usuario','lockerOrigen','lockerDestino']), 201);
    }

    public function update(Request $request, HistorialEnvio $historial_envio)
    {
        $data = $request->validate([
            'usuario_id'        => ['sometimes','integer','exists:usuarios,id'],
            'locker_origen_id'  => ['sometimes','integer','exists:lockers,id'],
            'locker_destino_id' => ['sometimes','integer','exists:lockers,id','different:locker_origen_id'],
            'fecha_envio'       => ['sometimes','date'],
            'fecha_recepcion'   => ['sometimes','nullable','date','after_or_equal:fecha_envio'],
            'estado'            => ['sometimes', Rule::in(['recibido','cancelado','pendiente'])],
            'codigo_seguimiento'=> ['sometimes','string','max:120', Rule::unique('historial_envios','codigo_seguimiento')->ignore($historial_envio->id)],
        ]);

        $historial_envio->update($data);

        return $historial_envio->load(['usuario','lockerOrigen','lockerDestino']);
    }

    public function destroy(HistorialEnvio $historial_envio)
    {
        $historial_envio->delete();
        return response()->noContent();
    }
}
