<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HistorialEmpresa extends Model
{
    use HasFactory;

    protected $table = 'historial_empresa';

    public const TIPOS = [
        'creacion_cuenta',
        'reserva_creada',
        'reserva_cancelada',
        'reserva_completada',
        'datos_actualizados',
        'locker_asignado',
        'locker_liberado',
        'estado_cambiado'
    ];

    protected $fillable = [
        'usuario_id',
        'tipo',
        'descripcion',
        'reserva_id',
        'detalles',
    ];

    protected $casts = [
        'detalles' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relación: historial pertenece a un usuario (empresa)
     */
    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }

    /**
     * Relación: historial puede estar relacionado con una reserva
     */
    public function reserva()
    {
        return $this->belongsTo(Reserva::class, 'reserva_id');
    }
}
