import { Component, OnInit, Output, EventEmitter, OnDestroy, ElementRef, ViewChild } from '@angular/core';
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
  templateUrl: './day-planner.component.html',
  styleUrls: ['./day-planner.component.css']
})
export class DayPlannerComponent implements OnInit, OnDestroy {
  @ViewChild('plannerTable', { static: false }) plannerTable!: ElementRef;
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
  
  private refreshInterval: any;
  currentTimeSlotId: string | null = null;
  pinnedTasks: {content: string, completed: boolean, order: number}[] = [];
  completedTasks: {content: string, completed: boolean, order: number}[] = [];
  newPinnedTask = '';
  showDatePicker = false;
  selectedMoveDate = '';
  taskToMoveIndex = -1;
  editingTaskIndex = -1;
  editingTaskContent = '';

  ngOnInit() {
    this.onPlannerViewChange();
    this.startAutoRefresh();
    this.loadPinnedTasks();
    this.initializeResize();
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  private startAutoRefresh() {
    // Refresh every 5 minutes
    this.refreshInterval = setInterval(() => {
      this.focusCurrentTimeSlot();
    }, 5 * 60 * 1000);
    
    // Initial focus
    setTimeout(() => this.focusCurrentTimeSlot(), 1000);
  }

  private focusCurrentTimeSlot() {
    if (this.plannerView !== 'today') return;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Round to nearest 30-minute slot
    const roundedMinute = currentMinute < 30 ? 0 : 30;
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${roundedMinute.toString().padStart(2, '0')}`;
    
    this.currentTimeSlotId = currentTime;
    
    // Scroll to current time slot
    setTimeout(() => {
      const element = document.getElementById(`time-slot-${currentTime}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('current-time-slot');
        
        // Remove highlight from other slots
        document.querySelectorAll('.time-slot').forEach(slot => {
          if (slot.id !== `time-slot-${currentTime}`) {
            slot.classList.remove('current-time-slot');
          }
        });
      }
    }, 100);
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
    this.loadPinnedTasks();
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
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());

      for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        this.weekDays.push(day.toISOString().split('T')[0]);
      }
    } else if (this.plannerView === 'workweek') {
      const startOfWeek = new Date(today);
      const dayOfWeek = today.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startOfWeek.setDate(today.getDate() + mondayOffset);

      for (let i = 0; i < 5; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
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
          try {
            const tasks = JSON.parse(dayPlan.tasks);
            this.timeSlots.forEach(slot => {
              slot.task = tasks[slot.time] || '';
            });
          } catch (error) {
            console.error('Error parsing tasks JSON:', error);
          }
        }
      }

      if (this.plannerView !== 'today') {
        await this.loadWeekTasks();
      }

      await this.loadEvents();
      
      // Reload pinned tasks when date changes
      if (this.plannerView === 'today') {
        await this.loadPinnedTasks();
      }
    } catch (error) {
      console.error('Error loading plan:', error);
    }
  }

  async saveAllTasks() {
    this.saving = true;

    try {
      if (this.plannerView === 'today') {
        const tasks: { [key: string]: string } = {};
        this.timeSlots.forEach(slot => {
          if (slot.task && slot.task.trim() && slot.task !== '<br>') {
            tasks[slot.time] = slot.task;
          }
        });

        const existing = await client.models.DayPlan.list({
          filter: { date: { eq: this.selectedDate } }
        });

        if (existing.data && existing.data.length > 0) {
          await client.models.DayPlan.update({
            id: existing.data[0].id,
            tasks: JSON.stringify(tasks)
          });
        } else {
          await client.models.DayPlan.create({
            date: this.selectedDate,
            tasks: JSON.stringify(tasks)
          });
        }
      } else {
        const savePromises = [];
        
        for (const day of this.weekDays) {
          const dayTasksData = this.dayTasks[day] || {};
          const tasks: { [key: string]: string } = {};
          
          Object.keys(dayTasksData).forEach(time => {
            const task = dayTasksData[time];
            if (task && task.trim() && task !== '<br>') {
              tasks[time] = task;
            }
          });

          if (Object.keys(tasks).length > 0) {
            const existing = await client.models.DayPlan.list({
              filter: { date: { eq: day } }
            });

            if (existing.data && existing.data.length > 0) {
              savePromises.push(
                client.models.DayPlan.update({
                  id: existing.data[0].id,
                  tasks: JSON.stringify(tasks)
                })
              );
            } else {
              savePromises.push(
                client.models.DayPlan.create({
                  date: day,
                  tasks: JSON.stringify(tasks)
                })
              );
            }
          }
        }
        
        await Promise.all(savePromises);
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
          this.addEventToSlot(event, event.targetDate, false);

          if (event.snoozeDates) {
            try {
              const snoozeData = JSON.parse(event.snoozeDates);
              if (snoozeData.startDate) {
                const generatedDates = this.generateSnoozeOccurrences(snoozeData);
                generatedDates.forEach((snoozeDate: string) => {
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

  private addEventToSlot(event: any, eventDateStr: string | null, isSnooze: boolean) {
    if (!eventDateStr) return;

    const eventDate = new Date(eventDateStr);
    const eventInUserTz = eventDate.toISOString().split('T')[0];

    if (eventInUserTz === this.selectedDate) {
      const eventTimeInUserTz = '08:00';
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





  async loadWeekTasks() {
    try {
      for (const day of this.weekDays) {
        const result = await client.models.DayPlan.list({
          filter: { date: { eq: day } }
        });

        if (!this.dayTasks[day]) {
          this.dayTasks[day] = {};
        }

        if (result.data && result.data.length > 0) {
          const dayPlan = result.data[0];
          if (dayPlan.tasks) {
            try {
              const tasks = JSON.parse(dayPlan.tasks);
              Object.keys(tasks).forEach(time => {
                this.dayTasks[day][time] = tasks[time];
              });
            } catch (error) {
              console.error('Error parsing week tasks JSON:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading week tasks:', error);
    }
  }

  formatText(command: string) {
    document.execCommand(command, false, undefined);
  }

  insertBullet() {
    document.execCommand('insertUnorderedList', false, undefined);
  }





  onTaskInput(event: Event, slot: TimeSlot) {
    const target = event.target as HTMLElement;
    slot.task = target.innerHTML;
  }

  private initializeResize() {
    setTimeout(() => {
      const resizeHandle = document.getElementById('resizeHandle');
      const pinnedSidebar = document.getElementById('pinnedSidebar');
      
      if (!resizeHandle || !pinnedSidebar) return;
      
      let isResizing = false;
      
      resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        e.preventDefault();
      });
      
      const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing) return;
        
        const container = document.querySelector('.planner-body') as HTMLElement;
        if (!container) return;
        
        const containerRect = container.getBoundingClientRect();
        const newSidebarWidth = containerRect.right - e.clientX;
        
        if (newSidebarWidth >= 200 && newSidebarWidth <= 600) {
          pinnedSidebar.style.width = `${newSidebarWidth}px`;
        }
      };
      
      const handleMouseUp = () => {
        isResizing = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, 100);
  }

  addPinnedTask() {
    if (this.newPinnedTask.trim()) {
      const maxOrder = Math.max(...this.pinnedTasks.map(t => t.order), -1);
      this.pinnedTasks.push({ 
        content: this.newPinnedTask.trim(), 
        completed: false,
        order: maxOrder + 1
      });
      this.newPinnedTask = '';
      this.savePinnedTasks();
    }
  }

  togglePinnedComplete(index: number) {
    const task = this.pinnedTasks[index];
    task.completed = true;
    
    // Move to completed tasks
    this.completedTasks.push(task);
    this.pinnedTasks.splice(index, 1);
    
    this.savePinnedTasks();
  }

  toggleCompletedTask(index: number) {
    const task = this.completedTasks[index];
    task.completed = false;
    
    // Move back to pinned tasks
    this.pinnedTasks.push(task);
    this.completedTasks.splice(index, 1);
    
    this.savePinnedTasks();
  }

  removeCompletedTask(index: number) {
    this.completedTasks.splice(index, 1);
    this.savePinnedTasks();
  }

  removePinnedTask(index: number) {
    this.pinnedTasks.splice(index, 1);
    this.savePinnedTasks();
  }

  pinTask(slot: TimeSlot) {
    if (slot.task && slot.task.trim()) {
      const maxOrder = Math.max(...this.pinnedTasks.map(t => t.order), -1);
      this.pinnedTasks.push({ 
        content: slot.task.trim(), 
        completed: false,
        order: maxOrder + 1
      });
      this.savePinnedTasks();
    }
  }

  movePinnedTask(index: number) {
    this.taskToMoveIndex = index;
    this.selectedMoveDate = new Date().toISOString().split('T')[0];
    this.showDatePicker = true;
  }

  closeDatePicker() {
    this.showDatePicker = false;
    this.taskToMoveIndex = -1;
    this.selectedMoveDate = '';
  }

  confirmMoveTask() {
    if (this.selectedMoveDate && this.taskToMoveIndex >= 0) {
      const task = this.pinnedTasks[this.taskToMoveIndex];
      this.movePinnedTaskToDate(task, this.selectedMoveDate, this.taskToMoveIndex);
      this.closeDatePicker();
    }
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  private async movePinnedTaskToDate(task: any, targetDate: string, index: number) {
    try {
      // Remove from current date
      this.pinnedTasks.splice(index, 1);
      await this.savePinnedTasks();

      // Add to target date
      const targetResult = await client.models.PinnedTask.list({
        filter: { date: { eq: targetDate } }
      });
      
      let targetTasks = [];
      if (targetResult.data && targetResult.data.length > 0 && targetResult.data[0].tasks) {
        targetTasks = JSON.parse(targetResult.data[0].tasks);
      }
      
      targetTasks.push({ ...task, order: targetTasks.length });
      
      if (targetResult.data && targetResult.data.length > 0) {
        await client.models.PinnedTask.update({
          id: targetResult.data[0].id,
          tasks: JSON.stringify(targetTasks)
        });
      } else {
        await client.models.PinnedTask.create({
          date: targetDate,
          tasks: JSON.stringify(targetTasks)
        });
      }

      alert(`Task moved to ${targetDate}`);
    } catch (error) {
      console.error('Error moving pinned task:', error);
    }
  }

  onDragStart(event: DragEvent, index: number) {
    event.dataTransfer?.setData('text/plain', index.toString());
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDrop(event: DragEvent, targetIndex: number) {
    event.preventDefault();
    const sourceIndex = parseInt(event.dataTransfer?.getData('text/plain') || '-1');
    
    if (sourceIndex !== -1 && sourceIndex !== targetIndex) {
      const [movedTask] = this.pinnedTasks.splice(sourceIndex, 1);
      this.pinnedTasks.splice(targetIndex, 0, movedTask);
      
      this.pinnedTasks.forEach((task, index) => {
        task.order = index;
      });
      
      this.savePinnedTasks();
    }
  }

  startEditTask(index: number) {
    this.editingTaskIndex = index;
    this.editingTaskContent = this.pinnedTasks[index].content;
  }

  saveEditTask() {
    if (this.editingTaskIndex >= 0 && this.editingTaskContent.trim()) {
      this.pinnedTasks[this.editingTaskIndex].content = this.editingTaskContent.trim();
      this.editingTaskIndex = -1;
      this.editingTaskContent = '';
      this.savePinnedTasks();
    }
  }

  cancelEditTask() {
    this.editingTaskIndex = -1;
    this.editingTaskContent = '';
  }

  async loadPinnedTasks() {
    try {
      const result = await client.models.PinnedTask.list({
        filter: { date: { eq: this.selectedDate } }
      });
      
      if (result.data && result.data.length > 0 && result.data[0].tasks) {
        const allTasks = JSON.parse(result.data[0].tasks);
        this.pinnedTasks = allTasks.filter((task: any) => !task.completed);
        this.completedTasks = allTasks.filter((task: any) => task.completed);
      } else {
        this.pinnedTasks = [];
        this.completedTasks = [];
      }
    } catch (error) {
      console.error('Error loading pinned tasks:', error);
      this.pinnedTasks = [];
      this.completedTasks = [];
    }
  }

  async savePinnedTasks() {
    try {
      const allTasks = [...this.pinnedTasks, ...this.completedTasks];
      
      const existing = await client.models.PinnedTask.list({
        filter: { date: { eq: this.selectedDate } }
      });
      
      if (existing.data && existing.data.length > 0) {
        await client.models.PinnedTask.update({
          id: existing.data[0].id,
          tasks: JSON.stringify(allTasks)
        });
      } else {
        await client.models.PinnedTask.create({
          date: this.selectedDate,
          tasks: JSON.stringify(allTasks)
        });
      }
    } catch (error) {
      console.error('Error saving pinned tasks:', error);
    }
  }

  onTouchStart(event: TouchEvent) {
    const pinnedSidebar = document.getElementById('pinnedSidebar');
    if (!pinnedSidebar) return;
    
    event.preventDefault();
  }

  onTouchMove(event: TouchEvent) {
    const pinnedSidebar = document.getElementById('pinnedSidebar');
    if (!pinnedSidebar) return;
    
    const container = document.querySelector('.planner-body') as HTMLElement;
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const touch = event.touches[0];
    const newSidebarWidth = containerRect.right - touch.clientX;
    
    if (newSidebarWidth >= 200 && newSidebarWidth <= 600) {
      pinnedSidebar.style.width = `${newSidebarWidth}px`;
    }
    
    event.preventDefault();
  }

  onTouchEnd(event: TouchEvent) {
    event.preventDefault();
  }
}