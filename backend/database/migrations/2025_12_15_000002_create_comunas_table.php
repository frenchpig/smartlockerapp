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
        Schema::create('comunas', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 100);
            $table->foreignId('region_id')->constrained('regiones')->cascadeOnDelete();
            $table->timestamps();
            
            // Índice compuesto para búsquedas eficientes
            $table->index(['region_id', 'nombre']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('comunas');
    }
};

