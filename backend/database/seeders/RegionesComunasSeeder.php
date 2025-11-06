<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Region;
use App\Models\Comuna;

class RegionesComunasSeeder extends Seeder
{
    /**
     * Seeder básico para regiones y comunas de Chile
     * Incluye las principales regiones y algunas comunas representativas
     */
    public function run(): void
    {
        // Región Metropolitana
        $rm = Region::create(['nombre' => 'Región Metropolitana de Santiago']);
        Comuna::create(['nombre' => 'Santiago', 'region_id' => $rm->id]);
        Comuna::create(['nombre' => 'Providencia', 'region_id' => $rm->id]);
        Comuna::create(['nombre' => 'Las Condes', 'region_id' => $rm->id]);
        Comuna::create(['nombre' => 'Ñuñoa', 'region_id' => $rm->id]);
        Comuna::create(['nombre' => 'Maipú', 'region_id' => $rm->id]);
        Comuna::create(['nombre' => 'San Miguel', 'region_id' => $rm->id]);
        Comuna::create(['nombre' => 'Puente Alto', 'region_id' => $rm->id]);
        Comuna::create(['nombre' => 'La Florida', 'region_id' => $rm->id]);

        // Valparaíso
        $valparaiso = Region::create(['nombre' => 'Región de Valparaíso']);
        Comuna::create(['nombre' => 'Valparaíso', 'region_id' => $valparaiso->id]);
        Comuna::create(['nombre' => 'Viña del Mar', 'region_id' => $valparaiso->id]);
        Comuna::create(['nombre' => 'Quilpué', 'region_id' => $valparaiso->id]);
        Comuna::create(['nombre' => 'Villa Alemana', 'region_id' => $valparaiso->id]);

        // Biobío
        $biobio = Region::create(['nombre' => 'Región del Biobío']);
        Comuna::create(['nombre' => 'Concepción', 'region_id' => $biobio->id]);
        Comuna::create(['nombre' => 'Talcahuano', 'region_id' => $biobio->id]);
        Comuna::create(['nombre' => 'Los Ángeles', 'region_id' => $biobio->id]);
        Comuna::create(['nombre' => 'Chillán', 'region_id' => $biobio->id]);

        // Araucanía
        $araucania = Region::create(['nombre' => 'Región de La Araucanía']);
        Comuna::create(['nombre' => 'Temuco', 'region_id' => $araucania->id]);
        Comuna::create(['nombre' => 'Villarrica', 'region_id' => $araucania->id]);
        Comuna::create(['nombre' => 'Pucón', 'region_id' => $araucania->id]);

        // Los Lagos
        $loslagos = Region::create(['nombre' => 'Región de Los Lagos']);
        Comuna::create(['nombre' => 'Puerto Montt', 'region_id' => $loslagos->id]);
        Comuna::create(['nombre' => 'Osorno', 'region_id' => $loslagos->id]);
        Comuna::create(['nombre' => 'Valdivia', 'region_id' => $loslagos->id]);
    }
}

