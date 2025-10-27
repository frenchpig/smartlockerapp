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
        Schema::create('articulos_reserva', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reserva_id')->constrained('reservas')->cascadeOnDelete();
            $table->string('nombre');
            $table->integer('cantidad')->default(1);
            $table->text('descripcion')->nullable();
            $table->string('sku')->nullable();
            $table->decimal('peso', 8, 2)->nullable()->comment('Peso en kg');
            $table->timestamps();
            
            $table->index(['reserva_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('articulos_reserva');
    }
};

