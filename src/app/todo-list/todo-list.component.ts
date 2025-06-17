import { Component, Input, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

@Component({
  selector: 'app-todo-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './todo-list.component.html',
  styleUrl: './todo-list.component.css',
})
export class TodoListComponent implements OnInit, OnChanges {
  @Input() eventId: string = '';
  
  todos: any[] = [];
  newTodoContent: string = '';
  editingTodo: any = null;

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

  listTodos() {
    if (!this.eventId) return;
    
    try {
      client.models.Todo.observeQuery({
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
    try {
      client.models.Todo.delete({ id });
    } catch (error) {
      console.error('Error deleting todo', error);
    }
  }
}