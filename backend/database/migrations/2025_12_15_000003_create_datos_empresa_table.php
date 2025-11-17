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
        Schema::create('datos_empresa', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->unique()->constrained('usuarios')->cascadeOnDelete();
            $table->string('nombre', 255);
            $table->string('razon_social', 255)->nullable();
            $table->string('rut', 20)->nullable();
            $table->string('direccion', 255)->nullable();
            $table->foreignId('comuna_id')->nullable()->constrained('comunas')->nullOnDelete();
            $table->foreignId('tarifa_id')->nullable()->constrained('tarifas')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('datos_empresa');
    }
};

