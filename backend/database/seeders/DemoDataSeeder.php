<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Usuario;
use App\Models\Locker;
use App\Models\Ubicacion;
use App\Models\Reserva;
use App\Models\Repartidor;
use Carbon\Carbon;

class DemoDataSeeder extends Seeder
{
    /**
     * Seeder para datos de demostración
     * 
     * Crea:
     * - 15 pedidos recientes (últimos días) - aparecen en home y pedidos
     * - 10 pedidos antiguos (hace 10-37 días) - SOLO aparecen en pedidos, NO en home
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

        foreach ($usuariosEmpresas as $pair) {
            $usuario = $pair['usuario'];
            $empresa = $pair['empresa'];

            // Crear 15 pedidos recientes (últimos 7 días y algunos fuera de ese rango)
            for ($i = 0; $i < 15; $i++) {
                $fechaReserva = $now->copy()->subDays(($usuario->id % 2) + $i + 1);
                $horaInicio = $fechaReserva->copy()->addHours(1);

                $estado = $estadoSecuencia[$i % count($estadoSecuencia)];

                $horaFin = null;
                if ($estado === 'completado') {
                    $horaFin = $horaInicio->copy()->addHours(1);
                } elseif ($estado === 'anulado') {
                    $horaFin = $horaInicio->copy()->addMinutes(45);
                }

                $locker = $lockers[$i % count($lockers)];
                $repartidor = $repartidores[$i % count($repartidores)];

                Reserva::create([
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

                if ($estado !== 'completado') {
                    $repartidor->update(['disponible' => false]);
                }
            }

            // Crear 10 pedidos antiguos (hace más de 7 días - no aparecerán en home pero sí en pedidos)
            for ($i = 0; $i < 10; $i++) {
                $diasAtras = 10 + $i * 3; // Entre 10 y 37 días atrás
                $fechaReserva = $now->copy()->subDays($diasAtras);
                $horaInicio = $fechaReserva->copy()->addHours(2);

                $estado = $estadoSecuencia[($i + 1) % count($estadoSecuencia)];

                $horaFin = null;
                if ($estado === 'completado') {
                    $horaFin = $horaInicio->copy()->addHours(2);
                } elseif ($estado === 'anulado') {
                    $horaFin = $horaInicio->copy()->addMinutes(30);
                }

                $locker = $lockers[$i % count($lockers)];
                $repartidor = $repartidores[$i % count($repartidores)];

                Reserva::create([
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
            }
        }

        Repartidor::query()->update(['disponible' => true]);
    }
}
