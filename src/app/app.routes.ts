import { Routes } from '@angular/router';
import { CategoriesComponent } from './categories/categories.component';

export const routes: Routes = [
  { path: '', redirectTo: '/categories', pathMatch: 'full' },
  { path: 'categories', component: CategoriesComponent },
  // Keep any other routes you need
];