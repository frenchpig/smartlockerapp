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
        Schema::table('incidencias', function (Blueprint $table) {
            $table->enum('tipo', ['locker', 'pedido', 'otro'])->default('locker')->after('id')->index();
            $table->foreignId('reserva_id')->nullable()->after('locker_id')->constrained('reservas')->nullOnDelete();
            $table->json('datos_pedido')->nullable()->after('reserva_id')->comment('Datos del pedido: empresa, repartidor, usuario, articulos, etc.');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('incidencias', function (Blueprint $table) {
            $table->dropForeign(['reserva_id']);
            $table->dropColumn(['tipo', 'reserva_id', 'datos_pedido']);
        });
    }
};
