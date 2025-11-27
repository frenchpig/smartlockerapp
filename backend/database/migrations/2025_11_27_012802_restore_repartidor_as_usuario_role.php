<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Restaura el rol de repartidor como usuario autenticable.
     * Crea usuarios para los repartidores existentes y restaura la relación usuario_id.
     */
    public function up(): void
    {
        if (!Schema::hasTable('repartidores')) {
            return;
        }

        // Paso 1: Agregar rol 'repartidor' de vuelta al enum de usuarios
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE usuarios MODIFY rol ENUM('empresa','usuario','administrador','tecnico','repartidor') NOT NULL");
        }

        // Paso 2: Agregar usuario_id a la tabla repartidores (nullable primero para poder migrar datos)
        Schema::table('repartidores', function (Blueprint $table) {
            if (!Schema::hasColumn('repartidores', 'usuario_id')) {
                $table->foreignId('usuario_id')
                    ->nullable()
                    ->unique()
                    ->after('id')
                    ->constrained('usuarios')
                    ->cascadeOnDelete();
            }
        });

        // Paso 3: Crear usuarios para los repartidores existentes que no tienen usuario_id
        $repartidores = DB::table('repartidores')
            ->whereNull('usuario_id')
            ->get();

        foreach ($repartidores as $repartidor) {
            // Verificar si ya existe un usuario con ese email
            $usuarioExistente = DB::table('usuarios')
                ->where('email', $repartidor->email)
                ->first();

            if ($usuarioExistente) {
                // Si existe, actualizar su rol a repartidor y asignarlo
                DB::table('usuarios')
                    ->where('id', $usuarioExistente->id)
                    ->update(['rol' => 'repartidor']);

                DB::table('repartidores')
                    ->where('id', $repartidor->id)
                    ->update(['usuario_id' => $usuarioExistente->id]);
            } else {
                // Crear nuevo usuario para el repartidor
                // Contraseña por defecto: 123456 (SHA-256)
                $contrasenaHash = hash('sha256', '123456');
                
                $usuarioId = DB::table('usuarios')->insertGetId([
                    'nombre' => $repartidor->nombre,
                    'apellido' => $repartidor->apellido,
                    'email' => $repartidor->email,
                    'telefono' => $repartidor->telefono,
                    'contrasena' => $contrasenaHash,
                    'rol' => 'repartidor',
                    'habilitado' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::table('repartidores')
                    ->where('id', $repartidor->id)
                    ->update(['usuario_id' => $usuarioId]);
            }
        }

        // Paso 4: Sincronizar datos de repartidores con usuarios (por si hay diferencias)
        $repartidoresConUsuario = DB::table('repartidores')
            ->whereNotNull('usuario_id')
            ->join('usuarios', 'repartidores.usuario_id', '=', 'usuarios.id')
            ->select(
                'repartidores.id as repartidor_id',
                'repartidores.usuario_id',
                'repartidores.nombre as rep_nombre',
                'repartidores.apellido as rep_apellido',
                'repartidores.email as rep_email',
                'repartidores.telefono as rep_telefono',
                'usuarios.nombre as usr_nombre',
                'usuarios.apellido as usr_apellido',
                'usuarios.email as usr_email',
                'usuarios.telefono as usr_telefono'
            )
            ->get();

        foreach ($repartidoresConUsuario as $rep) {
            // Sincronizar datos del usuario con los del repartidor
            $actualizaciones = [];
            if ($rep->rep_nombre !== $rep->usr_nombre) {
                $actualizaciones['nombre'] = $rep->rep_nombre;
            }
            if ($rep->rep_apellido !== $rep->usr_apellido) {
                $actualizaciones['apellido'] = $rep->rep_apellido;
            }
            if ($rep->rep_email !== $rep->usr_email) {
                $actualizaciones['email'] = $rep->rep_email;
            }
            if ($rep->rep_telefono !== $rep->usr_telefono) {
                $actualizaciones['telefono'] = $rep->rep_telefono;
            }
            
            if (!empty($actualizaciones)) {
                DB::table('usuarios')
                    ->where('id', $rep->usuario_id)
                    ->update($actualizaciones);
            }
        }

        // Paso 5: Hacer usuario_id obligatorio (después de migrar todos los datos)
        Schema::table('repartidores', function (Blueprint $table) {
            $table->foreignId('usuario_id')
                ->nullable(false)
                ->change();
        });

        // Paso 6: Mantener los campos directos en repartidores como denormalizados
        // (no los eliminamos para mantener compatibilidad, pero ahora el usuario es la fuente de verdad)
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('repartidores')) {
            return;
        }

        // Eliminar la relación usuario_id
        Schema::table('repartidores', function (Blueprint $table) {
            if (Schema::hasColumn('repartidores', 'usuario_id')) {
                $table->dropForeign(['usuario_id']);
                $table->dropColumn('usuario_id');
            }
        });

        // Eliminar usuarios con rol repartidor
        DB::table('usuarios')
            ->where('rol', 'repartidor')
            ->delete();

        // Remover rol repartidor del enum
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE usuarios MODIFY rol ENUM('empresa','usuario','administrador','tecnico') NOT NULL");
        }
    }
};
