import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

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

@NgModule({
  declarations: [App, TestBackend,],

  imports: [
    BrowserModule,
    AppRoutingModule,
    Home,
    PedidoClave,
    PedidoQr,
    MisPedidos,
    RepartidorHome,
    ReservaNuevaComponent
  ],

  providers: [
    provideHttpClient(withInterceptors([authInterceptor, deviceAuthInterceptor])),
    provideBrowserGlobalErrorListeners(),
  ],

  bootstrap: [App]
})

export class AppModule { }
