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

    public function show($ubicacion)
    {
        // Manejar tanto route model binding como ID directo
        if (!($ubicacion instanceof Ubicacion)) {
            // Si viene como ID, obtener el modelo
            $ubicacion = Ubicacion::findOrFail($ubicacion);
        }
        
        // Recargar el modelo para asegurar que tiene todos los datos
        $ubicacion->refresh();
        $ubicacion->load('lockers');
        
        // Construir respuesta explícitamente para asegurar que todos los campos estén presentes
        return response()->json([
            'id' => $ubicacion->id,
            'nombre' => $ubicacion->nombre,
            'latitud' => $ubicacion->latitud,
            'longitud' => $ubicacion->longitud,
            'device_username' => $ubicacion->device_username,
            'lockers_count' => $ubicacion->lockers->count(),
            'lockers' => $ubicacion->lockers->map(function ($locker) {
                return [
                    'id' => $locker->id,
                    'numero' => $locker->numero,
                    'estado' => $locker->estado,
                    'tamano' => $locker->tamano,
                ];
            }),
            'created_at' => $ubicacion->created_at?->toISOString(),
            'updated_at' => $ubicacion->updated_at?->toISOString(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:255', 'unique:ubicaciones,nombre'],
            'latitud' => ['nullable', 'numeric'],
            'longitud' => ['nullable', 'numeric'],
            'device_username' => ['nullable', 'string', 'max:255'],
            'device_password' => ['nullable', 'string', 'max:255'],
        ]);

        $ubicacion = Ubicacion::create($data);

        return response()->json($ubicacion, 201);
    }

    public function update(Request $request, $ubicacion)
    {
        // Manejar tanto route model binding como ID directo
        if (!($ubicacion instanceof Ubicacion)) {
            // Si viene como ID, obtener el modelo
            $ubicacion = Ubicacion::findOrFail($ubicacion);
        }
        
        // Asegurar que tenemos el ID de la ubicación
        $ubicacionId = $ubicacion->id;
        
        $data = $request->validate([
            'nombre' => ['sometimes', 'string', 'max:255', 'unique:ubicaciones,nombre,' . $ubicacionId],
            'latitud' => ['sometimes', 'nullable', 'numeric'],
            'longitud' => ['sometimes', 'nullable', 'numeric'],
            'device_username' => ['sometimes', 'nullable', 'string', 'max:255'],
            'device_password' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);

        $ubicacion->update($data);
        
        // Recargar para obtener datos actualizados
        $ubicacion->refresh();

        return response()->json([
            'id' => $ubicacion->id,
            'nombre' => $ubicacion->nombre,
            'latitud' => $ubicacion->latitud,
            'longitud' => $ubicacion->longitud,
            'device_username' => $ubicacion->device_username,
            'lockers_count' => $ubicacion->lockers->count(),
            'lockers' => $ubicacion->lockers->map(function ($locker) {
                return [
                    'id' => $locker->id,
                    'numero' => $locker->numero,
                    'estado' => $locker->estado,
                    'tamano' => $locker->tamano,
                ];
            }),
            'created_at' => $ubicacion->created_at?->toISOString(),
            'updated_at' => $ubicacion->updated_at?->toISOString(),
        ]);
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
