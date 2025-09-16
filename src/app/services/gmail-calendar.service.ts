import { Injectable } from '@angular/core';

declare var gapi: any;

interface Window {
  gapi: any;
}

@Injectable({
  providedIn: 'root'
})
export class GmailCalendarService {
  private readonly CLIENT_ID = '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com';
  private readonly API_KEY = 'AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ1234567';
  private readonly SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';
  private readonly DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

  private isInitialized = false;
  private isSignedIn = false;

  async initializeGapi(): Promise<void> {
    if (this.isInitialized) return;

    // Wait for gapi to be available
    await this.waitForGapi();

    return new Promise((resolve, reject) => {
      const gapiInstance = (window as any).gapi;
      gapiInstance.load('client:auth2', async () => {
        try {
          await gapiInstance.client.init({
            apiKey: this.API_KEY,
            clientId: this.CLIENT_ID,
            discoveryDocs: [this.DISCOVERY_DOC],
            scope: this.SCOPES
          });
          
          this.isInitialized = true;
          this.isSignedIn = gapiInstance.auth2.getAuthInstance().isSignedIn.get();
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  private waitForGapi(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if gapi is already available
      if (typeof (window as any).gapi !== 'undefined') {
        resolve();
        return;
      }

      // Try to load the script if it's not available
      this.loadGoogleApiScript().then(() => {
        let attempts = 0;
        const maxAttempts = 50;
        const checkGapi = () => {
          attempts++;
          if (typeof (window as any).gapi !== 'undefined') {
            resolve();
          } else if (attempts >= maxAttempts) {
            reject(new Error('Google API failed to load. Please check your internet connection and try again.'));
          } else {
            setTimeout(checkGapi, 100);
          }
        };
        
        checkGapi();
      }).catch(reject);
    });
  }

  private loadGoogleApiScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      if (document.querySelector('script[src="https://apis.google.com/js/api.js"]')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google API script'));
      document.head.appendChild(script);
    });
  }

  async signIn(): Promise<boolean> {
    try {
      await this.initializeGapi();
      
      if (this.isSignedIn) return true;

      const authInstance = (window as any).gapi.auth2.getAuthInstance();
      const user = await authInstance.signIn({
        prompt: 'select_account'
      });
      
      if (user && authInstance.isSignedIn.get()) {
        this.isSignedIn = true;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Gmail sign-in error:', error);
      throw new Error('Failed to sign in to Google Calendar. Please try again.');
    }
  }

  async signOut(): Promise<void> {
    if (this.isSignedIn) {
      await (window as any).gapi.auth2.getAuthInstance().signOut();
      this.isSignedIn = false;
    }
  }

  async getCalendars(): Promise<any[]> {
    if (!this.isSignedIn) return [];

    try {
      const response = await (window as any).gapi.client.calendar.calendarList.list();
      return response.result.items || [];
    } catch (error) {
      console.error('Error fetching calendars:', error);
      return [];
    }
  }

  async getEvents(calendarId: string = 'primary', timeMin?: string, timeMax?: string): Promise<any[]> {
    if (!this.isSignedIn) return [];

    try {
      const response = await (window as any).gapi.client.calendar.events.list({
        calendarId: calendarId,
        timeMin: timeMin || new Date().toISOString(),
        timeMax: timeMax,
        showDeleted: false,
        singleEvents: true,
        maxResults: 50,
        orderBy: 'startTime'
      });
      
      return response.result.items || [];
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  }

  async createEvent(event: any, calendarId: string = 'primary'): Promise<any> {
    if (!this.isSignedIn) throw new Error('Not signed in');

    try {
      const response = await (window as any).gapi.client.calendar.events.insert({
        calendarId: calendarId,
        resource: event
      });
      return response.result;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  async updateEvent(eventId: string, event: any, calendarId: string = 'primary'): Promise<any> {
    if (!this.isSignedIn) throw new Error('Not signed in');

    try {
      const response = await (window as any).gapi.client.calendar.events.update({
        calendarId: calendarId,
        eventId: eventId,
        resource: event
      });
      return response.result;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  async deleteEvent(eventId: string, calendarId: string = 'primary'): Promise<void> {
    if (!this.isSignedIn) throw new Error('Not signed in');

    try {
      await (window as any).gapi.client.calendar.events.delete({
        calendarId: calendarId,
        eventId: eventId
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  convertToGoogleEvent(localEvent: any): any {
    return {
      summary: localEvent.title,
      description: localEvent.description,
      start: {
        dateTime: localEvent.targetDate,
        timeZone: 'America/New_York'
      },
      end: {
        dateTime: new Date(new Date(localEvent.targetDate).getTime() + 60 * 60 * 1000).toISOString(),
        timeZone: 'America/New_York'
      }
    };
  }

  convertFromGoogleEvent(googleEvent: any): any {
    return {
      title: googleEvent.summary || 'Untitled Event',
      description: googleEvent.description || '',
      targetDate: googleEvent.start?.dateTime || googleEvent.start?.date,
      googleEventId: googleEvent.id,
      googleCalendarId: googleEvent.organizer?.email || 'primary'
    };
  }

  isSignedInStatus(): boolean {
    return this.isSignedIn;
  }
}