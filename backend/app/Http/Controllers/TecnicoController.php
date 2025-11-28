<?php

namespace App\Http\Controllers;

use App\Models\Usuario;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TecnicoController extends Controller
{
    /**
     * Listar todos los técnicos
     */
    public function index(Request $request)
    {
        $perPage = (int) $request->query('per_page', 20);
        $perPage = max(1, min(200, $perPage));

        $query = Usuario::where('rol', 'tecnico');

        // Filtros opcionales
        if ($habilitado = $request->query('habilitado')) {
            $query->where('habilitado', filter_var($habilitado, FILTER_VALIDATE_BOOLEAN));
        }

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('nombre', 'like', "%{$search}%")
                  ->orWhere('apellido', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $query->orderBy('nombre')->orderBy('apellido');

        return $query->paginate($perPage);
    }

    /**
     * Mostrar un técnico específico
     */
    public function show(Usuario $tecnico)
    {
        if ($tecnico->rol !== 'tecnico') {
            return response()->json(['message' => 'El usuario no es un técnico'], 404);
        }

        // Cargar mantenciones del técnico
        $tecnico->loadCount('mantenimientos');
        $tecnico->load(['mantenimientos' => function ($query) {
            $query->latest()->limit(10);
        }]);

        return $tecnico;
    }

    /**
     * Crear un nuevo técnico
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre'    => ['required', 'string', 'max:255'],
            'apellido'  => ['required', 'string', 'max:255'],
            'email'     => ['required', 'email', 'max:255', 'unique:usuarios,email'],
            'contrasena'=> ['required', 'string', 'min:6'],
            'telefono'  => ['nullable', 'string', 'max:50'],
            'habilitado'=> ['sometimes', 'boolean'],
        ]);

        $data['rol'] = 'tecnico';
        $data['habilitado'] = $data['habilitado'] ?? true;

        $tecnico = Usuario::create($data);

        return response()->json($tecnico, 201);
    }

    /**
     * Actualizar un técnico
     */
    public function update(Request $request, Usuario $tecnico)
    {
        if ($tecnico->rol !== 'tecnico') {
            return response()->json(['message' => 'El usuario no es un técnico'], 404);
        }

        $data = $request->validate([
            'nombre'    => ['sometimes', 'string', 'max:255'],
            'apellido'  => ['sometimes', 'string', 'max:255'],
            'email'     => ['sometimes', 'email', 'max:255', Rule::unique('usuarios', 'email')->ignore($tecnico->id)],
            'contrasena'=> ['sometimes', 'string', 'min:6'],
            'telefono'  => ['sometimes', 'nullable', 'string', 'max:50'],
            'habilitado'=> ['sometimes', 'boolean'],
        ]);

        $tecnico->update($data);

        return $tecnico;
    }

    /**
     * Eliminar un técnico
     */
    public function destroy(Usuario $tecnico)
    {
        if ($tecnico->rol !== 'tecnico') {
            return response()->json(['message' => 'El usuario no es un técnico'], 404);
        }

        $tecnico->delete();

        return response()->noContent();
    }
}

