import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TestBackend } from './features/test-backend/test-backend';

const routes: Routes = [
  { path: 'test-backend', component: TestBackend },
  { path: '', pathMatch: 'full', redirectTo: 'test-backend' },
  { path: '**', redirectTo: 'test-backend' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
