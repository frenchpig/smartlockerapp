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
        Schema::create('productos_empresa', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('usuarios')->cascadeOnDelete();
            $table->string('nombre');
            $table->text('descripcion')->nullable();
            $table->string('sku')->nullable();
            $table->decimal('peso', 8, 2)->nullable()->comment('Peso en kg');
            $table->boolean('activo')->default(true);
            $table->timestamps();
            
            $table->index(['empresa_id', 'activo']);
            $table->index('sku');
            // SKU único por empresa
            $table->unique(['empresa_id', 'sku'], 'productos_empresa_empresa_sku_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('productos_empresa');
    }
};

