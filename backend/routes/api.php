<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UsuarioController;
use App\Http\Controllers\LockerController;
use App\Http\Controllers\ReservaController;
use App\Http\Controllers\NotificacionController;
use App\Http\Controllers\MantenimientoController;
use App\Http\Controllers\IncidenciaController;
use App\Http\Controllers\HistorialEnvioController;

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

// Rutas protegidas adicionales
Route::middleware('auth:sanctum')->group(function () {
    // Ultimas 10 reservas del usuario autenticado
    Route::get('/reservas/mis-ultimas', [ReservaController::class, 'myLatest']);
    Route::get('/reservas/empresa/mis-ultimas', [ReservaController::class, 'companyLatest']);
    // Generar codigo temporal de 6 digitos para una reserva
    Route::post('/reservas/{reserva}/codigo-temporal', [ReservaController::class, 'generarCodigoTemporal']);
    // Estado de codigo temporal
    Route::get('/reservas/{reserva}/codigo-temporal/estado', [ReservaController::class, 'estadoCodigoTemporal']);
    // Verificar codigo temporal y completar reserva
    Route::post('/reservas/{reserva}/codigo-temporal/verificar', [ReservaController::class, 'verificarCodigoTemporal']);
});

// DEV-ONLY (sin auth): generar/regenerar codigo temporal para pruebas locales
Route::post('/dev/reservas/{reserva}/codigo-temporal', [ReservaController::class, 'devGenerarCodigoTemporal']);
Route::post('/totem/codigo-temporal/verificar', [ReservaController::class, 'totemVerificarCodigo']);

Route::apiResources([
    'usuarios'          => UsuarioController::class,
    'lockers'           => LockerController::class,
    'reservas'          => ReservaController::class,
    'notificaciones'    => NotificacionController::class,
    'mantenimientos'    => MantenimientoController::class,
    'incidencias'       => IncidenciaController::class,
    'historial-envios'  => HistorialEnvioController::class,
]);

Route::get('/ping', fn() => response()->json(['ok' => true, 'time' => now()]));
