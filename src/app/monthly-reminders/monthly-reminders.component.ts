import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

@Component({
  selector: 'app-monthly-reminders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './monthly-reminders.component.html',
  styleUrls: ['./monthly-reminders.component.css']
})
export class MonthlyRemindersComponent implements OnInit {
  reminders: any[] = [];
  selectedMonth: number = new Date().getMonth() + 1;
  selectedYear: number = new Date().getFullYear();
  selectedDay: number = 1;
  selectedDate: string = '';
  
  newReminder = {
    title: '',
    description: ''
  };

  remindersByDay: { [key: number]: any[] } = {};
  editingCompletionTime: { [key: string]: boolean } = {};
  editingTitle: { [key: string]: boolean } = {};
  editingDescription: { [key: string]: boolean } = {};
  editingDay: { [key: string]: boolean } = {};

  months = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' }
  ];

  commonReminders = [
    'Phone Bill',
    'Credit Card Bill',
    'Rent',
    'Electricity Bill',
    'Internet Bill',
    'Insurance Premium',
    'Car Payment',
    'Mortgage Payment'
  ];

  ngOnInit() {
    this.initializeSelectedDate();
    this.loadReminders();
  }

  initializeSelectedDate() {
    const today = new Date();
    this.selectedDate = today.toISOString().split('T')[0];
    this.updateDateFields();
  }

  onDateChange() {
    this.updateDateFields();
  }

  updateDateFields() {
    if (this.selectedDate) {
      const date = new Date(this.selectedDate);
      this.selectedMonth = date.getMonth() + 1;
      this.selectedYear = date.getFullYear();
      this.selectedDay = date.getDate();
    }
  }

  async loadReminders() {
    try {
      const { data } = await client.models.MonthlyReminder.list();
      const monthReminders = data.filter(reminder => 
        reminder.month === this.selectedMonth && reminder.year === this.selectedYear
      );
      
      // Reset the remindersByDay object
      this.remindersByDay = {};
      
      // Organize reminders by day
      monthReminders.forEach(reminder => {
        const day = reminder.day!;
        if (!this.remindersByDay[day]) {
          this.remindersByDay[day] = [];
        }
        this.remindersByDay[day].push(reminder);
      });
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  }

  async addReminder() {
    if (!this.newReminder.title.trim()) return;

    try {
      await client.models.MonthlyReminder.create({
        title: this.newReminder.title,
        description: this.newReminder.description,
        month: this.selectedMonth,
        day: this.selectedDay,
        year: this.selectedYear,
        isRecurring: true
      });

      this.newReminder = { title: '', description: '' };
      this.loadReminders();
    } catch (error) {
      console.error('Error adding reminder:', error);
    }
  }

  async deleteReminder(id: string) {
    try {
      await client.models.MonthlyReminder.delete({ id });
      this.loadReminders();
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  }

  async toggleCompletion(reminder: any) {
    try {
      const updateData: any = {
        id: reminder.id,
        isCompleted: !reminder.isCompleted
      };
      
      if (!reminder.isCompleted) {
        // Mark as completed - capture current timestamp
        updateData.completedAt = new Date().toISOString();
      } else {
        // Mark as not completed - clear timestamp
        updateData.completedAt = null;
      }
      
      await client.models.MonthlyReminder.update(updateData);
      this.loadReminders();
    } catch (error) {
      console.error('Error updating reminder:', error);
    }
  }

  onMonthYearChange() {
    // Ensure selectedMonth and selectedYear are numbers
    this.selectedMonth = Number(this.selectedMonth);
    this.selectedYear = Number(this.selectedYear);
    this.selectedDay = 1;
    this.loadReminders();
  }

  selectCommonReminder(reminder: string) {
    this.newReminder.title = reminder;
  }



  getMonthName(): string {
    const monthNum = Number(this.selectedMonth);
    return this.months.find(m => m.value === monthNum)?.name || 'Unknown';
  }

  getDaysInMonth(): number[] {
    const daysInMonth = new Date(this.selectedYear, this.selectedMonth, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }

  getFormattedDate(day: number): string {
    const dayWithSuffix = this.getDayWithSuffix(day);
    const monthName = this.getMonthName();
    return `${dayWithSuffix} ${monthName} ${this.selectedYear}`;
  }

  getDayWithSuffix(day: number): string {
    if (day >= 11 && day <= 13) return `${day}th`;
    switch (day % 10) {
      case 1: return `${day}st`;
      case 2: return `${day}nd`;
      case 3: return `${day}rd`;
      default: return `${day}th`;
    }
  }

  getAllPendingReminders(): any[] {
    if (!this.remindersByDay || Object.keys(this.remindersByDay).length === 0) {
      return [];
    }
    const allReminders: any[] = [];
    Object.values(this.remindersByDay).forEach(dayReminders => {
      allReminders.push(...dayReminders.filter(r => !r.isCompleted));
    });
    return allReminders.sort((a, b) => a.day - b.day);
  }

  getAllCompletedReminders(): any[] {
    if (!this.remindersByDay || Object.keys(this.remindersByDay).length === 0) {
      return [];
    }
    const allReminders: any[] = [];
    Object.values(this.remindersByDay).forEach(dayReminders => {
      allReminders.push(...dayReminders.filter(r => r.isCompleted));
    });
    return allReminders.sort((a, b) => a.day - b.day);
  }

  formatCompletionTime(completedAt: string): string {
    if (!completedAt) return '';
    const date = new Date(completedAt);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  async updateCompletionTime(reminder: any, newDateTime: string) {
    try {
      await client.models.MonthlyReminder.update({
        id: reminder.id,
        completedAt: new Date(newDateTime).toISOString()
      });
      this.loadReminders();
    } catch (error) {
      console.error('Error updating completion time:', error);
    }
  }

  getEditableDateTime(completedAt: string): string {
    if (!completedAt) return '';
    const date = new Date(completedAt);
    return date.toISOString().slice(0, 16);
  }

  onCompletionTimeChange(reminder: any, event: Event) {
    const target = event.target as HTMLInputElement;
    if (target?.value) {
      this.updateCompletionTime(reminder, target.value);
    }
  }

  toggleEditCompletionTime(reminderId: string) {
    this.editingCompletionTime[reminderId] = !this.editingCompletionTime[reminderId];
  }

  isEditingCompletionTime(reminderId: string): boolean {
    return !!this.editingCompletionTime[reminderId];
  }

  toggleEditTitle(reminderId: string) {
    this.editingTitle[reminderId] = !this.editingTitle[reminderId];
  }

  toggleEditDescription(reminderId: string) {
    this.editingDescription[reminderId] = !this.editingDescription[reminderId];
  }

  toggleEditDay(reminderId: string) {
    this.editingDay[reminderId] = !this.editingDay[reminderId];
  }

  async updateReminderField(reminder: any, field: string, value: any) {
    try {
      await client.models.MonthlyReminder.update({
        id: reminder.id,
        [field]: value
      });
      this.loadReminders();
    } catch (error) {
      console.error('Error updating reminder:', error);
    }
  }

  onTitleChange(reminder: any, event: Event) {
    const target = event.target as HTMLInputElement;
    if (target?.value !== undefined) {
      this.updateReminderField(reminder, 'title', target.value);
      this.toggleEditTitle(reminder.id);
    }
  }

  onDayChange(reminder: any, event: Event) {
    const target = event.target as HTMLSelectElement;
    if (target?.value !== undefined) {
      this.updateReminderField(reminder, 'day', target.value);
      this.toggleEditDay(reminder.id);
    }
  }

  onDescriptionChange(reminder: any, event: Event) {
    const target = event.target as HTMLInputElement;
    if (target?.value !== undefined) {
      this.updateReminderField(reminder, 'description', target.value);
      this.toggleEditDescription(reminder.id);
    }
  }

  showCopyReminderModal = false;
  reminderToCopy: any = null;
  copyToMonth = new Date().getMonth() + 1;
  copyToYear = new Date().getFullYear();
  copyToDay = 1;

  showCopyModal(reminder: any) {
    this.reminderToCopy = reminder;
    this.copyToMonth = this.selectedMonth === 12 ? 1 : this.selectedMonth + 1;
    this.copyToYear = this.selectedMonth === 12 ? this.selectedYear + 1 : this.selectedYear;
    this.copyToDay = 1;
    this.showCopyReminderModal = true;
  }

  closeCopyModal() {
    this.showCopyReminderModal = false;
    this.reminderToCopy = null;
  }

  async confirmCopy() {
    if (!this.reminderToCopy) return;
    
    try {
      await client.models.MonthlyReminder.create({
        title: this.reminderToCopy.title,
        description: this.reminderToCopy.description,
        month: this.copyToMonth,
        day: this.copyToDay,
        year: this.copyToYear,
        isRecurring: true
      });
      
      this.closeCopyModal();
    } catch (error) {
      console.error('Error copying reminder:', error);
    }
  }

  getCopyDaysInMonth(): number[] {
    const daysInMonth = new Date(this.copyToYear, this.copyToMonth, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }

  getCopyFormattedDate(day: number): string {
    const dayWithSuffix = this.getDayWithSuffix(day);
    const monthName = this.months.find(m => m.value === this.copyToMonth)?.name || 'Unknown';
    return `${dayWithSuffix} ${monthName} ${this.copyToYear}`;
  }
}