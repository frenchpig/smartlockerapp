<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Ubicacion extends Model
{
    use HasFactory;

    protected $table = 'ubicaciones';

    protected $fillable = [
        'nombre',
        'latitud',
        'longitud',
    ];

    protected $casts = [
        'latitud' => 'float',
        'longitud' => 'float',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function lockers()
    {
        return $this->hasMany(Locker::class, 'ubicacion_id');
    }
}
