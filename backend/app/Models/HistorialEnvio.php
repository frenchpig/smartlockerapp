<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HistorialEnvio extends Model
{
    use HasFactory;

    protected $table = 'historial_envios';

    public const ESTADOS = ['recibido', 'cancelado', 'pendiente'];

    protected $fillable = [
        'usuario_id',
        'locker_origen_id',
        'locker_destino_id',
        'fecha_envio',
        'fecha_recepcion',
        'estado',
        'codigo_seguimiento',
    ];

    protected $casts = [
        'fecha_envio'     => 'datetime',
        'fecha_recepcion' => 'datetime',
        'created_at'      => 'datetime',
        'updated_at'      => 'datetime',
    ];

    // Relaciones
    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }

    public function lockerOrigen()
    {
        return $this->belongsTo(Locker::class, 'locker_origen_id');
    }

    public function lockerDestino()
    {
        return $this->belongsTo(Locker::class, 'locker_destino_id');
    }
}
