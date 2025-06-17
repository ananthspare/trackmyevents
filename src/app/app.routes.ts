import { Routes } from '@angular/router';
import { CategoriesComponent } from './categories/categories.component';
import { EventsComponent } from './events/events.component';

export const routes: Routes = [
  { path: '', redirectTo: '/categories', pathMatch: 'full' },
  { path: 'categories', component: CategoriesComponent },
  { path: 'events/:id', component: EventsComponent },
];