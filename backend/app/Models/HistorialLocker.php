<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HistorialLocker extends Model
{
    use HasFactory;

    protected $table = 'historial_lockers';

    public const ACCIONES = [
        'creado',
        'estado_cambiado',
        'reserva_creada',
        'reserva_completada',
        'reserva_anulada',
        'mantenimiento_programado',
        'mantenimiento_realizado',
        'mantenimiento_cancelado',
        'incidencia_reportada',
        'incidencia_resuelta',
    ];

    protected $fillable = [
        'locker_id',
        'usuario_id',
        'accion',
        'descripcion',
        'datos_anteriores',
        'datos_nuevos',
        'reserva_id',
        'mantenimiento_id',
        'incidencia_id',
    ];

    protected $casts = [
        'datos_anteriores' => 'array',
        'datos_nuevos' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relaciones
    public function locker()
    {
        return $this->belongsTo(Locker::class, 'locker_id');
    }

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }

    public function reserva()
    {
        return $this->belongsTo(Reserva::class, 'reserva_id');
    }

    public function mantenimiento()
    {
        return $this->belongsTo(Mantenimiento::class, 'mantenimiento_id');
    }

    public function incidencia()
    {
        return $this->belongsTo(Incidencia::class, 'incidencia_id');
    }
}

