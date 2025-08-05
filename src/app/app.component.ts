import { Component, ViewChild, OnInit } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';
import { AmplifyAuthenticatorModule, AuthenticatorService } from '@aws-amplify/ui-angular';
import { CategoriesComponent } from './categories/categories.component';
import { CalendarComponent } from './calendar/calendar.component';
import { TourComponent } from './tour/tour.component';
import { TourService } from './tour/tour.service';

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
    TourComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  title = 'Event Countdown App';
  currentYear = new Date().getFullYear();
  activeTab = 'categories';
  
  @ViewChild('categoriesRef') categoriesComponent!: CategoriesComponent;

  constructor(public authenticator: AuthenticatorService, private tourService: TourService) {}
  
  ngOnInit() {
    this.tourService.setAppComponent(this);
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

  getUserDisplayName(user: any): string {
    const firstName = user?.signInDetails?.loginId || '';
    const userAttributes = user?.signInDetails?.authFlowType === 'USER_SRP_AUTH' ? user : user?.attributes;
    const givenName = userAttributes?.given_name || userAttributes?.['custom:given_name'];
    const familyName = userAttributes?.family_name || userAttributes?.['custom:family_name'];
    
    if (givenName && familyName) {
      return `${givenName} ${familyName}`;
    }
    return firstName;
  }
}
