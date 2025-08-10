import { Component, OnInit } from '@angular/core';
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
        <div class="time-range">
          <label>From:</label>
          <select [(ngModel)]="startHour" (change)="generateTimeSlots()">
            <option *ngFor="let hour of hours" [value]="hour">{{ hour.toString().padStart(2, '0') }}:00</option>
          </select>
          <label>To:</label>
          <select [(ngModel)]="endHour" (change)="generateTimeSlots()">
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
      
      <div class="planner-table">
        <div class="time-slot" *ngFor="let slot of timeSlots; trackBy: trackByTime">
          <div class="time-label">{{ slot.timeRange }}</div>
          <div class="slot-content">
            <input 
              type="text" 
              [(ngModel)]="slot.task" 
              placeholder="Add task..."
              class="task-input">
            <div *ngFor="let event of slot.events" class="event-item">
              📅 {{ event.title }}
            </div>
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
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .planner-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .header-actions {
      display: flex;
      gap: 10px;
    }
    
    .planner-header h2 {
      margin: 0;
      color: #333;
    }
    
    .date-input {
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    
    .planner-table {
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
    }
    
    .time-slot {
      display: flex;
      border-bottom: 1px solid #eee;
    }
    
    .time-slot:last-child {
      border-bottom: none;
    }
    
    .time-label {
      width: 120px;
      padding: 12px;
      background: #f8f9fa;
      border-right: 1px solid #eee;
      font-weight: 500;
      font-size: 11px;
      display: flex;
      align-items: center;
    }
    
    .task-input {
      flex: 1;
      padding: 12px;
      border: none;
      outline: none;
      font-size: 14px;
    }
    
    .task-input:focus {
      background: #f0f4f8;
    }
    
    .slot-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .event-item {
      background: #e3f2fd;
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 12px;
      color: #1976d2;
      border-left: 3px solid #2196f3;
    }
    
    .save-all-btn {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    }
    
    .save-all-btn:hover:not(:disabled) {
      background: #45a049;
    }
    
    .save-all-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    
    .planner-footer {
      text-align: center;
      margin-top: 20px;
    }
    
    .copy-btn {
      background: #2196F3;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    
    .copy-btn:hover:not(:disabled) {
      background: #1976D2;
    }
    
    .copy-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    
    .time-range {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }
    
    .time-range select {
      padding: 4px;
      border: 1px solid #ddd;
      border-radius: 3px;
      font-size: 12px;
    }
  `]
})
export class DayPlannerComponent implements OnInit {
  selectedDate = new Date().toISOString().split('T')[0];
  timeSlots: TimeSlot[] = [];
  saving = false;
  copying = false;
  startHour = 9;
  endHour = 17;
  userTimezone = 'UTC';

  hours = Array.from({length: 24}, (_, i) => i);
  
  ngOnInit() {
    this.generateTimeSlots();
    this.loadPlan();
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
          if (event.targetDate) {
            // Convert event date to user timezone
            const eventDate = new Date(event.targetDate);
            const eventInUserTz = new Intl.DateTimeFormat('en-CA', {
              timeZone: this.userTimezone,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            }).format(eventDate);
            
            if (eventInUserTz === this.selectedDate) {
              const eventTimeInUserTz = new Intl.DateTimeFormat('en-GB', {
                timeZone: this.userTimezone,
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              }).format(eventDate);
              
              const slot = this.timeSlots.find(s => s.time === eventTimeInUserTz);
              
              if (slot) {
                slot.events.push(event);
              } else {
                // Find closest 30-minute slot
                const [hours, minutes] = eventTimeInUserTz.split(':').map(Number);
                const eventMinutes = hours * 60 + minutes;
                const slotMinutes = Math.floor(eventMinutes / 30) * 30;
                const slotHour = Math.floor(slotMinutes / 60);
                const slotMin = slotMinutes % 60;
                const slotTime = `${slotHour.toString().padStart(2, '0')}:${slotMin.toString().padStart(2, '0')}`;
                
                const closestSlot = this.timeSlots.find(s => s.time === slotTime);
                if (closestSlot) {
                  closestSlot.events.push(event);
                }
              }
            }
          }
        });
      }
    } catch (error) {
      console.error('Error loading events:', error);
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
}