import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { TestBackend } from './features/test-backend/test-backend';
import { LoginComponent } from './features/auth/login/login';
import { DashboardComponent } from './features/dashboard/dashboard/dashboard';
import { authGuard } from './core/auth/auth-guard';
<<<<<<< HEAD
=======

import { Home } from './features/cliente/home/home';
import { PedidoClave } from './features/cliente/pedido-clave/pedido-clave';
import { PedidoQr } from './features/cliente/pedido-qr/pedido-qr';

>>>>>>> origin/frontend

const routes: Routes = [
  { path: 'test-backend', component: TestBackend },
  { path: 'login', component: LoginComponent },
<<<<<<< HEAD
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' }
=======

  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },


  {
    path: 'cliente',
    children: [
      { path: '', component: Home },
      { path: 'pedido/:id/clave', component: PedidoClave },
      { path: 'pedido/:id/qr', component: PedidoQr },
    ]
  },

  // { path: 'cliente', component: Home },
  // { path: 'cliente/pedido/:id/clave', component: PedidoClave },
  // { path: 'cliente/pedido/:id/qr', component: PedidoQr },

  { path: '', pathMatch: 'full', redirectTo: 'cliente' }, //login
  { path: '**', redirectTo: 'cliente' }, //login
>>>>>>> origin/frontend
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
