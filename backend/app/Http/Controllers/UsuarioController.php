<?php

namespace App\Http\Controllers;

use App\Models\Usuario;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UsuarioController extends Controller
{
    public function index(Request $request)
    {
        $query = Usuario::query();

        if ($rol = $request->query('rol')) {
            $query->where('rol', $rol);
        }

        $perPage = (int) $request->query('per_page', 20);
        $perPage = max(1, min(200, $perPage));

        return $query->paginate($perPage);
    }

    public function show(Usuario $usuario)
    {
        return $usuario;
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre'    => ['required','string','max:255'],
            'apellido'  => ['required','string','max:255'],
            'email'     => ['required','email','max:255','unique:usuarios,email'],
            'contrasena'=> ['required','string','min:6'],
            'telefono'  => ['nullable','string','max:50'],
            'rol'       => ['required', Rule::in(Usuario::ROLES)],
        ]);

        $usuario = Usuario::create($data); // mutator aplica SHA-256

        return response()->json($usuario, 201);
    }

    public function update(Request $request, Usuario $usuario)
    {
        $data = $request->validate([
            'nombre'    => ['sometimes','string','max:255'],
            'apellido'  => ['sometimes','string','max:255'],
            'email'     => ['sometimes','email','max:255', Rule::unique('usuarios','email')->ignore($usuario->id)],
            'contrasena'=> ['sometimes','string','min:6'],
            'telefono'  => ['sometimes','nullable','string','max:50'],
            'rol'       => ['sometimes', Rule::in(Usuario::ROLES)],
        ]);

        $usuario->update($data);

        return $usuario;
    }

    public function destroy(Usuario $usuario)
    {
        $usuario->delete();
        return response()->noContent();
    }
}
