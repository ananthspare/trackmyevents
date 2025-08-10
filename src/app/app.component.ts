import { Component, ViewChild, OnInit, AfterViewInit } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Amplify } from 'aws-amplify';
import { fetchUserAttributes } from 'aws-amplify/auth';
import outputs from '../../amplify_outputs.json';
import { AmplifyAuthenticatorModule, AuthenticatorService } from '@aws-amplify/ui-angular';
import { CategoriesComponent } from './categories/categories.component';
import { CalendarComponent } from './calendar/calendar.component';
import { TourComponent } from './tour/tour.component';
import { ProfileComponent } from './profile/profile.component';
import { DayPlannerComponent } from './day-planner/day-planner.component';
import { TourService } from './tour/tour.service';
import { UserService } from './user/user.service';

// Configure Amplify
Amplify.configure(outputs);

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterModule,
    AmplifyAuthenticatorModule,
    CategoriesComponent,
    CalendarComponent,
    TourComponent,
    ProfileComponent,
    DayPlannerComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit, AfterViewInit {
  title = 'Event Countdown App';
  currentYear = new Date().getFullYear();
  activeTab = 'categories';
  userDisplayName = '';
  
  @ViewChild('categoriesRef') categoriesComponent!: CategoriesComponent;

  constructor(public authenticator: AuthenticatorService, private tourService: TourService, private userService: UserService) {
    // Subscribe to user updates
    this.userService.userUpdated$.subscribe(() => {
      this.refreshUserDisplayName();
    });
  }
  
  async ngOnInit() {
    this.tourService.setAppComponent(this);
    await this.refreshUserDisplayName();
  }

  async refreshUserDisplayName() {
    if (this.authenticator.user) {
      this.userDisplayName = await this.getUserDisplayName(this.authenticator.user);
    }
  }

  async ngAfterViewInit() {
    // Refresh display name after view is initialized
    setTimeout(async () => {
      await this.refreshUserDisplayName();
    }, 100);
  }
  
  startTour() {
    this.tourService.startTour();
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }
  
  navigateToEventInCategories(eventId: string, categoryId: string) {
    this.activeTab = 'categories';
    
    const tryNavigate = () => {
      if (this.categoriesComponent) {
        this.categoriesComponent.navigateToEvent(eventId, categoryId);
      } else {
        setTimeout(tryNavigate, 100);
      }
    };
    
    setTimeout(tryNavigate, 100);
  }

  async getUserDisplayName(user: any): Promise<string> {
    try {
      const attributes = await fetchUserAttributes();
      const givenName = attributes.given_name;
      const familyName = attributes.family_name;
      
      if (givenName || familyName) {
        return `${givenName || ''} ${familyName || ''}`.trim();
      }
    } catch (error) {
      console.error('Error fetching user attributes:', error);
    }
    return user?.signInDetails?.loginId || 'User';
  }
}
