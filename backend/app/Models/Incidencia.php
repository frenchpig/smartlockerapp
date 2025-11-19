<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Incidencia extends Model
{
    use HasFactory;

    protected $table = 'incidencias';

    public const ESTADOS = ['resuelto', 'pendiente', 'anulada'];
    public const TIPOS = ['locker', 'pedido', 'otro'];

    protected $fillable = [
        'tipo',
        'locker_id',
        'reserva_id',
        'usuario_id',
        'descripcion',
        'estado',
        'datos_pedido',
    ];

    protected $casts = [
        'datos_pedido' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relaciones
    public function locker()
    {
        return $this->belongsTo(Locker::class, 'locker_id');
    }

    public function reserva()
    {
        return $this->belongsTo(Reserva::class, 'reserva_id');
    }

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }
}
