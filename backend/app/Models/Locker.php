<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Locker extends Model
{
    use HasFactory;

    protected $table = 'lockers';

    public const ESTADOS = ['activo', 'bloqueado', 'mantenimiento', 'ocupado'];

    protected $fillable = [
        'ubicacion',
        'latitud',
        'longitud',
        'estado',
        'tamano',
        'codigo_acceso_temporal',
    ];

    protected $casts = [
        'latitud' => 'float',
        'longitud' => 'float',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relaciones
    public function reservas()
    {
        return $this->hasMany(Reserva::class, 'locker_id');
    }

    public function mantenimientos()
    {
        return $this->hasMany(Mantenimiento::class, 'locker_id');
    }

    public function incidencias()
    {
        return $this->hasMany(Incidencia::class, 'locker_id');
    }

    public function enviosOrigen()
    {
        return $this->hasMany(HistorialEnvio::class, 'locker_origen_id');
    }

    public function enviosDestino()
    {
        return $this->hasMany(HistorialEnvio::class, 'locker_destino_id');
    }
}
