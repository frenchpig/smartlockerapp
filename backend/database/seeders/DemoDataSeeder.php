<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Usuario;
use App\Models\Locker;
use App\Models\Reserva;
use Illuminate\Support\Str;
use Carbon\Carbon;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        // Usuarios
        $u1 = Usuario::create([
            'nombre' => 'Ema',
            'apellido' => 'García',
            'email' => 'ema@example.com',
            'contrasena' => '123456', // se encripta por mutator SHA-256
            'telefono' => '56911111111',
            'rol' => 'usuario',
        ]);

        $u2 = Usuario::create([
            'nombre' => 'Juan',
            'apellido' => 'Pérez',
            'email' => 'juan@example.com',
            'contrasena' => '123456',
            'telefono' => '56922222222',
            'rol' => 'usuario',
        ]);

        // Lockers (dos ubicaciones con números repetibles)
        $l1 = Locker::create([
            'numero' => 1,
            'ubicacion' => 'Metro Ñuñoa',
            'latitud' => -33.456,
            'longitud' => -70.648,
            'estado' => 'activo',
            'tamano' => 'M',
        ]);

        $l2 = Locker::create([
            'numero' => 2,
            'ubicacion' => 'Metro Ñuñoa',
            'latitud' => -33.4561,
            'longitud' => -70.6482,
            'estado' => 'activo',
            'tamano' => 'L',
        ]);

        $l3 = Locker::create([
            'numero' => 1,
            'ubicacion' => 'Metro Ñuble',
            'latitud' => -33.476,
            'longitud' => -70.628,
            'estado' => 'activo',
            'tamano' => 'S',
        ]);

        $now = Carbon::now();

        // Reservas para usuario 1
        Reserva::create([
            'usuario_id' => $u1->id,
            'locker_id' => $l1->id,
            'fecha_reserva' => $now->copy()->subDays(1),
            'hora_inicio' => $now->copy()->subDays(1)->addHour(),
            'hora_fin' => null,
            'estado' => 'pendiente',
            'tipo_acceso' => 'codigo_temporal',
            'codigo_acceso' => null, // se generará bajo demanda
        ]);

        Reserva::create([
            'usuario_id' => $u1->id,
            'locker_id' => $l2->id,
            'fecha_reserva' => $now->copy()->subDays(2),
            'hora_inicio' => $now->copy()->subDays(2)->addHour(),
            'hora_fin' => $now->copy()->subDays(2)->addHours(2),
            'estado' => 'completado',
            'tipo_acceso' => 'qr',
            'codigo_acceso' => null,
        ]);

        // Reservas para usuario 2
        Reserva::create([
            'usuario_id' => $u2->id,
            'locker_id' => $l3->id,
            'fecha_reserva' => $now->copy()->subHours(6),
            'hora_inicio' => $now->copy()->subHours(5),
            'hora_fin' => null,
            'estado' => 'pendiente',
            'tipo_acceso' => 'codigo_temporal',
            'codigo_acceso' => null,
        ]);

        Reserva::create([
            'usuario_id' => $u2->id,
            'locker_id' => $l1->id,
            'fecha_reserva' => $now->copy()->subDays(3),
            'hora_inicio' => $now->copy()->subDays(3)->addHour(),
            'hora_fin' => $now->copy()->subDays(3)->addHours(2),
            'estado' => 'anulado',
            'tipo_acceso' => 'codigo_temporal',
            'codigo_acceso' => null,
        ]);
    }
}

