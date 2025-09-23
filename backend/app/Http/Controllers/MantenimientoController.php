<?php

namespace App\Http\Controllers;

use App\Models\Mantenimiento;
use Illuminate\Http\Request;

class MantenimientoController extends Controller
{
    public function index()
    {
        return Mantenimiento::with(['locker','usuario'])->paginate(20);
    }

    public function show(Mantenimiento $mantenimiento)
    {
        return $mantenimiento->load(['locker','usuario']);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'locker_id'       => ['required','integer','exists:lockers,id'],
            'usuario_id'      => ['required','integer','exists:usuarios,id'],
            'descripcion'     => ['required','string','max:1000'],
            'fecha_programada'=> ['nullable','date'],
            'fecha_real'      => ['nullable','date','after_or_equal:fecha_programada'],
            'estado'          => ['nullable','string','max:100'],
        ]);

        $mantenimiento = Mantenimiento::create($data);

        return response()->json($mantenimiento->load(['locker','usuario']), 201);
    }

    public function update(Request $request, Mantenimiento $mantenimiento)
    {
        $data = $request->validate([
            'locker_id'       => ['sometimes','integer','exists:lockers,id'],
            'usuario_id'      => ['sometimes','integer','exists:usuarios,id'],
            'descripcion'     => ['sometimes','string','max:1000'],
            'fecha_programada'=> ['sometimes','date'],
            'fecha_real'      => ['sometimes','date','after_or_equal:fecha_programada'],
            'estado'          => ['sometimes','string','max:100'],
        ]);

        $mantenimiento->update($data);

        return $mantenimiento->load(['locker','usuario']);
    }

    public function destroy(Mantenimiento $mantenimiento)
    {
        $mantenimiento->delete();
        return response()->noContent();
    }
}
