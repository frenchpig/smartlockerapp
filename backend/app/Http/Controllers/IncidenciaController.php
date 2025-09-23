<?php

namespace App\Http\Controllers;

use App\Models\Incidencia;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class IncidenciaController extends Controller
{
    public function index()
    {
        return Incidencia::with(['locker','usuario'])->paginate(20);
    }

    public function show(Incidencia $incidencia)
    {
        return $incidencia->load(['locker','usuario']);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'locker_id'  => ['required','integer','exists:lockers,id'],
            'usuario_id' => ['required','integer','exists:usuarios,id'],
            'descripcion'=> ['required','string','max:1000'],
            'estado'     => ['required', Rule::in(['resuelto','pendiente','anulada'])],
        ]);

        $incidencia = Incidencia::create($data);

        return response()->json($incidencia->load(['locker','usuario']), 201);
    }

    public function update(Request $request, Incidencia $incidencia)
    {
        $data = $request->validate([
            'locker_id'  => ['sometimes','integer','exists:lockers,id'],
            'usuario_id' => ['sometimes','integer','exists:usuarios,id'],
            'descripcion'=> ['sometimes','string','max:1000'],
            'estado'     => ['sometimes', Rule::in(['resuelto','pendiente','anulada'])],
        ]);

        $incidencia->update($data);

        return $incidencia->load(['locker','usuario']);
    }

    public function destroy(Incidencia $incidencia)
    {
        $incidencia->delete();
        return response()->noContent();
    }
}
