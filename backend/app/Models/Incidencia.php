<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Incidencia extends Model
{
    use HasFactory;

    protected $table = 'incidencias';

    public const ESTADOS = ['resuelto', 'pendiente', 'anulada'];

    protected $fillable = [
        'locker_id',
        'usuario_id',
        'descripcion',
        'estado',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
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
