<?php

namespace App\Services;

use App\Models\Usuario;
use App\Models\Locker;
use App\Models\Ubicacion;
use App\Models\EmpresaUbicacion;
use App\Models\Reserva;
use Illuminate\Support\Facades\DB;

class TarifaLimitacionService
{
    /**
     * Valida y aplica las limitaciones de tarifa al crear una reserva
     * 
     * @param Usuario $empresa La empresa que está creando la reserva
     * @param Locker $locker El locker que se quiere reservar
     * @throws \Exception Si se exceden las limitaciones de la tarifa
     */
    public static function validarYAsignarUbicacion(Usuario $empresa, Locker $locker): void
    {
        // Verificar que el usuario es una empresa
        if ($empresa->rol !== 'empresa') {
            throw new \Exception('El usuario no es una empresa');
        }

        // Obtener datos de la empresa y su tarifa
        $datosEmpresa = $empresa->datosEmpresa;
        if (!$datosEmpresa) {
            throw new \Exception('La empresa no tiene datos registrados');
        }

        $tarifa = $datosEmpresa->tarifa;
        if (!$tarifa) {
            throw new \Exception('La empresa no tiene una tarifa asignada');
        }

        $ubicacion = $locker->ubicacion;
        if (!$ubicacion) {
            throw new \Exception('El locker no tiene una ubicación asignada');
        }

        // Verificar que la empresa tenga ubicaciones seleccionadas
        $ubicacionesSeleccionadas = EmpresaUbicacion::where('empresa_id', $empresa->id)
            ->pluck('ubicacion_id')
            ->toArray();

        if (empty($ubicacionesSeleccionadas)) {
            throw new \Exception(
                'Debes seleccionar al menos una ubicación antes de crear reservas. ' .
                'Ve a la configuración de tu empresa para seleccionar tus ubicaciones.'
            );
        }

        // Verificar que el locker esté en una de las ubicaciones seleccionadas
        if (!in_array($ubicacion->id, $ubicacionesSeleccionadas)) {
            $ubicacionesNombres = Ubicacion::whereIn('id', $ubicacionesSeleccionadas)
                ->pluck('nombre')
                ->toArray();
            
            throw new \Exception(
                "Solo puedes crear reservas en tus ubicaciones seleccionadas. " .
                "Este locker está en '{$ubicacion->nombre}', pero tus ubicaciones seleccionadas son: " .
                implode(', ', $ubicacionesNombres) . ". " .
                "Puedes cambiar tus ubicaciones en la configuración de tu empresa."
            );
        }

        // Verificar límite de lockers por sede
        // Si lockers_por_sede es 0, significa capacidad infinita, no se valida límite
        if ($tarifa->lockers_por_sede > 0) {
            $lockersEnUsoEnEstaSede = Reserva::where('empresa_id', $empresa->id)
                ->where('estado', 'pendiente')
                ->whereHas('locker', function ($query) use ($ubicacion) {
                    $query->where('ubicacion_id', $ubicacion->id);
                })
                ->count();

            if ($lockersEnUsoEnEstaSede >= $tarifa->lockers_por_sede) {
                throw new \Exception(
                    "Has alcanzado el límite de lockers permitidos en esta sede ({$tarifa->lockers_por_sede}). " .
                    "Tu tarifa '{$tarifa->nombre_publico}' permite máximo {$tarifa->lockers_por_sede} locker(s) por sede. " .
                    "Actualmente tienes {$lockersEnUsoEnEstaSede} locker(s) en uso en '{$ubicacion->nombre}'."
                );
            }
        }
    }

    /**
     * Obtiene información sobre las limitaciones y uso actual de una empresa
     * 
     * @param Usuario $empresa
     * @return array
     */
    public static function obtenerInfoLimitaciones(Usuario $empresa): array
    {
        if ($empresa->rol !== 'empresa') {
            return [];
        }

        $datosEmpresa = $empresa->datosEmpresa;
        if (!$datosEmpresa || !$datosEmpresa->tarifa) {
            return [
                'tiene_tarifa' => false,
            ];
        }

        $tarifa = $datosEmpresa->tarifa;
        $sedesAsignadas = EmpresaUbicacion::where('empresa_id', $empresa->id)->count();
        
        // Obtener lockers en uso por sede
        $lockersPorSede = [];
        $sedes = EmpresaUbicacion::where('empresa_id', $empresa->id)
            ->with('ubicacion')
            ->get();

        foreach ($sedes as $empresaUbicacion) {
            $ubicacion = $empresaUbicacion->ubicacion;
            $lockersEnUso = Reserva::where('empresa_id', $empresa->id)
                ->where('estado', 'pendiente')
                ->whereHas('locker', function ($query) use ($ubicacion) {
                    $query->where('ubicacion_id', $ubicacion->id);
                })
                ->count();

            $lockersPorSede[] = [
                'ubicacion_id' => $ubicacion->id,
                'ubicacion_nombre' => $ubicacion->nombre,
                'lockers_en_uso' => $lockersEnUso,
                'lockers_permitidos' => $tarifa->lockers_por_sede,
            ];
        }

        return [
            'tiene_tarifa' => true,
            'tarifa' => [
                'id' => $tarifa->id,
                'nombre' => $tarifa->nombre_publico,
                'sedes_permitidas' => $tarifa->sedes_permitidas,
                'lockers_por_sede' => $tarifa->lockers_por_sede,
            ],
            'uso_actual' => [
                'sedes_asignadas' => $sedesAsignadas,
                'sedes_disponibles' => max(0, $tarifa->sedes_permitidas - $sedesAsignadas),
                'lockers_por_sede' => $lockersPorSede,
            ],
        ];
    }
}

