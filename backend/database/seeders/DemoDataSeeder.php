<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Usuario;
use App\Models\Locker;
use App\Models\Ubicacion;
use App\Models\Reserva;
use App\Models\Repartidor;
use App\Models\ArticuloReserva;
use App\Models\Mantenimiento;
use App\Models\HistorialLocker;
use App\Models\DatosEmpresa;
use App\Models\Comuna;
use App\Models\Region;
use App\Models\Tarifa;
use App\Services\HistorialLockerService;
use App\Services\HistorialEmpresaService;
use Carbon\Carbon;

class DemoDataSeeder extends Seeder
{
    /**
     * Seeder para datos de demostración
     * 
     * Crea por empresa:
     * - 7 pedidos recientes (últimos 7 días) - aparecen en home y pedidos
     * - 18 pedidos antiguos (hace 8-25 días) - SOLO aparecen en pedidos, NO en home
     * Total: 25 pedidos por empresa
     */
    public function run(): void
    {
        // Tarifas
        $tarifas = [
            [
                'nombre_publico' => 'Smart Basic',
                'codigo_interno' => 'smart-basic',
                'precio_mensual' => 29000,
                'estado' => 'Activo',
                'descripcion_corta' => 'Recomendado para empresas pequeñas',
                'sedes_permitidas' => 2,
                'lockers_por_sede' => 10,
                'prioridad_soporte' => 'Normal',
                'incluye' => [
                    'Hasta 2 sedes',
                    'Soporte en horario laboral',
                    'Reportes básicos',
                ],
                'no_incluye' => [
                    'Sedes extra',
                    'Repostes avanzados',
                ],
            ],
            [
                'nombre_publico' => 'Smart Pro',
                'codigo_interno' => 'smart-pro',
                'precio_mensual' => 49000,
                'estado' => 'Activo',
                'descripcion_corta' => 'Para sedes dentro del metro',
                'sedes_permitidas' => 6,
                'lockers_por_sede' => 20,
                'prioridad_soporte' => 'Prioritario',
                'incluye' => [
                    'Hasta 6 sedes',
                    'Reportes avanzados',
                    'Prioridad en soporte',
                ],
                'no_incluye' => [
                    'Sedes ilimitadas',
                ],
            ],
            [
                'nombre_publico' => 'Smart Max',
                'codigo_interno' => 'smart-max',
                'precio_mensual' => 69000,
                'estado' => 'Inactivo',
                'descripcion_corta' => 'Cobertura completa',
                'sedes_permitidas' => 0,
                'lockers_por_sede' => 0,
                'prioridad_soporte' => 'Prioritario',
                'incluye' => [
                    'Sedes ilimitadas',
                    'Integraciones externas',
                    'Reportes diarios',
                    'Soporte extendido',
                ],
                'no_incluye' => [],
            ],
        ];

        foreach ($tarifas as $attributes) {
            Tarifa::query()->updateOrCreate(
                ['codigo_interno' => $attributes['codigo_interno']],
                $attributes
            );
        }

        // Usuarios
        $u1 = Usuario::create([
            'nombre' => 'Ema',
            'apellido' => 'Garcia',
            'email' => 'ema@example.com',
            'contrasena' => '123456', // se encripta por mutator SHA-256
            'telefono' => '56911111111',
            'rol' => 'usuario',
        ]);

        $u2 = Usuario::create([
            'nombre' => 'Juan',
            'apellido' => 'Perez',
            'email' => 'juan@example.com',
            'contrasena' => '123456',
            'telefono' => '56922222222',
            'rol' => 'usuario',
        ]);

        $empresa1 = Usuario::create([
            'nombre' => 'Locker',
            'apellido' => 'Solutions',
            'email' => 'empresa@example.com',
            'contrasena' => '123456',
            'telefono' => '56923334444',
            'rol' => 'empresa',
        ]);

        $empresa2 = Usuario::create([
            'nombre' => 'Smart',
            'apellido' => 'Logistics',
            'email' => 'empresa2@example.com',
            'contrasena' => '123456',
            'telefono' => '56925556666',
            'rol' => 'empresa',
        ]);

        // Crear datos_empresa para las empresas existentes
        // Asegurar que existan regiones y comunas (crear si no existen)
        $regionRM = Region::firstOrCreate(
            ['nombre' => 'Región Metropolitana de Santiago'],
            ['nombre' => 'Región Metropolitana de Santiago']
        );
        
        $comunaSantiago = Comuna::firstOrCreate(
            ['nombre' => 'Santiago', 'region_id' => $regionRM->id],
            ['nombre' => 'Santiago', 'region_id' => $regionRM->id]
        );
        
        // Datos empresa 1: Locker Solutions
        $datosEmpresa1 = DatosEmpresa::create([
            'usuario_id' => $empresa1->id,
            'nombre' => 'Locker Solutions S.A.',
            'razon_social' => 'Locker Solutions Sociedad Anónima',
            'rut' => '761234567', // Solo números
            'direccion' => 'Av. Providencia 1234, Oficina 501',
            'comuna_id' => $comunaSantiago->id,
        ]);

        // Registrar creación de cuenta en historial
        HistorialEmpresaService::registrarCreacionCuenta($empresa1->id, $datosEmpresa1->nombre);

        // Datos empresa 2: Smart Logistics (con RUT que termina en K como ejemplo)
        $datosEmpresa2 = DatosEmpresa::create([
            'usuario_id' => $empresa2->id,
            'nombre' => 'Smart Logistics SpA',
            'razon_social' => 'Smart Logistics SpA',
            'rut' => '77234567K', // Dígito verificador K
            'direccion' => 'Av. Las Condes 5678, Piso 12',
            'comuna_id' => $comunaSantiago->id,
        ]);

        // Registrar creación de cuenta en historial
        HistorialEmpresaService::registrarCreacionCuenta($empresa2->id, $datosEmpresa2->nombre);

        $repUser1 = Usuario::create([
            'nombre' => 'Laura',
            'apellido' => 'Campos',
            'email' => 'repartidor1@example.com',
            'contrasena' => '123456',
            'telefono' => '56928889999',
            'rol' => 'repartidor',
        ]);

        $repUser2 = Usuario::create([
            'nombre' => 'Pedro',
            'apellido' => 'Saez',
            'email' => 'repartidor2@example.com',
            'contrasena' => '123456',
            'telefono' => '56927778888',
            'rol' => 'repartidor',
        ]);

        $admin = Usuario::create([
            'nombre' => 'Admin',
            'apellido' => 'Sistema',
            'email' => 'admin@example.com',
            'contrasena' => '123456',
            'telefono' => '56930000000',
            'rol' => 'administrador',
        ]);

        $tecnico1 = Usuario::create([
            'nombre' => 'Carlos',
            'apellido' => 'Mendez',
            'email' => 'tecnico1@example.com',
            'contrasena' => '123456',
            'telefono' => '56931111111',
            'rol' => 'tecnico',
        ]);

        $tecnico2 = Usuario::create([
            'nombre' => 'Ana',
            'apellido' => 'Rodriguez',
            'email' => 'tecnico2@example.com',
            'contrasena' => '123456',
            'telefono' => '56932222222',
            'rol' => 'tecnico',
        ]);

        $tecnicos = [$tecnico1, $tecnico2];

        $repartidores = [
            Repartidor::create([
                'usuario_id' => $repUser1->id,
                'empresa_id' => $empresa1->id,
                'rut' => '111111111',
            ]),
            Repartidor::create([
                'usuario_id' => $repUser2->id,
                'empresa_id' => $empresa2->id,
                'rut' => '22222222K',
            ]),
        ];

        $metroNunoa = Ubicacion::create([
            'nombre' => 'Metro Nunoa',
            'latitud' => -33.456,
            'longitud' => -70.648,
            'device_username' => 'totem-nunoa',
            'device_password' => '123456', // se encripta por mutator SHA-256
        ]);

        $metroNuble = Ubicacion::create([
            'nombre' => 'Metro Nuble',
            'latitud' => -33.476,
            'longitud' => -70.628,
            'device_username' => 'totem-nuble',
            'device_password' => '123456', // se encripta por mutator SHA-256
        ]);

        $now = Carbon::now();
        
        // Crear lockers con fechas retroactivas (antes de las reservas)
        // Los lockers deben existir antes de las reservas para que tenga sentido cronológicamente
        $fechaCreacionLockers = $now->copy()->subDays(30); // 30 días antes del presente
        
        $l1 = new Locker([
            'numero' => 1,
            'ubicacion_id' => $metroNunoa->id,
            'estado' => 'activo',
            'tamano' => 'M',
        ]);
        $l1->created_at = $fechaCreacionLockers;
        $l1->updated_at = $fechaCreacionLockers;
        $l1->save();

        $l2 = new Locker([
            'numero' => 2,
            'ubicacion_id' => $metroNunoa->id,
            'estado' => 'activo',
            'tamano' => 'L',
        ]);
        $l2->created_at = $fechaCreacionLockers;
        $l2->updated_at = $fechaCreacionLockers;
        $l2->save();

        $l3 = new Locker([
            'numero' => 1,
            'ubicacion_id' => $metroNuble->id,
            'estado' => 'activo',
            'tamano' => 'S',
        ]);
        $l3->created_at = $fechaCreacionLockers;
        $l3->updated_at = $fechaCreacionLockers;
        $l3->save();

        // Crear historial de creación de lockers inmediatamente después de crearlos
        $lockers = [$l1, $l2, $l3];
        foreach ($lockers as $locker) {
            HistorialLockerService::registrarCreacion(
                $locker->id,
                $locker->numero,
                $locker->ubicacion->nombre,
                $admin->id,
                $locker->created_at->format('Y-m-d H:i:s')
            );
        }

        $usuariosEmpresas = [
            ['usuario' => $u1, 'empresa' => $empresa1],
            ['usuario' => $u2, 'empresa' => $empresa2],
        ];

        $estadoSecuencia = ['pendiente', 'completado', 'anulado'];

        // Artículos de ejemplo para los pedidos
        $articulosDisponibles = [
            ['nombre' => 'Zapatos deportivos', 'descripcion' => 'Zapatillas running Nike', 'sku' => 'NIKE-001', 'peso' => 0.5],
            ['nombre' => 'Chaqueta impermeable', 'descripcion' => 'Chaqueta North Face talla M', 'sku' => 'NF-JAC-M', 'peso' => 0.8],
            ['nombre' => 'Libro "Desarrollo Web"', 'descripcion' => 'Manual de programación', 'sku' => 'BOOK-DEV-001', 'peso' => 0.6],
            ['nombre' => 'Auriculares inalámbricos', 'descripcion' => 'Auriculares Bluetooth Sony', 'sku' => 'SONY-BT-100', 'peso' => 0.2],
            ['nombre' => 'Mochila', 'descripcion' => 'Mochila 30L impermeable', 'sku' => 'BAG-30L', 'peso' => 0.9],
            ['nombre' => 'Tablet', 'descripcion' => 'Tablet Samsung 10 pulgadas', 'sku' => 'SAMSUNG-TAB-10', 'peso' => 0.5],
            ['nombre' => 'Reloj inteligente', 'descripcion' => 'Smartwatch Garmin', 'sku' => 'GARMIN-SW-200', 'peso' => 0.1],
            ['nombre' => 'Camiseta', 'descripcion' => 'Camiseta deportiva Adidas', 'sku' => 'ADIDAS-TS-M', 'peso' => 0.2],
            ['nombre' => 'Pantalón', 'descripcion' => 'Pantalón jeans talla 32', 'sku' => 'JEANS-32', 'peso' => 0.5],
            ['nombre' => 'Gorra', 'descripcion' => 'Gorra de béisbol', 'sku' => 'CAP-001', 'peso' => 0.1],
        ];

        foreach ($usuariosEmpresas as $pair) {
            $usuario = $pair['usuario'];
            $empresa = $pair['empresa'];

            // Crear 7 pedidos recientes (últimos 7 días - aparecerán en home)
            for ($i = 0; $i < 7; $i++) {
                $diasAtras = $i + 1; // De 1 a 7 días atrás
                $fechaReserva = $now->copy()->subDays($diasAtras);
                $horaInicio = $fechaReserva->copy()->addHours(rand(9, 18)); // Hora aleatoria del día

                $estado = $estadoSecuencia[$i % count($estadoSecuencia)];

                $horaFin = null;
                if ($estado === 'completado') {
                    $horaFin = $horaInicio->copy()->addHours(1);
                } elseif ($estado === 'anulado') {
                    $horaFin = $horaInicio->copy()->addMinutes(45);
                }

                $locker = $lockers[$i % count($lockers)];
                $repartidor = $repartidores[$i % count($repartidores)];

                $reserva = new Reserva([
                    'usuario_id' => $usuario->id,
                    'empresa_id' => $empresa->id,
                    'locker_id' => $locker->id,
                    'repartidor_id' => $repartidor->id,
                    'fecha_reserva' => $fechaReserva,
                    'hora_inicio' => $horaInicio,
                    'hora_fin' => $horaFin,
                    'estado' => $estado,
                    'logistica_estado' => $estado === 'completado' ? 'completado' : 'asignado',
                    'tipo_acceso' => $i % 2 === 0 ? 'codigo_temporal' : 'qr',
                    'codigo_acceso' => null,
                ]);
                
                // Forzar los timestamps para que coincidan con la fecha retroactiva
                $reserva->created_at = $fechaReserva;
                $reserva->updated_at = $fechaReserva;
                $reserva->save();

                // Agregar artículos a cada reserva (1 a 3 artículos aleatorios)
                $numArticulos = rand(1, 3);
                $articulosSeleccionados = array_rand($articulosDisponibles, $numArticulos);
                if (!is_array($articulosSeleccionados)) {
                    $articulosSeleccionados = [$articulosSeleccionados];
                }
                
                foreach ($articulosSeleccionados as $index) {
                    $articulo = $articulosDisponibles[$index];
                    ArticuloReserva::create([
                        'reserva_id' => $reserva->id,
                        'nombre' => $articulo['nombre'],
                        'cantidad' => rand(1, 3),
                        'descripcion' => $articulo['descripcion'],
                        'sku' => $articulo['sku'],
                        'peso' => $articulo['peso'],
                    ]);
                }

                // Registrar historial de locker y empresa si corresponde
                if ($estado === 'pendiente') {
                    HistorialLockerService::registrarReservaCreada(
                        $locker->id,
                        $reserva->id,
                        $empresa->id
                    );

                    $lockerUbicacion = $locker->ubicacion->nombre ?? null;
                    HistorialEmpresaService::registrarReservaCreada(
                        $empresa->id,
                        $reserva->id,
                        $lockerUbicacion
                    );
                }

                if ($estado !== 'completado') {
                    $repartidor->update(['disponible' => false]);
                }
            }

            // Crear 18 pedidos antiguos (hace más de 7 días - no aparecerán en home pero sí en pedidos)
            for ($i = 0; $i < 18; $i++) {
                $diasAtras = 8 + $i; // De 8 a 25 días atrás
                $fechaReserva = $now->copy()->subDays($diasAtras);
                $horaInicio = $fechaReserva->copy()->addHours(rand(9, 18));

                $estado = $estadoSecuencia[($i + 1) % count($estadoSecuencia)];

                $horaFin = null;
                if ($estado === 'completado') {
                    $horaFin = $horaInicio->copy()->addHours(2);
                } elseif ($estado === 'anulado') {
                    $horaFin = $horaInicio->copy()->addMinutes(30);
                }

                $locker = $lockers[$i % count($lockers)];
                $repartidor = $repartidores[$i % count($repartidores)];

                $reserva = new Reserva([
                    'usuario_id' => $usuario->id,
                    'empresa_id' => $empresa->id,
                    'locker_id' => $locker->id,
                    'repartidor_id' => $repartidor->id,
                    'fecha_reserva' => $fechaReserva,
                    'hora_inicio' => $horaInicio,
                    'hora_fin' => $horaFin,
                    'estado' => $estado,
                    'logistica_estado' => 'completado', // Los antiguos están completados
                    'tipo_acceso' => $i % 2 === 0 ? 'qr' : 'codigo_temporal',
                    'codigo_acceso' => null,
                ]);
                
                // Forzar los timestamps para que coincidan con la fecha retroactiva
                $reserva->created_at = $fechaReserva;
                $reserva->updated_at = $fechaReserva;
                $reserva->save();

                // Agregar artículos a cada reserva antigua también
                $numArticulos = rand(1, 4);
                $articulosSeleccionados = array_rand($articulosDisponibles, $numArticulos);
                if (!is_array($articulosSeleccionados)) {
                    $articulosSeleccionados = [$articulosSeleccionados];
                }
                
                foreach ($articulosSeleccionados as $index) {
                    $articulo = $articulosDisponibles[$index];
                    ArticuloReserva::create([
                        'reserva_id' => $reserva->id,
                        'nombre' => $articulo['nombre'],
                        'cantidad' => rand(1, 2),
                        'descripcion' => $articulo['descripcion'],
                        'sku' => $articulo['sku'],
                        'peso' => $articulo['peso'],
                    ]);
                }

                // Registrar historial de empresa para reservas antiguas también
                if ($estado === 'completado') {
                    HistorialEmpresaService::registrarReservaCompletada(
                        $empresa->id,
                        $reserva->id
                    );
                }
            }
        }

        Repartidor::query()->update(['disponible' => true]);

        // Crear historiales de reservas y mantenimientos para los lockers
        // (Los historiales de creación ya se crearon cuando se crearon los lockers)
        $lockers = Locker::all();
        foreach ($lockers as $locker) {
            // Crear historiales de reservas para los lockers (en orden cronológico)
            $reservasLocker = Reserva::where('locker_id', $locker->id)
                ->orderBy('created_at', 'asc')
                ->get();

            foreach ($reservasLocker as $reserva) {
                $reserva->load('usuario');
                $usuarioNombre = $reserva->usuario ? trim($reserva->usuario->nombre . ' ' . $reserva->usuario->apellido) : 'Usuario';
                
                if ($reserva->estado === 'pendiente') {
                    HistorialLockerService::registrarReservaCreada(
                        $locker->id,
                        $reserva->id,
                        $reserva->empresa_id ?? $reserva->usuario_id,
                        $reserva->created_at->format('Y-m-d H:i:s')
                    );
                } elseif ($reserva->estado === 'completado') {
                    // Asegurar que TODAS las reservas completadas tengan historial de retiro
                    HistorialLockerService::registrarReservaCompletada(
                        $locker->id,
                        $reserva->id,
                        $locker->numero,
                        $usuarioNombre,
                        'ocupado',
                        'activo',
                        $reserva->usuario_id,
                        ($reserva->hora_fin ?? $reserva->updated_at)->format('Y-m-d H:i:s')
                    );
                } elseif ($reserva->estado === 'anulado') {
                    HistorialLockerService::registrarReservaAnulada(
                        $locker->id,
                        $reserva->id,
                        $reserva->empresa_id ?? $reserva->usuario_id,
                        $reserva->updated_at->format('Y-m-d H:i:s')
                    );
                }
            }

            // Crear mantenimiento programado para TODOS los lockers (después de las reservas)
            $tecnico = $tecnicos[array_rand($tecnicos)];
            $fechaProgramada = $now->copy()->addDays(rand(7, 30));
            $fechaMantenimientoProgramado = $now->copy()->subDays(rand(1, 5)); // Fecha en el pasado
            
            $mantenimiento = Mantenimiento::create([
                'locker_id' => $locker->id,
                'usuario_id' => $tecnico->id,
                'fecha_programada' => $fechaProgramada,
                'descripcion' => 'Mantenimiento preventivo programado',
                'estado' => 'programado',
                'created_at' => $fechaMantenimientoProgramado,
                'updated_at' => $fechaMantenimientoProgramado,
            ]);

            // Historial de mantenimiento programado (con fecha retroactiva)
            HistorialLockerService::registrarMantenimientoProgramado(
                $locker->id,
                $mantenimiento->id,
                $fechaProgramada->format('Y-m-d'),
                $admin->id,
                $fechaMantenimientoProgramado->format('Y-m-d H:i:s')
            );
        }

        // Actualizar estados de lockers según reservas pendientes
        $lockers = Locker::all();
        foreach ($lockers as $locker) {
            $tieneReservasPendientes = Reserva::where('locker_id', $locker->id)
                ->where('estado', 'pendiente')
                ->exists();

            if ($tieneReservasPendientes && $locker->estado !== 'bloqueado' && $locker->estado !== 'mantenimiento') {
                $locker->estado = 'ocupado';
                $locker->save();
            } elseif (!$tieneReservasPendientes && $locker->estado !== 'bloqueado' && $locker->estado !== 'mantenimiento') {
                $locker->estado = 'activo';
                $locker->save();
            }
        }
    }
}
