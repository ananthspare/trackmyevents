import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-todo-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="todo-list-container">
      <h4>Todo List</h4>
      
      <div class="add-todo-form">
        <input 
          type="text" 
          [(ngModel)]="newTodoContent" 
          placeholder="Add a todo item" 
          (keyup.enter)="createTodo()"
        />
        <button (click)="createTodo()" class="add-btn">
          <i class="fa fa-plus"></i>
        </button>
      </div>

      <div class="todos-list">
        <div *ngIf="todos.length === 0" class="empty-state">
          No todos yet
        </div>
        
        <div *ngFor="let todo of todos" class="todo-item">
          <div *ngIf="editingTodo?.id !== todo.id" class="todo-view">
            <div class="todo-content">
              <input 
                type="checkbox" 
                [checked]="todo.isDone" 
                (change)="toggleTodoStatus(todo)"
              />
              <span [class.completed]="todo.isDone">{{ todo.content }}</span>
            </div>
            <div class="todo-actions">
              <button (click)="startEdit(todo)" class="icon-btn">
                <i class="fa fa-pencil"></i>
              </button>
              <button (click)="deleteTodo(todo.id)" class="icon-btn">
                <i class="fa fa-trash"></i>
              </button>
            </div>
          </div>
          
          <div *ngIf="editingTodo?.id === todo.id" class="todo-edit">
            <input 
              type="text" 
              [(ngModel)]="editingTodo.content" 
              placeholder="Todo content" 
              required
            />
            <div class="edit-actions">
              <button (click)="saveEdit()" class="save-btn">
                <i class="fa fa-check"></i>
              </button>
              <button (click)="cancelEdit()" class="cancel-btn">
                <i class="fa fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .todo-list-container {
      margin-top: 15px;
      border-top: 1px solid #eee;
      padding-top: 15px;
    }
    .todo-list-container h4 {
      margin-bottom: 10px;
      font-size: 1rem;
      color: #555;
    }
    .add-todo-form {
      display: flex;
      margin-bottom: 10px;
      gap: 5px;
    }
    .add-todo-form input {
      flex: 1;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .add-btn {
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .todos-list {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .todo-item {
      padding: 8px;
      border-radius: 4px;
      background-color: #f9f9f9;
      border: 1px solid #eee;
    }
    .todo-view {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .todo-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .completed {
      text-decoration: line-through;
      color: #888;
    }
    .todo-actions {
      display: flex;
      gap: 5px;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .todo-item:hover .todo-actions {
      opacity: 1;
    }
    .todo-edit {
      display: flex;
      gap: 5px;
    }
    .todo-edit input {
      flex: 1;
      padding: 5px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .icon-btn, .save-btn, .cancel-btn {
      background: none;
      border: none;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .icon-btn:hover {
      background-color: #f0f0f0;
    }
    .save-btn {
      color: #4CAF50;
    }
    .cancel-btn {
      color: #f44336;
    }
    .empty-state {
      text-align: center;
      padding: 10px;
      color: #757575;
      font-style: italic;
      font-size: 0.9rem;
    }
  `]
})
export class TodoListComponent implements OnInit {
  @Input() eventId: string = '';
  
  todos: any[] = [];
  newTodoContent: string = '';
  editingTodo: any = null;

  ngOnInit(): void {
    // Mock data
    if (this.eventId) {
      this.todos = [
        { id: '1', content: 'Prepare materials', isDone: false, eventID: this.eventId },
        { id: '2', content: 'Send invitations', isDone: true, eventID: this.eventId }
      ];
    }
  }

  createTodo(): void {
    if (!this.newTodoContent.trim() || !this.eventId) return;
    
    const newTodo = {
      id: Date.now().toString(),
      content: this.newTodoContent,
      isDone: false,
      eventID: this.eventId
    };
    
    this.todos.push(newTodo);
    this.newTodoContent = '';
  }

  toggleTodoStatus(todo: any): void {
    todo.isDone = !todo.isDone;
  }

  startEdit(todo: any): void {
    this.editingTodo = { ...todo };
  }

  cancelEdit(): void {
    this.editingTodo = null;
  }

  saveEdit(): void {
    if (!this.editingTodo || !this.editingTodo.content.trim()) return;
    
    const index = this.todos.findIndex(todo => todo.id === this.editingTodo.id);
    if (index !== -1) {
      this.todos[index] = { ...this.editingTodo };
    }
    
    this.editingTodo = null;
  }

  deleteTodo(id: string): void {
    this.todos = this.todos.filter(todo => todo.id !== id);
  }
}