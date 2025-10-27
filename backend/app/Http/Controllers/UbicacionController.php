<?php

namespace App\Http\Controllers;

use App\Models\Ubicacion;
use Illuminate\Http\Request;

class UbicacionController extends Controller
{
    public function index()
    {
        return Ubicacion::withCount('lockers')->paginate(20);
    }

    public function show(Ubicacion $ubicacion)
    {
        return $ubicacion->load('lockers');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:255', 'unique:ubicaciones,nombre'],
            'latitud' => ['nullable', 'numeric'],
            'longitud' => ['nullable', 'numeric'],
        ]);

        $ubicacion = Ubicacion::create($data);

        return response()->json($ubicacion, 201);
    }

    public function update(Request $request, Ubicacion $ubicacion)
    {
        $data = $request->validate([
            'nombre' => ['sometimes', 'string', 'max:255', 'unique:ubicaciones,nombre,' . $ubicacion->id],
            'latitud' => ['sometimes', 'nullable', 'numeric'],
            'longitud' => ['sometimes', 'nullable', 'numeric'],
        ]);

        $ubicacion->update($data);

        return $ubicacion;
    }

    public function destroy(Ubicacion $ubicacion)
    {
        if ($ubicacion->lockers()->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar la ubicacion porque tiene lockers asociados.',
            ], 422);
        }

        $ubicacion->delete();

        return response()->noContent();
    }
}
