<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('mantenimientos', function (Blueprint $table) {
            // Agregar campo fecha_mantenimiento (mantener fecha_programada para compatibilidad)
            $table->dateTime('fecha_mantenimiento')->nullable()->after('descripcion');
            
            // Agregar campo es_urgente
            $table->boolean('es_urgente')->default(false)->after('fecha_mantenimiento');
            
            // Agregar campo comentarios
            $table->text('comentarios')->nullable()->after('estado');
            
            // Agregar relación con incidencia (opcional)
            $table->foreignId('incidencia_id')->nullable()->after('comentarios')->constrained('incidencias')->nullOnDelete();
        });
        
        // Migrar datos de fecha_programada a fecha_mantenimiento si existen
        DB::statement('UPDATE mantenimientos SET fecha_mantenimiento = fecha_programada WHERE fecha_programada IS NOT NULL AND fecha_mantenimiento IS NULL');
        
        // Actualizar estados existentes que no coincidan con los valores esperados
        DB::statement("UPDATE mantenimientos SET estado = 'pendiente' WHERE estado IS NULL OR estado NOT IN ('resuelta', 'pendiente', 'cancelado')");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mantenimientos', function (Blueprint $table) {
            $table->dropForeign(['incidencia_id']);
            $table->dropColumn(['fecha_mantenimiento', 'es_urgente', 'comentarios', 'incidencia_id']);
            $table->string('estado')->nullable()->change();
        });
    }
};
