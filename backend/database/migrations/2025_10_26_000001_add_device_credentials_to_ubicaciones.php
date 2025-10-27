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
        Schema::table('ubicaciones', function (Blueprint $table) {
            $table->string('device_username')->nullable()->unique()->after('longitud');
            $table->string('device_password')->nullable()->after('device_username');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ubicaciones', function (Blueprint $table) {
            $table->dropColumn(['device_username', 'device_password']);
        });
    }
};

