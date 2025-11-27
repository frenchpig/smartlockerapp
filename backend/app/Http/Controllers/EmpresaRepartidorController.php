<?php

namespace App\Http\Controllers;

use App\Models\Repartidor;
use App\Models\Reserva;
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

        $query = Repartidor::where('empresa_id', $empresa->id);

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('rut', 'like', "%{$search}%")
                    ->orWhere('nombre', 'like', "%{$search}%")
                    ->orWhere('apellido', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        return $query
            ->with('usuario')
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
            'nombre' => ['required', 'string', 'max:100'],
            'apellido' => ['required', 'string', 'max:100'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('repartidores', 'email')->where('empresa_id', $empresa->id),
            ],
            'telefono' => ['nullable', 'string', 'max:20'],
            'rut' => ['required', 'string', 'max:20', 'regex:/^\d{7,8}[0-9Kk]$/'],
            'disponible' => ['nullable', 'boolean'],
        ]);

        $data['rut'] = $this->normalizeRut($data['rut']);
        $data['telefono'] = $this->normalizeTelefono($data['telefono'] ?? null);

        // Verificar que el email no exista en usuarios
        $usuarioExistente = Usuario::where('email', $data['email'])->first();
        if ($usuarioExistente) {
            return response()->json([
                'message' => 'El email ya está registrado como usuario del sistema.',
            ], 422);
        }

        // Crear usuario para el repartidor
        $usuarioRepartidor = Usuario::create([
            'nombre' => $data['nombre'],
            'apellido' => $data['apellido'],
            'email' => $data['email'],
            'telefono' => $data['telefono'],
            'contrasena' => '123456', // Contraseña por defecto, el repartidor puede cambiarla
            'rol' => 'repartidor',
            'habilitado' => true,
        ]);

        // Crear repartidor vinculado al usuario
        $repartidor = Repartidor::create([
            'usuario_id' => $usuarioRepartidor->id,
            'empresa_id' => $empresa->id,
            'nombre' => $data['nombre'],
            'apellido' => $data['apellido'],
            'email' => $data['email'],
            'telefono' => $data['telefono'],
            'rut' => $data['rut'],
            'disponible' => $data['disponible'] ?? true,
        ]);

        return response()->json($repartidor->load('usuario'), 201);
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
            'nombre' => ['sometimes', 'string', 'max:100'],
            'apellido' => ['sometimes', 'string', 'max:100'],
            'email' => [
                'sometimes',
                'email',
                'max:255',
                Rule::unique('repartidores', 'email')
                    ->where('empresa_id', $empresa->id)
                    ->ignore($repartidor->id),
            ],
            'telefono' => ['sometimes', 'nullable', 'string', 'max:20'],
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

        if (array_key_exists('telefono', $data)) {
            $data['telefono'] = $this->normalizeTelefono($data['telefono'] ?? null);
        }

        // Si hay cambios en datos que también están en el usuario, actualizar ambos
        if ($repartidor->usuario) {
            $actualizacionesUsuario = [];
            if (array_key_exists('nombre', $data)) {
                $actualizacionesUsuario['nombre'] = $data['nombre'];
            }
            if (array_key_exists('apellido', $data)) {
                $actualizacionesUsuario['apellido'] = $data['apellido'];
            }
            if (array_key_exists('email', $data)) {
                // Verificar que el nuevo email no exista en otro usuario
                $usuarioExistente = Usuario::where('email', $data['email'])
                    ->where('id', '!=', $repartidor->usuario_id)
                    ->first();
                if ($usuarioExistente) {
                    return response()->json([
                        'message' => 'El email ya está registrado como usuario del sistema.',
                    ], 422);
                }
                $actualizacionesUsuario['email'] = $data['email'];
            }
            if (array_key_exists('telefono', $data)) {
                $actualizacionesUsuario['telefono'] = $data['telefono'];
            }
            
            if (!empty($actualizacionesUsuario)) {
                $repartidor->usuario->update($actualizacionesUsuario);
            }
        }

        $repartidor->update($data);

        return response()->json($repartidor->fresh()->load('usuario'));
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

        // Eliminar el usuario asociado (cascade delete debería manejarlo, pero por si acaso)
        $usuarioId = $repartidor->usuario_id;
        $repartidor->delete();
        
        // El usuario se eliminará automáticamente por cascadeOnDelete, pero por seguridad:
        if ($usuarioId) {
            Usuario::where('id', $usuarioId)->delete();
        }

        return response()->noContent();
    }

    /**
     * Obtener los pedidos asignados a un repartidor específico de la empresa
     */
    public function pedidosRepartidor(Request $request, Repartidor $repartidor)
    {
        $empresa = $request->user();

        if (!$empresa || $empresa->rol !== 'empresa') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if ($repartidor->empresa_id !== $empresa->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $perPage = (int) $request->query('per_page', 10);
        $perPage = max(1, min(100, $perPage));

        $estado = $request->query('estado');
        $logisticaEstado = $request->query('logistica_estado');

        $query = Reserva::with(['usuario', 'locker.ubicacion', 'articulos'])
            ->where('repartidor_id', $repartidor->id)
            ->where('empresa_id', $empresa->id)
            ->where('logistica_estado', '!=', 'completado') // Solo pedidos no entregados
            ->orderByDesc('created_at');

        if ($estado) {
            $query->where('estado', $estado);
        }

        if ($logisticaEstado) {
            // Si se especifica logistica_estado, aún así excluimos completados
            if ($logisticaEstado !== 'completado') {
                $query->where('logistica_estado', $logisticaEstado);
            } else {
                // Si específicamente piden completados, no retornar nada
                $query->whereRaw('1 = 0');
            }
        }

        $reservas = $query->paginate($perPage);

        return response()->json([
            'repartidor' => $repartidor,
            'reservas' => $reservas->items(),
            'pagination' => [
                'current_page' => $reservas->currentPage(),
                'last_page' => $reservas->lastPage(),
                'per_page' => $reservas->perPage(),
                'total' => $reservas->total(),
            ],
        ]);
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
