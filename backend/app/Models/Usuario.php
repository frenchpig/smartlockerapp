<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Foundation\Auth\User as Authenticatable; // <- importante
use Laravel\Sanctum\HasApiTokens;                       // <- importante

class Usuario extends Authenticatable
{
    use HasApiTokens, HasFactory;

    protected $table = 'usuarios';

    public const ROLES = ['empresa', 'usuario', 'administrador', 'tecnico'];

    protected $fillable = [
        'nombre',
        'apellido',
        'email',
        'contrasena',
        'telefono',
        'rol',
    ];

    protected $hidden = [
        'contrasena',
        'remember_token',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Mutator para encriptar la contraseña con SHA-256
     */
    protected function contrasena(): Attribute
    {
        return Attribute::make(
            set: fn ($value) => $value ? hash('sha256', $value) : null
        );
    }

    // Relaciones...
    public function notificaciones() { return $this->hasMany(Notificacion::class, 'usuario_id'); }
    public function reservas()       { return $this->hasMany(Reserva::class, 'usuario_id'); }
    public function mantenimientos() { return $this->hasMany(Mantenimiento::class, 'usuario_id'); }
    public function incidencias()    { return $this->hasMany(Incidencia::class, 'usuario_id'); }
    public function historialEnvios(){ return $this->hasMany(HistorialEnvio::class, 'usuario_id'); }
}
