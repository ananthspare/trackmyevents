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
  template: `
    <div class="category-events-container">
      <!-- Left Column: Categories -->
      <div class="categories-column">
        <div class="categories-header">
          <h2>Categories</h2>
          <a routerLink="/calendar" class="calendar-link">
            <i class="fa fa-calendar"></i>
          </a>
        </div>

        <!-- Add Category Form -->
        <div class="add-category-form">
          <input 
            type="text" 
            [(ngModel)]="newCategory.name" 
            placeholder="New category"
            (keyup.enter)="createCategory()"
          />
          <input 
            type="color" 
            [(ngModel)]="newCategory.color" 
            title="Choose color"
          />
          <button (click)="createCategory()">
            <i class="fa fa-plus"></i>
          </button>
        </div>

        <!-- Categories List -->
        <div class="categories-list">
          <div *ngFor="let category of categories" 
               class="category-item"
               [class.selected]="category.id === selectedCategoryId"
               (click)="selectCategory(category.id)">
            <div class="category-content">
              <span class="color-dot" [style.backgroundColor]="category.color"></span>
              <span class="category-name">{{ category.name }}</span>
            </div>
            <div class="category-actions">
              <button (click)="startEditCategory(category); $event.stopPropagation()" 
                      class="icon-btn">
                <i class="fa fa-pencil"></i>
              </button>
              <button (click)="deleteCategory(category.id); $event.stopPropagation()" 
                      class="icon-btn">
                <i class="fa fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Events -->
      <div class="events-column">
        <ng-container *ngIf="selectedCategoryId">
          <div class="events-header">
            <h2>{{ getSelectedCategory()?.name }} Events</h2>
          </div>

          <!-- Add Event Form -->
          <div class="add-event-form">
            <input 
              type="text" 
              [(ngModel)]="newEvent.title" 
              placeholder="Event title"
            />
            <input 
              type="datetime-local" 
              [(ngModel)]="newEvent.targetDate"
            />
            <button (click)="createEvent()">
              <i class="fa fa-plus"></i> Add Event
            </button>
          </div>

          <!-- Events List -->
          <div class="events-list">
            <div *ngIf="getEventsForSelectedCategory().length === 0" class="empty-state">
              No events yet. Create one to get started!
            </div>
            <div *ngFor="let event of getEventsForSelectedCategory()" 
                 class="event-item">
              <div class="event-header">
                <h3>{{ event.title }}</h3>
                <div class="event-actions">
                  <button (click)="startEditEvent(event)" class="icon-btn">
                    <i class="fa fa-pencil"></i>
                  </button>
                  <button (click)="deleteEvent(event.id)" class="icon-btn">
                    <i class="fa fa-trash"></i>
                  </button>
                </div>
              </div>
              <div class="event-content">
                <p *ngIf="event.description">{{ event.description }}</p>
                <div class="event-date">
                  {{ event.targetDate | date:'medium' }}
                </div>
                <app-todo-list [eventId]="event.id"></app-todo-list>
              </div>
            </div>
          </div>
        </ng-container>

        <div *ngIf="!selectedCategoryId" class="no-selection">
          <p>Select a category to view events</p>
        </div>
      </div>
    </div>

    <!-- Edit Category Modal -->
    <div *ngIf="editingCategory" class="modal-overlay">
      <div class="modal-content">
        <h3>Edit Category</h3>
        <div class="form-group">
          <label>Name</label>
          <input type="text" [(ngModel)]="editingCategory.name">
        </div>
        <div class="form-group">
          <label>Description</label>
          <input type="text" [(ngModel)]="editingCategory.description">
        </div>
        <div class="form-group">
          <label>Color</label>
          <input type="color" [(ngModel)]="editingCategory.color">
        </div>
        <div class="modal-actions">
          <button (click)="saveEditCategory()" class="save-btn">Save</button>
          <button (click)="cancelEditCategory()" class="cancel-btn">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Edit Event Modal -->
    <div *ngIf="editingEvent" class="modal-overlay">
      <div class="modal-content">
        <h3>Edit Event</h3>
        <div class="form-group">
          <label>Title</label>
          <input type="text" [(ngModel)]="editingEvent.title">
        </div>
        <div class="form-group">
          <label>Description</label>
          <input type="text" [(ngModel)]="editingEvent.description">
        </div>
        <div class="form-group">
          <label>Date & Time</label>
          <input type="datetime-local" [(ngModel)]="editingEvent.targetDate">
        </div>
        <div class="modal-actions">
          <button (click)="saveEditEvent()" class="save-btn">Save</button>
          <button (click)="cancelEditEvent()" class="cancel-btn">Cancel</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .category-events-container {
      display: flex;
      height: calc(100vh - 120px);
      gap: 20px;
    }

    /* Left Column Styles */
    .categories-column {
      width: 300px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      padding: 20px;
    }

    .categories-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .calendar-link {
      color: #2196F3;
      padding: 8px;
      border-radius: 50%;
      transition: background-color 0.2s;
    }

    .calendar-link:hover {
      background-color: rgba(33, 150, 243, 0.1);
    }

    .add-category-form {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
    }

    .add-category-form input[type="text"] {
      flex: 1;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    .add-category-form input[type="color"] {
      width: 36px;
      padding: 2px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    .add-category-form button {
      padding: 8px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    .categories-list {
      flex: 1;
      overflow-y: auto;
    }

    .category-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      margin-bottom: 4px;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .category-item:hover {
      background-color: #f5f5f5;
    }

    .category-item.selected {
      background-color: #e3f2fd;
    }

    .category-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .color-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .category-actions {
      opacity: 0;
      transition: opacity 0.2s;
    }

    .category-item:hover .category-actions {
      opacity: 1;
    }

    /* Right Column Styles */
    .events-column {
      flex: 1;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 20px;
      overflow-y: auto;
    }

    .events-header {
      margin-bottom: 20px;
    }

    .add-event-form {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
    }

    .add-event-form input {
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    .add-event-form input[type="text"] {
      flex: 1;
    }

    .add-event-form button {
      padding: 8px 16px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    .events-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .event-item {
      border: 1px solid #eee;
      border-radius: 8px;
      padding: 16px;
    }

    .event-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .event-header h3 {
      margin: 0;
    }

    .event-actions {
      display: flex;
      gap: 8px;
    }

    .icon-btn {
      background: none;
      border: none;
      padding: 6px;
      border-radius: 4px;
      cursor: pointer;
      color: #666;
      transition: all 0.2s;
    }

    .icon-btn:hover {
      background-color: #f5f5f5;
      color: #2196F3;
    }

    .icon-btn:hover .fa-trash {
      color: #f44336;
    }

    .no-selection {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #666;
      font-style: italic;
    }

    .event-date {
      color: #666;
      font-size: 0.9em;
      margin-bottom: 12px;
    }

    .empty-state {
      text-align: center;
      padding: 20px;
      color: #757575;
      font-style: italic;
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 8px;
      padding: 24px;
      width: 400px;
      max-width: 90%;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 4px;
      font-weight: 500;
    }

    .form-group input {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
    }

    .save-btn, .cancel-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    .save-btn {
      background-color: #4CAF50;
      color: white;
    }

    .cancel-btn {
      background-color: #9e9e9e;
      color: white;
    }
  `]
})
export class CategoryEventsComponent implements OnInit, OnDestroy {
  categories: any[] = [];
  events: any[] = [];
  selectedCategoryId: string | null = null;
  newCategory = { name: '', description: '', color: '#4285F4' };
  editingCategory: any = null;
  newEvent = { title: '', description: '', targetDate: '' };
  editingEvent: any = null;
  
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
    });
  }

  ngOnDestroy(): void {
    if (this.categorySubscription) {
      this.categorySubscription.unsubscribe();
    }
    
    if (this.eventSubscription) {
      this.eventSubscription.unsubscribe();
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
    
    this.eventService.updateEvent({
      ...this.editingEvent,
      targetDate: new Date(this.editingEvent.targetDate).toISOString()
    })
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