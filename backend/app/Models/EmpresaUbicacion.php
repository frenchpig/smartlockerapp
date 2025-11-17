<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmpresaUbicacion extends Model
{
    use HasFactory;

    protected $table = 'empresa_ubicacion';

    protected $fillable = [
        'empresa_id',
        'ubicacion_id',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relación: empresa_ubicacion pertenece a una empresa (usuario)
     */
    public function empresa()
    {
        return $this->belongsTo(Usuario::class, 'empresa_id');
    }

    /**
     * Relación: empresa_ubicacion pertenece a una ubicación
     */
    public function ubicacion()
    {
        return $this->belongsTo(Ubicacion::class, 'ubicacion_id');
    }
}
