import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GmailCalendarService } from './services/gmail-calendar.service';

@Component({
  selector: 'app-calendar-sync',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="calendar-sync-container">
      <div class="sync-header">
        <h3>📅 Gmail Calendar Sync</h3>
        <div class="sync-status" [class.connected]="isConnected">
          {{ isConnected ? '✓ Connected' : '○ Not Connected' }}
        </div>
      </div>

      <div *ngIf="!isConnected" class="connect-section">
        <button (click)="connectGmail()" [disabled]="isLoading" class="connect-btn">
          <span *ngIf="!isLoading">🔗 Connect Gmail Calendar</span>
          <span *ngIf="isLoading">Connecting...</span>
        </button>
        <p class="connect-info">Sign in with your Google account to sync calendar events</p>
      </div>

      <div *ngIf="isConnected" class="sync-controls">
        <div class="calendar-selector">
          <label>Select Calendar:</label>
          <select [(ngModel)]="selectedCalendarId" class="calendar-select">
            <option *ngFor="let calendar of calendars" [value]="calendar.id">
              {{ calendar.summary }}
            </option>
          </select>
        </div>

        <div class="sync-actions">
          <button (click)="syncFromGmail()" [disabled]="isSyncing" class="sync-btn">
            <span *ngIf="!isSyncing">⬇️ Import from Gmail</span>
            <span *ngIf="isSyncing">Importing...</span>
          </button>
          
          <button (click)="disconnect()" class="disconnect-btn">
            🔌 Disconnect
          </button>
        </div>

        <div class="sync-options">
          <label class="checkbox-label">
            <input type="checkbox" [(ngModel)]="autoSync">
            Auto-sync new events
          </label>
          <label class="checkbox-label">
            <input type="checkbox" [(ngModel)]="syncPastEvents">
            Include past events (last 30 days)
          </label>
        </div>
      </div>

      <div *ngIf="syncStatus" class="sync-status-message" [class]="syncStatus.type">
        {{ syncStatus.message }}
      </div>

      <div *ngIf="lastSyncTime" class="last-sync">
        Last sync: {{ lastSyncTime | date:'short' }}
      </div>
    </div>
  `,
  styles: [`
    .calendar-sync-container {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
      border: 1px solid #e0e0e0;
    }

    .sync-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }

    .sync-header h3 {
      margin: 0;
      font-size: 16px;
      color: #333;
    }

    .sync-status {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      background: #ffebee;
      color: #c62828;
    }

    .sync-status.connected {
      background: #e8f5e8;
      color: #2e7d32;
    }

    .connect-btn, .sync-btn {
      background: #4285f4;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      margin-right: 8px;
    }

    .connect-btn:hover, .sync-btn:hover {
      background: #3367d6;
    }

    .connect-btn:disabled, .sync-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .disconnect-btn {
      background: #dc3545;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    .disconnect-btn:hover {
      background: #c82333;
    }

    .connect-info {
      font-size: 12px;
      color: #666;
      margin: 8px 0 0 0;
    }

    .calendar-selector {
      margin-bottom: 15px;
    }

    .calendar-selector label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 5px;
    }

    .calendar-select {
      width: 100%;
      padding: 6px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 13px;
    }

    .sync-actions {
      margin-bottom: 15px;
    }

    .sync-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      cursor: pointer;
    }

    .sync-status-message {
      padding: 8px;
      border-radius: 4px;
      font-size: 13px;
      margin-top: 10px;
    }

    .sync-status-message.success {
      background: #e8f5e8;
      color: #2e7d32;
      border: 1px solid #4caf50;
    }

    .sync-status-message.error {
      background: #ffebee;
      color: #c62828;
      border: 1px solid #f44336;
    }

    .sync-status-message.info {
      background: #e3f2fd;
      color: #1565c0;
      border: 1px solid #2196f3;
    }

    .last-sync {
      font-size: 12px;
      color: #666;
      margin-top: 10px;
      text-align: right;
    }

    .setup-info {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 4px;
      padding: 10px;
      margin-top: 10px;
      font-size: 12px;
    }

    .setup-info strong {
      color: #856404;
    }

    .setup-info ol {
      margin: 8px 0;
      padding-left: 16px;
    }

    .setup-info li {
      margin: 4px 0;
    }
  `]
})
export class CalendarSyncComponent implements OnInit {
  @Output() eventsImported = new EventEmitter<any[]>();
  @Output() syncStatusChange = new EventEmitter<boolean>();

  isConnected = false;
  isLoading = false;
  isSyncing = false;
  calendars: any[] = [];
  selectedCalendarId = 'primary';
  autoSync = false;
  syncPastEvents = false;
  syncStatus: { type: string, message: string } | null = null;
  lastSyncTime: Date | null = null;

  constructor(private gmailService: GmailCalendarService) {}

  async ngOnInit() {
    await this.checkConnectionStatus();
  }

  private async checkConnectionStatus() {
    try {
      await this.gmailService.initializeGapi();
      this.isConnected = this.gmailService.isSignedInStatus();
      if (this.isConnected) {
        await this.loadCalendars();
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
    }
  }

  async connectGmail() {
    this.isLoading = true;
    try {
      const success = await this.gmailService.signIn();
      if (success) {
        this.isConnected = true;
        await this.loadCalendars();
        this.showStatus('success', 'Successfully connected to Google Calendar!');
        this.syncStatusChange.emit(true);
      } else {
        this.showStatus('error', 'Failed to connect to Google Calendar');
      }
    } catch (error) {
      console.error('Connection error:', error);
      this.showStatus('error', error.message || 'Connection failed. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  async disconnect() {
    try {
      await this.gmailService.signOut();
      this.isConnected = false;
      this.calendars = [];
      this.showStatus('info', 'Disconnected from Google Calendar');
      this.syncStatusChange.emit(false);
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }

  private async loadCalendars() {
    try {
      this.calendars = await this.gmailService.getCalendars();
      if (this.calendars.length > 0) {
        this.selectedCalendarId = this.calendars[0].id;
      }
    } catch (error) {
      console.error('Error loading calendars:', error);
      this.showStatus('error', 'Failed to load calendars');
    }
  }

  async syncFromGmail() {
    if (!this.isConnected) return;

    this.isSyncing = true;
    try {
      const timeMin = this.syncPastEvents 
        ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        : new Date().toISOString();
      
      const timeMax = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      
      const events = await this.gmailService.getEvents(this.selectedCalendarId, timeMin, timeMax);
      const convertedEvents = events.map(event => this.gmailService.convertFromGoogleEvent(event));
      
      this.eventsImported.emit(convertedEvents);
      this.lastSyncTime = new Date();
      this.showStatus('success', `Imported ${events.length} events from Google Calendar`);
    } catch (error) {
      console.error('Sync from Gmail error:', error);
      this.showStatus('error', 'Failed to import events from Google Calendar');
    } finally {
      this.isSyncing = false;
    }
  }

  private showStatus(type: string, message: string) {
    this.syncStatus = { type, message };
    setTimeout(() => {
      this.syncStatus = null;
    }, 5000);
  }
}