import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IcsParserService } from '../services/ics-parser.service';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

@Component({
  selector: 'app-teams-sync',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="teams-sync">
      <h3>Calendar Import</h3>
      
      <div class="import-steps">
        <p><strong>Steps to import meetings:</strong></p>
        <ol>
          <li>Open <a href="https://outlook.office.com/calendar" target="_blank">Outlook Calendar</a></li>
          <li>Click Settings (gear icon) → View all Outlook settings</li>
          <li>Go to Calendar → Shared calendars</li>
          <li>Click "Publish a calendar" → Select your calendar</li>
          <li>Choose "Can view all details" → Copy the ICS link</li>
          <li>Paste the link below or upload an exported .ics file</li>
        </ol>
      </div>

      <div class="import-options">
        <div class="file-upload">
          <label for="icsFile">Upload .ics file:</label>
          <input 
            type="file" 
            id="icsFile" 
            accept=".ics" 
            (change)="onFileSelected($event)"
            class="file-input">
        </div>
        
        <div class="url-input">
          <label for="icsUrl">Or paste ICS URL:</label>
          <input 
            type="url" 
            id="icsUrl" 
            [(ngModel)]="icsUrl" 
            placeholder="https://outlook.office365.com/owa/calendar/..."
            class="url-field">
          <button (click)="importFromUrl()" [disabled]="syncing || !icsUrl" class="import-btn">
            {{ syncing ? 'Importing...' : 'Import from URL' }}
          </button>
        </div>
      </div>
      
      <div *ngIf="lastSync" class="sync-status">
        Last import: {{ lastSync | date:'short' }} ({{ syncedCount }} meetings)
      </div>
      
      <div *ngIf="debugMeetings.length > 0" class="debug-info">
        <h4>Debug - Parsed Meetings:</h4>
        <div *ngFor="let meeting of debugMeetings" class="debug-meeting">
          <strong>{{ meeting.title }}</strong><br>
          Date: {{ meeting.date }}<br>
          Time: {{ meeting.startTime }}<br>
          Type: {{ meeting.type }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .teams-sync {
      padding: 20px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      margin: 20px 0;
    }
    
    .import-steps {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 20px;
    }
    
    .import-steps ol {
      margin: 10px 0;
      padding-left: 20px;
    }
    
    .import-steps a {
      color: #0078d4;
      text-decoration: none;
    }
    
    .import-options {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .file-upload, .url-input {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .file-input, .url-field {
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
    }
    
    .import-btn {
      padding: 10px 20px;
      background: #107c10;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
    }
    
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .sync-status {
      margin-top: 15px;
      padding: 10px;
      background: #f0f8ff;
      border-radius: 4px;
      font-size: 14px;
    }
    
    .debug-info {
      margin-top: 15px;
      padding: 10px;
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 4px;
      font-size: 12px;
    }
    
    .debug-meeting {
      margin: 10px 0;
      padding: 8px;
      background: white;
      border-radius: 3px;
    }
  `]
})
export class TeamsSyncComponent {
  syncing = false;
  lastSync: Date | null = null;
  syncedCount = 0;
  icsUrl = '';
  debugMeetings: any[] = [];

  constructor(private icsParser: IcsParserService) {}

  private convertToUserTimezone(meeting: any): string {
    // Get user's timezone offset
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // If meeting has original time, use it for conversion
    if (meeting.originalTime) {
      const originalDate = new Date(meeting.originalTime);
      return originalDate.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        timeZone: userTimezone
      });
    }
    
    return meeting.startTime;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.ics')) {
      this.readIcsFile(file);
    }
  }

  private readIcsFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      this.processIcsContent(content);
    };
    reader.readAsText(file);
  }

  async importFromUrl() {
    if (!this.icsUrl) return;
    
    this.syncing = true;
    try {
      const response = await fetch(this.icsUrl);
      const content = await response.text();
      await this.processIcsContent(content);
    } catch (error) {
      console.error('Failed to fetch ICS from URL:', error);
      alert('Failed to import from URL. Try downloading the file and uploading it instead.');
    }
    this.syncing = false;
  }

  private async processIcsContent(content: string) {
    this.syncing = true;
    
    try {
      console.log('Processing ICS content, length:', content.length);
      
      if (!content || content.length < 50) {
        throw new Error('File appears to be empty or too small');
      }
      
      if (!content.includes('BEGIN:VCALENDAR') && !content.includes('BEGIN:VEVENT')) {
        throw new Error('Not a valid ICS calendar file');
      }
      
      const meetings = this.icsParser.parseIcsFile(content);
      console.log('Parsed meetings:', meetings);
      this.debugMeetings = meetings;
      
      if (meetings.length === 0) {
        alert('No meetings found in the calendar file.');
        this.syncing = false;
        return;
      }
      
      for (const meeting of meetings) {
        console.log('Processing meeting:', meeting);
        
        try {
          const existingPlan = await client.models.DayPlan.list({
            filter: { date: { eq: meeting.date } }
          });
          
          console.log('Existing plan for', meeting.date, ':', existingPlan.data);
          
          let currentTasksObj: any = {};
          
          // Parse existing tasks
          if (existingPlan.data[0]?.tasks) {
            try {
              currentTasksObj = JSON.parse(existingPlan.data[0].tasks);
            } catch (error) {
              // If it's plain text, convert to object format
              currentTasksObj = { '08:00': existingPlan.data[0].tasks };
            }
          }
          
          // Convert meeting time to user's timezone if needed
          const meetingTime = this.convertToUserTimezone(meeting);
          const meetingTask = `${meeting.title}`;
          const timeSlot = meetingTime;
          
          console.log('Current tasks object:', currentTasksObj);
          console.log('Adding meeting to time slot:', timeSlot, meetingTask);
          
          // Add meeting to appropriate time slot
          if (!currentTasksObj[timeSlot]) {
            currentTasksObj[timeSlot] = meetingTask;
          } else if (!currentTasksObj[timeSlot].includes(meeting.title)) {
            currentTasksObj[timeSlot] += '\n' + meetingTask;
          }
          
          const updatedTasksJson = JSON.stringify(currentTasksObj);
          console.log('Updated tasks JSON:', updatedTasksJson);
          
          if (existingPlan.data[0]) {
            const result = await client.models.DayPlan.update({
              id: existingPlan.data[0].id,
              tasks: updatedTasksJson
            });
            console.log('Update result:', result);
          } else {
            const result = await client.models.DayPlan.create({
              date: meeting.date,
              tasks: updatedTasksJson
            });
            console.log('Create result:', result);
          }
        } else {
          console.log('Meeting already exists, skipping');
        }
        } catch (meetingError) {
          console.error('Error processing meeting:', meeting, meetingError);
        }
      }
      
      this.syncedCount = meetings.length;
      this.lastSync = new Date();
      alert(`Successfully imported ${meetings.length} meetings!`);
    } catch (error) {
      console.error('Failed to process ICS content:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to process calendar file'}`);
    }
    
    this.syncing = false;
  }
}