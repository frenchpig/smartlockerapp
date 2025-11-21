<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductoEmpresa extends Model
{
    use HasFactory;

    protected $table = 'productos_empresa';

    protected $fillable = [
        'empresa_id',
        'nombre',
        'descripcion',
        'sku',
        'peso',
        'activo',
    ];

    protected $casts = [
        'peso' => 'decimal:2',
        'activo' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relaciones
    public function empresa()
    {
        return $this->belongsTo(Usuario::class, 'empresa_id');
    }
}

