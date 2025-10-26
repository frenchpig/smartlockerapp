<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateDevice
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Get the bearer token from the request
        $token = $request->bearerToken();
        
        if (!$token) {
            return response()->json(['message' => 'No autenticado'], 401);
        }

        // Find the token in the database
        $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
        
        if (!$accessToken) {
            return response()->json(['message' => 'Token inválido'], 401);
        }

        // Get the tokenable model (should be Ubicacion)
        $ubicacion = $accessToken->tokenable;
        
        if (!$ubicacion instanceof \App\Models\Ubicacion) {
            return response()->json(['message' => 'Token no válido para dispositivo'], 401);
        }

        // Set the authenticated ubicacion in the request
        $request->setUserResolver(function () use ($ubicacion) {
            return $ubicacion;
        });

        Auth::setUser($ubicacion);

        return $next($request);
    }
}

