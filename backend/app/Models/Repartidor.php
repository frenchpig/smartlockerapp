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

    protected $appends = [
        'nombre_completo',
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

    /**
     * Obtener el nombre completo del repartidor
     * Prioriza los datos del usuario si existe, sino usa los campos directos
     */
    public function getNombreCompletoAttribute(): string
    {
        if ($this->usuario) {
            return trim($this->usuario->nombre . ' ' . $this->usuario->apellido);
        }
        return trim($this->nombre . ' ' . $this->apellido);
    }
}
