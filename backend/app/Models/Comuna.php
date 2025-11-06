<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Comuna extends Model
{
    use HasFactory;

    protected $table = 'comunas';

    protected $fillable = [
        'nombre',
        'region_id',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relación: una comuna pertenece a una región
     */
    public function region()
    {
        return $this->belongsTo(Region::class, 'region_id');
    }

    /**
     * Relación: una comuna puede tener muchas empresas
     */
    public function datosEmpresas()
    {
        return $this->hasMany(DatosEmpresa::class, 'comuna_id');
    }
}

