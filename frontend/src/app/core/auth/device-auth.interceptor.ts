import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { DeviceAuthService } from './device-auth.service';

export const deviceAuthInterceptor: HttpInterceptorFn = (req, next) => {
  // Only intercept totem-related routes
  if (req.url.includes('/totem/') || req.url.includes('/device/')) {
    const deviceAuth = inject(DeviceAuthService);
    const token = deviceAuth.getToken();

    if (token) {
      req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }
  }

  return next(req);
};

