<?php

namespace App\Http\Controllers;

use App\Models\Locker;
use App\Models\Reserva;
use App\Models\Usuario;
use App\Models\Incidencia;
use App\Models\Mantenimiento;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    /**
     * Obtener estadísticas del dashboard para el administrador
     */
    public function dashboard(Request $request)
    {
        $user = $request->user();

        if (!$user || $user->rol !== 'administrador') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        // Estadísticas de lockers
        $lockersTotales = Locker::count();
        $lockersActivos = Locker::where('estado', 'activo')->count();
        
        // Lockers ocupados (con reserva pendiente)
        $lockersOcupados = Locker::whereHas('reservas', function ($query) {
            $query->where('estado', 'pendiente');
        })->count();

        // Lockers en revisión (con incidencia pendiente de tipo locker)
        $lockersRevision = Locker::whereHas('incidencias', function ($query) {
            $query->where('tipo', 'locker')
                  ->where('estado', 'pendiente');
        })->count();

        // Estadísticas de empresas
        $empresasTotales = Usuario::where('rol', 'empresa')->where('habilitado', true)->count();
        $empresasActivas = Usuario::where('rol', 'empresa')
            ->where('habilitado', true)
            ->whereHas('reservas', function ($query) {
                $query->where('created_at', '>=', now()->subDays(30));
            })
            ->count();

        // Estadísticas de usuarios
        $usuariosTotales = Usuario::where('rol', 'usuario')->where('habilitado', true)->count();
        $usuariosActivos = Usuario::where('rol', 'usuario')
            ->where('habilitado', true)
            ->whereHas('reservas', function ($query) {
                $query->where('created_at', '>=', now()->subDays(30));
            })
            ->count();

        // Estadísticas de reservas
        $reservasTotales = Reserva::count();
        $reservasPendientes = Reserva::where('estado', 'pendiente')->count();
        $reservasCompletadas = Reserva::where('estado', 'completado')->count();
        $reservasHoy = Reserva::whereDate('created_at', today())->count();
        $reservasEstaSemana = Reserva::where('created_at', '>=', now()->startOfWeek())->count();
        $reservasEsteMes = Reserva::where('created_at', '>=', now()->startOfMonth())->count();

        // Estadísticas de incidencias
        $incidenciasTotales = Incidencia::count();
        $incidenciasPendientes = Incidencia::where('estado', 'pendiente')->count();
        $incidenciasResueltas = Incidencia::where('estado', 'resuelto')->count();
        $incidenciasLockers = Incidencia::where('tipo', 'locker')->count();
        $incidenciasPedidos = Incidencia::where('tipo', 'pedido')->count();

        // Incidencias recientes (últimas 5 pendientes)
        $incidenciasRecientes = Incidencia::with(['locker.ubicacion', 'usuario', 'reserva.empresa'])
            ->where('estado', 'pendiente')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(function ($incidencia) {
                return [
                    'id' => $incidencia->id,
                    'tipo' => $incidencia->tipo,
                    'problema_tipo' => $incidencia->problema_tipo,
                    'descripcion' => $incidencia->descripcion,
                    'estado' => $incidencia->estado,
                    'fecha' => $incidencia->created_at->toISOString(),
                    'locker' => $incidencia->locker ? [
                        'id' => $incidencia->locker->id,
                        'numero' => $incidencia->locker->numero,
                        'ubicacion' => $incidencia->locker->ubicacion->nombre ?? null,
                    ] : null,
                    'usuario' => $incidencia->usuario ? [
                        'id' => $incidencia->usuario->id,
                        'nombre' => $incidencia->usuario->nombre,
                        'email' => $incidencia->usuario->email,
                    ] : null,
                    'empresa' => $incidencia->reserva && $incidencia->reserva->empresa ? [
                        'id' => $incidencia->reserva->empresa->id,
                        'nombre' => $incidencia->reserva->empresa->nombre,
                    ] : null,
                ];
            });

        // Empresas activas (últimas 5 con más reservas recientes)
        $empresasActivasList = Usuario::where('rol', 'empresa')
            ->where('habilitado', true)
            ->withCount(['reservas' => function ($query) {
                $query->where('created_at', '>=', now()->subDays(30));
            }])
            ->orderByDesc('reservas_count')
            ->limit(5)
            ->get()
            ->map(function ($empresa) {
                return [
                    'id' => $empresa->id,
                    'nombre' => $empresa->nombre,
                    'email' => $empresa->email,
                    'reservas_recientes' => $empresa->reservas_count,
                ];
            });

        // Estadísticas de mantenimientos
        $mantenimientosPendientes = Mantenimiento::where('estado', '!=', 'completado')
            ->orWhereNull('estado')
            ->count();

        // Reservas recientes (últimas 5)
        $reservasRecientes = Reserva::with(['usuario', 'locker.ubicacion', 'empresa'])
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(function ($reserva) {
                return [
                    'id' => $reserva->id,
                    'estado' => $reserva->estado,
                    'logistica_estado' => $reserva->logistica_estado,
                    'fecha' => $reserva->created_at->toISOString(),
                    'usuario' => $reserva->usuario ? [
                        'id' => $reserva->usuario->id,
                        'nombre' => $reserva->usuario->nombre,
                        'email' => $reserva->usuario->email,
                    ] : null,
                    'locker' => $reserva->locker ? [
                        'id' => $reserva->locker->id,
                        'numero' => $reserva->locker->numero,
                        'ubicacion' => $reserva->locker->ubicacion->nombre ?? null,
                    ] : null,
                    'empresa' => $reserva->empresa ? [
                        'id' => $reserva->empresa->id,
                        'nombre' => $reserva->empresa->nombre,
                    ] : null,
                ];
            });

        return response()->json([
            'lockers' => [
                'totales' => $lockersTotales,
                'activos' => $lockersActivos,
                'ocupados' => $lockersOcupados,
                'en_revision' => $lockersRevision,
            ],
            'empresas' => [
                'totales' => $empresasTotales,
                'activas' => $empresasActivas,
            ],
            'usuarios' => [
                'totales' => $usuariosTotales,
                'activos' => $usuariosActivos,
            ],
            'reservas' => [
                'totales' => $reservasTotales,
                'pendientes' => $reservasPendientes,
                'completadas' => $reservasCompletadas,
                'hoy' => $reservasHoy,
                'esta_semana' => $reservasEstaSemana,
                'este_mes' => $reservasEsteMes,
            ],
            'incidencias' => [
                'totales' => $incidenciasTotales,
                'pendientes' => $incidenciasPendientes,
                'resueltas' => $incidenciasResueltas,
                'lockers' => $incidenciasLockers,
                'pedidos' => $incidenciasPedidos,
            ],
            'mantenimientos' => [
                'pendientes' => $mantenimientosPendientes,
            ],
            'incidencias_recientes' => $incidenciasRecientes,
            'empresas_activas' => $empresasActivasList,
            'reservas_recientes' => $reservasRecientes,
        ]);
    }
}

