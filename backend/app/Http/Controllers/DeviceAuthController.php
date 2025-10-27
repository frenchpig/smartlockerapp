<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Ubicacion;
use Illuminate\Validation\ValidationException;

class DeviceAuthController extends Controller
{
    /**
     * Autentica un dispositivo totem usando credenciales de ubicación
     */
    public function login(Request $request)
    {
        $data = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        // Buscar ubicación por device_username
        $ubicacion = Ubicacion::where('device_username', $data['username'])->first();

        // Validar credenciales
        if (!$ubicacion || !$ubicacion->device_password) {
            throw ValidationException::withMessages([
                'username' => ['Las credenciales no son válidas.'],
            ]);
        }

        // Validar contraseña
        $passwordHash = hash('sha256', $data['password']);
        if ($ubicacion->device_password !== $passwordHash) {
            throw ValidationException::withMessages([
                'username' => ['Las credenciales no son válidas.'],
            ]);
        }

        // Revocar tokens anteriores si es necesario (opcional)
        $ubicacion->tokens()->delete();

        // Crear token con scope 'device' para identificar que es un token de dispositivo
        $token = $ubicacion->createToken('device', ['device'])->plainTextToken;

        return response()->json([
            'token' => $token,
            'ubicacion' => [
                'id' => $ubicacion->id,
                'nombre' => $ubicacion->nombre,
                'latitud' => $ubicacion->latitud,
                'longitud' => $ubicacion->longitud,
            ],
        ]);
    }

    /**
     * Obtener información de la ubicación del dispositivo autenticado
     */
    public function me(Request $request)
    {
        // Obtener la ubicación desde el token
        $ubicacion = $request->user();

        return response()->json([
            'ubicacion' => [
                'id' => $ubicacion->id,
                'nombre' => $ubicacion->nombre,
                'latitud' => $ubicacion->latitud,
                'longitud' => $ubicacion->longitud,
            ],
        ]);
    }

    /**
     * Cerrar sesión del dispositivo
     */
    public function logout(Request $request)
    {
        // Revocar el token actual
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Sesión cerrada']);
    }
}

