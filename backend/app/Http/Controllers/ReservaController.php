<?php

namespace App\Http\Controllers;

use App\Models\Reserva;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Cache;

class ReservaController extends Controller
{
    /**
     * Devuelve todas las reservas pendientes del usuario autenticado
     */
    public function myLatest(Request $request)
    {
        $user = $request->user();

        $items = Reserva::with(['locker.ubicacion'])
            ->where('usuario_id', $user->id)
            ->where('estado', 'pendiente')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($items);
    }

    /**
     * Devuelve todas las reservas del usuario autenticado
     */
    public function myHistory(Request $request)
    {
        $user = $request->user();
        $perPage = (int) $request->query('per_page', 5);
        $perPage = max(1, min(50, $perPage));

        $items = Reserva::with(['locker.ubicacion'])
            ->where('usuario_id', $user->id)
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json($items);
    }

    /**
     * Devuelve las reservas asociadas a la empresa autenticada con filtros y paginacion
     */
    public function companyLatest(Request $request)
    {
        $user = $request->user();

        if (!$user || $user->rol !== 'empresa') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $perPage = (int) $request->query('per_page', 5);
        $perPage = max(1, min(50, $perPage));

        $query = Reserva::with(['usuario', 'locker.ubicacion'])
            ->where('empresa_id', $user->id)
            ->orderByDesc('created_at');

        if ($estado = $request->query('estado')) {
            $query->where('estado', $estado);
        }

        if ($ubicacion = trim((string) $request->query('ubicacion', ''))) {
            $query->whereHas('locker.ubicacion', function ($ubicacionQuery) use ($ubicacion) {
                $ubicacionQuery->where('nombre', 'like', "%{$ubicacion}%");
            });
        }

        if ($email = trim((string) $request->query('email', ''))) {
            $query->whereHas('usuario', function ($usuarioQuery) use ($email) {
                $like = "%{$email}%";
                $usuarioQuery->where('email', 'like', $like);
            });
        }

        $items = $query->paginate($perPage);

        return response()->json($items);
    }

    public function index()
    {
        return Reserva::with(['usuario','locker.ubicacion'])->paginate(20);
    }

