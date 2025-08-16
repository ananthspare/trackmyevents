import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

interface TimeSlot {
  time: string;
  timeRange: string;
  task: string;
  events: any[];
}

@Component({
  selector: 'app-day-planner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="planner-container">
      <div class="planner-header">
        <h2>Day Planner</h2>
        <input type="date" [(ngModel)]="selectedDate" (change)="loadPlan()" class="date-input">
        <div class="view-selector">
          <label>View:</label>
          <select [(ngModel)]="plannerView" (change)="onPlannerViewChange()">
            <option value="today">Today</option>
            <option value="week">Whole Week</option>
            <option value="workweek">Work Week</option>
            <option value="month">Monthly</option>
          </select>
        </div>
        <div class="time-range">
          <label>From:</label>
          <select [(ngModel)]="startHour" (change)="onTimeRangeChange()">
            <option *ngFor="let hour of hours" [value]="hour">{{ hour.toString().padStart(2, '0') }}:00</option>
          </select>
          <label>To:</label>
          <select [(ngModel)]="endHour" (change)="onTimeRangeChange()">
            <option *ngFor="let hour of hours" [value]="hour">{{ hour.toString().padStart(2, '0') }}:00</option>
          </select>
        </div>
        <div class="header-actions">
          <button (click)="copyToNextDay()" [disabled]="copying" class="copy-btn">
            {{ copying ? 'Copying...' : 'Copy to Next Day' }}
          </button>
          <button (click)="copyToWeek()" [disabled]="copying" class="copy-btn">
            {{ copying ? 'Copying...' : 'Copy to Week' }}
          </button>
          <button (click)="saveAllTasks()" [disabled]="saving" class="save-all-btn">
            {{ saving ? 'Saving...' : 'Save All Tasks' }}
          </button>
        </div>
      </div>

      <!-- Day View -->
      <div class="planner-table" *ngIf="plannerView === 'today'">
        <div class="time-slot" *ngFor="let slot of timeSlots; trackBy: trackByTime">
          <div class="time-label">{{ slot.timeRange }}</div>
          <div class="slot-content">
            <textarea
              [(ngModel)]="slot.task"
              placeholder="Add task..."
              class="task-input"
              rows="1"></textarea>
            <div *ngFor="let event of slot.events" class="event-item" [class.snooze-event]="event.isSnoozeOccurrence">
              <span *ngIf="event.isSnoozeOccurrence">🔔</span>
              <span *ngIf="!event.isSnoozeOccurrence">📅</span>
              {{ event.title }}
              <div class="event-description" *ngIf="event.description">{{ event.description }}</div>
              <span *ngIf="event.isSnoozeOccurrence" class="original-date">Original: {{ getOriginalDate(event.targetDate) }}</span>
              <span class="navigate-icon" (click)="navigateToEvent(event.id, event.categoryID)" title="Go to event and category">📁</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Week Views -->
      <div class="week-grid" *ngIf="plannerView === 'week' || plannerView === 'workweek'">
        <div class="week-header">
          <div class="time-column-header">Time</div>
          <div class="day-header" *ngFor="let day of weekDays">{{ day | date:'EEE MMM d' }}</div>
        </div>
        <div class="week-row" *ngFor="let slot of filteredTimeSlots">
          <div class="time-label">{{ slot.timeRange }}</div>
          <div class="day-cell" *ngFor="let day of weekDays">
            <textarea class="day-task-input" [(ngModel)]="dayTasks[day][slot.time]" placeholder="Tasks..."></textarea>
            <div *ngFor="let event of getDayEvents(day, slot.time)" class="event-item" [class.snooze-event]="event.isSnoozeOccurrence">
              <span *ngIf="event.isSnoozeOccurrence">🔔</span>
              <span *ngIf="!event.isSnoozeOccurrence">📅</span>
              {{ event.title }}
            </div>
          </div>
        </div>
      </div>

      <!-- Month View -->
      <div class="month-grid" *ngIf="plannerView === 'month'">
        <div class="month-header">
          <div class="day-name" *ngFor="let dayName of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']">{{ dayName }}</div>
        </div>
        <div class="month-row" *ngFor="let week of monthWeeks">
          <div class="month-day" *ngFor="let day of week" (click)="selectDayInMonth(day.date)" [class.other-month]="!day.isCurrentMonth" [class.today]="isToday(day.date)">
            <div class="day-number">{{ day.day }}</div>
            <div class="day-tasks-preview">{{ getDayTasksCount(day.date) }} tasks</div>
            <div class="day-events-preview">{{ getDayEventsCount(day.date) }} events</div>
          </div>
        </div>
      </div>

      <div class="planner-footer">
        <button (click)="saveAllTasks()" [disabled]="saving" class="save-all-btn">
          {{ saving ? 'Saving...' : 'Save All Tasks' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .planner-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 30px;
      min-height: 100vh;
    }

    .planner-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    .planner-header h2 {
      margin: 0;
      color: #333;
      font-size: 28px;
      font-weight: 600;
    }

    .date-input {
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 16px;
      min-width: 160px;
    }

    .date-input:focus {
      border-color: #2196f3;
      outline: none;
    }

    .planner-table {
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .time-slot {
      display: flex;
      border-bottom: 1px solid #f0f0f0;
      min-height: 50px;
    }

    .time-slot:last-child {
      border-bottom: none;
    }

    .time-slot:hover {
      background: #fafafa;
    }

    .time-label {
      width: 120px;
      padding: 10px;
      background: #f8f9fa;
      border-right: 2px solid #e0e0e0;
      font-weight: 600;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #555;
    }

    .task-input {
      flex: 1;
      padding: 10px 15px;
      border: none;
      outline: none;
      font-size: 14px;
      line-height: 1.4;
      resize: none;
      word-wrap: break-word;
      overflow-wrap: break-word;
      white-space: pre-wrap;
      min-height: 20px;
      max-height: 80px;
      overflow-y: auto;
      font-family: inherit;
    }

    .task-input:focus {
      background: #f0f4f8;
    }

    .task-input::placeholder {
      color: #999;
      font-style: italic;
    }

    .slot-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 4px 0;
    }

    .event-item {
      background: #e3f2fd;
      padding: 6px 12px;
      margin: 0 12px;
      border-radius: 4px;
      font-size: 12px;
      color: #1976d2;
      border-left: 3px solid #2196f3;
      font-weight: 500;
      word-wrap: break-word;
      overflow-wrap: break-word;
      line-height: 1.3;
      position: relative;
    }

    .event-item.snooze-event {
      background: #fff3e0;
      color: #e65100;
      border-left: 3px solid #ff9800;
    }

    .event-description {
      font-size: 10px;
      color: #666;
      margin-top: 2px;
    }

    .navigate-icon {
      position: absolute;
      right: 4px;
      top: 2px;
      cursor: pointer;
      font-size: 10px;
      opacity: 0.7;
    }

    .navigate-icon:hover {
      opacity: 1;
    }

    .original-date {
      font-size: 9px;
      color: #888;
      margin-top: 1px;
    }

    .save-all-btn {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .save-all-btn:hover:not(:disabled) {
      background: #45a049;
      transform: translateY(-1px);
    }

    .save-all-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .planner-footer {
      text-align: center;
      margin-top: 20px;
      padding: 10px;
    }

    .copy-btn {
      background: #2196F3;
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .copy-btn:hover:not(:disabled) {
      background: #1976D2;
      transform: translateY(-1px);
    }

    .copy-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .time-range {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
      font-weight: 500;
    }

    .time-range select {
      padding: 8px 12px;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-size: 14px;
      min-width: 80px;
    }

    .time-range select:focus {
      border-color: #2196f3;
      outline: none;
    }

    .time-range label {
      color: #555;
      font-weight: 600;
    }

    .view-selector {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
      font-weight: 500;
    }

    .view-selector select {
      padding: 8px 12px;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-size: 14px;
      min-width: 120px;
    }

    .week-view {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      padding: 20px;
    }

    .day-column {
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
    }

    .day-header {
      background: #f8f9fa;
      padding: 12px;
      font-weight: 600;
      text-align: center;
      border-bottom: 1px solid #e0e0e0;
    }

    .day-content {
      padding: 12px;
    }

    .day-task-input {
      width: 100%;
      min-height: 100px;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      resize: vertical;
      font-family: inherit;
    }

    .week-grid {
      display: grid;
      grid-template-rows: auto 1fr;
      height: 100%;
      overflow-x: auto;
    }

    .week-header {
      display: grid;
      grid-template-columns: 120px repeat(7, 1fr);
      background: #f8f9fa;
      border-bottom: 2px solid #e0e0e0;
      min-width: 900px;
    }

    .time-column-header {
      padding: 12px;
      font-weight: 600;
      text-align: center;
      border-right: 1px solid #e0e0e0;
    }

    .week-row {
      display: grid;
      grid-template-columns: 120px repeat(7, 1fr);
      border-bottom: 1px solid #f0f0f0;
      min-height: 60px;
      min-width: 900px;
    }

    .day-cell {
      padding: 4px;
      border-right: 1px solid #f0f0f0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .day-cell .day-task-input {
      width: 100%;
      min-height: 30px;
      padding: 4px;
      border: 1px solid #ddd;
      border-radius: 3px;
      font-size: 11px;
      resize: none;
    }

    .day-tasks {
      font-size: 11px;
      color: #666;
      margin-bottom: 2px;
    }

    .month-grid {
      display: grid;
      grid-template-rows: auto 1fr;
      height: 100%;
    }

    .month-header {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      background: #f8f9fa;
      border-bottom: 2px solid #e0e0e0;
    }

    .day-name {
      padding: 12px;
      font-weight: 600;
      text-align: center;
      border-right: 1px solid #e0e0e0;
    }

    .month-row {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      border-bottom: 1px solid #e0e0e0;
    }

    .month-day {
      padding: 8px;
      border-right: 1px solid #e0e0e0;
      min-height: 80px;
      cursor: pointer;
    }

    .month-day:hover {
      background: #f5f5f5;
    }

    .month-day.other-month {
      color: #ccc;
      background: #fafafa;
    }

    .month-day.today {
      background: #e3f2fd;
      border: 2px solid #2196f3;
    }

    .day-number {
      font-weight: 600;
      margin-bottom: 4px;
    }

    .day-tasks-preview {
      font-size: 10px;
      color: #666;
    }

    .day-events-preview {
      font-size: 10px;
      color: #2196f3;
      margin-top: 2px;
    }
  `]
})
export class DayPlannerComponent implements OnInit {
  selectedDate = new Date().toISOString().split('T')[0];
  timeSlots: TimeSlot[] = [];
  saving = false;
  copying = false;
  startHour = 6;
  endHour = 21;
  userTimezone = 'UTC';
  showNavigateIcon: string | null = null;
  plannerView = 'today';
  weekDays: string[] = [];
  monthWeeks: any[][] = [];
  dayTasks: { [key: string]: { [key: string]: string } } = {};
  filteredTimeSlots: any[] = [];

  hours = Array.from({length: 24}, (_, i) => i);

  @Output() navigateToCategories = new EventEmitter<{eventId: string, categoryId: string}>();

  ngOnInit() {
    this.onPlannerViewChange();
  }

  onPlannerViewChange() {
    if (this.plannerView === 'today') {
      this.generateTimeSlots();
    } else if (this.plannerView === 'month') {
      this.generateMonthView();
    } else {
      this.generateWeekView();
    }
    this.loadPlan();
  }

  onTimeRangeChange() {
    if (this.plannerView === 'today') {
      this.generateTimeSlots();
    } else {
      this.generateWeekView();
    }
    this.applyTimeFilter();
    this.loadPlan();
  }

  applyTimeFilter() {
    const start = Math.min(this.startHour, this.endHour);
    const end = Math.max(this.startHour, this.endHour);

    this.filteredTimeSlots = this.timeSlots.filter(slot => {
      const [hour] = slot.time.split(':').map(Number);
      return hour >= start && hour <= end;
    });
  }

  generateWeekView() {
    const today = new Date(this.selectedDate);
    this.weekDays = [];

    if (this.plannerView === 'week') {
      // Full week (Sunday to Saturday)
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());

      for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        this.weekDays.push(day.toISOString().split('T')[0]);
      }
    } else if (this.plannerView === 'workweek') {
      // Work week (Monday to Friday)
      const startOfWeek = new Date(today);
      const dayOfWeek = today.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startOfWeek.setDate(today.getDate() + mondayOffset);

      for (let i = 0; i < 5; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        this.weekDays.push(day.toISOString().split('T')[0]);
      }
    } else if (this.plannerView === 'month') {
      // Monthly view - all days in current month
      const year = today.getFullYear();
      const month = today.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let i = 1; i <= daysInMonth; i++) {
        const day = new Date(year, month, i);
        this.weekDays.push(day.toISOString().split('T')[0]);
      }
    }

    this.generateTimeSlots();
    this.initializeDayTasks();
  }

  initializeDayTasks() {
    this.weekDays.forEach(day => {
      if (!this.dayTasks[day]) {
        this.dayTasks[day] = {};
      }
      this.timeSlots.forEach(slot => {
        if (!this.dayTasks[day][slot.time]) {
          this.dayTasks[day][slot.time] = '';
        }
      });
    });
  }

  generateMonthView() {
    const today = new Date(this.selectedDate);
    const year = today.getFullYear();
    const month = today.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    this.monthWeeks = [];
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + (week * 7) + day);
        weekDays.push({
          date: date.toISOString().split('T')[0],
          day: date.getDate(),
          isCurrentMonth: date.getMonth() === month
        });
      }
      this.monthWeeks.push(weekDays);
    }
  }

  getDayTasks(day: string, time: string): string {
    return this.dayTasks[day]?.[time] || '';
  }

  getDayEvents(day: string, time: string): any[] {
    return this.timeSlots.find(slot => slot.time === time)?.events?.filter((event: any) => {
      const eventDate = new Date(event.targetDate).toISOString().split('T')[0];
      return eventDate === day;
    }) || [];
  }

  getDayEventsCount(day: string): number {
    return this.timeSlots.reduce((count, slot) => {
      return count + (slot.events?.filter((event: any) => {
        const eventDate = new Date(event.targetDate).toISOString().split('T')[0];
        return eventDate === day;
      }).length || 0);
    }, 0);
  }

  isToday(dateStr: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  }

  generateSnoozeOccurrences(snoozeData: any): string[] {
    if (snoozeData.type === 'once') {
      return [snoozeData.startDate];
    }

    const dates: string[] = [];
    const start = new Date(snoozeData.startDate + 'T00:00:00');
    const end = new Date(snoozeData.endDate + 'T23:59:59');
    let current = new Date(start);

    if (snoozeData.type === 'daily') {
      while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    }

    return dates;
  }

  isValidWeekday(date: Date, weekdays: boolean[]): boolean {
    const dayOfWeek = (date.getDay() + 6) % 7;
    return weekdays[dayOfWeek];
  }

  getDayTasksCount(day: string): number {
    return Object.keys(this.dayTasks[day] || {}).length;
  }

  selectDayInMonth(date: string) {
    this.selectedDate = date;
    this.plannerView = 'today';
    this.onPlannerViewChange();
  }

  generateTimeSlots() {
    this.timeSlots = [];

    const start = Math.min(this.startHour, this.endHour);
    const end = Math.max(this.startHour, this.endHour);

    for (let hour = start; hour <= end; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        // Skip the last 30-minute slot if we're at the end hour
        if (hour === end && minute === 30) {
          break;
        }

        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const nextMinute = minute + 30;
        const nextHour = nextMinute >= 60 ? hour + 1 : hour;
        const adjustedMinute = nextMinute >= 60 ? 0 : nextMinute;
        const endTime = `${nextHour.toString().padStart(2, '0')}:${adjustedMinute.toString().padStart(2, '0')}`;
        const timeRange = `${time} - ${endTime}`;

        this.timeSlots.push({ time, timeRange, task: '', events: [] });
      }
    }

    this.applyTimeFilter();
    if (this.timeSlots.length > 0) {
      this.loadPlan();
    }
  }

  async loadPlan() {
    try {
      // Load user timezone
      await this.loadUserTimezone();

      const result = await client.models.DayPlan.list({
        filter: { date: { eq: this.selectedDate } }
      });

      this.timeSlots.forEach(slot => {
        slot.task = '';
        slot.events = [];
      });

      if (result.data && result.data.length > 0) {
        const dayPlan = result.data[0];
        if (dayPlan.tasks) {
          const tasks = JSON.parse(dayPlan.tasks);
          this.timeSlots.forEach(slot => {
            slot.task = tasks[slot.time] || '';
          });
        }
      }

      // Load events for this date
      await this.loadEvents();
    } catch (error) {
      console.error('Error loading plan:', error);
    }
  }

  async saveAllTasks() {
    this.saving = true;

    try {
      // Create tasks object from time slots
      const tasks: { [key: string]: string } = {};
      this.timeSlots.forEach(slot => {
        if (slot.task.trim()) {
          tasks[slot.time] = slot.task;
        }
      });

      // Get existing plan for this date
      const existing = await client.models.DayPlan.list({
        filter: { date: { eq: this.selectedDate } }
      });

      if (existing.data && existing.data.length > 0) {
        // Update existing plan
        await client.models.DayPlan.update({
          id: existing.data[0].id,
          tasks: JSON.stringify(tasks)
        });
      } else {
        // Create new plan
        await client.models.DayPlan.create({
          date: this.selectedDate,
          tasks: JSON.stringify(tasks)
        });
      }
    } catch (error) {
      console.error('Error saving tasks:', error);
    } finally {
      this.saving = false;
    }
  }

  trackByTime(index: number, slot: TimeSlot): string {
    return slot.time;
  }

  async testConnection() {
    try {
      console.log('Testing Amplify connection...');

      // Test categories
      const categoriesResult = await client.models.Category.list();
      console.log('Categories result:', categoriesResult);

      // Test events
      const eventsResult = await client.models.Event.list();
      console.log('Events result:', eventsResult);

      alert(`Connection OK!\nCategories: ${categoriesResult.data?.length || 0}\nEvents: ${eventsResult.data?.length || 0}`);
    } catch (error: any) {
      console.error('Connection test failed:', error);
      alert('Connection failed: ' + (error?.message || 'Unknown error'));
    }
  }

  async loadUserTimezone() {
    try {
      const prefs = await client.models.UserPreferences.list();
      if (prefs.data && prefs.data.length > 0) {
        this.userTimezone = prefs.data[0].timezone || 'UTC';
      }
    } catch (error) {
      console.error('Error loading timezone:', error);
    }
  }

  async loadEvents() {
    try {
      const events = await client.models.Event.list();

      if (events.data) {
        events.data.forEach(event => {
          // Process original event
          this.addEventToSlot(event, event.targetDate, false);

          // Process snooze events
          if (event.snoozeDates) {
            try {
              const snoozeData = JSON.parse(event.snoozeDates);
              if (snoozeData.startDate) {
                const generatedDates = this.generateSnoozeOccurrences(snoozeData);
                generatedDates.forEach((snoozeDate: string) => {
                  this.addEventToSlot(event, snoozeDate, true);
                });
              } else if (snoozeData.dates) {
                // Handle old format with dates array
                snoozeData.dates.forEach((snoozeDate: string) => {
                  this.addEventToSlot(event, snoozeDate, true);
                });
              }
            } catch (error) {
              console.error('Error parsing snooze dates:', error);
            }
          }
        });
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  }

  private addEventToSlot(event: any, eventDateStr: string | null, isSnooze: boolean) {
    if (!eventDateStr) return;

    let eventDate: Date;
    let eventTimeInUserTz: string;

    eventDate = new Date(eventDateStr);
    const eventInUserTz = eventDate.toISOString().split('T')[0];

    if (eventInUserTz === this.selectedDate) {
      // All events for the selected day appear in the snooze items list at 8:00 AM
      eventTimeInUserTz = '08:00';
      
      const slot = this.timeSlots.find(s => s.time === eventTimeInUserTz);
      if (slot) {
        slot.events.push({ ...event, isSnoozeOccurrence: isSnooze });
      }
    }
  }

  async copyToNextDay() {
    const taskCount = this.timeSlots.filter(slot => slot.task.trim()).length;
    if (taskCount === 0) {
      alert('No tasks to copy!');
      return;
    }

    if (!confirm(`Copy ${taskCount} tasks to next day?`)) {
      return;
    }

    this.copying = true;

    try {
      const nextDate = new Date(this.selectedDate);
      nextDate.setDate(nextDate.getDate() + 1);
      const nextDateStr = nextDate.toISOString().split('T')[0];

      const tasks: { [key: string]: string } = {};
      this.timeSlots.forEach(slot => {
        if (slot.task.trim()) {
          tasks[slot.time] = slot.task;
        }
      });

      const existing = await client.models.DayPlan.list({
        filter: { date: { eq: nextDateStr } }
      });

      if (existing.data && existing.data.length > 0) {
        await client.models.DayPlan.update({
          id: existing.data[0].id,
          tasks: JSON.stringify(tasks)
        });
      } else {
        await client.models.DayPlan.create({
          date: nextDateStr,
          tasks: JSON.stringify(tasks)
        });
      }

      alert('Tasks copied to next day!');
    } catch (error) {
      console.error('Error copying to next day:', error);
      alert('Error copying tasks. Please try again.');
    } finally {
      this.copying = false;
    }
  }

  async copyToWeek() {
    const taskCount = this.timeSlots.filter(slot => slot.task.trim()).length;
    if (taskCount === 0) {
      alert('No tasks to copy!');
      return;
    }

    if (!confirm(`Copy ${taskCount} tasks to the next 7 days?`)) {
      return;
    }

    this.copying = true;

    try {
      const tasks: { [key: string]: string } = {};
      this.timeSlots.forEach(slot => {
        if (slot.task.trim()) {
          tasks[slot.time] = slot.task;
        }
      });

      const promises = [];

      for (let i = 1; i <= 7; i++) {
        const targetDate = new Date(this.selectedDate);
        targetDate.setDate(targetDate.getDate() + i);
        const targetDateStr = targetDate.toISOString().split('T')[0];

        const existing = await client.models.DayPlan.list({
          filter: { date: { eq: targetDateStr } }
        });

        if (existing.data && existing.data.length > 0) {
          promises.push(
            client.models.DayPlan.update({
              id: existing.data[0].id,
              tasks: JSON.stringify(tasks)
            })
          );
        } else {
          promises.push(
            client.models.DayPlan.create({
              date: targetDateStr,
              tasks: JSON.stringify(tasks)
            })
          );
        }
      }

      await Promise.all(promises);
      alert('Tasks copied to next 7 days!');
    } catch (error) {
      console.error('Error copying to week:', error);
      alert('Error copying tasks. Please try again.');
    } finally {
      this.copying = false;
    }
  }

  navigateToEvent(eventId: string, categoryId: string) {
    this.navigateToCategories.emit({ eventId, categoryId });
  }

  getOriginalDate(targetDate: string): string {
    const date = new Date(targetDate);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' , year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true,timeZoneName: 'short' });
  }
  
  setSelectedDate(dateStr: string) {
    this.selectedDate = dateStr;
    this.plannerView = 'today';
    this.onPlannerViewChange();
  }
}
