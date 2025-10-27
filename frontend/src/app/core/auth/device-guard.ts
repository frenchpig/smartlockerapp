import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { DeviceAuthService } from './device-auth.service';

export const deviceGuard: CanActivateFn = async (route, state) => {
  const deviceAuth = inject(DeviceAuthService);
  const router = inject(Router);

  if (!deviceAuth.isAuthenticated()) {
    const restored = await deviceAuth.restoreSession();
    if (!restored || !deviceAuth.isAuthenticated()) {
      return router.createUrlTree(['/totem/device-login']);
    }
  }

  return true;
};

