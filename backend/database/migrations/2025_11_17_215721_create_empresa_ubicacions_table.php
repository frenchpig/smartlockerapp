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
        Schema::create('empresa_ubicacion', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('usuarios')->cascadeOnDelete();
            $table->foreignId('ubicacion_id')->constrained('ubicaciones')->cascadeOnDelete();
            $table->timestamps();
            
            // Evitar duplicados: una empresa no puede tener la misma ubicación dos veces
            $table->unique(['empresa_id', 'ubicacion_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('empresa_ubicacion');
    }
};
