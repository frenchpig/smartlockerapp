<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Tarifa extends Model
{
    use HasFactory;

    protected $fillable = [
        'nombre_publico',
        'codigo_interno',
        'precio_mensual',
        'estado',
        'descripcion_corta',
        'sedes_permitidas',
        'lockers_por_sede',
        'prioridad_soporte',
        'incluye',
        'no_incluye',
    ];

    protected $casts = [
        'precio_mensual' => 'integer',
        'sedes_permitidas' => 'integer',
        'lockers_por_sede' => 'integer',
        'incluye' => 'array',
        'no_incluye' => 'array',
    ];
}
