<?php

namespace App\Http\Controllers;

use App\Models\Reserva;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReservaController extends Controller
{
    public function index()
    {
        return Reserva::with(['usuario','locker'])->paginate(20);
    }

    public function show(Reserva $reserva)
    {
        return $reserva->load(['usuario','locker']);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'usuario_id'   => ['required','integer','exists:usuarios,id'],
            'locker_id'    => ['required','integer','exists:lockers,id'],
            'fecha_reserva'=> ['required','date'],
            'hora_inicio'  => ['required','date_format:H:i'],
            'hora_fin'     => ['required','date_format:H:i','after:hora_inicio'],
            'estado'       => ['required', Rule::in(['pendiente','completado','anulado'])],
            'tipo_acceso'  => ['required', Rule::in(['qr','codigo_temporal'])],
            'codigo_acceso'=> ['nullable','string','max:120'],
        ]);

        $reserva = Reserva::create($data);

        return response()->json($reserva->load(['usuario','locker']), 201);
    }

    public function update(Request $request, Reserva $reserva)
    {
        $data = $request->validate([
            'usuario_id'   => ['sometimes','integer','exists:usuarios,id'],
            'locker_id'    => ['sometimes','integer','exists:lockers,id'],
            'fecha_reserva'=> ['sometimes','date'],
            'hora_inicio'  => ['sometimes','date_format:H:i'],
            'hora_fin'     => ['sometimes','date_format:H:i','after:hora_inicio'],
            'estado'       => ['sometimes', Rule::in(['pendiente','completado','anulado'])],
            'tipo_acceso'  => ['sometimes', Rule::in(['qr','codigo_temporal'])],
            'codigo_acceso'=> ['sometimes','nullable','string','max:120'],
        ]);

        $reserva->update($data);

        return $reserva->load(['usuario','locker']);
    }

    public function destroy(Reserva $reserva)
    {
        $reserva->delete();
        return response()->noContent();
    }
}
