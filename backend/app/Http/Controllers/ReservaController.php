<?php

namespace App\Http\Controllers;

use App\Models\Reserva;
use App\Models\Repartidor;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

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

        $query = Reserva::with(['usuario', 'locker.ubicacion', 'repartidor.usuario'])
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

        if ($logistica = trim((string) $request->query('logistica_estado', ''))) {
            $query->where('logistica_estado', $logistica);
        }

        if ($email = trim((string) $request->query('email', ''))) {
            $query->whereHas('usuario', function ($usuarioQuery) use ($email) {
                $like = "%{$email}%";
                $usuarioQuery->where('email', 'like', $like);
            });
        }

        if ($fechaDesde = trim((string) $request->query('fecha_desde', ''))) {
            $query->where('created_at', '>=', $fechaDesde);
        }

        $items = $query->paginate($perPage);

        return response()->json($items);
    }

    public function index()
    {
        return Reserva::with(['usuario','locker.ubicacion','repartidor.usuario'])->paginate(20);
    }

    public function createForCompany(Request $request)
    {
        $user = $request->user();

        if (!$user || $user->rol !== 'empresa') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'usuario_id'   => ['required', 'integer', 'exists:usuarios,id'],
            'locker_id'    => ['required', 'integer', 'exists:lockers,id'],
            'fecha_reserva'=> ['required', 'date'],
            'hora_inicio'  => ['required', 'date_format:H:i'],
            'hora_fin'     => ['nullable', 'date_format:H:i', 'after:hora_inicio'],
            'tipo_acceso'  => ['nullable', Rule::in(['qr','codigo_temporal'])],
        ]);

        $payload = array_merge($data, [
            'empresa_id' => $user->id,
            'estado' => 'pendiente',
            'logistica_estado' => 'pendiente_repartidor',
            'tipo_acceso' => $data['tipo_acceso'] ?? 'codigo_temporal',
            'codigo_acceso' => null,
        ]);

        $reserva = DB::transaction(function () use ($payload) {
            $reserva = Reserva::create($payload);
            $this->asignarRepartidorDisponible($reserva);
            return $reserva->load(['usuario','locker.ubicacion','repartidor.usuario']);
        });

        return response()->json($reserva, 201);
    }

    public function repartidorAssignments(Request $request)
    {
        $user = $request->user();
        if (!$user || $user->rol !== 'repartidor') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $repartidor = Repartidor::with('usuario')->where('usuario_id', $user->id)->first();
        if (!$repartidor) {
            return response()->json(['message' => 'Repartidor no registrado'], 404);
        }

        $perPage = (int) $request->query('per_page', 5);
        $perPage = max(1, min(50, $perPage));

        $query = Reserva::with(['usuario','locker.ubicacion','repartidor.usuario'])
            ->where('repartidor_id', $repartidor->id)
            ->orderByDesc('created_at');

        if ($estado = $request->query('estado')) {
            $query->where('estado', $estado);
        }

        if ($logistica = $request->query('logistica_estado')) {
            $query->where('logistica_estado', $logistica);
        } else {
            $query->whereIn('logistica_estado', ['pendiente_repartidor','asignado','en_camino']);
        }

        $items = $query->paginate($perPage);

        return response()->json([
            'repartidor' => $repartidor,
            'reservas' => $items->items(),
            'pagination' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    public function show(Reserva $reserva)
    {
        return $reserva->load(['usuario','locker.ubicacion','repartidor.usuario']);
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
            'logistica_estado' => ['sometimes','string','max:40'],
            'repartidor_id' => ['sometimes','nullable','integer','exists:repartidores,id'],
        ]);

        $data['logistica_estado'] = $data['logistica_estado'] ?? 'pendiente_repartidor';

        $reserva = Reserva::create($data);

        if (empty($data['repartidor_id'])) {
            $this->asignarRepartidorDisponible($reserva);
        }

        return response()->json($reserva->load(['usuario','locker.ubicacion','repartidor.usuario']), 201);
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

        return $reserva->load(['usuario','locker.ubicacion','repartidor.usuario']);
    }

    public function marcarEnRuta(Request $request, Reserva $reserva)
    {
        $user = $request->user();
        if (!$user || $user->rol !== 'repartidor') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $repartidor = Repartidor::where('usuario_id', $user->id)->first();
        if (!$repartidor || $reserva->repartidor_id !== $repartidor->id) {
            return response()->json(['message' => 'Acceso denegado a la reserva'], 403);
        }

        if ($reserva->estado !== 'pendiente') {
            return response()->json(['message' => 'La reserva no puede actualizarse'], 422);
        }

        if (!in_array($reserva->logistica_estado, ['asignado', 'pendiente_repartidor'], true)) {
            return response()->json(['message' => 'La reserva ya fue marcada en ruta o finalizada'], 422);
        }

        $reserva->logistica_estado = 'en_camino';
        $reserva->save();

        return response()->json($reserva->load(['usuario','locker.ubicacion','repartidor.usuario']));
    }

    public function marcarEntregado(Request $request, Reserva $reserva)
    {
        $user = $request->user();
        if (!$user || $user->rol !== 'repartidor') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $repartidor = Repartidor::where('usuario_id', $user->id)->first();
        if (!$repartidor || $reserva->repartidor_id !== $repartidor->id) {
            return response()->json(['message' => 'Acceso denegado a la reserva'], 403);
        }

        if ($reserva->estado === 'completado') {
            return response()->json(['message' => 'La reserva ya fue finalizada'], 422);
        }

        if (!in_array($reserva->logistica_estado, ['en_camino', 'asignado'], true)) {
            return response()->json(['message' => 'La reserva no está en un estado válido para marcar como entregada'], 422);
        }

        $reserva = DB::transaction(function () use ($reserva) {
            $reserva->logistica_estado = 'completado';
            $reserva->save();

            $this->liberarRepartidor($reserva);

            return $reserva->load(['usuario','locker.ubicacion','repartidor.usuario']);
        });

        return response()->json([
            'message' => 'Reserva marcada como entregada',
            'reserva' => $reserva,
        ]);
    }

    public function destroy(Reserva $reserva)
    {
        $this->liberarRepartidor($reserva);

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

        // Obtener la ubicación del dispositivo autenticado
        $ubicacionDevice = $request->user();
        if (!$ubicacionDevice) {
            return response()->json(['message' => 'No autorizado'], 401);
        }

        $hash = hash('sha256', $data['code']);

        $reserva = Reserva::with(['locker.ubicacion','repartidor.usuario'])
            ->where('tipo_acceso', 'codigo_temporal')
            ->where('codigo_acceso', $hash)
            ->first();

        if (!$reserva) {
            return response()->json(['message' => 'Código no reconocido'], 422);
        }

        // Validar que el locker pertenece a la ubicación del dispositivo
        if (!$reserva->locker || $reserva->locker->ubicacion_id !== $ubicacionDevice->id) {
            return response()->json(['message' => 'Código no reconocido'], 422);
        }

        [, , $isValidWindow] = $this->calcularEstadoCodigoTemporal($reserva);
        if (!$isValidWindow) {
            return response()->json(['message' => 'Código no reconocido'], 422);
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
            'repartidor' => $reserva->repartidor?->usuario?->only(['id','nombre','apellido','email']),
            'logistica_estado' => $reserva->logistica_estado,
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
        $reserva->logistica_estado = 'completado';
        $reserva->save();

        $this->liberarRepartidor($reserva);

        Cache::forget('reserva_code_'.$reserva->id);

        return $reserva->load(['locker.ubicacion','repartidor.usuario']);
    }

    private function asignarRepartidorDisponible(Reserva $reserva): void
    {
        if ($reserva->repartidor_id) {
            return;
        }

        $repartidor = Repartidor::where('disponible', true)->inRandomOrder()->first();
        if (!$repartidor) {
            return;
        }

        $reserva->repartidor()->associate($repartidor);
        $reserva->logistica_estado = 'asignado';
        $reserva->save();

        $repartidor->update(['disponible' => false]);
    }

    private function liberarRepartidor(Reserva $reserva): void
    {
        if ($reserva->repartidor_id) {
            Repartidor::where('id', $reserva->repartidor_id)->update(['disponible' => true]);
        }
    }
}
