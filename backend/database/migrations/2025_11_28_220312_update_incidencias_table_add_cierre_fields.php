<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('incidencias', function (Blueprint $table) {
            // Agregar comentario de cierre
            $table->text('comentario_cierre')->nullable()->after('datos_pedido');
            
            // Agregar campo para indicar si está disponible para cerrarse (solo para incidencias de locker derivadas a técnico)
            $table->boolean('disponible_para_cerrar')->default(false)->after('comentario_cierre');
            
            // Agregar relación con técnico (usuario_id del técnico asignado)
            $table->foreignId('tecnico_id')->nullable()->after('disponible_para_cerrar')->constrained('usuarios')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('incidencias', function (Blueprint $table) {
            $table->dropForeign(['tecnico_id']);
            $table->dropColumn(['comentario_cierre', 'disponible_para_cerrar', 'tecnico_id']);
        });
    }
};
