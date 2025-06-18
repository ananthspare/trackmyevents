import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

@Component({
  selector: 'app-todos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './todos.component.html',
  styleUrl: './todos.component.css',
})
export class TodosComponent implements OnInit, OnDestroy {
  categories: any[] = [];
  events: any[] = [];
  todos: any[] = [];
  
  selectedCategory: any = null;
  selectedEvent: any = null;

  private subscriptions: any[] = [];

  ngOnInit(): void {
    this.listCategories();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Category methods
  listCategories() {
    try {
      const sub = client.models.Category.observeQuery().subscribe({
        next: ({ items }) => {
          this.categories = items;
        },
        error: (error) => console.error('Error fetching categories', error)
      });
      this.subscriptions.push(sub);
    } catch (error) {
      console.error('Error setting up categories subscription', error);
    }
  }

  createCategory() {
    try {
      const name = window.prompt('Enter category name:');
      if (name && name.trim()) {
        const description = window.prompt('Enter category description (optional):');
        client.models.Category.create({
          name: name.trim(),
          description: description || ''
        });
      }
    } catch (error) {
      console.error('Error creating category', error);
    }
  }

  editCategory(category: any) {
    try {
      const name = window.prompt('Enter new category name:', category.name);
      if (name && name.trim()) {
        const description = window.prompt('Enter new category description (optional):', category.description);
        client.models.Category.update({
          id: category.id,
          name: name.trim(),
          description: description || ''
        });
      }
    } catch (error) {
      console.error('Error updating category', error);
    }
  }

  deleteCategory(id: string) {
    try {
      if (confirm('Are you sure you want to delete this category? All associated events and tasks will also be deleted.')) {
        client.models.Category.delete({ id });
        if (this.selectedCategory && this.selectedCategory.id === id) {
          this.selectedCategory = null;
          this.selectedEvent = null;
          this.events = [];
          this.todos = [];
        }
      }
    } catch (error) {
      console.error('Error deleting category', error);
    }
  }

  selectCategory(category: any) {
    this.selectedCategory = category;
    this.selectedEvent = null;
    this.todos = [];
    this.listEvents();
  }

  // Event methods
  listEvents() {
    if (!this.selectedCategory) return;
    
    try {
      const sub = client.models.Event.observeQuery({
        filter: { categoryID: { eq: this.selectedCategory.id } }
      }).subscribe({
        next: ({ items }) => {
          this.events = items;
        },
        error: (error) => console.error('Error fetching events', error)
      });
      this.subscriptions.push(sub);
    } catch (error) {
      console.error('Error setting up events subscription', error);
    }
  }

  createEvent() {
    if (!this.selectedCategory) return;
    
    try {
      const title = window.prompt('Enter event title:');
      if (title && title.trim()) {
        const description = window.prompt('Enter event description (optional):');
        const targetDateStr = window.prompt('Enter target date (YYYY-MM-DD HH:MM):');
        
        if (targetDateStr) {
          const targetDate = new Date(targetDateStr).toISOString();
          client.models.Event.create({
            title: title.trim(),
            description: description || '',
            targetDate: targetDate,
            categoryID: this.selectedCategory.id
          });
        }
      }
    } catch (error) {
      console.error('Error creating event', error);
    }
  }

  editEvent(event: any) {
    try {
      const title = window.prompt('Enter new event title:', event.title);
      if (title && title.trim()) {
        const description = window.prompt('Enter new event description (optional):', event.description);
        const targetDateStr = window.prompt('Enter new target date (YYYY-MM-DD HH:MM):', new Date(event.targetDate).toLocaleString());
        
        if (targetDateStr) {
          const targetDate = new Date(targetDateStr).toISOString();
          client.models.Event.update({
            id: event.id,
            title: title.trim(),
            description: description || '',
            targetDate: targetDate
          });
        }
      }
    } catch (error) {
      console.error('Error updating event', error);
    }
  }

  deleteEvent(id: string) {
    try {
      if (confirm('Are you sure you want to delete this event? All associated tasks will also be deleted.')) {
        client.models.Event.delete({ id });
        if (this.selectedEvent && this.selectedEvent.id === id) {
          this.selectedEvent = null;
          this.todos = [];
        }
      }
    } catch (error) {
      console.error('Error deleting event', error);
    }
  }

  selectEvent(event: any) {
    this.selectedEvent = event;
    this.listTodos();
  }

  isEventExpired(event: any): boolean {
    const targetTime = new Date(event.targetDate).getTime();
    const now = new Date().getTime();
    return targetTime < now;
  }

  getCountdownText(event: any): string {
    const targetTime = new Date(event.targetDate).getTime();
    const now = new Date().getTime();
    const timeLeft = targetTime - now;
    
    if (timeLeft <= 0) return 'Event has passed';
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  // Todo methods
  listTodos() {
    if (!this.selectedEvent) return;
    
    try {
      const sub = client.models.Todo.observeQuery({
        filter: { eventID: { eq: this.selectedEvent.id } }
      }).subscribe({
        next: ({ items }) => {
          this.todos = items;
        },
        error: (error) => console.error('Error fetching todos', error)
      });
      this.subscriptions.push(sub);
    } catch (error) {
      console.error('Error setting up todos subscription', error);
    }
  }

  createTodo() {
    if (!this.selectedEvent) return;
    
    try {
      const content = window.prompt('Enter task description:');
      if (content && content.trim()) {
        client.models.Todo.create({
          content: content.trim(),
          isDone: false,
          eventID: this.selectedEvent.id
        });
      }
    } catch (error) {
      console.error('Error creating todo', error);
    }
  }

  toggleTodo(todo: any) {
    try {
      client.models.Todo.update({
        id: todo.id,
        isDone: !todo.isDone
      });
    } catch (error) {
      console.error('Error updating todo', error);
    }
  }

  deleteTodo(id: string) {
    try {
      if (confirm('Are you sure you want to delete this task?')) {
        client.models.Todo.delete({ id });
      }
    } catch (error) {
      console.error('Error deleting todo', error);
    }
  }
}