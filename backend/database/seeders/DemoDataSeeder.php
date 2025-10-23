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
        ]);

        $metroNuble = Ubicacion::create([
            'nombre' => 'Metro Nuble',
            'latitud' => -33.476,
            'longitud' => -70.628,
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
        }

        Repartidor::query()->update(['disponible' => true]);
    }
}
