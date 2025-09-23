<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UsuarioController;
use App\Http\Controllers\LockerController;
use App\Http\Controllers\ReservaController;
use App\Http\Controllers\NotificacionController;
use App\Http\Controllers\MantenimientoController;
use App\Http\Controllers\IncidenciaController;
use App\Http\Controllers\HistorialEnvioController;

Route::apiResources([
    'usuarios'          => UsuarioController::class,
    'lockers'           => LockerController::class,
    'reservas'          => ReservaController::class,
    'notificaciones'    => NotificacionController::class,
    'mantenimientos'    => MantenimientoController::class,
    'incidencias'       => IncidenciaController::class,
    'historial-envios'  => HistorialEnvioController::class,
]);
