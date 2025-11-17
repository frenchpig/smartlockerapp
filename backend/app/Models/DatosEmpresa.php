<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DatosEmpresa extends Model
{
    use HasFactory;

    protected $table = 'datos_empresa';

    protected $fillable = [
        'usuario_id',
        'nombre',
        'razon_social',
        'rut',
        'direccion',
        'comuna_id',
        'tarifa_id',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relación: datos_empresa pertenece a un usuario
     */
    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }

    /**
     * Relación: datos_empresa pertenece a una comuna
     */
    public function comuna()
    {
        return $this->belongsTo(Comuna::class, 'comuna_id');
    }

    /**
     * Relación: datos_empresa pertenece a una tarifa
     */
    public function tarifa()
    {
        return $this->belongsTo(Tarifa::class, 'tarifa_id');
    }

    /**
     * Relación: datos_empresa tiene muchos registros de historial
     */
    public function historial()
    {
        return $this->hasMany(HistorialEmpresa::class, 'usuario_id', 'usuario_id');
    }
}

