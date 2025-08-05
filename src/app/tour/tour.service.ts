import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface TourStep {
  target: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class TourService {
  private currentStepSubject = new BehaviorSubject<number>(-1);
  private isActiveSubject = new BehaviorSubject<boolean>(false);
  
  currentStep$ = this.currentStepSubject.asObservable();
  isActive$ = this.isActiveSubject.asObservable();
  
  steps: TourStep[] = [
    {
      target: '.nav-buttons',
      title: 'Navigation Tabs',
      content: 'Switch between Categories and Calendar views using these tabs.',
      position: 'bottom'
    },
    {
      target: '.categories-sidebar',
      title: 'Categories Panel',
      content: 'Create and manage categories to organize your events. You can create subcategories too.',
      position: 'right'
    },
    {
      target: '.add-category-form',
      title: 'Add Category',
      content: 'Use this form to create new categories. Select a parent to create subcategories.',
      position: 'right'
    },
    {
      target: '.events-content',
      title: 'Events Panel',
      content: 'View and manage events for the selected category. Each event shows a real-time countdown.',
      position: 'left'
    },
    {
      target: '.add-event-form',
      title: 'Add Event',
      content: 'Create new events with title, description, and target date.',
      position: 'left'
    },
    {
      target: '[class*="nav-btn"]:last-child',
      title: 'Calendar View',
      content: 'Switch to calendar view to see events in a monthly layout.',
      position: 'bottom',
      action: () => this.switchToCalendar()
    },
    {
      target: '.calendar-container',
      title: 'Calendar Grid',
      content: 'View events in a traditional calendar format. Click on dates to filter events.',
      position: 'left'
    },
    {
      target: '.events-sidebar',
      title: 'Event List',
      content: 'Filter and view events by different time periods. Use the folder icon to navigate back to categories.',
      position: 'right'
    }
  ];
  
  private appComponent: any;
  
  setAppComponent(component: any) {
    this.appComponent = component;
  }
  
  startTour() {
    this.isActiveSubject.next(true);
    this.currentStepSubject.next(0);
  }
  
  nextStep() {
    const current = this.currentStepSubject.value;
    if (current < this.steps.length - 1) {
      const nextStep = current + 1;
      const step = this.steps[nextStep];
      if (step.action) step.action();
      this.currentStepSubject.next(nextStep);
    } else {
      this.endTour();
    }
  }
  
  skipStep() {
    this.nextStep();
  }
  
  endTour() {
    this.isActiveSubject.next(false);
    this.currentStepSubject.next(-1);
  }
  
  private switchToCalendar() {
    if (this.appComponent) {
      this.appComponent.setActiveTab('calendar');
    }
  }
}