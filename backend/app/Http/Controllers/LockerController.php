<?php

namespace App\Http\Controllers;

use App\Models\Locker;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LockerController extends Controller
{
    public function index()
    {
        return Locker::paginate(20);
    }

    public function show(Locker $locker)
    {
        return $locker;
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'ubicacion'              => ['required','string','max:255'],
            'latitud'                => ['required','numeric'],
            'longitud'               => ['required','numeric'],
            'estado'                 => ['required', Rule::in(Locker::ESTADOS)],
            'tamano'                 => ['required','string','max:100'],
            'codigo_acceso_temporal' => ['nullable','string','max:100'],
        ]);

        $locker = Locker::create($data);

        return response()->json($locker, 201);
    }

    public function update(Request $request, Locker $locker)
    {
        $data = $request->validate([
            'ubicacion'              => ['sometimes','string','max:255'],
            'latitud'                => ['sometimes','numeric'],
            'longitud'               => ['sometimes','numeric'],
            'estado'                 => ['sometimes', Rule::in(Locker::ESTADOS)],
            'tamano'                 => ['sometimes','string','max:100'],
            'codigo_acceso_temporal' => ['sometimes','nullable','string','max:100'],
        ]);

        $locker->update($data);

        return $locker;
    }

    public function destroy(Locker $locker)
    {
        $locker->delete();
        return response()->noContent();
    }
}
