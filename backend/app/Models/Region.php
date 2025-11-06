<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Region extends Model
{
    use HasFactory;

    protected $table = 'regiones';

    protected $fillable = [
        'nombre',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relación: una región tiene muchas comunas
     */
    public function comunas()
    {
        return $this->hasMany(Comuna::class, 'region_id');
    }
}

