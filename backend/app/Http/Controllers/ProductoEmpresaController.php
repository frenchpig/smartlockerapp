<?php

namespace App\Http\Controllers;

use App\Models\ProductoEmpresa;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProductoEmpresaController extends Controller
{
    /**
     * Listar productos de la empresa autenticada
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if (!$user || $user->rol !== 'empresa') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $perPage = (int) $request->query('per_page', 20);
        $perPage = max(1, min(100, $perPage));

        $query = ProductoEmpresa::where('empresa_id', $user->id);

        // Filtro por activo
        if ($request->has('activo')) {
            $activo = filter_var($request->query('activo'), FILTER_VALIDATE_BOOLEAN);
            $query->where('activo', $activo);
        }

        // Búsqueda por nombre o SKU
        if ($busqueda = trim((string) $request->query('busqueda', ''))) {
            $query->where(function ($q) use ($busqueda) {
                $q->where('nombre', 'like', "%{$busqueda}%")
                  ->orWhere('sku', 'like', "%{$busqueda}%")
                  ->orWhere('descripcion', 'like', "%{$busqueda}%");
            });
        }

        $query->orderByDesc('created_at');

        return $query->paginate($perPage);
    }

    /**
     * Crear un nuevo producto
     */
    public function store(Request $request)
    {
        $user = $request->user();

        if (!$user || $user->rol !== 'empresa') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:255'],
            'descripcion' => ['nullable', 'string', 'max:1000'],
            'sku' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('productos_empresa', 'sku')->where(function ($query) use ($user) {
                    return $query->where('empresa_id', $user->id);
                }),
            ],
            'peso' => ['nullable', 'numeric', 'min:0', 'max:9999.99'],
            'activo' => ['sometimes', 'boolean'],
        ]);

        $producto = ProductoEmpresa::create([
            'empresa_id' => $user->id,
            'nombre' => $data['nombre'],
            'descripcion' => $data['descripcion'] ?? null,
            'sku' => $data['sku'] ?? null,
            'peso' => $data['peso'] ?? null,
            'activo' => $data['activo'] ?? true,
        ]);

        return response()->json($producto, 201);
    }

    /**
     * Mostrar un producto específico
     */
    public function show(Request $request, ProductoEmpresa $producto)
    {
        $user = $request->user();

        if (!$user || $user->rol !== 'empresa') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        // Verificar que el producto pertenece a la empresa
        if ($producto->empresa_id !== $user->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        return response()->json($producto);
    }

    /**
     * Actualizar un producto
     */
    public function update(Request $request, ProductoEmpresa $producto)
    {
        $user = $request->user();

        if (!$user || $user->rol !== 'empresa') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        // Verificar que el producto pertenece a la empresa
        if ($producto->empresa_id !== $user->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'nombre' => ['sometimes', 'string', 'max:255'],
            'descripcion' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'sku' => [
                'sometimes',
                'nullable',
                'string',
                'max:100',
                Rule::unique('productos_empresa', 'sku')
                    ->where(function ($query) use ($user) {
                        return $query->where('empresa_id', $user->id);
                    })
                    ->ignore($producto->id),
            ],
            'peso' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999.99'],
            'activo' => ['sometimes', 'boolean'],
        ]);

        $producto->update($data);

        return response()->json($producto);
    }

    /**
     * Eliminar un producto
     */
    public function destroy(Request $request, ProductoEmpresa $producto)
    {
        $user = $request->user();

        if (!$user || $user->rol !== 'empresa') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        // Verificar que el producto pertenece a la empresa
        if ($producto->empresa_id !== $user->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $producto->delete();

        return response()->noContent();
    }
}

