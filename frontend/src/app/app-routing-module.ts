import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { TestBackend } from './features/test-backend/test-backend';
import { LoginComponent } from './features/auth/login/login';
import { RegisterComponent } from './features/auth/register/register';
import { DashboardComponent } from './features/dashboard/dashboard/dashboard';
import { authGuard } from './core/auth/auth-guard';
import { deviceGuard } from './core/auth/device-guard';

import { Home } from './features/cliente/home/home';
import { PedidoClave } from './features/cliente/pedido-clave/pedido-clave';
import { PedidoQr } from './features/cliente/pedido-qr/pedido-qr';
import { TotemCodigoComponent } from './features/totem/codigo/totem-codigo';
import { DeviceLoginComponent } from './features/totem/device-login/device-login';
import { Perfil } from './features/cliente/perfil/perfil';
import { PedidoDetalle } from './features/cliente/pedido-detalle/pedido-detalle';

import { HomeEmpresa } from './features/empresa/home-empresa/home-empresa';
import { Pedidos } from './features/empresa/pedidos/pedidos';
import { MisPedidos } from './features/cliente/mis-pedidos/mis-pedidos';
import { RepartidorHome } from './features/repartidor/home/repartidor-home';
import { RepartidorHistorico } from './features/repartidor/historico/historico';
import { PerfilRepartidor } from './features/repartidor/perfil/perfil';
import { ReservaNuevaComponent } from './features/empresa/reservas/reserva-nueva/reserva-nueva';
import { EmpresaPedidoDetalle } from './features/empresa/pedidoDetalle/pedido-detalle';
import { EmpresaRepartidoresComponent } from './features/empresa/repartidores/repartidores';
import { PedidosRepartidorComponent } from './features/empresa/pedidos-repartidor/pedidos-repartidor';
import { TodosPedidosComponent } from './features/empresa/todos-pedidos/todos-pedidos';
import { PerfilEmpresa } from "./features/empresa/perfilEmpresa/perfilEmpresa";
import { EmpresaTarifas } from "./features/empresa/tarifa/tarifaEmpresa";
import { EmpresaIncidencias } from "./features/empresa/incidenciasEmpresa/incidenciasEmpresa";
import { EmpresaIncidenciaDetalle } from "./features/empresa/incidenciaDetalle/incidencia-detalle";
import { UbicacionesEmpresa } from "./features/empresa/ubicaciones/ubicaciones";
import { ProductosEmpresa } from "./features/empresa/productos/productos";
import { ClienteIncidencias  } from "./features/cliente/incidenciasCliente/incidenciasCliente";


import { AdminDashboard } from './features/admin/adminDashboard/adminDashboard';
import { AdminLockers } from './features/admin/adminLockers/adminLockers';
import { LockerDetalle } from "./features/admin/detalleLockers/detalleLockers";
import { EditarLockers } from "./features/admin/editarLockers/editarLockers";
import { CrearLockers } from "./features/admin/crearLockers/crearLockers";
import { AdminEmpresas } from "./features/admin/adminEmpresas/adminEmpresas";
import { EmpresaForm } from "./features/admin/empresaForm/empresaForm";
import { DetalleEmpresa } from "./features/admin/detalleEmpresa/detalleEmpresa";
import { EditarEmpresa } from "./features/admin/editarEmpresa/editarEmpresa";
import { AdminTarifas } from "./features/admin/tarifasAdmin/tarifasAdmin";
import { EditarTarifa } from "./features/admin/editarTarifa/editarTarifa";
import { CrearTarifa } from "./features/admin/crearTarifa/crearTarifa";
import { AdminIncidencias } from "./features/admin/adminIncidencias/adminIncidencias";
import { AdminIncidenciaDetalle } from "./features/admin/adminIncidenciaDetalle/adminIncidenciaDetalle";
import { PerfilAdmin } from "./features/admin/perfilAdmin/perfilAdmin";
import { UbicacionForm } from "./features/admin/ubicacionForm/ubicacionForm";
import { AdminTecnicos } from "./features/admin/adminTecnicos/adminTecnicos";
import { TecnicoForm } from "./features/admin/tecnicoForm/tecnicoForm";
import { DetalleTecnico } from "./features/admin/detalleTecnico/detalleTecnico";
import { TecnicoHome } from "./features/tecnico/home/tecnico-home";
import { TecnicoDetalle } from "./features/tecnico/detalle/tecnico-detalle";
import { TecnicoHistorico } from "./features/tecnico/historico/tecnico-historico";
import { PerfilTecnico } from "./features/tecnico/perfil/perfil";


