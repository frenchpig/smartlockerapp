import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { TestBackend } from './features/test-backend/test-backend';
import { LoginComponent } from './features/auth/login/login';
import { DashboardComponent } from './features/dashboard/dashboard/dashboard';
import { authGuard } from './core/auth/auth-guard';

import { Home } from './features/cliente/home/home';
import { PedidoClave } from './features/cliente/pedido-clave/pedido-clave';
import { PedidoQr } from './features/cliente/pedido-qr/pedido-qr';

import { HomeEmpresa } from './features/empresa/home-empresa/home-empresa'
import { Lockers } from './features/empresa/lockers/lockers'
import { Pedidos } from './features/empresa/pedidos/pedidos'



const routes: Routes = [
  { path: 'test-backend', component: TestBackend },
  { path: 'login', component: LoginComponent },

  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },


  {
    path: 'cliente',
    canActivate: [authGuard],
    children: [
      { path: '', component: Home },
      { path: 'pedido/:id/clave', component: PedidoClave },
      { path: 'pedido/:id/qr', component: PedidoQr },
    ]
  },

    {
    path: 'empresa',
    children: [
      { path: '', component: HomeEmpresa },
      { path: 'pedidos', component: Pedidos },
      { path: 'lockers', component: Lockers },
    ],
  },



  { path: '', pathMatch: 'full', redirectTo: 'empresa' }, //login
  { path: '**', redirectTo: 'empresa' }, //login
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
