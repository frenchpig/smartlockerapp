import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { TestBackend } from './features/test-backend/test-backend';
import { LoginComponent } from './features/auth/login/login';
import { DashboardComponent } from './features/dashboard/dashboard/dashboard';
import { authGuard } from './core/auth/auth-guard';
import { deviceGuard } from './core/auth/device-guard';

import { Home } from './features/cliente/home/home';
import { PedidoClave } from './features/cliente/pedido-clave/pedido-clave';
import { PedidoQr } from './features/cliente/pedido-qr/pedido-qr';
import { TotemCodigoComponent } from './features/totem/codigo/totem-codigo';
import { DeviceLoginComponent } from './features/totem/device-login/device-login';

import { HomeEmpresa } from './features/empresa/home-empresa/home-empresa'
import { Lockers } from './features/empresa/lockers/lockers'
import { Pedidos } from './features/empresa/pedidos/pedidos'
import { MisPedidos } from './features/cliente/mis-pedidos/mis-pedidos'
import { RepartidorHome } from './features/repartidor/home/repartidor-home'
import { ReservaNuevaComponent } from './features/empresa/reservas/reserva-nueva/reserva-nueva'
import { EmpresaPedidoDetalle } from './features/empresa/pedidoDetalle/pedido-detalle'


const routes: Routes = [
  { path: 'test-backend', component: TestBackend },
  { path: 'login', component: LoginComponent },
  
  // Totem routes
  { path: 'totem/device-login', component: DeviceLoginComponent },
  { path: 'totem/codigo', component: TotemCodigoComponent, canActivate: [deviceGuard] },
  { path: 'totem', redirectTo: 'totem/device-login', pathMatch: 'full' },

  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },


  {
    path: 'cliente',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    data: { roles: ['usuario'] },
    children: [
      { path: '', component: Home },
      { path: 'mis-pedidos', component: MisPedidos },
      { path: 'pedido/:id/clave', component: PedidoClave },
      { path: 'pedido/:id/qr', component: PedidoQr },
    ],
  },

  {
    path: 'empresa',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    data: { roles: ['empresa'] },
    children: [
      { path: '', component: HomeEmpresa },
      { path: 'pedidos', component: Pedidos },
      { path: 'pedidos/:id', component: EmpresaPedidoDetalle },
      { path: 'lockers', component: Lockers },
      { path: 'reservas/nueva', component: ReservaNuevaComponent },
    ],
  },

  {
    path: 'repartidor',
    component: RepartidorHome,
    canActivate: [authGuard],
    data: { roles: ['repartidor'] },
  },



  { path: '', pathMatch: 'full', redirectTo: 'login' }, //login
  { path: '**', redirectTo: 'login' }, //login
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
