<?php

namespace App\Http\Controllers;

use App\Models\Notificacion;
use Illuminate\Http\Request;

class NotificacionController extends Controller
{
    public function index()
    {
        return Notificacion::with('usuario')->paginate(20);
    }

    public function show(Notificacion $notificacion)
    {
        return $notificacion->load('usuario');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'usuario_id' => ['required','integer','exists:usuarios,id'],
            'mensaje'    => ['required','string','max:1000'],
            'tipo'       => ['nullable','string','max:100'],
            'leida'      => ['nullable','boolean'],
        ]);

        $notificacion = Notificacion::create($data);

        return response()->json($notificacion->load('usuario'), 201);
    }

    public function update(Request $request, Notificacion $notificacion)
    {
        $data = $request->validate([
            'usuario_id' => ['sometimes','integer','exists:usuarios,id'],
            'mensaje'    => ['sometimes','string','max:1000'],
            'tipo'       => ['sometimes','nullable','string','max:100'],
            'leida'      => ['sometimes','boolean'],
        ]);

        $notificacion->update($data);

        return $notificacion->load('usuario');
    }

    public function destroy(Notificacion $notificacion)
    {
        $notificacion->delete();
        return response()->noContent();
    }
}
