import { Component, Input, OnInit, OnChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { Subscription } from 'rxjs';

const client = generateClient<Schema>();

@Component({
  selector: 'app-todo-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './todo-list.component.html',
  styleUrl: './todo-list.component.css',
})
export class TodoListComponent implements OnInit, OnChanges, OnDestroy {
  @Input() eventId: string = '';
  
  todos: any[] = [];
  newTodoContent: string = '';
  editingTodo: any = null;
  private todoSubscription: Subscription | null = null;

  ngOnInit(): void {
    if (this.eventId) {
      this.listTodos();
    }
  }

  ngOnChanges(): void {
    if (this.eventId) {
      this.listTodos();
    }
  }

  ngOnDestroy(): void {
    if (this.todoSubscription) {
      this.todoSubscription.unsubscribe();
    }
  }

  listTodos() {
    if (!this.eventId) return;
    
    // Unsubscribe from previous subscription if exists
    if (this.todoSubscription) {
      this.todoSubscription.unsubscribe();
    }
    
    try {
      this.todoSubscription = client.models.Todo.observeQuery({
        filter: { eventID: { eq: this.eventId } }
      }).subscribe({
        next: ({ items }) => {
          this.todos = items;
        },
        error: (error) => console.error('Error fetching todos', error)
      });
    } catch (error) {
      console.error('Error setting up todos subscription', error);
    }
  }

  createTodo() {
    if (!this.newTodoContent.trim() || !this.eventId) return;
    
    try {
      client.models.Todo.create({
        content: this.newTodoContent,
        isDone: false,
        eventID: this.eventId
      });
      this.newTodoContent = '';
    } catch (error) {
      console.error('Error creating todo', error);
    }
  }

  toggleTodoStatus(todo: any) {
    if (!todo || !todo.id) return;
    
    try {
      client.models.Todo.update({
        id: todo.id,
        isDone: !todo.isDone
      });
    } catch (error) {
      console.error('Error toggling todo status', error);
    }
  }

  startEdit(todo: any) {
    if (!todo) return;
    this.editingTodo = { ...todo };
  }

  cancelEdit() {
    this.editingTodo = null;
  }

  saveEdit() {
    if (!this.editingTodo || !this.editingTodo.content.trim()) return;
    
    try {
      client.models.Todo.update({
        id: this.editingTodo.id,
        content: this.editingTodo.content
      });
      this.editingTodo = null;
    } catch (error) {
      console.error('Error updating todo', error);
    }
  }

  deleteTodo(id: string) {
    if (!id) return;
    
    try {
      client.models.Todo.delete({ id });
    } catch (error) {
      console.error('Error deleting todo', error);
    }
  }
}