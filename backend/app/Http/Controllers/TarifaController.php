<?php

namespace App\Http\Controllers;

use App\Models\Tarifa;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TarifaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $tarifas = Tarifa::query()
            ->orderBy('prioridad_soporte')
            ->orderBy('precio_mensual')
            ->orderBy('nombre_publico')
            ->get();

        return response()->json($tarifas);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validateData($request);

        $tarifa = Tarifa::create($data);

        return response()->json($tarifa, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Tarifa $tarifa): JsonResponse
    {
        return response()->json($tarifa);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Tarifa $tarifa): JsonResponse
    {
        $data = $this->validateData($request, $tarifa->id, isPartial: true);

        $tarifa->fill($data);
        $tarifa->save();

        return response()->json($tarifa->refresh());
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Tarifa $tarifa): JsonResponse
    {
        $tarifa->delete();

        return response()->json(null, 204);
    }

    /**
     * Validate the incoming data for storing/updating tarifas.
     */
    private function validateData(Request $request, ?int $ignoreId = null, bool $isPartial = false): array
    {
        $uniqueCodigo = Rule::unique('tarifas', 'codigo_interno');
        if ($ignoreId !== null) {
            $uniqueCodigo->ignore($ignoreId);
        }

        $rules = [
            'nombre_publico' => [$isPartial ? 'sometimes' : 'required', 'string', 'max:255'],
            'codigo_interno' => [$isPartial ? 'sometimes' : 'required', 'string', 'max:255', $uniqueCodigo],
            'precio_mensual' => [$isPartial ? 'sometimes' : 'required', 'integer', 'min:0'],
            'estado' => [$isPartial ? 'sometimes' : 'required', Rule::in(['Activo', 'Inactivo'])],
            'descripcion_corta' => [$isPartial ? 'sometimes' : 'nullable', 'string', 'max:512'],
            'sedes_permitidas' => [$isPartial ? 'sometimes' : 'required', 'integer', 'min:0'],
            'lockers_por_sede' => [$isPartial ? 'sometimes' : 'required', 'integer', 'min:0'],
            'prioridad_soporte' => [$isPartial ? 'sometimes' : 'required', Rule::in(['Normal', 'Prioritario'])],
            'incluye' => [$isPartial ? 'sometimes' : 'nullable', 'array'],
            'incluye.*' => ['string', 'max:255'],
            'no_incluye' => [$isPartial ? 'sometimes' : 'nullable', 'array'],
            'no_incluye.*' => ['string', 'max:255'],
        ];

        $validated = $request->validate($rules);

        if (array_key_exists('incluye', $validated) && $validated['incluye'] === null) {
            $validated['incluye'] = [];
        }

        if (array_key_exists('no_incluye', $validated) && $validated['no_incluye'] === null) {
            $validated['no_incluye'] = [];
        }

        return $validated;
    }
}
