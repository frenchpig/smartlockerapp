<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('repartidores')) {
            return;
        }

        Schema::table('repartidores', function (Blueprint $table) {
            if (!Schema::hasColumn('repartidores', 'empresa_id')) {
                $table->foreignId('empresa_id')
                    ->nullable()
                    ->after('usuario_id')
                    ->constrained('usuarios')
                    ->cascadeOnDelete();
            }
            if (!Schema::hasColumn('repartidores', 'rut')) {
                $table->string('rut', 20)->nullable()->unique()->after('empresa_id');
            }

            $table->index(['empresa_id', 'disponible'], 'repartidores_empresa_disponible_index');
        });

        // Intentar asignar empresa_id en base a reservas existentes
        $repartidores = DB::table('repartidores')->select('id')->whereNull('empresa_id')->get();

        foreach ($repartidores as $repartidor) {
            $empresaId = DB::table('reservas')
                ->where('repartidor_id', $repartidor->id)
                ->whereNotNull('empresa_id')
                ->orderByDesc('created_at')
                ->value('empresa_id');

            if ($empresaId) {
                DB::table('repartidores')
                    ->where('id', $repartidor->id)
                    ->update(['empresa_id' => $empresaId]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('repartidores')) {
            return;
        }

        Schema::table('repartidores', function (Blueprint $table) {
            if (Schema::hasColumn('repartidores', 'rut')) {
                $table->dropUnique('repartidores_rut_unique');
                $table->dropColumn('rut');
            }

            $table->dropIndex('repartidores_empresa_disponible_index');

            if (Schema::hasColumn('repartidores', 'empresa_id')) {
                $table->dropForeign(['empresa_id']);
                $table->dropColumn('empresa_id');
            }
        });
    }
};

