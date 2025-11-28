import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth';

const fallbackRoutes: Record<string, string> = {
  empresa: 'empresa',
  usuario: 'cliente',
  administrador: 'admin',
  tecnico: 'tecnico',
  repartidor: 'repartidor',
};

export const authGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    const restored = await auth.restoreSession();
    if (!restored || !auth.isAuthenticated()) {
      return router.createUrlTree(['/login'], { queryParams: { redirectTo: state.url } });
    }
  }

  const user = auth.user();
  if (!user) {
    return router.createUrlTree(['/login'], { queryParams: { redirectTo: state.url } });
  }

  const allowedRoles = route.data?.['roles'] as string[] | undefined;
  if (!allowedRoles?.length) {
    return true;
  }

  if (allowedRoles.includes(user.rol)) {
    return true;
  }

  const fallback = fallbackRoutes[user.rol] ?? 'login';
  return router.createUrlTree([fallback]);
};
