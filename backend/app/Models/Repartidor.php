<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Repartidor extends Model
{
    use HasFactory;

    protected $table = 'repartidores';

    protected $fillable = [
        'empresa_id',
        'nombre',
        'apellido',
        'email',
        'telefono',
        'rut',
        'disponible',
    ];

    protected $casts = [
        'disponible' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function empresa()
    {
        return $this->belongsTo(Usuario::class, 'empresa_id');
    }

    public function reservas()
    {
        return $this->hasMany(Reserva::class, 'repartidor_id');
    }

    /**
     * Obtener el nombre completo del repartidor
     */
    public function getNombreCompletoAttribute(): string
    {
        return trim($this->nombre . ' ' . $this->apellido);
    }
}
