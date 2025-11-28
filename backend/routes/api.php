<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DeviceAuthController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UsuarioController;
use App\Http\Controllers\LockerController;
use App\Http\Controllers\ReservaController;
use App\Http\Controllers\NotificacionController;
use App\Http\Controllers\MantenimientoController;
use App\Http\Controllers\IncidenciaController;
use App\Http\Controllers\HistorialEnvioController;
use App\Http\Controllers\TarifaController;
use App\Http\Controllers\UbicacionController;
use App\Http\Controllers\EmpresaRepartidorController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\ProductoEmpresaController;
use App\Http\Controllers\TecnicoController;

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']); // Registro público
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::patch('/profile', [AuthController::class, 'updateProfile']);
        Route::post('/change-password', [AuthController::class, 'changePassword']);
    });
});

// Rutas protegidas adicionales
Route::middleware('auth:sanctum')->group(function () {
    // Ultimas 10 reservas del usuario autenticado
    Route::get('/reservas/mis-ultimas', [ReservaController::class, 'myLatest']);
    Route::get('/reservas/mis-historicas', [ReservaController::class, 'myHistory']);
    Route::get('/reservas/empresa/mis-ultimas', [ReservaController::class, 'companyLatest']);
    Route::post('/reservas/empresa/solicitudes', [ReservaController::class, 'createForCompany']);
    Route::get('/reservas/repartidor/mis', [ReservaController::class, 'repartidorMisReservas']);
    Route::get('/repartidor/mis-ubicaciones', [ReservaController::class, 'repartidorMisUbicaciones']);
    Route::get('/ubicaciones/tamanos-disponibles', [ReservaController::class, 'tamanosDisponiblesUbicacion']);
    Route::post('/reservas/repartidor/marcar-en-ruta-masivo', [ReservaController::class, 'repartidorMarcarEnRutaMasivo']);
    Route::post('/reservas/repartidor/marcar-entregado-masivo', [ReservaController::class, 'repartidorMarcarEntregadoMasivo']);
    Route::post('/reservas/{reserva}/asignar-repartidor', [ReservaController::class, 'asignarRepartidor']);
    Route::post('/reservas/{reserva}/en-ruta', [ReservaController::class, 'marcarEnRuta']);
    Route::post('/reservas/{reserva}/entregar', [ReservaController::class, 'marcarEntregado']);
    Route::post('/reservas/{reserva}/cancelar-entrega', [ReservaController::class, 'cancelarEntrega']);
    Route::post('/reservas/{reserva}/cancelar', [ReservaController::class, 'cancelarReserva']);
    Route::post('/reservas/marcar-en-ruta-masivo', [ReservaController::class, 'marcarEnRutaMasivo']);
    Route::post('/reservas/marcar-entregado-masivo', [ReservaController::class, 'marcarEntregadoMasivo']);
    // Generar codigo temporal de 6 digitos para una reserva
    Route::post('/reservas/{reserva}/codigo-temporal', [ReservaController::class, 'generarCodigoTemporal']);
    // Estado de codigo temporal
    Route::get('/reservas/{reserva}/codigo-temporal/estado', [ReservaController::class, 'estadoCodigoTemporal']);
    // Verificar codigo temporal y completar reserva
    Route::post('/reservas/{reserva}/codigo-temporal/verificar', [ReservaController::class, 'verificarCodigoTemporal']);

    // Repartidores de empresa
    Route::get('/empresa/repartidores', [EmpresaRepartidorController::class, 'index']);
    Route::post('/empresa/repartidores', [EmpresaRepartidorController::class, 'store']);
    Route::get('/empresa/repartidores/{repartidor}/pedidos', [EmpresaRepartidorController::class, 'pedidosRepartidor']);
    Route::put('/empresa/repartidores/{repartidor}', [EmpresaRepartidorController::class, 'update']);
    Route::patch('/empresa/repartidores/{repartidor}', [EmpresaRepartidorController::class, 'update']);
    Route::delete('/empresa/repartidores/{repartidor}', [EmpresaRepartidorController::class, 'destroy']);
});

// DEV-ONLY (sin auth): generar/regenerar codigo temporal para pruebas locales
Route::post('/dev/reservas/{reserva}/codigo-temporal', [ReservaController::class, 'devGenerarCodigoTemporal']);

