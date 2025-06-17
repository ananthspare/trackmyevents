import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { TodoListComponent } from '../todo-list/todo-list.component';

const client = generateClient<Schema>();

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TodoListComponent],
  templateUrl: './events.component.html',
  styleUrl: './events.component.css',
})
export class EventsComponent implements OnInit, OnDestroy {
  categoryId: string = '';
  category: any = null;
  events: any[] = [];
  newEvent = { title: '', description: '', targetDate: '' };
  editingEvent: any = null;
  countdowns: { [key: string]: any } = {};
  countdownInterval: any;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.categoryId = params['id'];
      this.loadCategory();
      this.listEvents();
    });

    // Update countdowns every second
    this.countdownInterval = setInterval(() => this.updateCountdowns(), 1000);
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  loadCategory() {
    if (!this.categoryId) return;
    
    client.models.Category.get({ id: this.categoryId })
      .then(category => {
        this.category = category;
      })
      .catch(error => console.error('Error loading category', error));
  }

  listEvents() {
    if (!this.categoryId) return;
    
    try {
      client.models.Event.observeQuery({
        filter: { categoryID: { eq: this.categoryId } }
      }).subscribe({
        next: ({ items }) => {
          this.events = items;
          this.updateCountdowns();
        },
        error: (error) => console.error('Error fetching events', error)
      });
    } catch (error) {
      console.error('Error setting up events subscription', error);
    }
  }

  updateCountdowns() {
    const now = new Date().getTime();
    
    this.events.forEach(event => {
      const targetTime = new Date(event.targetDate).getTime();
      const timeLeft = targetTime - now;
      
      if (timeLeft <= 0) {
        this.countdowns[event.id] = { expired: true };
      } else {
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        this.countdowns[event.id] = { days, hours, minutes, seconds, expired: false };
      }
    });
  }

  createEvent() {
    if (!this.newEvent.title.trim() || !this.newEvent.targetDate) return;
    
    try {
      client.models.Event.create({
        title: this.newEvent.title,
        description: this.newEvent.description || '', // Ensure description is not undefined
        targetDate: new Date(this.newEvent.targetDate).toISOString(),
        categoryID: this.categoryId
      });
      this.newEvent = { title: '', description: '', targetDate: '' };
    } catch (error) {
      console.error('Error creating event', error);
    }
  }

  startEdit(event: any) {
    // Format the date for the input field
    const date = new Date(event.targetDate);
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    const formattedDate = localDate.toISOString().slice(0, 16);
    
    this.editingEvent = { 
      ...event, 
      description: event.description || '', // Ensure description is not undefined
      targetDate: formattedDate
    };
  }

  cancelEdit() {
    this.editingEvent = null;
  }

  saveEdit() {
    if (!this.editingEvent || !this.editingEvent.title.trim() || !this.editingEvent.targetDate) return;
    
    try {
      client.models.Event.update({
        id: this.editingEvent.id,
        title: this.editingEvent.title,
        description: this.editingEvent.description || '', // Ensure description is not undefined
        targetDate: new Date(this.editingEvent.targetDate).toISOString()
      });
      this.editingEvent = null;
    } catch (error) {
      console.error('Error updating event', error);
    }
  }

  deleteEvent(id: string) {
    if (confirm('Are you sure you want to delete this event? All associated todos will also be deleted.')) {
      try {
        client.models.Event.delete({ id });
      } catch (error) {
        console.error('Error deleting event', error);
      }
    }
  }
}