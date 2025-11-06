<?php

namespace App\Http\Controllers;

use App\Models\Usuario;
use App\Models\DatosEmpresa;
use App\Models\Region;
use App\Models\Comuna;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class EmpresaController extends Controller
{
    /**
     * Obtener todas las regiones
     */
    public function getRegiones()
    {
        return Region::orderBy('nombre')->get();
    }

    /**
     * Obtener comunas por región
     */
    public function getComunasPorRegion($regionId)
    {
        return Comuna::where('region_id', $regionId)
            ->orderBy('nombre')
            ->get();
    }

    /**
     * Crear una nueva empresa (usuario + datos_empresa)
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            // Datos del usuario (persona encargada)
            'nombre' => ['required', 'string', 'max:255'],
            'apellido' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:usuarios,email'],
            'telefono' => ['nullable', 'string', 'max:50'],
            'contrasena' => ['required', 'string', 'min:6'],
            
            // Datos de la empresa
            'nombre_empresa' => ['required', 'string', 'max:255'],
            'razon_social' => ['nullable', 'string', 'max:255'],
            'rut' => ['nullable', 'string', 'max:20'],
            'direccion' => ['nullable', 'string', 'max:255'],
            'comuna_id' => ['nullable', 'integer', 'exists:comunas,id'],
        ]);

        try {
            DB::beginTransaction();

            // Crear el usuario (persona encargada)
            $usuario = Usuario::create([
                'nombre' => $data['nombre'],
                'apellido' => $data['apellido'],
                'email' => $data['email'],
                'telefono' => $data['telefono'] ?? null,
                'contrasena' => $data['contrasena'],
                'rol' => 'empresa',
            ]);

            // Crear los datos de la empresa
            $datosEmpresa = DatosEmpresa::create([
                'usuario_id' => $usuario->id,
                'nombre' => $data['nombre_empresa'],
                'razon_social' => $data['razon_social'] ?? null,
                'rut' => $data['rut'] ?? null,
                'direccion' => $data['direccion'] ?? null,
                'comuna_id' => $data['comuna_id'] ?? null,
            ]);

            DB::commit();

            return response()->json([
                'usuario' => $usuario,
                'datos_empresa' => $datosEmpresa->load('comuna.region'),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Error al crear la empresa',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar una empresa
     */
    public function update(Request $request, Usuario $usuario)
    {
        if ($usuario->rol !== 'empresa') {
            return response()->json(['message' => 'El usuario no es una empresa'], 400);
        }

        $data = $request->validate([
            // Datos del usuario
            'nombre' => ['sometimes', 'string', 'max:255'],
            'apellido' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('usuarios', 'email')->ignore($usuario->id)],
            'telefono' => ['sometimes', 'nullable', 'string', 'max:50'],
            'contrasena' => ['sometimes', 'string', 'min:6'],
            
            // Datos de la empresa
            'nombre_empresa' => ['sometimes', 'string', 'max:255'],
            'razon_social' => ['sometimes', 'nullable', 'string', 'max:255'],
            'rut' => ['sometimes', 'nullable', 'string', 'max:20'],
            'direccion' => ['sometimes', 'nullable', 'string', 'max:255'],
            'comuna_id' => ['sometimes', 'nullable', 'integer', 'exists:comunas,id'],
        ]);

        try {
            DB::beginTransaction();

            // Actualizar usuario
            if (isset($data['nombre'])) $usuario->nombre = $data['nombre'];
            if (isset($data['apellido'])) $usuario->apellido = $data['apellido'];
            if (isset($data['email'])) $usuario->email = $data['email'];
            if (isset($data['telefono'])) $usuario->telefono = $data['telefono'];
            if (isset($data['contrasena'])) $usuario->contrasena = $data['contrasena'];
            $usuario->save();

            // Actualizar o crear datos_empresa
            $datosEmpresa = DatosEmpresa::firstOrCreate(
                ['usuario_id' => $usuario->id],
                [
                    'nombre' => $data['nombre_empresa'] ?? $usuario->nombre . ' ' . $usuario->apellido,
                    'razon_social' => null,
                    'rut' => null,
                    'direccion' => null,
                    'comuna_id' => null,
                ]
            );

            if (isset($data['nombre_empresa'])) $datosEmpresa->nombre = $data['nombre_empresa'];
            if (isset($data['razon_social'])) $datosEmpresa->razon_social = $data['razon_social'];
            if (isset($data['rut'])) $datosEmpresa->rut = $data['rut'];
            if (isset($data['direccion'])) $datosEmpresa->direccion = $data['direccion'];
            if (isset($data['comuna_id'])) $datosEmpresa->comuna_id = $data['comuna_id'];
            $datosEmpresa->save();

            DB::commit();

            return response()->json([
                'usuario' => $usuario,
                'datos_empresa' => $datosEmpresa->load('comuna.region'),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Error al actualizar la empresa',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

