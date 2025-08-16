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
      content: 'Switch between Categories, Calendar, and Planner views. Categories for organizing events, Calendar for monthly view, and Planner for daily time management.',
      position: 'bottom'
    },
    {
      target: '.categories-sidebar',
      title: 'Categories Panel',
      content: 'Create hierarchical categories to organize your events. Drag and drop to reorder or move categories. Root categories can have unlimited subcategories.',
      position: 'right'
    },
    {
      target: '.add-category-form',
      title: 'Add Category',
      content: 'Create new categories with name and description. Select a parent category to create subcategories for better organization.',
      position: 'right'
    },
    {
      target: '.events-content',
      title: 'Events Panel',
      content: 'View events for selected category with real-time countdowns. Events show urgency colors: red (urgent), orange (warning), yellow (caution). Use drag handle (⋮⋮) to move events between categories.',
      position: 'left'
    },
    {
      target: '.add-event-form',
      title: 'Add Event',
      content: 'Create events with title, description, and target date/time. All times are stored in UTC and displayed in your timezone.',
      position: 'left'
    },
    {
      target: '.drag-handle',
      title: 'Drag Handle',
      content: 'Use the drag handle (⋮⋮) to move events between categories. This prevents accidental dragging when selecting todo text or clicking other buttons.',
      position: 'top'
    },
    {
      target: '.snooze-btn',
      title: 'Event Snoozing',
      content: 'Snooze events with flexible options: once, daily, weekly (select specific days), or custom intervals. Set end dates for recurring snoozes.',
      position: 'top'
    },
    {
      target: '[class*="nav-btn"]:nth-child(2)',
      title: 'Calendar View',
      content: 'Switch to calendar view to see events in monthly layout with drag-and-drop support.',
      position: 'bottom',
      action: () => this.switchToCalendar()
    },
    {
      target: '.calendar-container',
      title: 'Calendar Grid',
      content: 'Monthly calendar showing events on their dates. Snooze occurrences appear on multiple dates. Drag events to reschedule with date/time picker.',
      position: 'left'
    },
    {
      target: '.events-sidebar',
      title: 'Event Filters',
      content: 'Filter events by time periods: today, next 2/7/30 days, past events, etc. Use folder icon to navigate to event in categories view.',
      position: 'right'
    },
    {
      target: '[class*="nav-btn"]:nth-child(3)',
      title: 'Day Planner',
      content: 'Switch to day planner for detailed time management.',
      position: 'bottom',
      action: () => this.switchToPlanner()
    },
    {
      target: '.planner-header',
      title: 'Planner Controls',
      content: 'Select date, adjust time range (6 AM - 9 PM default), and choose view: Today, Week, Work Week, or Monthly overview.',
      position: 'bottom'
    },
    {
      target: '.time-slot',
      title: 'Time Slots',
      content: '30-minute time slots for detailed planning. Add tasks and see scheduled events. Snooze events show with bell icon and original date.',
      position: 'right'
    },
    {
      target: '.copy-btn',
      title: 'Task Management',
      content: 'Copy tasks to next day or entire week. Save all tasks to persist your daily plans.',
      position: 'top'
    },
    {
      target: '.profile-btn',
      title: 'User Profile',
      content: 'Access profile settings to configure timezone, notification preferences (daily/weekly reminders), and personal information.',
      position: 'bottom',
      action: () => this.switchToProfile()
    },
    {
      target: '.tour-btn',
      title: 'Tour Complete!',
      content: 'You can restart this tour anytime. The app supports timezone conversion, drag-and-drop, snooze scheduling, and comprehensive event management.',
      position: 'bottom'
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
  
  previousStep() {
    const current = this.currentStepSubject.value;
    if (current > 0) {
      this.currentStepSubject.next(current - 1);
    }
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
  
  private switchToPlanner() {
    if (this.appComponent) {
      this.appComponent.setActiveTab('planner');
    }
  }
  
  private switchToProfile() {
    if (this.appComponent) {
      this.appComponent.setActiveTab('profile');
    }
  }
}