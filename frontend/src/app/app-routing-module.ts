import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TestBackend } from './features/test-backend/test-backend';
import { LoginComponent } from './features/auth/login/login';
const routes: Routes = [
  { path: 'test-backend', component: TestBackend },
  { path: 'login', component: LoginComponent },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'test-backend' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
