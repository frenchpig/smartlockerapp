<?php

namespace App\Http\Controllers;

use App\Models\Repartidor;
use App\Models\Usuario;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class EmpresaRepartidorController extends Controller
{
    /**
     * Lista de repartidores asociados a la empresa autenticada.
     */
    public function index(Request $request)
    {
        $empresa = $request->user();

        if (!$empresa || $empresa->rol !== 'empresa') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $perPage = (int) $request->query('per_page', 20);
        $perPage = max(1, min(200, $perPage));

        $search = trim((string) $request->query('search', ''));

        $query = Repartidor::with('usuario')
            ->where('empresa_id', $empresa->id);

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('rut', 'like', "%{$search}%")
                    ->orWhereHas('usuario', function ($usuarioQuery) use ($search) {
                        $usuarioQuery->where(function ($inner) use ($search) {
                            $inner->where('nombre', 'like', "%{$search}%")
                                ->orWhere('apellido', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                        });
                    });
            });
        }

        return $query
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    /**
     * Crea un nuevo repartidor asociado a la empresa autenticada.
     */
    public function store(Request $request)
    {
        $empresa = $request->user();

        if (!$empresa || $empresa->rol !== 'empresa') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:255'],
            'apellido' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:usuarios,email'],
            'contrasena' => ['required', 'string', 'min:6'],
            'telefono' => ['nullable', 'regex:/^569\d{8}$/'],
            'rut' => ['required', 'string', 'max:20', 'unique:repartidores,rut', 'regex:/^\d{7,8}[0-9Kk]$/'],
            'disponible' => ['nullable', 'boolean'],
        ]);

        $data['rut'] = $this->normalizeRut($data['rut']);
        $data['telefono'] = $this->normalizeTelefono($data['telefono'] ?? null);

        $repartidor = DB::transaction(function () use ($empresa, $data) {
            $usuario = Usuario::create([
                'nombre' => $data['nombre'],
                'apellido' => $data['apellido'] ?? null,
                'email' => $data['email'],
                'contrasena' => $data['contrasena'],
                'telefono' => $data['telefono'],
                'rol' => 'repartidor',
            ]);

            return Repartidor::create([
                'usuario_id' => $usuario->id,
                'empresa_id' => $empresa->id,
                'rut' => $data['rut'],
                'disponible' => $data['disponible'] ?? true,
            ])->load('usuario');
        });

        return response()->json($repartidor, 201);
    }

    /**
     * Actualiza los datos del repartidor asociado a la empresa autenticada.
     */
    public function update(Request $request, Repartidor $repartidor)
    {
        $empresa = $request->user();

        if (!$empresa || $empresa->rol !== 'empresa') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if ($repartidor->empresa_id !== $empresa->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'nombre' => ['sometimes', 'string', 'max:255'],
            'apellido' => ['sometimes', 'nullable', 'string', 'max:255'],
            'email' => [
                'sometimes',
                'email',
                'max:255',
                Rule::unique('usuarios', 'email')->ignore($repartidor->usuario_id),
            ],
            'contrasena' => ['sometimes', 'string', 'min:6'],
            'telefono' => ['sometimes', 'nullable', 'regex:/^569\d{8}$/'],
            'rut' => [
                'sometimes',
                'required',
                'string',
                'max:20',
                'regex:/^\d{7,8}[0-9Kk]$/',
                Rule::unique('repartidores', 'rut')->ignore($repartidor->id),
            ],
            'disponible' => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('rut', $data)) {
            $data['rut'] = $this->normalizeRut((string) $data['rut']);
        }

        $repartidorActualizado = DB::transaction(function () use ($repartidor, $data) {
            $usuario = $repartidor->usuario;

            if (isset($data['nombre'])) {
                $usuario->nombre = $data['nombre'];
            }
            if (array_key_exists('apellido', $data)) {
                $usuario->apellido = $data['apellido'];
            }
            if (isset($data['email'])) {
                $usuario->email = $data['email'];
            }
            if (isset($data['contrasena'])) {
                $usuario->contrasena = $data['contrasena'];
            }
            if (array_key_exists('telefono', $data)) {
                $usuario->telefono = $this->normalizeTelefono($data['telefono'] ?? null);
            }

            if ($usuario->isDirty()) {
                $usuario->save();
            }

            if (array_key_exists('disponible', $data)) {
                $repartidor->disponible = (bool) $data['disponible'];
            }

            if (array_key_exists('rut', $data)) {
                $repartidor->rut = $data['rut'];
            }

            if ($repartidor->isDirty()) {
                $repartidor->save();
            }

            return $repartidor->fresh('usuario');
        });

        return response()->json($repartidorActualizado);
    }

    /**
     * Elimina un repartidor de la empresa autenticada.
     */
    public function destroy(Request $request, Repartidor $repartidor)
    {
        $empresa = $request->user();

        if (!$empresa || $empresa->rol !== 'empresa') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if ($repartidor->empresa_id !== $empresa->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $tieneReservasPendientes = $repartidor->reservas()
            ->where('estado', 'pendiente')
            ->whereIn('logistica_estado', ['pendiente_repartidor', 'asignado', 'en_camino'])
            ->exists();

        if ($tieneReservasPendientes) {
            return response()->json([
                'message' => 'No se puede eliminar el repartidor porque tiene pedidos pendientes.',
            ], 422);
        }

        DB::transaction(function () use ($repartidor) {
            $usuario = $repartidor->usuario;
            $repartidor->delete();

            if ($usuario) {
                $usuario->delete();
            }
        });

        return response()->noContent();
    }

    private function normalizeRut(string $rut): string
    {
        $clean = strtoupper(preg_replace('/[^0-9Kk]/', '', $rut) ?? '');
        return $clean;
    }

    private function normalizeTelefono(?string $telefono): ?string
    {
        if ($telefono === null) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $telefono) ?? '';

        if ($digits === '') {
            return null;
        }

        if (str_starts_with($digits, '569') && strlen($digits) === 11) {
            return $digits;
        }

        if (strlen($digits) === 8) {
            return '569' . $digits;
        }

        return null;
    }
}

