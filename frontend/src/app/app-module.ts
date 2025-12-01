import { NgModule, provideBrowserGlobalErrorListeners, LOCALE_ID } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeEsCL from '@angular/common/locales/es-CL';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { TestBackend } from './features/test-backend/test-backend';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/auth/auth-interceptor';
import { deviceAuthInterceptor } from './core/auth/device-auth.interceptor';

import { Home } from './features/cliente/home/home';
import { PedidoClave } from './features/cliente/pedido-clave/pedido-clave';
import { PedidoQr } from './features/cliente/pedido-qr/pedido-qr';
import { MisPedidos } from './features/cliente/mis-pedidos/mis-pedidos';
import { RepartidorHome } from './features/repartidor/home/repartidor-home';
import { ReservaNuevaComponent } from './features/empresa/reservas/reserva-nueva/reserva-nueva';
import { PedidoDetalle } from './features/cliente/pedido-detalle/pedido-detalle';

// Registrar locale para español de Chile
registerLocaleData(localeEsCL);

@NgModule({
  declarations: [App, TestBackend,],

  imports: [
    BrowserModule,
    AppRoutingModule,
    Home,
    PedidoClave,
    PedidoQr,
    PedidoDetalle,
    MisPedidos,
    RepartidorHome,
    ReservaNuevaComponent
  ],

  providers: [
    provideHttpClient(withInterceptors([authInterceptor, deviceAuthInterceptor])),
    provideBrowserGlobalErrorListeners(),
    { provide: LOCALE_ID, useValue: 'es-CL' },
  ],

  bootstrap: [App]
})

export class AppModule { }
