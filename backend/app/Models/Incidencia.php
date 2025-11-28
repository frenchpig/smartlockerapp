<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Incidencia extends Model
{
    use HasFactory;

    protected $table = 'incidencias';

    public const ESTADOS = ['resuelto', 'pendiente', 'anulada'];
    public const TIPOS = ['locker', 'pedido', 'otro'];

    // Tipos de problemas según el tipo de incidencia
    public const PROBLEMAS_LOCKER = [
        'no_se_abre',
        'no_se_cierra',
        'dañado',
        'bloqueado',
        'sin_energia',
        'codigo_no_funciona',
        'sensor_defectuoso',
        'otro',
    ];

    public const PROBLEMAS_PEDIDO = [
        'pedido_incorrecto',
        'pedido_dañado',
        'pedido_faltante',
        'pedido_extraviado',
        'pedido_no_es_el_solicitado',
        'articulos_faltantes',
        'articulos_dañados',
        'pedido_retrasado',
        'otro',
    ];

    public const PROBLEMAS_OTRO = [
        'problema_general',
        'otro',
    ];

    protected $fillable = [
        'tipo',
        'problema_tipo',
        'locker_id',
        'reserva_id',
        'usuario_id',
        'descripcion',
        'estado',
        'datos_pedido',
        'comentario_cierre',
        'disponible_para_cerrar',
        'tecnico_id',
    ];

    protected $casts = [
        'datos_pedido' => 'array',
        'disponible_para_cerrar' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relaciones
    public function locker()
    {
        return $this->belongsTo(Locker::class, 'locker_id');
    }

    public function reserva()
    {
        return $this->belongsTo(Reserva::class, 'reserva_id');
    }

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }
    
    public function tecnico()
    {
        return $this->belongsTo(Usuario::class, 'tecnico_id');
    }
    
    public function mantenimientos()
    {
        return $this->hasMany(Mantenimiento::class, 'incidencia_id');
    }

    /**
     * Obtener los tipos de problemas válidos según el tipo de incidencia
     */
    public static function getProblemasByTipo(string $tipo): array
    {
        return match($tipo) {
            'locker' => self::PROBLEMAS_LOCKER,
            'pedido' => self::PROBLEMAS_PEDIDO,
            'otro' => self::PROBLEMAS_OTRO,
            default => [],
        };
    }
}
