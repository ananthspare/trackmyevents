import { Routes } from '@angular/router';
import { TodosComponent } from './todos/todos.component';
import { CategoryEventsComponent } from './category-events/category-events.component';
import { CalendarComponent } from './calendar/calendar.component';

export const routes: Routes = [
  { path: '', redirectTo: 'categories', pathMatch: 'full' },
  { path: 'categories', component: CategoryEventsComponent },
  { path: 'calendar', component: CalendarComponent }
];