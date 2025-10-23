<?php

namespace App\Http\Controllers;

use App\Models\Locker;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LockerController extends Controller
{
    public function index()
    {
        return Locker::with('ubicacion')->paginate(20);
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
