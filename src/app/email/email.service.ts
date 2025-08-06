import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

@Injectable({
  providedIn: 'root'
})
export class EmailService {

  async getCurrentDayEvents(): Promise<any[]> {
    try {
      const result = await client.models.Event.list();
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      return result.data?.filter(event => {
        if (!event.targetDate) return false;
        const eventDate = new Date(event.targetDate);
        return eventDate >= todayStart && eventDate < todayEnd;
      }) || [];
    } catch (error) {
      console.error('Error fetching current day events:', error);
      return [];
    }
  }

  async getCurrentWeekEvents(): Promise<any[]> {
    try {
      const result = await client.models.Event.list();
      const today = new Date();
      const weekStart = this.getWeekStart(today);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

      return result.data?.filter(event => {
        if (!event.targetDate) return false;
        const eventDate = new Date(event.targetDate);
        return eventDate >= weekStart && eventDate < weekEnd;
      }) || [];
    } catch (error) {
      console.error('Error fetching current week events:', error);
      return [];
    }
  }

  private getWeekStart(date: Date): Date {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day;
    return new Date(start.setDate(diff));
  }

  async sendDailyReminder(): Promise<void> {
    const events = await this.getCurrentDayEvents();
    if (events.length > 0) {
      // Trigger Lambda function for daily reminders
      console.log('Daily events to send:', events);
    }
  }

  async sendWeeklyReminder(): Promise<void> {
    const events = await this.getCurrentWeekEvents();
    if (events.length > 0) {
      // Trigger Lambda function for weekly reminders
      console.log('Weekly events to send:', events);
    }
  }
}