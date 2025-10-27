<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE usuarios MODIFY rol ENUM('empresa','usuario','administrador','tecnico','repartidor') NOT NULL");
        }

        Schema::create('repartidores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->unique()->constrained('usuarios')->cascadeOnDelete();
            $table->boolean('disponible')->default(true)->index();
            $table->timestamps();
        });

        Schema::table('reservas', function (Blueprint $table) {
            $table->foreignId('repartidor_id')->nullable()->after('empresa_id')->constrained('repartidores')->nullOnDelete();
            $table->string('logistica_estado', 40)->default('pendiente_repartidor')->after('estado');
        });

        DB::table('reservas')->update([
            'logistica_estado' => DB::raw("CASE WHEN estado = 'completado' THEN 'completado' ELSE 'pendiente_repartidor' END"),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reservas', function (Blueprint $table) {
            $table->dropForeign(['repartidor_id']);
            $table->dropColumn(['repartidor_id', 'logistica_estado']);
        });

        Schema::dropIfExists('repartidores');

        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE usuarios MODIFY rol ENUM('empresa','usuario','administrador','tecnico') NOT NULL");
        }
    }
};
