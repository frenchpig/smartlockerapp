<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Reserva extends Model
{
    use HasFactory;

    protected $table = 'reservas';

    public const ESTADOS = ['pendiente', 'completado', 'anulado'];
    public const LOGISTICA_ESTADOS = ['pendiente_repartidor', 'asignado', 'en_camino', 'completado'];
    public const TIPOS_ACCESO = ['qr', 'codigo_temporal'];

    protected $fillable = [
        'usuario_id',
        'empresa_id',
        'locker_id',
        'tamano_pedido',
        'ubicacion_destino_id',
        'fecha_reserva',
        'hora_inicio',
        'hora_fin',
        'estado',
        'tipo_acceso',
        'codigo_acceso',
        'repartidor_id',
        'logistica_estado',
    ];

    protected $casts = [
        'fecha_reserva' => 'datetime',
        'hora_inicio'   => 'datetime',
        'hora_fin'      => 'datetime',
        'created_at'    => 'datetime',
        'updated_at'    => 'datetime',
    ];

    protected $with = [
        'locker.ubicacion',
        'repartidor',
        'articulos',
    ];

    // Relaciones
    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }

    public function empresa()
    {
        return $this->belongsTo(Usuario::class, 'empresa_id');
    }

    public function locker()
    {
        return $this->belongsTo(Locker::class, 'locker_id');
    }

    public function repartidor()
    {
        return $this->belongsTo(Repartidor::class, 'repartidor_id');
    }

    public function articulos()
    {
        return $this->hasMany(ArticuloReserva::class, 'reserva_id');
    }

    public function ubicacionDestino()
    {
        return $this->belongsTo(Ubicacion::class, 'ubicacion_destino_id');
    }
}
