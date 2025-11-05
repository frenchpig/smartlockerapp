<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Usuario;
use App\Models\Locker;
use App\Models\Ubicacion;
use App\Models\Reserva;
use App\Models\Repartidor;
use App\Models\ArticuloReserva;
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

        $repartidores = [
            Repartidor::create(['usuario_id' => $repUser1->id]),
            Repartidor::create(['usuario_id' => $repUser2->id]),
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

        // Lockers (dos ubicaciones con numeros repetibles)
        $l1 = Locker::create([
            'numero' => 1,
            'ubicacion_id' => $metroNunoa->id,
            'estado' => 'activo',
            'tamano' => 'M',
        ]);

        $l2 = Locker::create([
            'numero' => 2,
            'ubicacion_id' => $metroNunoa->id,
            'estado' => 'activo',
            'tamano' => 'L',
        ]);

        $l3 = Locker::create([
            'numero' => 1,
            'ubicacion_id' => $metroNuble->id,
            'estado' => 'activo',
            'tamano' => 'S',
        ]);

        $now = Carbon::now();

        $usuariosEmpresas = [
            ['usuario' => $u1, 'empresa' => $empresa1],
            ['usuario' => $u2, 'empresa' => $empresa2],
        ];

        $lockers = [$l1, $l2, $l3];
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
            }
        }

        Repartidor::query()->update(['disponible' => true]);
    }
}