const routes: Routes = [
  { path: 'test-backend', component: TestBackend },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

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
      { path: 'perfil', component: Perfil },
      { path: 'pedido/:id', component: PedidoDetalle },
      { path: 'pedido/:id/clave', component: PedidoClave },
      { path: 'pedido/:id/qr', component: PedidoQr },
      { path: 'ClienteIncidencias', component: ClienteIncidencias  },

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
      { path: 'reservas/nueva', component: ReservaNuevaComponent },
      { path: 'repartidores', component: EmpresaRepartidoresComponent },
      { path: 'repartidores/:id/pedidos', component: PedidosRepartidorComponent },
      { path: 'repartidores/todos-pedidos', component: TodosPedidosComponent },
      { path: 'PerfilEmpresa', component: PerfilEmpresa },
      { path: 'tarifaEmpresa', component: EmpresaTarifas },
      { path: 'EmpresaIncidencias', component: EmpresaIncidencias },
      { path: 'EmpresaIncidencias/:id', component: EmpresaIncidenciaDetalle },
      { path: 'ubicaciones', component: UbicacionesEmpresa },
      { path: 'productos', component: ProductosEmpresa },


    ],
  },

  {
    path: 'repartidor',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    data: { roles: ['repartidor'] },
    children: [
      { path: '', component: RepartidorHome },
      { path: 'historico', component: RepartidorHistorico },
      { path: 'perfil', component: PerfilRepartidor },
    ],
  },

  {
    path: 'tecnico',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    data: { roles: ['tecnico'] },
    children: [
      { path: '', component: TecnicoHome },
      { path: 'mantenciones/:id', component: TecnicoDetalle },
      { path: 'historico', component: TecnicoHistorico },
      { path: 'perfil', component: PerfilTecnico },
    ],
  },

  {
    path: 'admin',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    data: { roles: ['administrador'] },
    children: [
      { path: '', component: AdminDashboard },
      { path: 'lockers', component: AdminLockers },
      { path: 'detalle/:id', component: LockerDetalle },
      { path: 'editar/:id', component: EditarLockers },
      { path: 'crear', component: CrearLockers },
      { path: 'empresa', component: AdminEmpresas },
      { path: 'empresaForm', component: EmpresaForm },
      { path: 'detalleEmpresa/:id', component: DetalleEmpresa },
      { path: 'editarEmpresa/:id', component: EditarEmpresa },
      { path: 'tarifas', component: AdminTarifas },
      { path: 'crearTarifas', component: CrearTarifa },
      { path: 'editarTarifas/:id', component: EditarTarifa },
      { path: 'AdminIncidencias', component: AdminIncidencias },
      { path: 'IncidenciaDetalle/:id', component: AdminIncidenciaDetalle },
      { path: 'perfilAdmin', component: PerfilAdmin },
      { path: 'ubicaciones/nueva', component: UbicacionForm },
      { path: 'ubicaciones/editar/:id', component: UbicacionForm },
      { path: 'tecnicos', component: AdminTecnicos },
      { path: 'tecnicoForm', component: TecnicoForm },
      { path: 'editarTecnico/:id', component: TecnicoForm },
      { path: 'detalleTecnico/:id', component: DetalleTecnico },

    ]
  },


  { path: '', pathMatch: 'full', redirectTo: 'admin' }, //login
  { path: '**', redirectTo: 'admin' }, //login
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