    public function show(Reserva $reserva)
    {
        return $reserva->load(['usuario','locker.ubicacion']);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'usuario_id'   => ['required','integer','exists:usuarios,id'],
            'empresa_id'   => ['nullable','integer','exists:usuarios,id'],
            'locker_id'    => ['required','integer','exists:lockers,id'],
            'fecha_reserva'=> ['required','date'],
            'hora_inicio'  => ['required','date_format:H:i'],
            'hora_fin'     => ['required','date_format:H:i','after:hora_inicio'],
            'estado'       => ['required', Rule::in(['pendiente','completado','anulado'])],
            'tipo_acceso'  => ['required', Rule::in(['qr','codigo_temporal'])],
            'codigo_acceso'=> ['nullable','string','max:120'],
        ]);

        $reserva = Reserva::create($data);

        return response()->json($reserva->load(['usuario','locker']), 201);
    }

    public function update(Request $request, Reserva $reserva)
    {
        $data = $request->validate([
            'usuario_id'   => ['sometimes','integer','exists:usuarios,id'],
            'empresa_id'   => ['sometimes','nullable','integer','exists:usuarios,id'],
            'locker_id'    => ['sometimes','integer','exists:lockers,id'],
            'fecha_reserva'=> ['sometimes','date'],
            'hora_inicio'  => ['sometimes','date_format:H:i'],
            'hora_fin'     => ['sometimes','date_format:H:i','after:hora_inicio'],
            'estado'       => ['sometimes', Rule::in(['pendiente','completado','anulado'])],
            'tipo_acceso'  => ['sometimes', Rule::in(['qr','codigo_temporal'])],
            'codigo_acceso'=> ['sometimes','nullable','string','max:120'],
        ]);

        $reserva->update($data);

        return $reserva->load(['usuario','locker']);
    }

    public function destroy(Reserva $reserva)
    {
        $reserva->delete();
        return response()->noContent();
    }

    /**
     * Genera un código temporal de 6 dígitos para la reserva indicada.
     * El código se guarda como SHA-256 en `codigo_acceso` y expira a los 5 minutos
     * (se toma como referencia el `updated_at` de la reserva).
     */
    public function generarCodigoTemporal(Request $request, Reserva $reserva)
    {
        $user = $request->user();

        if (!$user || $reserva->usuario_id !== $user->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        // Generar un código numérico de 6 dígitos
        $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Guardar hash y tipo de acceso
        $reserva->update([
            'tipo_acceso'   => 'codigo_temporal',
            'codigo_acceso' => hash('sha256', $code),
        ]);

        $expiresAt = now()->addMinutes(5);
        Cache::put('reserva_code_'.$reserva->id, $code, $expiresAt);

        return response()->json([
            'code' => $code,
            'expires_at' => $expiresAt->toISOString(),
            'valid_for_seconds' => 5 * 60,
        ]);
    }

    /**
     * Estado del código temporal (existe y sigue vigente?).
     */
    public function estadoCodigoTemporal(Request $request, Reserva $reserva)
    {
        $user = $request->user();
        if (!$user || $reserva->usuario_id !== $user->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        [$has, $expiresAt, $isValid] = $this->calcularEstadoCodigoTemporal($reserva);
        $code = $isValid ? Cache::get('reserva_code_'.$reserva->id) : null;

        return response()->json([
            'has_code' => $has,
            'is_valid' => $isValid,
            'expires_at' => $expiresAt?->toISOString(),
            'code' => $code,
        ]);
    }

    /**
     * Verifica el código ingresado por el usuario y, si es válido, marca la reserva como completada.
     */
    public function verificarCodigoTemporal(Request $request, Reserva $reserva)
    {
        $data = $request->validate([
            'code' => ['required','regex:/^\d{6}$/'],
        ]);

        $user = $request->user();
        if (!$user || $reserva->usuario_id !== $user->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        [$has, $expiresAt, $isValidWindow] = $this->calcularEstadoCodigoTemporal($reserva);
        if (!$has || !$isValidWindow) {
            return response()->json(['message' => 'Código vencido o no generado'], 422);
        }

        $hash = hash('sha256', $data['code']);
        if (!hash_equals($reserva->codigo_acceso ?? '', $hash)) {
            return response()->json(['message' => 'Código inválido'], 422);
        }

        $reserva = $this->finalizarReserva($reserva);

        return response()->json([
            'message' => 'Reserva completada',
            'reserva' => $reserva,
        ]);
    }

    public function totemVerificarCodigo(Request $request)
    {
        $data = $request->validate([
            'code' => ['required','regex:/^\d{6}$/'],
        ]);

        $hash = hash('sha256', $data['code']);

        $reserva = Reserva::with(['locker.ubicacion'])
            ->where('tipo_acceso', 'codigo_temporal')
            ->where('codigo_acceso', $hash)
            ->first();

        if (!$reserva) {
            return response()->json(['message' => 'Código inválido o expirado'], 422);
        }

        [, , $isValidWindow] = $this->calcularEstadoCodigoTemporal($reserva);
        if (!$isValidWindow) {
            return response()->json(['message' => 'Código inválido o expirado'], 422);
        }

        $reserva = $this->finalizarReserva($reserva);

        return response()->json([
            'message' => 'Reserva completada',
            'reserva_id' => $reserva->id,
            'locker' => [
                'id' => $reserva->locker?->id,
                'numero' => $reserva->locker->numero ?? null,
                'ubicacion' => $reserva->locker->ubicacion?->nombre ?? null,
            ],
            'completado_en' => now()->toISOString(),
        ]);
    }

    /**
     * DEV-ONLY: Genera/regenera el código sin requerir autenticación.
     * Solo disponible cuando APP_ENV=local. Útil para pruebas con Postman.
     */
    public function devGenerarCodigoTemporal(Request $request, Reserva $reserva)
    {
        if (!app()->environment('local')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $reserva->update([
            'tipo_acceso'   => 'codigo_temporal',
            'codigo_acceso' => hash('sha256', $code),
        ]);

        $expiresAt = now()->addMinutes(5);
        Cache::put('reserva_code_'.$reserva->id, $code, $expiresAt);

        return response()->json([
            'code' => $code,
            'expires_at' => $expiresAt->toISOString(),
            'valid_for_seconds' => 5 * 60,
        ]);
    }

    private function calcularEstadoCodigoTemporal(Reserva $reserva): array
    {
        $has = !empty($reserva->codigo_acceso) && $reserva->tipo_acceso === 'codigo_temporal';
        $expiresAt = $reserva->updated_at?->copy()->addMinutes(5);
        $isValid = $has && $expiresAt && now()->lt($expiresAt);

        return [$has, $expiresAt, $isValid];
    }

    private function finalizarReserva(Reserva $reserva): Reserva
    {
        $reserva->estado = 'completado';
        $reserva->hora_fin = now();
        $reserva->codigo_acceso = null;
        $reserva->save();

        Cache::forget('reserva_code_'.$reserva->id);

        return $reserva->load(['locker.ubicacion']);
    }
}
