<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Ubicacion extends Authenticatable
{
    use HasApiTokens, HasFactory;

    protected $table = 'ubicaciones';

    protected $fillable = [
        'nombre',
        'latitud',
        'longitud',
        'device_username',
        'device_password',
    ];

    protected $hidden = [
        'device_password',
    ];

    protected $casts = [
        'latitud' => 'float',
        'longitud' => 'float',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Mutator para encriptar la contraseña del dispositivo con SHA-256
     */
    protected function devicePassword(): Attribute
    {
        return Attribute::make(
            set: fn ($value) => $value ? hash('sha256', $value) : null
        );
    }

    public function lockers()
    {
        return $this->hasMany(Locker::class, 'ubicacion_id');
    }

    /**
     * Relación: una ubicación puede ser usada por muchas empresas
     */
    public function empresasAsignadas()
    {
        return $this->hasMany(EmpresaUbicacion::class, 'ubicacion_id');
    }
}
