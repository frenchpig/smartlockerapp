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
        Schema::create('mantenimientos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('locker_id')->constrained('lockers')->cascadeOnDelete();
            $table->foreignId('usuario_id')->constrained('usuarios')->cascadeOnDelete(); // técnico o admin
            $table->text('descripcion')->nullable();
            $table->dateTime('fecha_programada')->nullable();
            $table->dateTime('fecha_real')->nullable();
            $table->string('estado')->nullable(); // si quieres enum, dime los posibles valores exactos
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
