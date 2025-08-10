import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

@Injectable({
  providedIn: 'root'
})
export class TimezoneService {
  private userTimezone = 'UTC';

  async loadUserTimezone(): Promise<string> {
    try {
      const prefs = await client.models.UserPreferences.list();
      if (prefs.data && prefs.data.length > 0) {
        this.userTimezone = prefs.data[0].timezone || 'UTC';
      }
    } catch (error) {
      console.error('Error loading timezone:', error);
    }
    return this.userTimezone;
  }

  convertToUTC(localDateTime: string): string {
    const date = new Date(localDateTime);
    return date.toISOString();
  }

  convertFromUTC(utcDateTime: string): string {
    const date = new Date(utcDateTime);
    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: this.userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date).replace(' ', 'T');
  }

  formatForDisplay(utcDateTime: string): string {
    const date = new Date(utcDateTime);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: this.userTimezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  }

  getUserTimezone(): string {
    return this.userTimezone;
  }
}