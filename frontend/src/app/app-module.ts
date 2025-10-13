import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { TestBackend } from './features/test-backend/test-backend';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/auth/auth-interceptor';
<<<<<<< HEAD
=======

import { Home } from './features/cliente/home/home';
import { PedidoClave } from './features/cliente/pedido-clave/pedido-clave';
import { PedidoQr } from './features/cliente/pedido-qr/pedido-qr';
>>>>>>> origin/frontend

@NgModule({
  declarations: [App, TestBackend,],

  imports: [
    BrowserModule,
    AppRoutingModule,
    Home,
    PedidoClave,
    PedidoQr
  ],

  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
  ],

  bootstrap: [App]
})

export class AppModule { }
