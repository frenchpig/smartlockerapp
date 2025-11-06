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
        Schema::create('historial_empresa', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios')->cascadeOnDelete();
            $table->enum('tipo', [
                'creacion_cuenta',
                'reserva_creada',
                'reserva_cancelada',
                'reserva_completada',
                'datos_actualizados',
                'locker_asignado',
                'locker_liberado',
                'estado_cambiado'
            ])->index();
            $table->text('descripcion');
            $table->foreignId('reserva_id')->nullable()->constrained('reservas')->nullOnDelete();
            $table->json('detalles')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('historial_empresa');
    }
};
