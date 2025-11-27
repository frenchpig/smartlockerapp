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
        // Primero hacer que locker_id sea nullable
        Schema::table('reservas', function (Blueprint $table) {
            $table->foreignId('locker_id')->nullable()->change();
        });

        // Luego agregar los nuevos campos
        Schema::table('reservas', function (Blueprint $table) {
            // Agregar campo para el tamaño del pedido
            $table->string('tamano_pedido', 10)->nullable()->after('locker_id');
            
            // Agregar campo para la ubicación de destino
            $table->foreignId('ubicacion_destino_id')
                ->nullable()
                ->after('tamano_pedido')
                ->constrained('ubicaciones')
                ->cascadeOnUpdate()
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reservas', function (Blueprint $table) {
            $table->dropConstrainedForeignId('ubicacion_destino_id');
            $table->dropColumn(['tamano_pedido', 'ubicacion_destino_id']);
            
            // Nota: No revertimos locker_id a NOT NULL para evitar errores si hay datos
            // Si es necesario, se debe hacer manualmente después de limpiar datos
        });
    }
};
