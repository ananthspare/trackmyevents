import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { EventService } from '../services/event.service';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="calendar-container">
      <div class="calendar-header">
        <h2>Event Calendar</h2>
        <a routerLink="/categories" class="nav-link">
          Back to Categories
        </a>
      </div>
      <div class="calendar-wrapper">
        <div *ngIf="events.length === 0" class="empty-state">
          No events yet. Create some events in the Categories section.
        </div>
        <div *ngIf="events.length > 0" class="events-list">
          <div *ngFor="let event of events" class="event-item" 
               [style.backgroundColor]="getEventColor(event)"
               (click)="navigateToEvent(event)">
            <h3>{{ event.title }}</h3>
            <p>{{ event.targetDate | date:'medium' }}</p>
            <p *ngIf="event.description">{{ event.description }}</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .calendar-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 20px;
    }
    .calendar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .nav-link {
      color: #2196F3;
      text-decoration: none;
      padding: 8px 16px;
      border: 1px solid #2196F3;
      border-radius: 4px;
    }
    .calendar-wrapper {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      padding: 20px;
      min-height: 400px;
    }
    .empty-state {
      text-align: center;
      padding: 40px;
      color: #757575;
      font-style: italic;
    }
    .events-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 15px;
    }
    .event-item {
      padding: 15px;
      border-radius: 8px;
      cursor: pointer;
      color: white;
      transition: transform 0.2s;
    }
    .event-item:hover {
      transform: translateY(-3px);
    }
    .event-item h3 {
      margin-top: 0;
    }
  `]
})
export class CalendarComponent implements OnInit, OnDestroy {
  events: any[] = [];
  categories: any[] = [];
  private eventSubscription: Subscription | null = null;
  private categorySubscription: Subscription | null = null;

  constructor(
    private router: Router,
    private eventService: EventService
  ) {}

  ngOnInit(): void {
    this.eventSubscription = this.eventService.events$.subscribe(events => {
      this.events = events;
    });
    
    this.categorySubscription = this.eventService.categories$.subscribe(categories => {
      this.categories = categories;
    });
  }

  ngOnDestroy(): void {
    if (this.eventSubscription) {
      this.eventSubscription.unsubscribe();
    }
    if (this.categorySubscription) {
      this.categorySubscription.unsubscribe();
    }
  }

  getEventColor(event: any): string {
    const category = this.categories.find(cat => cat.id === event.categoryID);
    return category?.color || '#4285F4';
  }

  navigateToEvent(event: any): void {
    if (event.categoryID) {
      localStorage.setItem('selectedCategoryId', event.categoryID);
      this.router.navigate(['/categories']);
    }
  }
}