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
        Schema::create('reservas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios')->cascadeOnDelete();
            $table->foreignId('locker_id')->constrained('lockers')->cascadeOnDelete();
            $table->dateTime('fecha_reserva');
            $table->dateTime('hora_inicio');
            $table->dateTime('hora_fin')->nullable();
            $table->enum('estado', ['pendiente', 'completado', 'anulado'])->default('pendiente')->index();
            $table->enum('tipo_acceso', ['qr', 'codigo_temporal']);
            $table->string('codigo_acceso')->nullable()->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reservas');
    }
};
