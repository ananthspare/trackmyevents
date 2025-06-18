import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { EventService } from '../services/event.service';
import { TodoListComponent } from '../todo-list/todo-list.component';

@Component({
  selector: 'app-category-events',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TodoListComponent],
  templateUrl: './category-events.component.html',
  styleUrl: './category-events.component.css'
})
export class CategoryEventsComponent implements OnInit, OnDestroy {
  categories: any[] = [];
  events: any[] = [];
  selectedCategoryId: string | null = null;
  newCategory = { name: '', description: '', color: '#4285F4' };
  editingCategory: any = null;
  newEvent = { title: '', description: '', targetDate: '' };
  editingEvent: any = null;
  countdowns: { [key: string]: any } = {};
  countdownInterval: any;
  
  private categorySubscription: Subscription | null = null;
  private eventSubscription: Subscription | null = null;

  constructor(private eventService: EventService) {}

  ngOnInit(): void {
    const storedCategoryId = localStorage.getItem('selectedCategoryId');
    
    this.categorySubscription = this.eventService.categories$.subscribe(categories => {
      this.categories = categories;
      
      if (storedCategoryId && categories.length > 0) {
        const exists = categories.some(cat => cat.id === storedCategoryId);
        if (exists) {
          this.selectCategory(storedCategoryId);
        } else if (categories.length > 0) {
          this.selectCategory(categories[0].id);
        }
        localStorage.removeItem('selectedCategoryId');
      } else if (categories.length > 0 && !this.selectedCategoryId) {
        this.selectCategory(categories[0].id);
      }
    });
    
    this.eventSubscription = this.eventService.events$.subscribe(events => {
      this.events = events;
      this.updateCountdowns();
    });
    
    this.countdownInterval = setInterval(() => this.updateCountdowns(), 1000);
  }

  ngOnDestroy(): void {
    if (this.categorySubscription) {
      this.categorySubscription.unsubscribe();
    }
    
    if (this.eventSubscription) {
      this.eventSubscription.unsubscribe();
    }
    
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  selectCategory(categoryId: string): void {
    this.selectedCategoryId = categoryId;
    this.editingCategory = null;
    this.editingEvent = null;
  }

  getEventsForSelectedCategory(): any[] {
    if (!this.selectedCategoryId) return [];
    return this.events.filter(event => event.categoryID === this.selectedCategoryId);
  }

  getSelectedCategory(): any {
    return this.categories.find(cat => cat.id === this.selectedCategoryId);
  }

  updateCountdowns(): void {
    const now = new Date().getTime();
    
    this.getEventsForSelectedCategory().forEach(event => {
      if (!event || !event.targetDate) return;
      
      try {
        const targetTime = new Date(event.targetDate).getTime();
        const timeLeft = targetTime - now;
        
        if (timeLeft <= 0) {
          this.countdowns[event.id] = { expired: true };
        } else {
          const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
          const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
          
          this.countdowns[event.id] = { days, hours, minutes, seconds, expired: false };
        }
      } catch (error) {
        console.error('Error calculating countdown for event', event.id, error);
      }
    });
  }

  createCategory(): void {
    if (!this.newCategory.name.trim()) return;
    
    this.eventService.createCategory(this.newCategory)
      .then((result: any) => {
        this.newCategory = { name: '', description: '', color: '#4285F4' };
        if (result?.id) {
          this.selectCategory(result.id);
        }
      })
      .catch((error: any) => {
        console.error('Error creating category', error);
      });
  }

  startEditCategory(category: any): void {
    this.editingCategory = { 
      ...category,
      description: category.description || '',
      color: category.color || '#4285F4'
    };
  }

  cancelEditCategory(): void {
    this.editingCategory = null;
  }

  saveEditCategory(): void {
    if (!this.editingCategory || !this.editingCategory.name.trim()) return;
    
    this.eventService.updateCategory(this.editingCategory)
      .then(() => {
        this.editingCategory = null;
      })
      .catch((error: any) => {
        console.error('Error updating category', error);
      });
  }

  deleteCategory(id: string): void {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    this.eventService.deleteCategory(id)
      .then(() => {
        if (id === this.selectedCategoryId) {
          const remainingCategories = this.categories.filter(c => c.id !== id);
          if (remainingCategories.length > 0) {
            this.selectCategory(remainingCategories[0].id);
          } else {
            this.selectedCategoryId = null;
          }
        }
      })
      .catch((error: any) => {
        console.error('Error deleting category', error);
      });
  }

  createEvent(): void {
    if (!this.newEvent.title.trim() || !this.newEvent.targetDate || !this.selectedCategoryId) return;
    
    this.eventService.createEvent({
      ...this.newEvent,
      categoryID: this.selectedCategoryId
    }).then(() => {
      this.newEvent = { title: '', description: '', targetDate: '' };
    }).catch((error: any) => {
      console.error('Error creating event', error);
    });
  }

  startEditEvent(event: any): void {
    try {
      const date = new Date(event.targetDate);
      const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      const formattedDate = localDate.toISOString().slice(0, 16);
      
      this.editingEvent = { 
        ...event, 
        description: event.description || '',
        targetDate: formattedDate
      };
    } catch (error) {
      console.error('Error formatting date', error);
      this.editingEvent = { 
        ...event, 
        description: event.description || '',
        targetDate: ''
      };
    }
  }

  cancelEditEvent(): void {
    this.editingEvent = null;
  }

  saveEditEvent(): void {
    if (!this.editingEvent || !this.editingEvent.title.trim() || !this.editingEvent.targetDate) return;
    
    this.eventService.updateEvent(this.editingEvent)
      .then(() => {
        this.editingEvent = null;
      })
      .catch((error: any) => {
        console.error('Error updating event', error);
      });
  }

  deleteEvent(id: string): void {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    this.eventService.deleteEvent(id)
      .catch((error: any) => {
        console.error('Error deleting event', error);
      });
  }
}