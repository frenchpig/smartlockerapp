<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Mantenimiento extends Model
{
    use HasFactory;

    protected $table = 'mantenimientos';

    protected $fillable = [
        'locker_id',
        'usuario_id',
        'descripcion',
        'fecha_programada',
        'fecha_real',
        'estado',
    ];

    protected $casts = [
        'fecha_programada' => 'datetime',
        'fecha_real'       => 'datetime',
        'created_at'       => 'datetime',
        'updated_at'       => 'datetime',
    ];

    // Relaciones
    public function locker()
    {
        return $this->belongsTo(Locker::class, 'locker_id');
    }

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }
}
