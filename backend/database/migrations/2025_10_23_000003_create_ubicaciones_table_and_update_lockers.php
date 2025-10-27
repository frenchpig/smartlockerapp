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
        Schema::create('ubicaciones', function (Blueprint $table) {
            $table->id();
            $table->string('nombre')->unique();
            $table->decimal('latitud', 10, 7)->nullable();
            $table->decimal('longitud', 10, 7)->nullable();
            $table->timestamps();
        });

        Schema::table('lockers', function (Blueprint $table) {
            if (Schema::hasColumn('lockers', 'ubicacion') && Schema::hasColumn('lockers', 'numero')) {
                $table->dropUnique('uniq_lockers_ubicacion_numero');
            }
        });

        Schema::table('lockers', function (Blueprint $table) {
            $table->foreignId('ubicacion_id')
                ->nullable()
                ->after('numero')
                ->constrained('ubicaciones')
                ->cascadeOnUpdate()
                ->restrictOnDelete();
        });

        $this->migrateExistingLocations();

        if (!DB::table('lockers')->whereNull('ubicacion_id')->exists()) {
            if (DB::connection()->getDriverName() === 'mysql') {
                DB::statement('ALTER TABLE lockers MODIFY ubicacion_id BIGINT UNSIGNED NOT NULL');
            } else {
                Schema::table('lockers', function (Blueprint $table) {
                    $table->unsignedBigInteger('ubicacion_id')->nullable(false)->change();
                });
            }
        }

        if (Schema::hasColumn('lockers', 'ubicacion')) {
            Schema::table('lockers', function (Blueprint $table) {
                $table->dropColumn(['ubicacion', 'latitud', 'longitud']);
            });
        }

        Schema::table('lockers', function (Blueprint $table) {
            $table->unique(['ubicacion_id', 'numero'], 'uniq_lockers_ubicacion_numero');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lockers', function (Blueprint $table) {
            $table->dropUnique('uniq_lockers_ubicacion_numero');
        });

        Schema::table('lockers', function (Blueprint $table) {
            $table->string('ubicacion')->after('numero');
            $table->decimal('latitud', 10, 7)->nullable()->after('ubicacion');
            $table->decimal('longitud', 10, 7)->nullable()->after('latitud');
        });

        $ubicaciones = DB::table('ubicaciones')->get();
        foreach ($ubicaciones as $ubicacion) {
            DB::table('lockers')
                ->where('ubicacion_id', $ubicacion->id)
                ->update([
                    'ubicacion' => $ubicacion->nombre,
                    'latitud' => $ubicacion->latitud,
                    'longitud' => $ubicacion->longitud,
                ]);
        }

        Schema::table('lockers', function (Blueprint $table) {
            $table->dropConstrainedForeignId('ubicacion_id');
            $table->unique(['ubicacion', 'numero'], 'uniq_lockers_ubicacion_numero');
        });

        Schema::dropIfExists('ubicaciones');
    }

    private function migrateExistingLocations(): void
    {
        $lockers = DB::table('lockers')
            ->select('ubicacion', DB::raw('MIN(latitud) as latitud'), DB::raw('MIN(longitud) as longitud'))
            ->groupBy('ubicacion')
            ->get();

        $map = [];

        foreach ($lockers as $locker) {
            if (!$locker->ubicacion) {
                continue;
            }

            $id = DB::table('ubicaciones')->insertGetId([
                'nombre' => $locker->ubicacion,
                'latitud' => $locker->latitud,
                'longitud' => $locker->longitud,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $map[$locker->ubicacion] = $id;
        }

        foreach ($map as $nombre => $ubicacionId) {
            DB::table('lockers')
                ->where('ubicacion', $nombre)
                ->update(['ubicacion_id' => $ubicacionId]);
        }

        $sinNombre = DB::table('lockers')
            ->whereNull('ubicacion')
            ->orWhere('ubicacion', '')
            ->pluck('id');

        if ($sinNombre->isNotEmpty()) {
            $placeholderId = DB::table('ubicaciones')->insertGetId([
                'nombre' => 'Sin ubicacion',
                'latitud' => null,
                'longitud' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('lockers')
                ->whereIn('id', $sinNombre)
                ->update(['ubicacion_id' => $placeholderId]);
        }
    }
};
