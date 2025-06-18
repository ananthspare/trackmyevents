import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private eventsSubject = new BehaviorSubject<any[]>([]);
  private categoriesSubject = new BehaviorSubject<any[]>([]);
  
  events$: Observable<any[]> = this.eventsSubject.asObservable();
  categories$: Observable<any[]> = this.categoriesSubject.asObservable();

  constructor() {
    // Initialize with sample data
    this.categoriesSubject.next([
      { id: '1', name: 'Work', description: 'Work related events', color: '#4285F4' },
      { id: '2', name: 'Personal', description: 'Personal events', color: '#EA4335' }
    ]);
    
    this.eventsSubject.next([
      { id: '1', title: 'Meeting', description: 'Team meeting', targetDate: new Date().toISOString(), categoryID: '1' },
      { id: '2', title: 'Gym', description: 'Workout session', targetDate: new Date().toISOString(), categoryID: '2' }
    ]);
  }

  getEventsByCategory(categoryId: string): Observable<any[]> {
    return this.events$.pipe(
      map(events => events.filter(event => event.categoryID === categoryId))
    );
  }

  getCategoryById(categoryId: string): Observable<any> {
    return this.categories$.pipe(
      map(categories => categories.find(cat => cat.id === categoryId) || null)
    );
  }

  // Mock CRUD operations
  createCategory(category: any): Promise<any> {
    return new Promise((resolve) => {
      const newCategory = {
        ...category,
        id: Date.now().toString()
      };
      
      const currentCategories = this.categoriesSubject.value;
      this.categoriesSubject.next([...currentCategories, newCategory]);
      
      resolve(newCategory);
    });
  }

  updateCategory(category: any): Promise<any> {
    return new Promise((resolve) => {
      const currentCategories = this.categoriesSubject.value;
      const updatedCategories = currentCategories.map(cat => 
        cat.id === category.id ? { ...cat, ...category } : cat
      );
      
      this.categoriesSubject.next(updatedCategories);
      resolve(category);
    });
  }

  deleteCategory(id: string): Promise<any> {
    return new Promise((resolve) => {
      const currentCategories = this.categoriesSubject.value;
      this.categoriesSubject.next(currentCategories.filter(cat => cat.id !== id));
      
      // Also delete related events
      const currentEvents = this.eventsSubject.value;
      this.eventsSubject.next(currentEvents.filter(event => event.categoryID !== id));
      
      resolve({ id });
    });
  }

  createEvent(event: any): Promise<any> {
    return new Promise((resolve) => {
      const newEvent = {
        ...event,
        id: Date.now().toString()
      };
      
      const currentEvents = this.eventsSubject.value;
      this.eventsSubject.next([...currentEvents, newEvent]);
      
      resolve(newEvent);
    });
  }

  updateEvent(event: any): Promise<any> {
    return new Promise((resolve) => {
      const currentEvents = this.eventsSubject.value;
      const updatedEvents = currentEvents.map(evt => 
        evt.id === event.id ? { ...evt, ...event } : evt
      );
      
      this.eventsSubject.next(updatedEvents);
      resolve(event);
    });
  }

  deleteEvent(id: string): Promise<any> {
    return new Promise((resolve) => {
      const currentEvents = this.eventsSubject.value;
      this.eventsSubject.next(currentEvents.filter(event => event.id !== id));
      resolve({ id });
    });
  }
}