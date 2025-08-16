import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { TodoListComponent } from '../todo-list/todo-list.component';
import { TimezoneService } from '../shared/timezone.service';

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
  categories: any[] = [];
  viewType = 'month';
  selectedEvent: any = null;
  selectedEventCountdown: any = null;
  countdownInterval: any;
  isEditingEvent = false;
  editingEventData: any = {};
  monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  draggedEvent: any = null;
  showDateTimeModal = false;
  dropTargetDate = '';
  newDateTime = '';
  showCreateEventModal = false;
  selectedDateForEvent = '';
  newEventData = {
    title: '',
    description: '',
    targetDate: '',
    categoryID: '',
    subcategoryID: ''
  };
  subcategories: any[] = [];
  editingSubcategories: any[] = [];
  
  // Snooze functionality
  snoozeEvent: any = null;
  snoozeType = 'once';
  snoozeDate = '';
  snoozeTime = '09:00';
  customInterval = 1;
  customUnit = 'days';
  recurrenceEndDate = '';
  weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  selectedWeekdays = [false, false, false, false, false, false, false];
  weeklyTime = '09:00';
    
  @Output() navigateToCategories = new EventEmitter<{eventId: string, categoryId: string}>();
  @Output() navigateToPlanner = new EventEmitter<string>();

  constructor(private timezoneService: TimezoneService) {}
  
  showSnoozeModal(event: any) {
    this.snoozeEvent = event;
    
    // Parse existing snooze data if available
    let existingSnoozeData: any = null;
    if (event.snoozeDates) {
      try {
        const parsed = JSON.parse(event.snoozeDates);
        if (parsed.startDate || (parsed.dates && parsed.dates.length > 0)) {
          existingSnoozeData = parsed;
        }
      } catch (error) {
        console.error('Error parsing existing snooze data:', error);
      }
    }
    
    if (existingSnoozeData) {
      // Load existing snooze configuration
      this.snoozeType = existingSnoozeData.type || 'once';
      this.snoozeDate = existingSnoozeData.startDate || new Date().toISOString().split('T')[0];
      this.customInterval = existingSnoozeData.customInterval || 1;
      this.customUnit = existingSnoozeData.customUnit || 'days';
      this.recurrenceEndDate = existingSnoozeData.endDate || '';
      this.selectedWeekdays = existingSnoozeData.weekdays || [false, false, false, false, false, false, false];
      this.weeklyTime = existingSnoozeData.weeklyTime || '09:00';
    } else {
      // Set default values for new snooze
      const now = new Date();
      const eventDate = new Date(event.targetDate);
      let defaultDate: Date;
      
      if (eventDate > now) {
        defaultDate = new Date(eventDate);
        defaultDate.setDate(defaultDate.getDate() + 1);
      } else {
        defaultDate = new Date(now.getTime() + (60 * 60 * 1000));
      }
      
      this.snoozeDate = new Date().toISOString().split('T')[0];
      this.snoozeType = 'once';
      this.customInterval = 1;
      this.customUnit = 'days';
      this.recurrenceEndDate = '';
      this.selectedWeekdays = [false, false, false, false, false, false, false];
    }
  }
  
  cancelSnooze() {
    this.snoozeEvent = null;
  }
  
  async confirmSnooze() {
    if (!this.snoozeEvent || !this.snoozeDate) return;
    
    if (this.snoozeType === 'weekly' && !this.selectedWeekdays.some(day => day)) {
      alert('Please select at least one day for weekly recurrence.');
      return;
    }
    
    try {
      if (this.snoozeType === 'once') {
        const snoozeData = {
          type: 'once',
          startDate: this.snoozeDate
        };
        
        await client.models.Event.update({
          id: this.snoozeEvent.id,
          snoozeDates: JSON.stringify(snoozeData)
        });
      } else {
        const snoozeData = {
          type: this.snoozeType,
          startDate: this.snoozeDate,
          endDate: this.recurrenceEndDate || this.getDefaultEndDate(),
          customInterval: this.customInterval,
          customUnit: this.customUnit,
          weekdays: this.selectedWeekdays
        };
        
        await client.models.Event.update({
          id: this.snoozeEvent.id,
          snoozeDates: JSON.stringify(snoozeData)
        });
      }
      
      await this.loadEvents();
      this.snoozeEvent = null;
    } catch (error) {
      console.error('Error snoozing event:', error);
      alert('Error snoozing event. Please try again.');
    }
  }
  

  
  getNextWeeklyOccurrence(fromDate: Date): Date | null {
    const selectedDays = this.selectedWeekdays.map((selected, index) => selected ? index : -1).filter(day => day !== -1);
    if (selectedDays.length === 0) return null;
    
    let nextDate = new Date(fromDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    for (let i = 0; i < 7; i++) {
      const dayOfWeek = (nextDate.getDay() + 6) % 7;
      if (selectedDays.includes(dayOfWeek)) {
        return new Date(nextDate);
      }
      nextDate.setDate(nextDate.getDate() + 1);
    }
    
    return null;
  }
  
  async clearSnooze() {
    if (!this.snoozeEvent) return;
    
    try {
      await client.models.Event.update({
        id: this.snoozeEvent.id,
        snoozeDates: null
      });
      
      await this.loadEvents();
      this.snoozeEvent = null;
    } catch (error) {
      console.error('Error clearing snooze:', error);
      alert('Error clearing snooze. Please try again.');
    }
  }
  
  getDefaultEndDate(): string {
    const endDate = new Date(this.snoozeDate);
    endDate.setDate(endDate.getDate() + 90);
    return endDate.toISOString().split('T')[0];
  }
  
  generateSnoozeOccurrences(snoozeData: any): string[] {
    if (snoozeData.type === 'once') {
      return [snoozeData.startDate];
    }
    
    const dates: string[] = [];
    const start = new Date(snoozeData.startDate);
    const end = new Date(snoozeData.endDate);
    let current = new Date(start);
    
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      dates.push(dateStr);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }
  
  isValidWeekday(date: Date, weekdays: boolean[]): boolean {
    const dayOfWeek = (date.getDay() + 6) % 7; // Convert to Mon=0, Sun=6
    return weekdays[dayOfWeek];
  }

  async ngOnInit() {
    await this.timezoneService.loadUserTimezone();
    this.generateCalendar();
    this.loadCategories();
    this.loadEvents();
    this.filterEvents();
  }

  async loadCategories() {
    try {
      const result = await client.models.Category.list();
      this.categories = result.data || [];
      console.log('Loaded categories:', this.categories.length, this.categories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
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
      console.log('Loaded events:', this.events.length, this.events);
      this.mapEventsToCalendar();
      this.filterEvents();
    } catch (error) {
      console.error('Error loading events:', error);
    }
  }

  mapEventsToCalendar() {
    this.calendarDays.forEach(day => {
      day.events = [];
      
      this.events.forEach(event => {
        // Check original target date
        const eventDate = new Date(event.targetDate);
        if (this.isSameDay(day.date, eventDate)) {
          day.events.push({ ...event, isSnoozeOccurrence: false });
        }
        
        // Check snooze dates
        if (event.snoozeDates) {
          try {
            const snoozeData = JSON.parse(event.snoozeDates);
            if (snoozeData.startDate) {
              const generatedDates = this.generateSnoozeOccurrences(snoozeData);
              generatedDates.forEach((snoozeDate: string) => {
                const snoozeEventDate = new Date(snoozeDate);
                if (this.isSameDay(day.date, snoozeEventDate)) {
                  day.events.push({ ...event, isSnoozeOccurrence: true, targetDate: snoozeDate });
                }
              });
            } else if (snoozeData.dates) {
              // Handle old format with dates array
              snoozeData.dates.forEach((snoozeDate: string) => {
                const snoozeEventDate = new Date(snoozeDate);
                if (this.isSameDay(day.date, snoozeEventDate)) {
                  day.events.push({ ...event, isSnoozeOccurrence: true, targetDate: snoozeDate });
                }
              });
            }
          } catch (error) {
            console.error('Error parsing snooze dates:', error);
          }
        }
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

  openCreateEventModal(date: Date) {
    this.selectedDateForEvent = date.toISOString().split('T')[0];
    this.newEventData.targetDate = this.selectedDateForEvent + 'T09:00';
    this.showCreateEventModal = true;
  }

  onViewChange() {
    this.filterEvents();
  }

  filterEvents() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Only show original events in sidebar, not snooze occurrences
    const allOccurrences = this.events.map(event => ({ ...event, isSnoozeOccurrence: false }));
    
    switch (this.viewType) {
      case 'day':
        this.filteredEvents = allOccurrences.filter(event => {
          const eventDate = new Date(event.targetDate);
          return this.isSameDay(eventDate, this.selectedDate);
        });
        break;
        
      case 'week':
        const weekStart = this.getWeekStart(today);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        this.filteredEvents = allOccurrences.filter(event => {
          const eventDate = new Date(event.targetDate);
          return eventDate >= weekStart && eventDate <= weekEnd;
        });
        break;
        
      case 'next2':
        const next2End = new Date(today);
        next2End.setDate(today.getDate() + 2);
        
        this.filteredEvents = allOccurrences.filter(event => {
          const eventDate = new Date(event.targetDate);
          return eventDate >= today && eventDate <= next2End;
        });
        break;
        
      case 'next7':
        const next7End = new Date(today);
        next7End.setDate(today.getDate() + 7);
        
        this.filteredEvents = allOccurrences.filter(event => {
          const eventDate = new Date(event.targetDate);
          return eventDate >= today && eventDate <= next7End;
        });
        break;
        
      case 'next30':
        const next30End = new Date(today);
        next30End.setDate(today.getDate() + 30);
        
        this.filteredEvents = allOccurrences.filter(event => {
          const eventDate = new Date(event.targetDate);
          return eventDate >= today && eventDate <= next30End;
        });
        break;
        
      case 'nextMonth':
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
        
        this.filteredEvents = allOccurrences.filter(event => {
          const eventDate = new Date(event.targetDate);
          return eventDate >= nextMonth && eventDate <= nextMonthEnd;
        });
        break;
        
      case 'past2':
        const past2Start = new Date(today);
        past2Start.setDate(today.getDate() - 2);
        
        this.filteredEvents = allOccurrences.filter(event => {
          const eventDate = new Date(event.targetDate);
          return eventDate >= past2Start && eventDate < today;
        });
        break;
        
      case 'pastWeek':
        const pastWeekStart = new Date(today);
        pastWeekStart.setDate(today.getDate() - 7);
        
        this.filteredEvents = allOccurrences.filter(event => {
          const eventDate = new Date(event.targetDate);
          return eventDate >= pastWeekStart && eventDate < today;
        });
        break;
        
      case 'pastMonth':
        const pastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const pastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        
        this.filteredEvents = allOccurrences.filter(event => {
          const eventDate = new Date(event.targetDate);
          return eventDate >= pastMonth && eventDate <= pastMonthEnd;
        });
        break;
        
      case 'allPassed':
        this.filteredEvents = allOccurrences.filter(event => {
          const eventDate = new Date(event.targetDate);
          return eventDate < today;
        });
        break;
        
      case 'month':
      default:
        this.filteredEvents = allOccurrences.filter(event => {
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
    const today = new Date();
    
    switch (this.viewType) {
      case 'day':
        return `Events for ${this.selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      case 'week':
        return `Events for This Week`;
      case 'next2':
        return `Events for Next 2 Days`;
      case 'next7':
        return `Events for Next 7 Days`;
      case 'next30':
        return `Events for Next 30 Days`;
      case 'nextMonth':
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        return `Events for ${this.monthNames[nextMonth.getMonth()]} ${nextMonth.getFullYear()}`;
      case 'past2':
        return `Events from Past 2 Days`;
      case 'pastWeek':
        return `Events from Past Week`;
      case 'pastMonth':
        const pastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        return `Events from ${this.monthNames[pastMonth.getMonth()]} ${pastMonth.getFullYear()}`;
      case 'allPassed':
        return `All Passed Events`;
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

  async startEditEvent(event?: any) {
    if (event) {
      this.selectedEvent = event;
    }
    this.isEditingEvent = true;
    
    // Find if current category is a subcategory
    const currentCategory = this.categories.find(c => c.id === this.selectedEvent.categoryID);
    let rootCategoryID = '';
    let subcategoryID = '';
    
    if (currentCategory) {
      if (currentCategory.parentCategoryID) {
        // It's a subcategory
        rootCategoryID = currentCategory.parentCategoryID;
        subcategoryID = currentCategory.id;
        await this.loadEditingSubcategories(rootCategoryID);
      } else {
        // It's a root category
        rootCategoryID = currentCategory.id;
      }
    }
    
    this.editingEventData = {
      title: this.selectedEvent.title,
      description: this.selectedEvent.description || '',
      targetDate: this.formatDateForInput(this.selectedEvent.targetDate),
      categoryID: this.selectedEvent.categoryID || '',
      rootCategoryID: rootCategoryID,
      subcategoryID: subcategoryID
    };
    this.openEventPopup(this.selectedEvent);
  }

  async saveEventEdit() {
    try {
      const utcDateTime = this.timezoneService.convertToUTC(this.editingEventData.targetDate);
      
      await client.models.Event.update({
        id: this.selectedEvent.id,
        title: this.editingEventData.title,
        description: this.editingEventData.description,
        targetDate: utcDateTime,
        categoryID: this.editingEventData.categoryID
      });
      
      // Update local data
      this.selectedEvent.title = this.editingEventData.title;
      this.selectedEvent.description = this.editingEventData.description;
      this.selectedEvent.targetDate = utcDateTime;
      
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

  async deleteEvent(eventId: string) {
    if (!eventId) return;
    
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await client.models.Event.delete({ id: eventId });
        await this.loadEvents();
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    }
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

  getCategoryName(categoryID: string): string {
    const category = this.categories.find(cat => cat.id === categoryID);
    return category ? category.name : 'No Category';
  }

  get rootCategories() {
    return this.categories.filter(c => !c.parentCategoryID);
  }
  
  navigateToEventInCategories(eventId: string, categoryId: string) {
    this.navigateToCategories.emit({ eventId, categoryId });
  }
  
  goToPlanner(date: Date) {
    const dateStr = date.toISOString().split('T')[0];
    this.navigateToPlanner.emit(dateStr);
  }
  
  onDragStart(event: any, dragEvent: DragEvent) {
    this.draggedEvent = event;
    if (dragEvent.dataTransfer) {
      dragEvent.dataTransfer.effectAllowed = 'move';
    }
  }
  
  onDragOver(dragEvent: DragEvent) {
    dragEvent.preventDefault();
    if (dragEvent.dataTransfer) {
      dragEvent.dataTransfer.dropEffect = 'move';
    }
  }
  
  onDrop(day: any, dragEvent: DragEvent) {
    dragEvent.preventDefault();
    if (this.draggedEvent) {
      this.dropTargetDate = day.date.toISOString().split('T')[0];
      this.newDateTime = this.dropTargetDate + 'T09:00';
      this.showDateTimeModal = true;
    }
  }
  
  async confirmDateTimeChange() {
    if (this.draggedEvent && this.newDateTime) {
      try {
        const utcDateTime = this.timezoneService.convertToUTC(this.newDateTime);
        
        await client.models.Event.update({
          id: this.draggedEvent.id,
          targetDate: utcDateTime
        });
        
        await this.loadEvents();
        this.closeDateTimeModal();
      } catch (error) {
        console.error('Error updating event date:', error);
      }
    }
  }
  
  closeDateTimeModal() {
    this.showDateTimeModal = false;
    this.draggedEvent = null;
    this.dropTargetDate = '';
    this.newDateTime = '';
  }

  closeCreateEventModal() {
    this.showCreateEventModal = false;
    this.newEventData = {
      title: '',
      description: '',
      targetDate: '',
      categoryID: '',
      subcategoryID: ''
    };
    this.subcategories = [];
  }

  async onCategoryChange() {
    if (this.newEventData.categoryID) {
      await this.loadSubcategories(this.newEventData.categoryID);
    } else {
      this.subcategories = [];
    }
    this.newEventData.subcategoryID = '';
  }

  async loadSubcategories(parentId: string) {
    try {
      const result = await client.models.Category.list({
        filter: { parentCategoryID: { eq: parentId } }
      });
      this.subcategories = result.data || [];
    } catch (error) {
      console.error('Error loading subcategories:', error);
    }
  }

  async onEditingRootCategoryChange() {
    if (this.editingEventData.rootCategoryID) {
      await this.loadEditingSubcategories(this.editingEventData.rootCategoryID);
    } else {
      this.editingSubcategories = [];
    }
    this.editingEventData.subcategoryID = '';
    this.updateEditingCategoryID();
  }

  async loadEditingSubcategories(parentId: string) {
    try {
      const result = await client.models.Category.list({
        filter: { parentCategoryID: { eq: parentId } }
      });
      this.editingSubcategories = result.data || [];
    } catch (error) {
      console.error('Error loading editing subcategories:', error);
    }
  }

  updateEditingCategoryID() {
    if (this.editingEventData.subcategoryID) {
      this.editingEventData.categoryID = this.editingEventData.subcategoryID;
    } else if (this.editingEventData.rootCategoryID) {
      this.editingEventData.categoryID = this.editingEventData.rootCategoryID;
    } else {
      this.editingEventData.categoryID = '';
    }
  }

  async createEvent() {
    if (!this.newEventData.title.trim()) {
      alert('Please enter an event title');
      return;
    }

    try {
      console.log('Creating event with data:', this.newEventData);
      const utcDateTime = this.timezoneService.convertToUTC(this.newEventData.targetDate);
      console.log('UTC DateTime:', utcDateTime);
      
      const result = await client.models.Event.create({
        title: this.newEventData.title,
        description: this.newEventData.description || undefined,
        targetDate: utcDateTime,
        categoryID: this.newEventData.categoryID || undefined
      });
      
      console.log('Event created:', result);
      await this.loadEvents();
      this.closeCreateEventModal();
      alert('Event created successfully!');
    } catch (error: any) {
      console.error('Error creating event:', error);
      alert('Error creating event: ' + (error?.message || 'Unknown error'));
    }
  }
}