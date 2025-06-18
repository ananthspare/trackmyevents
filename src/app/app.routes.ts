import { Routes } from '@angular/router';
import { CategoryEventsComponent } from './category-events/category-events.component';

export const routes: Routes = [
  { path: '', redirectTo: '/categories', pathMatch: 'full' },
  { path: 'categories', component: CategoryEventsComponent },
  { path: 'calendar', component: CategoryEventsComponent } // Placeholder until we create a calendar component
];