import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { TodoListComponent } from '../todo-list/todo-list.component';

const client = generateClient<Schema>();

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, TodoListComponent],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css'
})
export class CalendarComponent implements OnInit, OnDestroy {
  currentDate = new Date();
  currentMonth = this.currentDate.getMonth();
  currentYear = this.currentDate.getFullYear();
  selectedDate = new Date();
  calendarDays: any[] = [];
  events: any[] = [];
  filteredEvents: any[] = [];
  viewType = 'month';
  selectedEvent: any = null;
  selectedEventCountdown: any = null;
  countdownInterval: any;
  isEditingEvent = false;
  editingEventData: any = {};
  monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  ngOnInit() {
    this.generateCalendar();
    this.loadEvents();
    this.filterEvents();
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  generateCalendar() {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    this.calendarDays = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      this.calendarDays.push({
        date: date,
        day: date.getDate(),
        isCurrentMonth: date.getMonth() === this.currentMonth,
        isToday: this.isToday(date),
        events: []
      });
    }
  }

  async loadEvents() {
    try {
      const result = await client.models.Event.list();
      this.events = result.data || [];
      this.mapEventsToCalendar();
      this.filterEvents();
    } catch (error) {
      console.error('Error loading events:', error);
    }
  }

  mapEventsToCalendar() {
    this.calendarDays.forEach(day => {
      day.events = this.events.filter(event => {
        const eventDate = new Date(event.targetDate);
        return this.isSameDay(day.date, eventDate);
      });
    });
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return this.isSameDay(date, today);
  }

  isSameDay(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  previousMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.generateCalendar();
    this.mapEventsToCalendar();
  }

  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.generateCalendar();
    this.mapEventsToCalendar();
    this.filterEvents();
  }

  selectDay(date: Date) {
    this.selectedDate = new Date(date);
    this.viewType = 'day';
    this.filterEvents();
  }

  onViewChange() {
    this.filterEvents();
  }

  filterEvents() {
    const now = new Date();
    
    switch (this.viewType) {
      case 'day':
        this.filteredEvents = this.events.filter(event => {
          const eventDate = new Date(event.targetDate);
          return this.isSameDay(eventDate, this.selectedDate);
        });
        break;
        
      case 'week':
        const weekStart = this.getWeekStart(this.selectedDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        this.filteredEvents = this.events.filter(event => {
          const eventDate = new Date(event.targetDate);
          return eventDate >= weekStart && eventDate <= weekEnd;
        });
        break;
        
      case 'month':
      default:
        this.filteredEvents = this.events.filter(event => {
          const eventDate = new Date(event.targetDate);
          return eventDate.getMonth() === this.currentMonth && 
                 eventDate.getFullYear() === this.currentYear;
        });
        break;
    }
    
    this.filteredEvents.sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
  }

  getWeekStart(date: Date): Date {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day;
    return new Date(start.setDate(diff));
  }

  getEventListTitle(): string {
    switch (this.viewType) {
      case 'day':
        return `Events for ${this.selectedDate.toLocaleDateString()}`;
      case 'week':
        const weekStart = this.getWeekStart(this.selectedDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `Events for Week of ${weekStart.toLocaleDateString()}`;
      case 'month':
      default:
        return `Events for ${this.monthNames[this.currentMonth]} ${this.currentYear}`;
    }
  }

  openEventPopup(event: any) {
    this.selectedEvent = event;
    this.updateSelectedEventCountdown();
    
    // Update countdown every second
    this.countdownInterval = setInterval(() => {
      this.updateSelectedEventCountdown();
    }, 1000);
  }

  closeEventPopup() {
    this.selectedEvent = null;
    this.selectedEventCountdown = null;
    this.isEditingEvent = false;
    this.editingEventData = {};
    
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  startEditEvent() {
    this.isEditingEvent = true;
    this.editingEventData = {
      title: this.selectedEvent.title,
      description: this.selectedEvent.description || '',
      targetDate: this.formatDateForInput(this.selectedEvent.targetDate)
    };
  }

  async saveEventEdit() {
    try {
      await client.models.Event.update({
        id: this.selectedEvent.id,
        title: this.editingEventData.title,
        description: this.editingEventData.description,
        targetDate: this.editingEventData.targetDate
      });
      
      // Update local data
      this.selectedEvent.title = this.editingEventData.title;
      this.selectedEvent.description = this.editingEventData.description;
      this.selectedEvent.targetDate = this.editingEventData.targetDate;
      
      // Refresh events and calendar
      await this.loadEvents();
      
      this.isEditingEvent = false;
    } catch (error) {
      console.error('Error updating event:', error);
    }
  }

  cancelEventEdit() {
    this.isEditingEvent = false;
    this.editingEventData = {};
  }

  formatDateForInput(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
  }

  updateSelectedEventCountdown() {
    if (!this.selectedEvent || !this.selectedEvent.targetDate) return;
    
    const now = new Date().getTime();
    const targetTime = new Date(this.selectedEvent.targetDate).getTime();
    const timeLeft = targetTime - now;
    
    if (timeLeft <= 0) {
      this.selectedEventCountdown = { expired: true };
    } else {
      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      
      this.selectedEventCountdown = { days, hours, minutes, seconds, expired: false };
    }
  }
}