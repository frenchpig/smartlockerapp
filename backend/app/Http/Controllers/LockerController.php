<?php

namespace App\Http\Controllers;

use App\Models\Locker;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LockerController extends Controller
{
    public function index(Request $request)
    {
        $perPage = (int) $request->query('per_page', 20);
        $perPage = max(1, min(200, $perPage));

        $query = Locker::with('ubicacion');

        if ($ubicacionId = $request->query('ubicacion_id')) {
            $query->where('ubicacion_id', $ubicacionId);
        }

        return $query->paginate($perPage);
    }

    public function show(Locker $locker)
    {
        return $locker->load('ubicacion');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'numero'                 => ['required','integer','min:1'],
            'ubicacion_id'           => ['required','integer','exists:ubicaciones,id'],
            'estado'                 => ['required', Rule::in(Locker::ESTADOS)],
            'tamano'                 => ['required','string','max:100'],
            'codigo_acceso_temporal' => ['nullable','string','max:100'],
        ]);

        $locker = Locker::create($data);

        return response()->json($locker->load('ubicacion'), 201);
    }

    public function update(Request $request, Locker $locker)
    {
        $data = $request->validate([
            'numero'                 => ['sometimes','integer','min:1'],
            'ubicacion_id'           => ['sometimes','integer','exists:ubicaciones,id'],
            'estado'                 => ['sometimes', Rule::in(Locker::ESTADOS)],
            'tamano'                 => ['sometimes','string','max:100'],
            'codigo_acceso_temporal' => ['sometimes','nullable','string','max:100'],
        ]);

        $locker->update($data);

        return $locker->load('ubicacion');
    }

    public function destroy(Locker $locker)
    {
        $locker->delete();
        return response()->noContent();
    }
}
