import { Component } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterModule
  ],
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
  styles: [`
    .app-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      background-color: #7e57c2;
      color: white;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .main-nav {
      display: flex;
      gap: 20px;
    }
    .main-nav a {
      color: white;
      text-decoration: none;
      padding: 8px 12px;
      border-radius: 4px;
    }
    .main-nav a.active {
      background-color: rgba(255, 255, 255, 0.3);
    }
    .main-content {
      flex: 1;
      padding: 20px;
      background: #f5f5f5;
    }
    footer {
      background-color: #673ab7;
      color: white;
      text-align: center;
      padding: 12px;
    }
  `]
})
export class AppComponent {
  currentYear = new Date().getFullYear();
}