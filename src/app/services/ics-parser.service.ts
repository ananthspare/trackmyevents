import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class IcsParserService {

  parseIcsFile(icsContent: string): any[] {
    const events: any[] = [];
    const lines = icsContent.replace(/\r\n/g, '\n').split('\n');
    
    let currentEvent: any = null;
    let currentProperty = '';
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // Handle line folding (lines starting with space or tab)
      while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
        i++;
        line += lines[i].trim();
      }
      
      if (line === 'BEGIN:VEVENT') {
        currentEvent = {};
      } else if (line === 'END:VEVENT' && currentEvent) {
        if (currentEvent.title && currentEvent.startDate) {
          events.push(this.formatEvent(currentEvent));
        }
        currentEvent = null;
      } else if (currentEvent && line.includes(':')) {
        const colonIndex = line.indexOf(':');
        const key = line.substring(0, colonIndex);
        const value = line.substring(colonIndex + 1);
        
        // Handle properties with parameters (e.g., DTSTART;TZID=...)
        const baseKey = key.split(';')[0];
        
        switch (baseKey) {
          case 'SUMMARY':
            currentEvent.title = this.decodeValue(value);
            break;
          case 'DTSTART':
            currentEvent.startDate = this.parseDateTime(value);
            break;
          case 'DTEND':
            currentEvent.endDate = this.parseDateTime(value);
            break;
          case 'DESCRIPTION':
            currentEvent.description = this.decodeValue(value);
            break;
          case 'LOCATION':
            currentEvent.location = this.decodeValue(value);
            break;
        }
      }
    }
    
    return events;
  }

  private isTeamsMeeting(event: any): boolean {
    const description = (event.description || '').toLowerCase();
    const location = (event.location || '').toLowerCase();
    const title = (event.title || '').toLowerCase();
    
    // Check for Teams indicators
    const teamsKeywords = [
      'teams', 'microsoft teams', 'join microsoft teams',
      'teams.microsoft.com', 'teams meeting',
      'skype for business', 'online meeting'
    ];
    
    const allText = `${description} ${location} ${title}`;
    
    return teamsKeywords.some(keyword => allText.includes(keyword)) ||
           description.includes('https://teams.microsoft.com') ||
           location.includes('https://teams.microsoft.com');
  }

  private parseDateTime(dateTimeStr: string): Date {
    try {
      // Handle timezone info
      if (dateTimeStr.endsWith('Z')) {
        // UTC time
        const cleanStr = dateTimeStr.replace('Z', '');
        const year = parseInt(cleanStr.substr(0, 4));
        const month = parseInt(cleanStr.substr(4, 2)) - 1;
        const day = parseInt(cleanStr.substr(6, 2));
        const hour = parseInt(cleanStr.substr(9, 2)) || 0;
        const minute = parseInt(cleanStr.substr(11, 2)) || 0;
        
        return new Date(Date.UTC(year, month, day, hour, minute));
      } else if (dateTimeStr.includes('T')) {
        // Local time or with timezone offset
        const year = parseInt(dateTimeStr.substr(0, 4));
        const month = parseInt(dateTimeStr.substr(4, 2)) - 1;
        const day = parseInt(dateTimeStr.substr(6, 2));
        const hour = parseInt(dateTimeStr.substr(9, 2)) || 0;
        const minute = parseInt(dateTimeStr.substr(11, 2)) || 0;
        
        return new Date(year, month, day, hour, minute);
      } else if (dateTimeStr.length === 8) {
        // All-day event
        const year = parseInt(dateTimeStr.substr(0, 4));
        const month = parseInt(dateTimeStr.substr(4, 2)) - 1;
        const day = parseInt(dateTimeStr.substr(6, 2));
        
        return new Date(year, month, day, 9, 0);
      }
    } catch (error) {
      console.error('Error parsing date:', dateTimeStr, error);
    }
    
    return new Date();
  }

  private formatEvent(event: any): any {
    // Convert to user's local timezone
    const localDate = new Date(event.startDate.getTime());
    
    return {
      title: event.title || 'Meeting',
      startTime: localDate.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      date: localDate.toLocaleDateString('en-CA'), // YYYY-MM-DD format
      type: 'meeting',
      originalTime: event.startDate.toISOString()
    };
  }

  private decodeValue(value: string): string {
    // Decode common ICS escape sequences
    return value
      .replace(/\\n/g, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\');
  }
}