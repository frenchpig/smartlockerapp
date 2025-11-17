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
     * Convierte los repartidores de usuarios a datos directos almacenados en la tabla 'repartidores'.
     * Los repartidores ahora son datos de la empresa, no usuarios del sistema.
     * Todos los datos se almacenan en la tabla 'repartidores'.
     */
    public function up(): void
    {
        if (!Schema::hasTable('repartidores')) {
            return;
        }

        // Paso 1: Agregar nuevos campos directos a la tabla 'repartidores'
        Schema::table('repartidores', function (Blueprint $table) {
            $table->string('nombre', 100)->nullable()->after('id');
            $table->string('apellido', 100)->nullable()->after('nombre');
            $table->string('email', 255)->nullable()->after('apellido');
            $table->string('telefono', 20)->nullable()->after('email');
        });

        // Paso 2: Migrar datos de usuarios a la tabla 'repartidores' (copiar datos antes de eliminar usuario_id)
        $repartidores = DB::table('repartidores')
            ->whereNotNull('usuario_id')
            ->get();

        foreach ($repartidores as $repartidor) {
            $usuario = DB::table('usuarios')
                ->where('id', $repartidor->usuario_id)
                ->first();

            if ($usuario) {
                DB::table('repartidores')
                    ->where('id', $repartidor->id)
                    ->update([
                        'nombre' => $usuario->nombre,
                        'apellido' => $usuario->apellido,
                        'email' => $usuario->email,
                        'telefono' => $usuario->telefono,
                    ]);
            }
        }

        // Paso 3: Hacer empresa_id obligatorio en la tabla 'repartidores'
        // Los repartidores deben pertenecer a una empresa
        Schema::table('repartidores', function (Blueprint $table) {
            // Primero eliminar valores nulos si existen
            DB::table('repartidores')
                ->whereNull('empresa_id')
                ->delete();

            // Luego hacer la columna obligatoria
            $table->foreignId('empresa_id')
                ->nullable(false)
                ->change();
        });

        // Paso 4: Eliminar usuario_id de la tabla 'repartidores' (ya no son usuarios)
        Schema::table('repartidores', function (Blueprint $table) {
            $table->dropForeign(['usuario_id']);
            $table->dropColumn('usuario_id');
        });

        // Paso 5: Hacer campos obligatorios en la tabla 'repartidores' (excepto telefono)
        Schema::table('repartidores', function (Blueprint $table) {
            $table->string('nombre', 100)->nullable(false)->change();
            $table->string('apellido', 100)->nullable(false)->change();
            $table->string('email', 255)->nullable(false)->change();
        });

        // Paso 6: Agregar índice único para email por empresa en la tabla 'repartidores'
        Schema::table('repartidores', function (Blueprint $table) {
            $table->unique(['empresa_id', 'email'], 'repartidores_empresa_email_unique');
        });

        // Paso 7: Eliminar rol 'repartidor' del enum de usuarios
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE usuarios MODIFY rol ENUM('empresa','usuario','administrador','tecnico') NOT NULL");
        }

        // Paso 8: Eliminar usuarios con rol repartidor (ya no son necesarios)
        DB::table('usuarios')
            ->where('rol', 'repartidor')
            ->delete();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('repartidores')) {
            return;
        }

        // Restaurar rol repartidor en usuarios
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE usuarios MODIFY rol ENUM('empresa','usuario','administrador','tecnico','repartidor') NOT NULL");
        }

        // Eliminar índice único
        Schema::table('repartidores', function (Blueprint $table) {
            $table->dropUnique('repartidores_empresa_email_unique');
        });

        // Restaurar usuario_id
        Schema::table('repartidores', function (Blueprint $table) {
            $table->foreignId('usuario_id')->nullable()->after('id');
        });

        // Hacer empresa_id nullable
        Schema::table('repartidores', function (Blueprint $table) {
            $table->foreignId('empresa_id')->nullable()->change();
        });

        // Eliminar campos directos
        Schema::table('repartidores', function (Blueprint $table) {
            $table->dropColumn(['nombre', 'apellido', 'email', 'telefono']);
        });
    }
};
