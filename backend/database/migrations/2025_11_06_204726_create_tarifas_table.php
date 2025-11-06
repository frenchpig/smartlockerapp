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
        Schema::create('tarifas', function (Blueprint $table) {
            $table->id();
            $table->string('nombre_publico');
            $table->string('codigo_interno')->unique();
            $table->unsignedBigInteger('precio_mensual');
            $table->enum('estado', ['Activo', 'Inactivo'])->default('Activo');
            $table->string('descripcion_corta', 512)->nullable();
            $table->unsignedInteger('sedes_permitidas')->default(0);
            $table->unsignedInteger('lockers_por_sede')->default(0);
            $table->enum('prioridad_soporte', ['Normal', 'Prioritario'])->default('Normal');
            $table->json('incluye')->nullable();
            $table->json('no_incluye')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tarifas');
    }
};
