import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { generateClient } from 'aws-amplify/data';
import { getCurrentUser, updateUserAttributes, fetchUserAttributes } from 'aws-amplify/auth';
import type { Schema } from '../../../amplify/data/resource';
import { EmailService } from '../email/email.service';

const client = generateClient<Schema>();

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  userProfile = {
    email: '',
    given_name: '',
    family_name: ''
  };
  
  userPreferences = {
    email: '',
    dailyReminderTime: '09:00',
    weeklyReminderDay: 'monday',
    weeklyReminderTime: '09:00'
  };
  
  isLoading = false;
  message = '';

  constructor(private emailService: EmailService) {}

  async ngOnInit() {
    await this.loadUserProfile();
    await this.loadUserPreferences();
  }

  async loadUserProfile() {
    try {
      const user = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      this.userProfile = {
        email: user.signInDetails?.loginId || '',
        given_name: attributes.given_name || '',
        family_name: attributes.family_name || ''
      };
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }

  async loadUserPreferences() {
    try {
      const result = await client.models.UserPreferences.list();
      if (result.data && result.data.length > 0) {
        const prefs = result.data[0];
        this.userPreferences = {
          email: prefs.email || this.userProfile.email,
          dailyReminderTime: prefs.dailyReminderTime || '09:00',
          weeklyReminderDay: prefs.weeklyReminderDay || 'monday',
          weeklyReminderTime: prefs.weeklyReminderTime || '09:00'
        };
      } else {
        this.userPreferences.email = this.userProfile.email;
      }
    } catch (error) {
      console.error('Error loading preferences from DDB:', error);
      this.userPreferences.email = this.userProfile.email;
    }
  }

  async saveProfile() {
    this.isLoading = true;
    try {
      await updateUserAttributes({
        userAttributes: {
          given_name: this.userProfile.given_name,
          family_name: this.userProfile.family_name
        }
      });
      this.message = 'Profile updated successfully!';
      setTimeout(() => this.message = '', 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      this.message = 'Error updating profile';
    }
    this.isLoading = false;
  }

  async savePreferences() {
    this.isLoading = true;
    try {
      const existingPrefs = await client.models.UserPreferences.list();
      
      if (existingPrefs.data && existingPrefs.data.length > 0) {
        await client.models.UserPreferences.update({
          id: existingPrefs.data[0].id,
          ...this.userPreferences
        });
      } else {
        await client.models.UserPreferences.create(this.userPreferences);
      }
      
      this.message = 'Preferences saved to DynamoDB!';
      setTimeout(() => this.message = '', 3000);
    } catch (error) {
      console.error('Error saving preferences to DDB:', error);
      this.message = 'Error saving preferences';
      setTimeout(() => this.message = '', 3000);
    }
    this.isLoading = false;
  }

  async testDailyEmail() {
    const events = await this.emailService.getCurrentDayEvents();
    console.log('Today\'s events:', events);
    this.message = `Found ${events.length} events for today`;
    setTimeout(() => this.message = '', 3000);
  }

  async testWeeklyEmail() {
    const events = await this.emailService.getCurrentWeekEvents();
    console.log('This week\'s events:', events);
    this.message = `Found ${events.length} events for this week`;
    setTimeout(() => this.message = '', 3000);
  }
}