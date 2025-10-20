import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;

  const restored = await auth.restoreSession();
  if (restored && auth.isAuthenticated()) return true;

  return router.createUrlTree(['/login']);
};
