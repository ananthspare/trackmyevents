import { Component } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  template: `
    <div class="app-container">
      <header>
        <h1>Event Countdown App</h1>
        <nav class="main-nav">
          <a routerLink="/categories" routerLinkActive="active">Categories</a>
          <a routerLink="/calendar" routerLinkActive="active">Calendar</a>
        </nav>
      </header>
      
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
      
      <footer>
        <p>© {{currentYear}} Event Countdown App</p>
      </footer>
    </div>
  `,
  styleUrl: './app.component.css'
})
export class AppComponent {
  currentYear = new Date().getFullYear();
}