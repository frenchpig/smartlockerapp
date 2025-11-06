<?php

namespace App\Services;

use App\Models\HistorialLocker;

class HistorialLockerService
{
    /**
     * Registra un evento en el historial de un locker
     */
    public static function registrar(
        int $lockerId,
        string $accion,
        string $descripcion,
        ?int $usuarioId = null,
        ?int $reservaId = null,
        ?int $mantenimientoId = null,
        ?int $incidenciaId = null,
        ?array $datosAnteriores = null,
        ?array $datosNuevos = null,
        ?string $createdAt = null
    ): HistorialLocker {
        // Si no se proporciona usuario_id, usar el usuario autenticado
        if (!$usuarioId) {
            $usuarioId = auth()->id();
        }

        $data = [
            'locker_id' => $lockerId,
            'usuario_id' => $usuarioId,
            'accion' => $accion,
            'descripcion' => $descripcion,
            'reserva_id' => $reservaId,
            'mantenimiento_id' => $mantenimientoId,
            'incidencia_id' => $incidenciaId,
            'datos_anteriores' => $datosAnteriores,
            'datos_nuevos' => $datosNuevos,
        ];

        if ($createdAt) {
            $data['created_at'] = $createdAt;
            $data['updated_at'] = $createdAt;
        }

        return HistorialLocker::create($data);
    }

    /**
     * Registra la creación de un locker
     */
    public static function registrarCreacion(
        int $lockerId,
        int $numeroLocker,
        string $ubicacionNombre,
        ?int $usuarioId = null,
        ?string $createdAt = null
    ): HistorialLocker {
        return self::registrar(
            $lockerId,
            'creado',
            "Locker #{$numeroLocker} creado en {$ubicacionNombre}",
            $usuarioId,
            null,
            null,
            null,
            null,
            null,
            $createdAt
        );
    }

    /**
     * Registra un cambio de estado de un locker
     */
    public static function registrarCambioEstado(
        int $lockerId,
        string $estadoAnterior,
        string $estadoNuevo,
        ?int $usuarioId = null
    ): HistorialLocker {
        return self::registrar(
            $lockerId,
            'estado_cambiado',
            "Estado cambiado de '{$estadoAnterior}' a '{$estadoNuevo}'",
            $usuarioId,
            null,
            null,
            null,
            ['estado' => $estadoAnterior],
            ['estado' => $estadoNuevo]
        );
    }

    /**
     * Registra la creación de una reserva en un locker
     */
    public static function registrarReservaCreada(
        int $lockerId,
        int $reservaId,
        ?int $usuarioId = null,
        ?string $createdAt = null
    ): HistorialLocker {
        return self::registrar(
            $lockerId,
            'reserva_creada',
            "Reserva #{$reservaId} creada - Locker ocupado",
            $usuarioId,
            $reservaId,
            null,
            null,
            null,
            null,
            $createdAt
        );
    }

    /**
     * Registra la finalización/completado de una reserva
     */
    public static function registrarReservaCompletada(
        int $lockerId,
        int $reservaId,
        int $numeroLocker,
        string $usuarioNombre,
        ?string $estadoLockerAnterior = null,
        ?string $estadoLockerNuevo = null,
        ?int $usuarioId = null,
        ?string $createdAt = null
    ): HistorialLocker {
        $descripcion = "Usuario {$usuarioNombre} retiró sus productos de la Reserva #{$reservaId}. ";
        
        if ($estadoLockerAnterior === 'ocupado' && $estadoLockerNuevo === 'activo') {
            $descripcion .= "Locker #{$numeroLocker} desocupado y disponible nuevamente.";
        } else {
            $descripcion .= "Locker #{$numeroLocker} actualizado.";
        }

        return self::registrar(
            $lockerId,
            'reserva_completada',
            $descripcion,
            $usuarioId,
            $reservaId,
            null,
            null,
            $estadoLockerAnterior ? ['estado_locker' => $estadoLockerAnterior] : null,
            $estadoLockerNuevo ? ['estado_locker' => $estadoLockerNuevo] : null,
            $createdAt
        );
    }

    /**
     * Registra la cancelación/anulación de una reserva
     */
    public static function registrarReservaAnulada(
        int $lockerId,
        int $reservaId,
        ?int $usuarioId = null,
        ?string $createdAt = null
    ): HistorialLocker {
        return self::registrar(
            $lockerId,
            'reserva_anulada',
            "Reserva #{$reservaId} anulada",
            $usuarioId,
            $reservaId,
            null,
            null,
            null,
            null,
            $createdAt
        );
    }

    /**
     * Registra el mantenimiento programado de un locker
     */
    public static function registrarMantenimientoProgramado(
        int $lockerId,
        int $mantenimientoId,
        ?string $fechaProgramada = null,
        ?int $usuarioId = null,
        ?string $createdAt = null
    ): HistorialLocker {
        $fechaTexto = $fechaProgramada ? (new \DateTime($fechaProgramada))->format('d/m/Y') : 'fecha por definir';
        return self::registrar(
            $lockerId,
            'mantenimiento_programado',
            "Mantenimiento programado para el {$fechaTexto}",
            $usuarioId,
            null,
            $mantenimientoId,
            null,
            null,
            null,
            $createdAt
        );
    }

    /**
     * Registra el mantenimiento realizado de un locker
     */
    public static function registrarMantenimientoRealizado(
        int $lockerId,
        int $mantenimientoId,
        ?int $usuarioId = null
    ): HistorialLocker {
        return self::registrar(
            $lockerId,
            'mantenimiento_realizado',
            "Mantenimiento realizado exitosamente",
            $usuarioId,
            null,
            $mantenimientoId
        );
    }

    /**
     * Registra el mantenimiento cancelado de un locker
     */
    public static function registrarMantenimientoCancelado(
        int $lockerId,
        int $mantenimientoId,
        ?int $usuarioId = null
    ): HistorialLocker {
        return self::registrar(
            $lockerId,
            'mantenimiento_cancelado',
            "Mantenimiento cancelado",
            $usuarioId,
            null,
            $mantenimientoId
        );
    }

    /**
     * Registra una incidencia reportada en un locker
     */
    public static function registrarIncidenciaReportada(
        int $lockerId,
        int $incidenciaId,
        string $descripcion,
        ?int $usuarioId = null
    ): HistorialLocker {
        return self::registrar(
            $lockerId,
            'incidencia_reportada',
            $descripcion,
            $usuarioId,
            null,
            null,
            $incidenciaId
        );
    }

    /**
     * Registra una incidencia resuelta en un locker
     */
    public static function registrarIncidenciaResuelta(
        int $lockerId,
        int $incidenciaId,
        ?int $usuarioId = null
    ): HistorialLocker {
        return self::registrar(
            $lockerId,
            'incidencia_resuelta',
            "Incidencia resuelta",
            $usuarioId,
            null,
            null,
            $incidenciaId
        );
    }
}

