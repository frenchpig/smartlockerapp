<?php

namespace App\Services;

use App\Models\HistorialEmpresa;

class HistorialEmpresaService
{
    /**
     * Registra un evento en el historial de una empresa
     */
    public static function registrar(
        int $usuarioId,
        string $tipo,
        string $descripcion,
        ?int $reservaId = null,
        ?array $detalles = null
    ): HistorialEmpresa {
        return HistorialEmpresa::create([
            'usuario_id' => $usuarioId,
            'tipo' => $tipo,
            'descripcion' => $descripcion,
            'reserva_id' => $reservaId,
            'detalles' => $detalles,
        ]);
    }

    /**
     * Registra la creación de una cuenta de empresa
     */
    public static function registrarCreacionCuenta(int $usuarioId, string $nombreEmpresa): HistorialEmpresa
    {
        return self::registrar(
            $usuarioId,
            'creacion_cuenta',
            "Se registró la empresa '{$nombreEmpresa}' en el sistema.",
            null,
            ['nombre_empresa' => $nombreEmpresa]
        );
    }

    /**
     * Registra la creación de una reserva
     */
    public static function registrarReservaCreada(
        int $usuarioId,
        int $reservaId,
        ?string $lockerUbicacion = null
    ): HistorialEmpresa {
        $descripcion = "Se generó una nueva reserva";
        if ($lockerUbicacion) {
            $descripcion .= " en locker ubicado en {$lockerUbicacion}";
        }
        $descripcion .= ".";

        return self::registrar(
            $usuarioId,
            'reserva_creada',
            $descripcion,
            $reservaId,
            ['locker_ubicacion' => $lockerUbicacion]
        );
    }

    /**
     * Registra la cancelación de una reserva
     */
    public static function registrarReservaCancelada(
        int $usuarioId,
        int $reservaId,
        ?string $motivo = null
    ): HistorialEmpresa {
        $descripcion = "Se canceló una reserva";
        if ($motivo) {
            $descripcion .= ". Motivo: {$motivo}";
        }
        $descripcion .= ".";

        return self::registrar(
            $usuarioId,
            'reserva_cancelada',
            $descripcion,
            $reservaId,
            ['motivo' => $motivo]
        );
    }

    /**
     * Registra la finalización/completado de una reserva
     */
    public static function registrarReservaCompletada(
        int $usuarioId,
        int $reservaId
    ): HistorialEmpresa {
        return self::registrar(
            $usuarioId,
            'reserva_completada',
            "Se completó una reserva exitosamente.",
            $reservaId
        );
    }

    /**
     * Registra la actualización de datos de la empresa
     */
    public static function registrarDatosActualizados(
        int $usuarioId,
        array $camposModificados
    ): HistorialEmpresa {
        $campos = implode(', ', array_keys($camposModificados));
        return self::registrar(
            $usuarioId,
            'datos_actualizados',
            "Se actualizaron los siguientes datos: {$campos}.",
            null,
            ['campos_modificados' => $camposModificados]
        );
    }
}

