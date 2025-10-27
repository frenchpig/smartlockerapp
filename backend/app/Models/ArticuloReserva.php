<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ArticuloReserva extends Model
{
    use HasFactory;

    protected $table = 'articulos_reserva';

    protected $fillable = [
        'reserva_id',
        'nombre',
        'cantidad',
        'descripcion',
        'sku',
        'peso',
    ];

    protected $casts = [
        'cantidad' => 'integer',
        'peso' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relaciones
    public function reserva()
    {
        return $this->belongsTo(Reserva::class, 'reserva_id');
    }
}