// Device authentication routes (no auth middleware)
Route::prefix('device')->group(function () {
    Route::post('/auth/login', [DeviceAuthController::class, 'login']);
});

// Totem routes - now require device authentication
Route::prefix('totem')->middleware('auth.device')->group(function () {
    Route::post('/codigo-temporal/verificar', [ReservaController::class, 'totemVerificarCodigo']);
    Route::get('/me', [DeviceAuthController::class, 'me']);
    Route::post('/logout', [DeviceAuthController::class, 'logout']);
});

// Ruta específica para activar/desactivar usuarios (debe estar antes de apiResources)
Route::middleware('auth:sanctum')->group(function () {
    Route::patch('/usuarios/{usuario}/habilitado', [UsuarioController::class, 'toggleHabilitado']);
    Route::put('/usuarios/{usuario}/habilitado', [UsuarioController::class, 'toggleHabilitado']);
});

Route::apiResources([
    'usuarios'          => UsuarioController::class,
    'lockers'           => LockerController::class,
    'ubicaciones'       => UbicacionController::class,
    'reservas'          => ReservaController::class,
    'notificaciones'    => NotificacionController::class,
    'mantenimientos'    => MantenimientoController::class,
    'historial-envios'  => HistorialEnvioController::class,
    'tarifas'           => TarifaController::class,
]);

// Rutas de incidencias protegidas
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('incidencias', IncidenciaController::class);
    Route::get('/incidencias/empresa/mis-incidencias', [IncidenciaController::class, 'empresaIncidencias']);
    Route::post('/incidencias/{incidencia}/derivar-tecnico', [IncidenciaController::class, 'derivarATecnico']);
    
    // Dashboard del administrador
    Route::get('/admin/dashboard', [AdminController::class, 'dashboard']);
    
    // Rutas para técnicos (CRUD)
    Route::apiResource('tecnicos', TecnicoController::class);
    
    // Rutas para técnicos autenticados
    Route::prefix('tecnico')->group(function () {
        // Mantenciones del técnico autenticado
        // IMPORTANTE: Las rutas más específicas deben ir ANTES de las rutas con parámetros
        Route::get('/mantenciones/historicas', [MantenimientoController::class, 'mantencionesHistoricas']);
        Route::get('/mantenciones', [MantenimientoController::class, 'misMantenciones']);
        Route::get('/mantenciones/{mantenimiento}', [MantenimientoController::class, 'showMantenimiento']);
        Route::patch('/incidencias/{incidencia}/marcar-disponible', [IncidenciaController::class, 'marcarDisponibleParaCerrar']);
    });
});

// Rutas para empresas
Route::prefix('empresas')->group(function () {
    Route::get('/regiones', [App\Http\Controllers\EmpresaController::class, 'getRegiones']);
    Route::get('/regiones/{regionId}/comunas', [App\Http\Controllers\EmpresaController::class, 'getComunasPorRegion']);
    Route::post('/', [App\Http\Controllers\EmpresaController::class, 'store']);
    Route::put('/{usuario}', [App\Http\Controllers\EmpresaController::class, 'update']);
    Route::get('/{usuario}/historial', [App\Http\Controllers\EmpresaController::class, 'historial']);
});

// Rutas para empresas autenticadas (selección de ubicaciones y tarifas)
Route::middleware('auth:sanctum')->prefix('empresa')->group(function () {
    Route::get('/mis-ubicaciones', [App\Http\Controllers\EmpresaController::class, 'misUbicaciones']);
    Route::post('/seleccionar-ubicaciones', [App\Http\Controllers\EmpresaController::class, 'seleccionarUbicaciones']);
    Route::get('/ubicaciones-disponibles', [App\Http\Controllers\EmpresaController::class, 'ubicacionesDisponibles']);
    Route::get('/plan-actual', [App\Http\Controllers\EmpresaController::class, 'planActual']);
    Route::post('/cambiar-tarifa', [App\Http\Controllers\EmpresaController::class, 'cambiarTarifa']);
    
    // Productos de empresa
    Route::apiResource('productos', ProductoEmpresaController::class);
});

// Ruta adicional para historial de lockers con paginación
Route::get('/lockers/{locker}/historial', [LockerController::class, 'historial']);

Route::get('/ping', fn() => response()->json(['ok' => true, 'time' => now()]));
