<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Usuario;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string', 'min:6'],
        ]);

        $user = Usuario::where('email', $data['email'])->first();

        // Validación manual con SHA-256
        if (!$user || $user->contrasena !== hash('sha256', $data['password'])) {
            throw ValidationException::withMessages([
                'email' => ['Las credenciales no son válidas.'],
            ]);
        }

        // Opcional: revocar tokens anteriores si "Recordarme" viene falso
        if (!$request->boolean('remember')) { $user->tokens()->delete(); }

        $token = $user->createToken('web')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => [
                'id'       => $user->id,
                'nombre'   => $user->nombre,
                'apellido' => $user->apellido,
                'email'    => $user->email,
                'telefono' => $user->telefono,
                'rol'      => $user->rol,
            ],
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user(); // via sanctum
        return response()->json([
            'id'       => $user->id,
            'nombre'   => $user->nombre,
            'apellido' => $user->apellido,
            'email'    => $user->email,
            'telefono' => $user->telefono,
            'rol'      => $user->rol,
        ]);
    }

    public function logout(Request $request)
    {
        // Revoca el token actual
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Sesión cerrada']);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'nombre'    => ['sometimes','string','max:255'],
            'apellido'  => ['sometimes','string','max:255'],
            'email'     => ['sometimes','email','max:255', Rule::unique('usuarios','email')->ignore($user->id)],
            'telefono'  => ['sometimes','nullable','string','max:50'],
        ]);

        $user->update($data);

        return response()->json([
            'id'       => $user->id,
            'nombre'   => $user->nombre,
            'apellido' => $user->apellido,
            'email'    => $user->email,
            'telefono' => $user->telefono,
            'rol'      => $user->rol,
        ]);
    }

    public function changePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password'     => ['required', 'string', 'min:6'],
        ]);

        $user = $request->user();

        // Validar contraseña actual
        if ($user->contrasena !== hash('sha256', $data['current_password'])) {
            return response()->json([
                'message' => 'La contraseña actual no es correcta'
            ], 422);
        }

        // Actualizar contraseña
        $user->update(['contrasena' => $data['new_password']]);

        return response()->json(['message' => 'Contraseña actualizada correctamente']);
    }
}
