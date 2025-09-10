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
        Schema::create('historial_envios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios')->cascadeOnDelete();
            $table->foreignId('locker_origen_id')->constrained('lockers')->cascadeOnDelete();
            $table->foreignId('locker_destino_id')->constrained('lockers')->cascadeOnDelete();
            $table->dateTime('fecha_envio');
            $table->dateTime('fecha_recepcion')->nullable();
            $table->enum('estado', ['recibido', 'cancelado', 'pendiente'])->default('pendiente')->index();
            $table->string('codigo_seguimiento')->unique();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('historial_envios');
    }
};
