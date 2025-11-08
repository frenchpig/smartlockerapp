<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Repartidor extends Model
{
    use HasFactory;

    protected $table = 'repartidores';

    protected $fillable = [
        'usuario_id',
        'empresa_id',
        'rut',
        'disponible',
    ];

    protected $casts = [
        'disponible' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }

    public function empresa()
    {
        return $this->belongsTo(Usuario::class, 'empresa_id');
    }

    public function reservas()
    {
        return $this->hasMany(Reserva::class, 'repartidor_id');
    }
}
