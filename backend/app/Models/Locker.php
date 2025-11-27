<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Locker extends Model
{
    use HasFactory;

    protected $table = 'lockers';

    public const ESTADOS = ['activo', 'bloqueado', 'mantenimiento', 'ocupado'];
    public const TAMANOS_VALIDOS = ['S', 'M', 'L', 'XL'];

    protected $fillable = [
        'numero',
        'ubicacion_id',
        'estado',
        'tamano',
        'codigo_acceso_temporal',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function ubicacion()
    {
        return $this->belongsTo(Ubicacion::class, 'ubicacion_id');
    }

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

    public function historial()
    {
        return $this->hasMany(HistorialLocker::class, 'locker_id');
    }
}
