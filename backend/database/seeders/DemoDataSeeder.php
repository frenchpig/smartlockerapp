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
use App\Models\EmpresaUbicacion;
use App\Models\Incidencia;
use App\Models\ProductoEmpresa;
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

        $tarifasCreadas = [];
        foreach ($tarifas as $attributes) {
            $tarifa = Tarifa::query()->updateOrCreate(
                ['codigo_interno' => $attributes['codigo_interno']],
                $attributes
            );
            $tarifasCreadas[$attributes['codigo_interno']] = $tarifa;
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
        
        // Datos empresa 1: Locker Solutions (asignar tarifa Smart Pro)
        $datosEmpresa1 = DatosEmpresa::create([
            'usuario_id' => $empresa1->id,
            'nombre' => 'Locker Solutions S.A.',
            'razon_social' => 'Locker Solutions Sociedad Anónima',
            'rut' => '761234567', // Solo números
            'direccion' => 'Av. Providencia 1234, Oficina 501',
            'comuna_id' => $comunaSantiago->id,
            'tarifa_id' => $tarifasCreadas['smart-pro']->id,
        ]);

        // Registrar creación de cuenta en historial
        HistorialEmpresaService::registrarCreacionCuenta($empresa1->id, $datosEmpresa1->nombre);

        // Datos empresa 2: Smart Logistics (con RUT que termina en K como ejemplo, asignar tarifa Smart Basic)
        $datosEmpresa2 = DatosEmpresa::create([
            'usuario_id' => $empresa2->id,
            'nombre' => 'Smart Logistics SpA',
            'razon_social' => 'Smart Logistics SpA',
            'rut' => '77234567K', // Dígito verificador K
            'direccion' => 'Av. Las Condes 5678, Piso 12',
            'comuna_id' => $comunaSantiago->id,
            'tarifa_id' => $tarifasCreadas['smart-basic']->id,
        ]);

        // Registrar creación de cuenta en historial
        HistorialEmpresaService::registrarCreacionCuenta($empresa2->id, $datosEmpresa2->nombre);

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

        // Crear repartidores como usuarios autenticables
        $usuarioRepartidor1 = Usuario::create([
            'nombre' => 'Laura',
            'apellido' => 'Campos',
            'email' => 'laura.campos@empresa1.com',
            'contrasena' => '123456',
            'telefono' => '56928889999',
            'rol' => 'repartidor',
        ]);

        $usuarioRepartidor2 = Usuario::create([
            'nombre' => 'Pedro',
            'apellido' => 'Saez',
            'email' => 'pedro.saez@empresa2.com',
            'contrasena' => '123456',
            'telefono' => '56927778888',
            'rol' => 'repartidor',
        ]);

        $repartidores = [
            Repartidor::create([
                'usuario_id' => $usuarioRepartidor1->id,
                'empresa_id' => $empresa1->id,
                'nombre' => $usuarioRepartidor1->nombre,
                'apellido' => $usuarioRepartidor1->apellido,
                'email' => $usuarioRepartidor1->email,
                'telefono' => $usuarioRepartidor1->telefono,
                'rut' => '111111111',
                'disponible' => true,
            ]),
            Repartidor::create([
                'usuario_id' => $usuarioRepartidor2->id,
                'empresa_id' => $empresa2->id,
                'nombre' => $usuarioRepartidor2->nombre,
                'apellido' => $usuarioRepartidor2->apellido,
                'email' => $usuarioRepartidor2->email,
                'telefono' => $usuarioRepartidor2->telefono,
                'rut' => '22222222K',
                'disponible' => true,
            ]),
        ];

        // Crear múltiples ubicaciones para demostrar el funcionamiento de las tarifas
        $ubicaciones = [
            [
                'nombre' => 'Metro Nunoa',
                'latitud' => -33.456,
                'longitud' => -70.648,
                'device_username' => 'totem-nunoa',
            ],
            [
                'nombre' => 'Metro Nuble',
                'latitud' => -33.476,
                'longitud' => -70.628,
                'device_username' => 'totem-nuble',
            ],
            [
                'nombre' => 'Metro Los Leones',
                'latitud' => -33.418,
                'longitud' => -70.606,
                'device_username' => 'totem-los-leones',
            ],
            [
                'nombre' => 'Metro Tobalaba',
                'latitud' => -33.420,
                'longitud' => -70.600,
                'device_username' => 'totem-tobalaba',
            ],
            [
                'nombre' => 'Metro Baquedano',
                'latitud' => -33.432,
                'longitud' => -70.632,
                'device_username' => 'totem-baquedano',
            ],
            [
                'nombre' => 'Metro Universidad de Chile',
                'latitud' => -33.448,
                'longitud' => -70.664,
                'device_username' => 'totem-uchile',
            ],
            [
                'nombre' => 'Metro Estación Central',
                'latitud' => -33.451,
                'longitud' => -70.682,
                'device_username' => 'totem-estacion-central',
            ],
            [
                'nombre' => 'Metro La Moneda',
                'latitud' => -33.444,
                'longitud' => -70.650,
                'device_username' => 'totem-la-moneda',
            ],
        ];

        $ubicacionesCreadas = [];
        foreach ($ubicaciones as $ubicacionData) {
            $ubicacion = Ubicacion::create([
                'nombre' => $ubicacionData['nombre'],
                'latitud' => $ubicacionData['latitud'],
                'longitud' => $ubicacionData['longitud'],
                'device_username' => $ubicacionData['device_username'],
                'device_password' => '123456', // se encripta por mutator SHA-256
            ]);
            $ubicacionesCreadas[] = $ubicacion;
        }

        // Asignar ubicaciones a las empresas según su tarifa
        // Empresa 1 (Smart Pro): puede usar hasta 6 sedes, asignamos 5 para demostrar la diferencia
        // Empresa 2 (Smart Basic): puede usar hasta 2 sedes, asignamos 2 (su máximo)
        $empresa1Ubicaciones = array_slice($ubicacionesCreadas, 0, 5); // Primeras 5 ubicaciones
        $empresa2Ubicaciones = array_slice($ubicacionesCreadas, 0, 2); // Primeras 2 ubicaciones
        
        foreach ($empresa1Ubicaciones as $ubicacion) {
            EmpresaUbicacion::create([
                'empresa_id' => $empresa1->id,
                'ubicacion_id' => $ubicacion->id,
            ]);
        }
        
        foreach ($empresa2Ubicaciones as $ubicacion) {
            EmpresaUbicacion::create([
                'empresa_id' => $empresa2->id,
                'ubicacion_id' => $ubicacion->id,
            ]);
        }

        $now = Carbon::now();
        
        // Crear lockers con fechas retroactivas (antes de las reservas)
        // Los lockers deben existir antes de las reservas para que tenga sentido cronológicamente
        $fechaCreacionLockers = $now->copy()->subDays(30); // 30 días antes del presente
        
        // Crear lockers en todas las ubicaciones
        // Empresa 1 (Smart Pro): 20 lockers por sede (puede usar hasta 6 sedes)
        // Empresa 2 (Smart Basic): 10 lockers por sede (puede usar hasta 2 sedes)
        // Crear 25 lockers por ubicación para tener suficiente capacidad
        $lockers = [];
        $tamanos = ['S', 'M', 'L'];
        
        foreach ($ubicacionesCreadas as $ubicacion) {
            for ($i = 1; $i <= 25; $i++) {
                $tamano = $tamanos[($i - 1) % 3];
                $l = new Locker([
                    'numero' => $i,
                    'ubicacion_id' => $ubicacion->id,
                    'estado' => 'activo',
                    'tamano' => $tamano,
                ]);
                $l->created_at = $fechaCreacionLockers;
                $l->updated_at = $fechaCreacionLockers;
                $l->save();
                $lockers[] = $l;
            }
        }

        // Crear historial de creación de lockers inmediatamente después de crearlos
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

        // Plantillas de productos que se crearán para cada empresa
        $plantillasProductos = [
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
            
            // Crear productos en productos_empresa para esta empresa
            $productosEmpresa = [];
            foreach ($plantillasProductos as $plantilla) {
                // Agregar un prefijo único por empresa al SKU para evitar duplicados
                $skuUnico = $empresa->id . '-' . $plantilla['sku'];
                $producto = ProductoEmpresa::create([
                    'empresa_id' => $empresa->id,
                    'nombre' => $plantilla['nombre'],
                    'descripcion' => $plantilla['descripcion'],
                    'sku' => $skuUnico,
                    'peso' => $plantilla['peso'],
                    'activo' => true,
                ]);
                $productosEmpresa[] = $producto;
            }
            
            // Obtener tarifa de la empresa
            $datosEmpresa = DatosEmpresa::where('usuario_id', $empresa->id)->first();
            $tarifa = $datosEmpresa?->tarifa;
            
            // Obtener ubicaciones asignadas a la empresa
            $ubicacionesEmpresa = EmpresaUbicacion::where('empresa_id', $empresa->id)
                ->with('ubicacion')
                ->get();
            $ubicacionesIds = $ubicacionesEmpresa->pluck('ubicacion_id')->toArray();
            
            // Obtener lockers solo de las ubicaciones asignadas
            $lockersDisponibles = collect($lockers)->filter(function($locker) use ($ubicacionesIds) {
                return in_array($locker->ubicacion_id, $ubicacionesIds);
            })->values()->all();
            
            if (empty($lockersDisponibles)) {
                continue; // Si no hay lockers disponibles, saltar esta empresa
            }
            
            // Calcular límites según tarifa
            $maxLockersPorSede = $tarifa?->lockers_por_sede ?? 10;
            $maxSedes = $tarifa?->sedes_permitidas ?? 2;
            $maxLockersPendientes = $maxSedes * $maxLockersPorSede;
            
            // Contador de reservas pendientes por ubicación
            $reservasPendientesPorUbicacion = [];
            foreach ($ubicacionesIds as $ubicacionId) {
                $reservasPendientesPorUbicacion[$ubicacionId] = 0;
            }

            // Crear pedidos recientes (últimos 7 días - aparecerán en home)
            // Crear suficientes reservas para mostrar actividad, pero respetando límites
            // Calcular cuántas reservas pendientes podemos crear
            $maxReservasPendientes = min($maxLockersPendientes, count($lockersDisponibles));
            $numReservasRecientes = min(15, $maxReservasPendientes + 5); // Algunas completadas/anuladas
            
            for ($i = 0; $i < $numReservasRecientes; $i++) {
                $diasAtras = ($i % 7) + 1; // Distribuir en los últimos 7 días
                $fechaReserva = $now->copy()->subDays($diasAtras);
                $horaInicio = $fechaReserva->copy()->addHours(rand(9, 18)); // Hora aleatoria del día

                // Determinar estado: priorizar pendientes hasta alcanzar el límite
                $totalPendientes = array_sum($reservasPendientesPorUbicacion);
                if ($totalPendientes < $maxReservasPendientes && ($i % 3) !== 2) {
                    // Crear más pendientes si no hemos alcanzado el límite
                    $estado = 'pendiente';
                } else {
                    // Alternar entre completado y anulado
                    $estado = $estadoSecuencia[($i % 2) + 1]; // completado o anulado
                }

                $horaFin = null;
                if ($estado === 'completado') {
                    $horaFin = $horaInicio->copy()->addHours(1);
                } elseif ($estado === 'anulado') {
                    $horaFin = $horaInicio->copy()->addMinutes(45);
                }

                // Seleccionar locker de las ubicaciones asignadas
                // Si la reserva es pendiente, verificar límites
                $lockerSeleccionado = null;
                if ($estado === 'pendiente') {
                    // Buscar una ubicación que no haya alcanzado su límite
                    foreach ($ubicacionesIds as $ubicacionId) {
                        if ($reservasPendientesPorUbicacion[$ubicacionId] < $maxLockersPorSede) {
                            // Buscar un locker disponible en esta ubicación
                            $lockerEnUbicacion = collect($lockersDisponibles)
                                ->first(function($l) use ($ubicacionId) {
                                    return $l->ubicacion_id === $ubicacionId;
                                });
                            
                            if ($lockerEnUbicacion) {
                                $lockerSeleccionado = $lockerEnUbicacion;
                                $reservasPendientesPorUbicacion[$ubicacionId]++;
                                break;
                            }
                        }
                    }
                    
                    // Si no hay espacio para más reservas pendientes, hacerla completada
                    if (!$lockerSeleccionado) {
                        $estado = 'completado';
                        $horaFin = $horaInicio->copy()->addHours(1);
                    }
                }
                
                // Si no se seleccionó locker (reserva completada/anulada), usar uno aleatorio
                if (!$lockerSeleccionado) {
                    $lockerSeleccionado = $lockersDisponibles[array_rand($lockersDisponibles)];
                }
                
                $locker = $lockerSeleccionado;
                $repartidor = $repartidores[$i % count($repartidores)];

                // Determinar estado de logística según el estado de la reserva
                $logisticaEstado = 'asignado';
                if ($estado === 'completado') {
                    $logisticaEstado = 'completado';
                } elseif ($estado === 'pendiente') {
                    // Variar entre asignado y en_camino para pedidos pendientes
                    $logisticaEstado = ($i % 3 === 0) ? 'en_camino' : 'asignado';
                }

                $reserva = new Reserva([
                    'usuario_id' => $usuario->id,
                    'empresa_id' => $empresa->id,
                    'locker_id' => $locker->id,
                    'repartidor_id' => $repartidor->id,
                    'fecha_reserva' => $fechaReserva,
                    'hora_inicio' => $horaInicio,
                    'hora_fin' => $horaFin,
                    'estado' => $estado,
                    'logistica_estado' => $logisticaEstado,
                    'tipo_acceso' => $i % 2 === 0 ? 'codigo_temporal' : 'qr',
                    'codigo_acceso' => null,
                ]);
                
                // Forzar los timestamps para que coincidan con la fecha retroactiva
                $reserva->created_at = $fechaReserva;
                $reserva->updated_at = $fechaReserva;
                $reserva->save();

                // Agregar artículos a cada reserva (1 a 3 artículos aleatorios)
                // Usar productos de productos_empresa
                $numArticulos = rand(1, min(3, count($productosEmpresa)));
                $indicesSeleccionados = array_rand($productosEmpresa, $numArticulos);
                if (!is_array($indicesSeleccionados)) {
                    $indicesSeleccionados = [$indicesSeleccionados];
                }
                
                foreach ($indicesSeleccionados as $indice) {
                    $producto = $productosEmpresa[$indice];
                    ArticuloReserva::create([
                        'reserva_id' => $reserva->id,
                        'nombre' => $producto->nombre,
                        'cantidad' => rand(1, 3),
                        'descripcion' => $producto->descripcion,
                        'sku' => $producto->sku,
                        'peso' => $producto->peso,
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
            // Estos pueden ser completados o anulados, no afectan los límites de pendientes
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

                // Para reservas antiguas, usar cualquier locker de las ubicaciones asignadas
                $locker = $lockersDisponibles[array_rand($lockersDisponibles)];
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
                    'logistica_estado' => $estado === 'completado' ? 'completado' : ($estado === 'anulado' ? 'asignado' : 'completado'),
                    'tipo_acceso' => $i % 2 === 0 ? 'qr' : 'codigo_temporal',
                    'codigo_acceso' => null,
                ]);
                
                // Forzar los timestamps para que coincidan con la fecha retroactiva
                $reserva->created_at = $fechaReserva;
                $reserva->updated_at = $fechaReserva;
                $reserva->save();

                // Agregar artículos a cada reserva antigua también
                // Usar productos de productos_empresa
                $numArticulos = rand(1, min(4, count($productosEmpresa)));
                $indicesSeleccionados = array_rand($productosEmpresa, $numArticulos);
                if (!is_array($indicesSeleccionados)) {
                    $indicesSeleccionados = [$indicesSeleccionados];
                }
                
                foreach ($indicesSeleccionados as $indice) {
                    $producto = $productosEmpresa[$indice];
                    ArticuloReserva::create([
                        'reserva_id' => $reserva->id,
                        'nombre' => $producto->nombre,
                        'cantidad' => rand(1, 2),
                        'descripcion' => $producto->descripcion,
                        'sku' => $producto->sku,
                        'peso' => $producto->peso,
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

            // Crear mantenimiento preventivo programado solo para algunos lockers (30% de los lockers)
            // No todos los lockers necesitan mantenimiento preventivo al mismo tiempo
            if (rand(1, 100) <= 30) {
                $tecnico = $tecnicos[array_rand($tecnicos)];
                $fechaMantenimiento = $now->copy()->addDays(rand(7, 30));
                $fechaMantenimientoProgramado = $now->copy()->subDays(rand(1, 10)); // Fecha en el pasado
                
                $mantenimiento = Mantenimiento::create([
                    'locker_id' => $locker->id,
                    'usuario_id' => $tecnico->id,
                    'fecha_mantenimiento' => $fechaMantenimiento,
                    'fecha_programada' => $fechaMantenimiento, // Compatibilidad
                    'descripcion' => 'Mantenimiento preventivo programado',
                    'estado' => 'pendiente',
                    'tipo' => 'preventivo',
                    'es_urgente' => false,
                    'created_at' => $fechaMantenimientoProgramado,
                    'updated_at' => $fechaMantenimientoProgramado,
                ]);

                // Historial de mantenimiento programado (con fecha retroactiva)
                HistorialLockerService::registrarMantenimientoProgramado(
                    $locker->id,
                    $mantenimiento->id,
                    $fechaMantenimiento->format('Y-m-d'),
                    $admin->id,
                    $fechaMantenimientoProgramado->format('Y-m-d H:i:s')
                );
            }

            // Crear algunos mantenimientos preventivos resueltos (históricos)
            if (rand(1, 100) <= 20) {
                $tecnico = $tecnicos[array_rand($tecnicos)];
                $fechaMantenimientoRealizado = $now->copy()->subDays(rand(10, 60));
                $fechaCreacionMantenimiento = $fechaMantenimientoRealizado->copy()->subDays(rand(5, 15));
                
                $mantenimiento = Mantenimiento::create([
                    'locker_id' => $locker->id,
                    'usuario_id' => $tecnico->id,
                    'fecha_mantenimiento' => $fechaMantenimientoRealizado,
                    'fecha_programada' => $fechaMantenimientoRealizado,
                    'fecha_real' => $fechaMantenimientoRealizado,
                    'descripcion' => 'Mantenimiento preventivo realizado',
                    'estado' => 'resuelta',
                    'tipo' => 'preventivo',
                    'es_urgente' => false,
                    'comentarios' => 'Mantención preventiva completada exitosamente. Todos los sistemas funcionando correctamente.',
                    'created_at' => $fechaCreacionMantenimiento,
                    'updated_at' => $fechaMantenimientoRealizado,
                ]);

                // Registrar en historial
                HistorialLockerService::registrarMantenimientoProgramado(
                    $locker->id,
                    $mantenimiento->id,
                    $fechaMantenimientoRealizado->format('Y-m-d'),
                    $admin->id,
                    $fechaCreacionMantenimiento->format('Y-m-d H:i:s')
                );
                
                HistorialLockerService::registrarMantenimientoRealizado(
                    $locker->id,
                    $mantenimiento->id,
                    $tecnico->id
                );
            }
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

        // Crear incidencias relacionadas con pedidos de empresas
        // Obtener todas las reservas de empresas (pedidos)
        $reservasEmpresas = Reserva::whereNotNull('empresa_id')
            ->with(['empresa', 'repartidor', 'usuario', 'articulos', 'locker.ubicacion'])
            ->get();

        if ($reservasEmpresas->count() > 0) {
            // Tipos de problemas para incidencias de pedido
            $problemasPedido = [
                'pedido_incorrecto',
                'pedido_dañado',
                'pedido_faltante',
                'pedido_extraviado',
                'pedido_no_es_el_solicitado',
                'articulos_faltantes',
                'articulos_dañados',
                'pedido_retrasado',
                'otro',
            ];

            // Estados de incidencias
            $estadosIncidencia = ['pendiente', 'resuelto', 'anulada'];

            // Crear incidencias para algunas reservas (aproximadamente 15-20% de las reservas)
            $numIncidencias = min(15, (int)($reservasEmpresas->count() * 0.15));
            $reservasParaIncidencia = $reservasEmpresas->random(min($numIncidencias, $reservasEmpresas->count()));

            foreach ($reservasParaIncidencia as $reserva) {
                // Seleccionar un estado aleatorio
                $estadoIncidencia = $estadosIncidencia[array_rand($estadosIncidencia)];
                
                // Seleccionar un problema aleatorio
                $problemaTipo = $problemasPedido[array_rand($problemasPedido)];

                // Descripciones de ejemplo según el tipo de problema
                $descripciones = [
                    'pedido_incorrecto' => 'El pedido recibido no corresponde al que se solicitó. Se esperaba otro artículo.',
                    'pedido_dañado' => 'El pedido llegó con daños visibles en el empaque y algunos artículos están afectados.',
                    'pedido_faltante' => 'El pedido no llegó al locker en la fecha acordada. Cliente reporta que no recibió notificación.',
                    'pedido_extraviado' => 'El pedido fue marcado como entregado pero el cliente no lo encuentra en el locker asignado.',
                    'pedido_no_es_el_solicitado' => 'El contenido del pedido no coincide con lo que se ordenó. Hay artículos diferentes.',
                    'articulos_faltantes' => 'Faltan algunos artículos del pedido. El cliente recibió solo una parte de lo solicitado.',
                    'articulos_dañados' => 'Algunos artículos del pedido llegaron dañados o en mal estado.',
                    'pedido_retrasado' => 'El pedido tiene un retraso significativo respecto a la fecha de entrega prometida.',
                    'otro' => 'Problema general con el pedido que requiere atención del equipo de soporte.',
                ];

                $descripcion = $descripciones[$problemaTipo] ?? 'Problema reportado con el pedido.';

                // Fecha de la incidencia (puede ser reciente o antigua)
                $diasAtras = rand(1, 20);
                $fechaIncidencia = $now->copy()->subDays($diasAtras);

                // Si la incidencia es resuelta, debe ser más antigua que si es pendiente
                if ($estadoIncidencia === 'resuelto') {
                    $fechaIncidencia = $now->copy()->subDays(rand(5, 20));
                } elseif ($estadoIncidencia === 'pendiente') {
                    $fechaIncidencia = $now->copy()->subDays(rand(1, 7));
                }

                // Cargar datos del pedido para almacenarlos en datos_pedido
                $reserva->load(['empresa', 'repartidor', 'usuario', 'articulos', 'locker.ubicacion']);

                $datosPedido = [
                    'reserva_id' => $reserva->id,
                    'empresa' => [
                        'id' => $reserva->empresa->id ?? null,
                        'nombre' => $reserva->empresa->nombre ?? null,
                        'email' => $reserva->empresa->email ?? null,
                    ],
                    'repartidor' => $reserva->repartidor ? [
                        'id' => $reserva->repartidor->id,
                        'nombre' => $reserva->repartidor->nombre ?? null,
                        'apellido' => $reserva->repartidor->apellido ?? null,
                        'nombre_completo' => $reserva->repartidor->nombre_completo ?? null,
                        'email' => $reserva->repartidor->email ?? null,
                        'telefono' => $reserva->repartidor->telefono ?? null,
                        'rut' => $reserva->repartidor->rut ?? null,
                    ] : null,
                    'usuario_destino' => [
                        'id' => $reserva->usuario->id ?? null,
                        'nombre' => $reserva->usuario->nombre ?? null,
                        'email' => $reserva->usuario->email ?? null,
                    ],
                    'locker' => [
                        'id' => $reserva->locker->id ?? null,
                        'numero' => $reserva->locker->numero ?? null,
                        'ubicacion' => $reserva->locker->ubicacion->nombre ?? null,
                    ],
                    'articulos' => $reserva->articulos->map(function ($articulo) {
                        return [
                            'id' => $articulo->id,
                            'nombre' => $articulo->nombre,
                            'cantidad' => $articulo->cantidad,
                            'descripcion' => $articulo->descripcion,
                            'sku' => $articulo->sku,
                            'peso' => $articulo->peso,
                        ];
                    })->toArray(),
                    'fecha_reserva' => $reserva->fecha_reserva?->toDateTimeString(),
                    'estado_pedido' => $reserva->estado,
                    'logistica_estado' => $reserva->logistica_estado,
                ];

                // Asignar técnico a algunas incidencias de pedido que requieren intervención técnica (30%)
                // Solo para problemas que pueden requerir revisión técnica del locker
                $tecnicoAsignado = null;
                $problemasQueRequierenTecnico = ['pedido_extraviado', 'pedido_faltante'];
                if (in_array($problemaTipo, $problemasQueRequierenTecnico) && rand(1, 100) <= 50) {
                    $tecnicoAsignado = $tecnicos[array_rand($tecnicos)];
                }

                // Crear la incidencia
                $incidencia = new Incidencia([
                    'tipo' => 'pedido',
                    'problema_tipo' => $problemaTipo,
                    'locker_id' => $reserva->locker_id,
                    'reserva_id' => $reserva->id,
                    'usuario_id' => $reserva->usuario_id,
                    'tecnico_id' => $tecnicoAsignado ? $tecnicoAsignado->id : null,
                    'descripcion' => $descripcion,
                    'estado' => $estadoIncidencia,
                    'datos_pedido' => $datosPedido,
                ]);

                // Forzar los timestamps para que coincidan con la fecha retroactiva
                $incidencia->created_at = $fechaIncidencia;
                $incidencia->updated_at = $fechaIncidencia;
                $incidencia->save();

                // Registrar en historial del locker
                $historialIncidencia = HistorialLockerService::registrarIncidenciaReportada(
                    $reserva->locker_id,
                    $incidencia->id,
                    $descripcion,
                    $reserva->usuario_id
                );
                // Ajustar fecha del historial
                $historialIncidencia->created_at = $fechaIncidencia;
                $historialIncidencia->updated_at = $fechaIncidencia;
                $historialIncidencia->save();

                // Si la incidencia está resuelta, registrar también la resolución
                if ($estadoIncidencia === 'resuelto') {
                    $fechaResolucion = $fechaIncidencia->copy()->addDays(rand(1, 5));
                    $usuarioResolucion = $tecnicoAsignado ? $tecnicoAsignado->id : $admin->id;
                    
                    $historialResolucion = HistorialLockerService::registrarIncidenciaResuelta(
                        $reserva->locker_id,
                        $incidencia->id,
                        $usuarioResolucion
                    );
                    // Ajustar fecha del historial de resolución
                    $historialResolucion->created_at = $fechaResolucion;
                    $historialResolucion->updated_at = $fechaResolucion;
                    $historialResolucion->save();
                    
                    $incidencia->updated_at = $fechaResolucion;
                    $incidencia->save();
                }
            }
        }

        // Crear incidencias de lockers (no relacionadas con pedidos)
        // Obtener todos los lockers disponibles
        $lockersDisponibles = Locker::all();
        $usuariosDisponibles = Usuario::where('rol', 'usuario')->get();

        if ($lockersDisponibles->count() > 0 && $usuariosDisponibles->count() > 0) {
            // Tipos de problemas para incidencias de locker
            $problemasLocker = [
                'no_se_abre',
                'no_se_cierra',
                'dañado',
                'bloqueado',
                'sin_energia',
                'codigo_no_funciona',
                'sensor_defectuoso',
                'otro',
            ];

            // Estados de incidencias
            $estadosIncidencia = ['pendiente', 'resuelto', 'anulada'];

            // Crear aproximadamente 10-15 incidencias de lockers
            $numIncidenciasLocker = min(15, $lockersDisponibles->count());

            for ($i = 0; $i < $numIncidenciasLocker; $i++) {
                // Seleccionar locker y usuario aleatorios
                $locker = $lockersDisponibles->random();
                $usuario = $usuariosDisponibles->random();

                // Seleccionar un estado aleatorio
                $estadoIncidencia = $estadosIncidencia[array_rand($estadosIncidencia)];
                
                // Seleccionar un problema aleatorio
                $problemaTipo = $problemasLocker[array_rand($problemasLocker)];

                // Descripciones de ejemplo según el tipo de problema
                $descripciones = [
                    'no_se_abre' => 'El locker no se abre con el código proporcionado. El usuario intentó varias veces sin éxito.',
                    'no_se_cierra' => 'El locker no se cierra correctamente. La puerta queda abierta o no se traba.',
                    'dañado' => 'El locker presenta daños físicos visibles. Hay signos de golpes o deterioro.',
                    'bloqueado' => 'El locker está bloqueado y no responde a ningún comando. Parece estar fuera de servicio.',
                    'sin_energia' => 'El locker no tiene energía. La pantalla no enciende y no responde.',
                    'codigo_no_funciona' => 'El código de acceso no funciona. El sistema no reconoce el código válido.',
                    'sensor_defectuoso' => 'El sensor de puerta está defectuoso. No detecta cuando la puerta está abierta o cerrada.',
                    'otro' => 'Problema general con el locker que requiere revisión técnica.',
                ];

                $descripcion = $descripciones[$problemaTipo] ?? 'Problema reportado con el locker.';

                // Fecha de la incidencia (puede ser reciente o antigua)
                $diasAtras = rand(1, 25);
                $fechaIncidencia = $now->copy()->subDays($diasAtras);

                // Si la incidencia es resuelta, debe ser más antigua que si es pendiente
                if ($estadoIncidencia === 'resuelto') {
                    $fechaIncidencia = $now->copy()->subDays(rand(5, 25));
                } elseif ($estadoIncidencia === 'pendiente') {
                    $fechaIncidencia = $now->copy()->subDays(rand(1, 7));
                }

                // Asignar técnico a algunas incidencias de locker (60% de las incidencias)
                $tecnicoAsignado = null;
                $disponibleParaCerrar = false;
                if (rand(1, 100) <= 60) {
                    $tecnicoAsignado = $tecnicos[array_rand($tecnicos)];
                    // Si está resuelta y tiene técnico, marcar como disponible para cerrar
                    if ($estadoIncidencia === 'resuelto') {
                        $disponibleParaCerrar = true;
                    }
                }

                // Crear la incidencia de locker (sin reserva_id)
                $incidencia = new Incidencia([
                    'tipo' => 'locker',
                    'problema_tipo' => $problemaTipo,
                    'locker_id' => $locker->id,
                    'reserva_id' => null, // Incidencias de locker no tienen reserva
                    'usuario_id' => $usuario->id,
                    'tecnico_id' => $tecnicoAsignado ? $tecnicoAsignado->id : null,
                    'descripcion' => $descripcion,
                    'estado' => $estadoIncidencia,
                    'datos_pedido' => null, // No hay datos de pedido para incidencias de locker
                    'disponible_para_cerrar' => $disponibleParaCerrar,
                ]);

                // Forzar los timestamps para que coincidan con la fecha retroactiva
                $incidencia->created_at = $fechaIncidencia;
                $incidencia->updated_at = $fechaIncidencia;
                $incidencia->save();

                // Registrar en historial del locker
                $historialIncidencia = HistorialLockerService::registrarIncidenciaReportada(
                    $locker->id,
                    $incidencia->id,
                    $descripcion,
                    $usuario->id
                );
                // Ajustar fecha del historial
                $historialIncidencia->created_at = $fechaIncidencia;
                $historialIncidencia->updated_at = $fechaIncidencia;
                $historialIncidencia->save();

                // Si la incidencia está resuelta, registrar también la resolución
                if ($estadoIncidencia === 'resuelto') {
                    $fechaResolucion = $fechaIncidencia->copy()->addDays(rand(1, 5));
                    $usuarioResolucion = $tecnicoAsignado ? $tecnicoAsignado->id : $admin->id;
                    
                    $historialResolucion = HistorialLockerService::registrarIncidenciaResuelta(
                        $locker->id,
                        $incidencia->id,
                        $usuarioResolucion
                    );
                    // Ajustar fecha del historial de resolución
                    $historialResolucion->created_at = $fechaResolucion;
                    $historialResolucion->updated_at = $fechaResolucion;
                    $historialResolucion->save();
                    
                    $incidencia->updated_at = $fechaResolucion;
                    $incidencia->save();

                    // Si la incidencia tiene técnico asignado, crear un mantenimiento correctivo relacionado
                    // (Esto refleja el flujo: incidencia → asignación a técnico → mantenimiento)
                    if ($tecnicoAsignado && rand(1, 100) <= 70) {
                        $fechaMantenimiento = $fechaIncidencia->copy()->addDays(rand(1, 3));
                        $fechaCreacionMantenimiento = $fechaIncidencia->copy()->addHours(rand(2, 12));
                        
                        // Determinar si el mantenimiento ya fue realizado o está pendiente
                        $mantenimientoResuelto = rand(1, 100) <= 60; // 60% ya resueltos
                        $estadoMantenimiento = $mantenimientoResuelto ? 'resuelta' : 'pendiente';
                        $fechaRealMantenimiento = $mantenimientoResuelto ? $fechaMantenimiento : null;
                        
                        $mantenimiento = Mantenimiento::create([
                            'locker_id' => $locker->id,
                            'usuario_id' => $tecnicoAsignado->id,
                            'incidencia_id' => $incidencia->id,
                            'fecha_mantenimiento' => $fechaMantenimiento,
                            'fecha_programada' => $fechaMantenimiento,
                            'fecha_real' => $fechaRealMantenimiento,
                            'descripcion' => "Mantenimiento correctivo derivado de incidencia: {$descripcion}",
                            'estado' => $estadoMantenimiento,
                            'tipo' => 'correctivo',
                            'es_urgente' => in_array($problemaTipo, ['bloqueado', 'sin_energia', 'dañado']),
                            'comentarios' => $mantenimientoResuelto ? 'Problema solucionado. Locker operativo nuevamente.' : null,
                            'created_at' => $fechaCreacionMantenimiento,
                            'updated_at' => $mantenimientoResuelto ? $fechaMantenimiento : $fechaCreacionMantenimiento,
                        ]);

                        // Registrar en historial
                        HistorialLockerService::registrarMantenimientoProgramado(
                            $locker->id,
                            $mantenimiento->id,
                            $fechaMantenimiento->format('Y-m-d'),
                            $admin->id,
                            $fechaCreacionMantenimiento->format('Y-m-d H:i:s')
                        );

                        if ($mantenimientoResuelto) {
                            HistorialLockerService::registrarMantenimientoRealizado(
                                $locker->id,
                                $mantenimiento->id,
                                $tecnicoAsignado->id
                            );
                        }
                    }
                }
            }
        }

        // ============================================
        // DATOS ESPECÍFICOS PARA MUESTRA
        // ============================================

        // 1. Crear ubicación Metro Los Dominicos
        $ubicacionLosDominicos = Ubicacion::firstOrCreate(
            ['nombre' => 'Metro Los Dominicos'],
            [
                'nombre' => 'Metro Los Dominicos',
                'latitud' => -33.4079,
                'longitud' => -70.5451,
                'device_username' => 'totem-los-dominicos',
                'device_password' => '123456',
            ]
        );

        // 2. Crear 5 lockers tamaño M en Metro Los Dominicos
        $lockersLosDominicos = [];
        $fechaCreacionLockers = $now->copy()->subDays(30);
        for ($i = 1; $i <= 5; $i++) {
            $locker = new Locker([
                'numero' => $i,
                'ubicacion_id' => $ubicacionLosDominicos->id,
                'estado' => 'activo',
                'tamano' => 'M',
            ]);
            $locker->created_at = $fechaCreacionLockers;
            $locker->updated_at = $fechaCreacionLockers;
            $locker->save();
            $lockersLosDominicos[] = $locker;

            // Registrar creación en historial
            HistorialLockerService::registrarCreacion(
                $locker->id,
                $locker->numero,
                $ubicacionLosDominicos->nombre,
                $admin->id,
                $fechaCreacionLockers->format('Y-m-d H:i:s')
            );

            // Crear mantenimiento programado para cada locker
            // Asignar a tecnico1 y crear algunos para hoy y otros para el futuro
            $diasFuturo = $i <= 2 ? 0 : rand(7, 30); // Los primeros 2 lockers tienen mantenimiento para hoy
            $fechaMantenimiento = $now->copy()->addDays($diasFuturo)->startOfDay();
            $fechaMantenimientoProgramado = $now->copy()->subDays(rand(1, 10));
            
            $mantenimiento = Mantenimiento::create([
                'locker_id' => $locker->id,
                'usuario_id' => $tecnico1->id, // Asignar al técnico existente
                'fecha_mantenimiento' => $fechaMantenimiento,
                'fecha_programada' => $fechaMantenimiento,
                'descripcion' => 'Mantenimiento preventivo programado',
                'estado' => 'pendiente',
                'tipo' => 'preventivo',
                'es_urgente' => false,
                'created_at' => $fechaMantenimientoProgramado,
                'updated_at' => $fechaMantenimientoProgramado,
            ]);

            HistorialLockerService::registrarMantenimientoProgramado(
                $locker->id,
                $mantenimiento->id,
                $fechaMantenimiento->format('Y-m-d'),
                $admin->id,
                $fechaMantenimientoProgramado->format('Y-m-d H:i:s')
            );
        }

        // 3. Crear tarifa Smart Tiny
        $tarifaTiny = Tarifa::firstOrCreate(
            ['codigo_interno' => 'PLAN_TINY_01'],
            [
                'nombre_publico' => 'Smart Tiny',
                'codigo_interno' => 'PLAN_TINY_01',
                'precio_mensual' => 20000,
                'estado' => 'Activo',
                'descripcion_corta' => 'Para empresas pequeñas',
                'sedes_permitidas' => 1,
                'lockers_por_sede' => 0, // Ilimitado
                'prioridad_soporte' => 'Prioritario',
                'incluye' => [
                    'Hasta 1 sede',
                    'Lockers ilimitados por sede',
                    'Soporte 24/7',
                ],
                'no_incluye' => [
                    'Sedes extra',
                ],
            ]
        );

        // 4. Crear comuna San Miguel si no existe
        $regionMetropolitana = Region::firstOrCreate(
            ['nombre' => 'Región Metropolitana de Santiago'],
            ['nombre' => 'Región Metropolitana de Santiago']
        );

        $comunaSanMiguel = Comuna::firstOrCreate(
            ['nombre' => 'San Miguel', 'region_id' => $regionMetropolitana->id],
            ['nombre' => 'San Miguel', 'region_id' => $regionMetropolitana->id]
        );

        // 5. Crear empresa Importadora Auspont
        $usuarioEmpresaAuspont = Usuario::firstOrCreate(
            ['email' => 'javier@example.com'],
            [
                'nombre' => 'Javier',
                'apellido' => 'Auspont',
                'email' => 'javier@example.com',
                'telefono' => '94134989',
                'contrasena' => '123456',
                'rol' => 'empresa',
            ]
        );

        $datosEmpresaAuspont = DatosEmpresa::firstOrCreate(
            ['usuario_id' => $usuarioEmpresaAuspont->id],
            [
                'usuario_id' => $usuarioEmpresaAuspont->id,
                'nombre' => 'Importadora Auspont',
                'razon_social' => 'Importadora Auspont SpA',
                'rut' => '76845321K',
                'direccion' => 'Calle Falsa 123',
                'comuna_id' => $comunaSanMiguel->id,
                'tarifa_id' => $tarifaTiny->id,
            ]
        );

        // Registrar creación de cuenta
        HistorialEmpresaService::registrarCreacionCuenta($usuarioEmpresaAuspont->id, $datosEmpresaAuspont->nombre);

        // Asignar ubicación Metro Los Dominicos a la empresa
        EmpresaUbicacion::firstOrCreate(
            [
                'empresa_id' => $usuarioEmpresaAuspont->id,
                'ubicacion_id' => $ubicacionLosDominicos->id,
            ],
            [
                'empresa_id' => $usuarioEmpresaAuspont->id,
                'ubicacion_id' => $ubicacionLosDominicos->id,
            ]
        );

        // 6. Crear repartidor Adela Auspont
        $usuarioRepartidorAdela = Usuario::firstOrCreate(
            ['email' => 'adela@example.com'],
            [
                'nombre' => 'Adela',
                'apellido' => 'Auspont',
                'email' => 'adela@example.com',
                'telefono' => '12341234',
                'contrasena' => '123456',
                'rol' => 'repartidor',
            ]
        );

        $repartidorAdela = Repartidor::firstOrCreate(
            ['usuario_id' => $usuarioRepartidorAdela->id],
            [
                'usuario_id' => $usuarioRepartidorAdela->id,
                'empresa_id' => $usuarioEmpresaAuspont->id,
                'nombre' => 'Adela',
                'apellido' => 'Auspont',
                'email' => 'adela@example.com',
                'telefono' => '12341234',
                'rut' => '215064883',
                'disponible' => true,
            ]
        );

        // 7. Crear usuario cliente Eliseo Perez
        $usuarioClienteEliseo = Usuario::firstOrCreate(
            ['email' => 'eliseo@example.com'],
            [
                'nombre' => 'Eliseo',
                'apellido' => 'Perez',
                'email' => 'eliseo@example.com',
                'telefono' => '56912341234',
                'contrasena' => '123456',
                'rol' => 'usuario',
            ]
        );

        // 8. Crear producto Aiphone 17
        $productoAiphone = ProductoEmpresa::firstOrCreate(
            [
                'empresa_id' => $usuarioEmpresaAuspont->id,
                'sku' => 'AIPHONE-17-001',
            ],
            [
                'empresa_id' => $usuarioEmpresaAuspont->id,
                'nombre' => 'Aiphone 17',
                'descripcion' => 'Aiphone 17',
                'sku' => 'AIPHONE-17-001',
                'peso' => 0.5,
                'activo' => true,
            ]
        );

        // 9. Crear 3 reservas
        $fechaManana = $now->copy()->addDay()->startOfDay();
        
        // Reserva 1: Código temporal - COMPLETA
        $reserva1 = new Reserva([
            'usuario_id' => $usuarioClienteEliseo->id,
            'empresa_id' => $usuarioEmpresaAuspont->id,
            'locker_id' => $lockersLosDominicos[0]->id,
            'tamano_pedido' => 'M',
            'ubicacion_destino_id' => $ubicacionLosDominicos->id,
            'repartidor_id' => $repartidorAdela->id,
            'fecha_reserva' => $fechaManana,
            'hora_inicio' => $fechaManana->copy()->addHours(10),
            'hora_fin' => $fechaManana->copy()->addHours(12),
            'estado' => 'completado',
            'tipo_acceso' => 'codigo_temporal',
            'codigo_acceso' => str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT),
            'logistica_estado' => 'completado',
        ]);
        $reserva1->created_at = $fechaManana->copy()->subDays(1);
        $reserva1->updated_at = $fechaManana->copy()->addHours(12);
        $reserva1->save();

        // Artículo para reserva 1
        ArticuloReserva::create([
            'reserva_id' => $reserva1->id,
            'nombre' => 'Aiphone 17',
            'cantidad' => 1,
            'descripcion' => 'Aiphone 17',
            'sku' => 'AIPHONE-17-001',
            'peso' => 0.5,
        ]);

        // Registrar historial
        HistorialLockerService::registrarReservaCreada(
            $lockersLosDominicos[0]->id,
            $reserva1->id,
            $usuarioEmpresaAuspont->id,
            $reserva1->created_at->format('Y-m-d H:i:s')
        );
        HistorialLockerService::registrarReservaCompletada(
            $lockersLosDominicos[0]->id,
            $reserva1->id,
            $lockersLosDominicos[0]->numero,
            trim($usuarioClienteEliseo->nombre . ' ' . $usuarioClienteEliseo->apellido),
            'ocupado',
            'activo',
            $usuarioClienteEliseo->id,
            $reserva1->hora_fin->format('Y-m-d H:i:s')
        );
        HistorialEmpresaService::registrarReservaCreada(
            $usuarioEmpresaAuspont->id,
            $reserva1->id,
            $ubicacionLosDominicos->nombre
        );
        HistorialEmpresaService::registrarReservaCompletada(
            $usuarioEmpresaAuspont->id,
            $reserva1->id
        );

        // Reserva 2: QR - PENDIENTE
        $reserva2 = new Reserva([
            'usuario_id' => $usuarioClienteEliseo->id,
            'empresa_id' => $usuarioEmpresaAuspont->id,
            'locker_id' => $lockersLosDominicos[1]->id,
            'tamano_pedido' => 'M',
            'ubicacion_destino_id' => $ubicacionLosDominicos->id,
            'repartidor_id' => $repartidorAdela->id,
            'fecha_reserva' => $fechaManana,
            'hora_inicio' => $fechaManana->copy()->addHours(14),
            'hora_fin' => null,
            'estado' => 'pendiente',
            'tipo_acceso' => 'qr',
            'codigo_acceso' => null,
            'logistica_estado' => 'asignado',
        ]);
        $reserva2->created_at = $now->copy()->subHours(2);
        $reserva2->updated_at = $now->copy()->subHours(2);
        $reserva2->save();

        // Artículo para reserva 2
        ArticuloReserva::create([
            'reserva_id' => $reserva2->id,
            'nombre' => 'Aiphone 17',
            'cantidad' => 1,
            'descripcion' => 'Aiphone 17',
            'sku' => 'AIPHONE-17-001',
            'peso' => 0.5,
        ]);

        // Registrar historial
        HistorialLockerService::registrarReservaCreada(
            $lockersLosDominicos[1]->id,
            $reserva2->id,
            $usuarioEmpresaAuspont->id,
            $reserva2->created_at->format('Y-m-d H:i:s')
        );
        HistorialEmpresaService::registrarReservaCreada(
            $usuarioEmpresaAuspont->id,
            $reserva2->id,
            $ubicacionLosDominicos->nombre
        );

        // Actualizar estado del locker
        $lockersLosDominicos[1]->estado = 'ocupado';
        $lockersLosDominicos[1]->save();

        // Reserva 3: Código temporal - PENDIENTE
        $reserva3 = new Reserva([
            'usuario_id' => $usuarioClienteEliseo->id,
            'empresa_id' => $usuarioEmpresaAuspont->id,
            'locker_id' => $lockersLosDominicos[2]->id,
            'tamano_pedido' => 'M',
            'ubicacion_destino_id' => $ubicacionLosDominicos->id,
            'repartidor_id' => $repartidorAdela->id,
            'fecha_reserva' => $fechaManana,
            'hora_inicio' => $fechaManana->copy()->addHours(16),
            'hora_fin' => null,
            'estado' => 'pendiente',
            'tipo_acceso' => 'codigo_temporal',
            'codigo_acceso' => str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT),
            'logistica_estado' => 'en_camino',
        ]);
        $reserva3->created_at = $now->copy()->subHours(1);
        $reserva3->updated_at = $now->copy()->subHours(1);
        $reserva3->save();

        // Artículo para reserva 3
        ArticuloReserva::create([
            'reserva_id' => $reserva3->id,
            'nombre' => 'Aiphone 17',
            'cantidad' => 1,
            'descripcion' => 'Aiphone 17',
            'sku' => 'AIPHONE-17-001',
            'peso' => 0.5,
        ]);

        // Registrar historial
        HistorialLockerService::registrarReservaCreada(
            $lockersLosDominicos[2]->id,
            $reserva3->id,
            $usuarioEmpresaAuspont->id,
            $reserva3->created_at->format('Y-m-d H:i:s')
        );
        HistorialEmpresaService::registrarReservaCreada(
            $usuarioEmpresaAuspont->id,
            $reserva3->id,
            $ubicacionLosDominicos->nombre
        );

        // Actualizar estado del locker
        $lockersLosDominicos[2]->estado = 'ocupado';
        $lockersLosDominicos[2]->save();

        // 10. Usar técnico existente (tecnico1) con incidencia de locker
        // Crear reserva para la incidencia (debe tener una reserva)
        $reservaIncidencia = new Reserva([
            'usuario_id' => $usuarioClienteEliseo->id,
            'empresa_id' => $usuarioEmpresaAuspont->id,
            'locker_id' => $lockersLosDominicos[3]->id,
            'tamano_pedido' => 'M',
            'ubicacion_destino_id' => $ubicacionLosDominicos->id,
            'repartidor_id' => $repartidorAdela->id,
            'fecha_reserva' => $now->copy()->subDays(2),
            'hora_inicio' => $now->copy()->subDays(2)->addHours(10),
            'hora_fin' => null,
            'estado' => 'pendiente',
            'tipo_acceso' => 'qr',
            'codigo_acceso' => null,
            'logistica_estado' => 'asignado',
        ]);
        $reservaIncidencia->created_at = $now->copy()->subDays(2);
        $reservaIncidencia->updated_at = $now->copy()->subDays(2);
        $reservaIncidencia->save();

        // Crear incidencia de locker asociada al técnico
        $incidenciaLocker = new Incidencia([
            'tipo' => 'locker',
            'problema_tipo' => 'no_se_abre',
            'locker_id' => $lockersLosDominicos[3]->id,
            'reserva_id' => $reservaIncidencia->id,
            'usuario_id' => $usuarioClienteEliseo->id,
            'tecnico_id' => $tecnico1->id,
            'descripcion' => 'El locker no se abre con el código proporcionado. El usuario intentó varias veces sin éxito.',
            'estado' => 'pendiente',
            'datos_pedido' => null,
        ]);
        $incidenciaLocker->created_at = $now->copy()->subDays(1);
        $incidenciaLocker->updated_at = $now->copy()->subDays(1);
        $incidenciaLocker->save();

        // Registrar en historial
        $historialIncidencia = HistorialLockerService::registrarIncidenciaReportada(
            $lockersLosDominicos[3]->id,
            $incidenciaLocker->id,
            $incidenciaLocker->descripcion,
            $usuarioClienteEliseo->id
        );
        $historialIncidencia->created_at = $incidenciaLocker->created_at;
        $historialIncidencia->updated_at = $incidenciaLocker->created_at;
        $historialIncidencia->save();

        // 11. Crear reserva para incidencia de empresa por pedido
        $reservaIncidenciaPedido = new Reserva([
            'usuario_id' => $usuarioClienteEliseo->id,
            'empresa_id' => $usuarioEmpresaAuspont->id,
            'locker_id' => $lockersLosDominicos[4]->id,
            'tamano_pedido' => 'M',
            'ubicacion_destino_id' => $ubicacionLosDominicos->id,
            'repartidor_id' => $repartidorAdela->id,
            'fecha_reserva' => $now->copy()->subDays(3),
            'hora_inicio' => $now->copy()->subDays(3)->addHours(11),
            'hora_fin' => null,
            'estado' => 'pendiente',
            'tipo_acceso' => 'codigo_temporal',
            'codigo_acceso' => str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT),
            'logistica_estado' => 'completado',
        ]);
        $reservaIncidenciaPedido->created_at = $now->copy()->subDays(3);
        $reservaIncidenciaPedido->updated_at = $now->copy()->subDays(3);
        $reservaIncidenciaPedido->save();

        // Artículo para reserva de incidencia
        ArticuloReserva::create([
            'reserva_id' => $reservaIncidenciaPedido->id,
            'nombre' => 'Aiphone 17',
            'cantidad' => 1,
            'descripcion' => 'Aiphone 17',
            'sku' => 'AIPHONE-17-001',
            'peso' => 0.5,
        ]);

        // Cargar datos de la reserva para la incidencia
        $reservaIncidenciaPedido->load(['empresa', 'repartidor', 'usuario', 'articulos', 'locker.ubicacion']);
        
        $datosPedidoIncidencia = [
            'reserva_id' => $reservaIncidenciaPedido->id,
            'empresa' => [
                'id' => $reservaIncidenciaPedido->empresa->id ?? null,
                'nombre' => $reservaIncidenciaPedido->empresa->nombre ?? null,
                'email' => $reservaIncidenciaPedido->empresa->email ?? null,
            ],
            'repartidor' => $reservaIncidenciaPedido->repartidor ? [
                'id' => $reservaIncidenciaPedido->repartidor->id,
                'nombre' => $reservaIncidenciaPedido->repartidor->nombre ?? null,
                'apellido' => $reservaIncidenciaPedido->repartidor->apellido ?? null,
                'nombre_completo' => $reservaIncidenciaPedido->repartidor->nombre_completo ?? null,
                'email' => $reservaIncidenciaPedido->repartidor->email ?? null,
                'telefono' => $reservaIncidenciaPedido->repartidor->telefono ?? null,
                'rut' => $reservaIncidenciaPedido->repartidor->rut ?? null,
            ] : null,
            'usuario_destino' => [
                'id' => $reservaIncidenciaPedido->usuario->id ?? null,
                'nombre' => $reservaIncidenciaPedido->usuario->nombre ?? null,
                'email' => $reservaIncidenciaPedido->usuario->email ?? null,
            ],
            'locker' => [
                'id' => $reservaIncidenciaPedido->locker->id ?? null,
                'numero' => $reservaIncidenciaPedido->locker->numero ?? null,
                'ubicacion' => $reservaIncidenciaPedido->locker->ubicacion->nombre ?? null,
            ],
            'articulos' => $reservaIncidenciaPedido->articulos->map(function ($articulo) {
                return [
                    'id' => $articulo->id,
                    'nombre' => $articulo->nombre,
                    'cantidad' => $articulo->cantidad,
                    'descripcion' => $articulo->descripcion,
                    'sku' => $articulo->sku,
                    'peso' => $articulo->peso,
                ];
            })->toArray(),
            'fecha_reserva' => $reservaIncidenciaPedido->fecha_reserva?->toDateTimeString(),
            'estado_pedido' => $reservaIncidenciaPedido->estado,
            'logistica_estado' => $reservaIncidenciaPedido->logistica_estado,
        ];

        // Crear incidencia de pedido
        $incidenciaPedido = new Incidencia([
            'tipo' => 'pedido',
            'problema_tipo' => 'pedido_incorrecto',
            'locker_id' => $lockersLosDominicos[4]->id,
            'reserva_id' => $reservaIncidenciaPedido->id,
            'usuario_id' => $usuarioClienteEliseo->id,
            'tecnico_id' => null,
            'descripcion' => 'El pedido recibido no corresponde al que se solicitó. Se esperaba otro artículo.',
            'estado' => 'pendiente',
            'datos_pedido' => $datosPedidoIncidencia,
        ]);
        $incidenciaPedido->created_at = $now->copy()->subDays(1);
        $incidenciaPedido->updated_at = $now->copy()->subDays(1);
        $incidenciaPedido->save();

        // Registrar en historial
        $historialIncidenciaPedido = HistorialLockerService::registrarIncidenciaReportada(
            $lockersLosDominicos[4]->id,
            $incidenciaPedido->id,
            $incidenciaPedido->descripcion,
            $usuarioClienteEliseo->id
        );
        $historialIncidenciaPedido->created_at = $incidenciaPedido->created_at;
        $historialIncidenciaPedido->updated_at = $incidenciaPedido->created_at;
        $historialIncidenciaPedido->save();

        // Registrar historial de reserva
        HistorialLockerService::registrarReservaCreada(
            $lockersLosDominicos[4]->id,
            $reservaIncidenciaPedido->id,
            $usuarioEmpresaAuspont->id,
            $reservaIncidenciaPedido->created_at->format('Y-m-d H:i:s')
        );
        HistorialEmpresaService::registrarReservaCreada(
            $usuarioEmpresaAuspont->id,
            $reservaIncidenciaPedido->id,
            $ubicacionLosDominicos->nombre
        );

        // Actualizar estado del locker
        $lockersLosDominicos[4]->estado = 'ocupado';
        $lockersLosDominicos[4]->save();
    }
}
