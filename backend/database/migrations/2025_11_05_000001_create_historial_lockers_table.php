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
        Schema::create('historial_lockers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('locker_id')->constrained('lockers')->cascadeOnDelete();
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios')->nullOnDelete(); // Usuario que realizó la acción
            $table->string('accion'); // 'creado', 'estado_cambiado', 'reserva_creada', 'reserva_completada', 'mantenimiento_programado', 'mantenimiento_realizado', 'incidencia_reportada'
            $table->string('descripcion')->nullable(); // Descripción de la acción
            $table->json('datos_anteriores')->nullable(); // Estado anterior (para cambios de estado)
            $table->json('datos_nuevos')->nullable(); // Estado nuevo (para cambios de estado)
            $table->foreignId('reserva_id')->nullable()->constrained('reservas')->nullOnDelete(); // Si la acción está relacionada con una reserva
            $table->foreignId('mantenimiento_id')->nullable()->constrained('mantenimientos')->nullOnDelete(); // Si la acción está relacionada con un mantenimiento
            $table->foreignId('incidencia_id')->nullable()->constrained('incidencias')->nullOnDelete(); // Si la acción está relacionada con una incidencia
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('historial_lockers');
    }
};

