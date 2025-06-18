import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
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
      { id: '2', name: 'Personal', description: 'Personal events', color: '#EA4335' },
      { id: '3', name: 'Family', description: 'Family events', color: '#FBBC05' },
      { id: '4', name: 'Health', description: 'Health and fitness', color: '#34A853' }
    ]);
    
    this.eventsSubject.next([
      { 
        id: '1', 
        title: 'Team Meeting', 
        description: 'Weekly team sync-up', 
        targetDate: new Date(Date.now() + 86400000).toISOString(), 
        categoryID: '1' 
      },
      { 
        id: '2', 
        title: 'Gym Session', 
        description: 'Cardio workout', 
        targetDate: new Date(Date.now() + 172800000).toISOString(), 
        categoryID: '4' 
      },
      { 
        id: '3', 
        title: 'Family Dinner', 
        description: 'At Mom\'s place', 
        targetDate: new Date(Date.now() + 259200000).toISOString(), 
        categoryID: '3' 
      },
      { 
        id: '4', 
        title: 'Movie Night', 
        description: 'Watch new release', 
        targetDate: new Date(Date.now() + 345600000).toISOString(), 
        categoryID: '2' 
      }
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

  // CRUD operations for Category
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

  // CRUD operations for Event
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