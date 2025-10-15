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
        Schema::table('lockers', function (Blueprint $table) {
            // Número visible del locker (puede repetirse entre ubicaciones)
            $table->unsignedSmallInteger('numero')->after('id');

            // Evitar duplicados dentro de la misma ubicación
            $table->unique(['ubicacion', 'numero'], 'uniq_lockers_ubicacion_numero');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lockers', function (Blueprint $table) {
            $table->dropUnique('uniq_lockers_ubicacion_numero');
            $table->dropColumn('numero');
        });
    }
};

