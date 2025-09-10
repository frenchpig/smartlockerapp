<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Reserva extends Model
{
    use HasFactory;

    protected $table = 'reservas';

    public const ESTADOS = ['pendiente', 'completado', 'anulado'];
    public const TIPOS_ACCESO = ['qr', 'codigo_temporal'];

    protected $fillable = [
        'usuario_id',
        'locker_id',
        'fecha_reserva',
        'hora_inicio',
        'hora_fin',
        'estado',
        'tipo_acceso',
        'codigo_acceso',
    ];

    protected $casts = [
        'fecha_reserva' => 'datetime',
        'hora_inicio'   => 'datetime',
        'hora_fin'      => 'datetime',
        'created_at'    => 'datetime',
        'updated_at'    => 'datetime',
    ];

    // Relaciones
    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }

    public function locker()
    {
        return $this->belongsTo(Locker::class, 'locker_id');
    }
}
