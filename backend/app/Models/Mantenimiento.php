<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Mantenimiento extends Model
{
    use HasFactory;

    protected $table = 'mantenimientos';

    public const ESTADOS = ['resuelta', 'pendiente', 'cancelado'];
    public const TIPOS = ['preventivo', 'correctivo'];
    
    public const COMENTARIOS_DEFAULT = [
        'Problema solucionado',
        'Mantención realizada',
        'Reparación completada',
        'Sistema restaurado',
        'Mantención preventiva completada',
    ];

    protected $fillable = [
        'locker_id',
        'usuario_id', // técnico asignado
        'descripcion',
        'fecha_mantenimiento',
        'fecha_programada', // mantener para compatibilidad
        'fecha_real',
        'es_urgente',
        'estado',
        'comentarios',
        'incidencia_id',
        'tipo',
    ];

    protected $casts = [
        'fecha_mantenimiento' => 'datetime',
        'fecha_programada' => 'datetime',
        'fecha_real'       => 'datetime',
        'es_urgente'       => 'boolean',
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
    
    public function tecnico()
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }
    
    public function incidencia()
    {
        return $this->belongsTo(Incidencia::class, 'incidencia_id');
    }
}
