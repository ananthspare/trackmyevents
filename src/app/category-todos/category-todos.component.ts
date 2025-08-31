import { Component, Input, OnInit, OnChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { Subscription } from 'rxjs';

const client = generateClient<Schema>();

@Component({
  selector: 'app-category-todos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="category-todos">
      <div class="todos-header">
        <h4>Category Tasks</h4>
      </div>
      
      <div class="add-todo">
        <input
          type="text"
          [(ngModel)]="newTodoContent"
          placeholder="Add a task..."
          (keyup.enter)="createTodo()"
          class="todo-input"
        />
        <button (click)="createTodo()" class="add-todo-btn" [disabled]="!newTodoContent.trim()">
          <i class="glyphicon glyphicon-plus"></i>
        </button>
      </div>

      <div class="todos-list" *ngIf="todos.length > 0">
        <div *ngFor="let todo of todos" class="todo-item" [class.completed]="todo.isDone">
          <div *ngIf="editingTodo?.id !== todo.id" class="todo-view">
            <input
              type="checkbox"
              [checked]="todo.isDone"
              (change)="toggleTodoStatus(todo)"
              class="todo-checkbox"
            />
            <span class="todo-content" [class.done]="todo.isDone">{{ todo.content }}</span>
            <div class="todo-actions">
              <button (click)="startEdit(todo)" class="edit-btn" title="Edit">
                <i class="glyphicon glyphicon-pencil"></i>
              </button>
              <button (click)="deleteTodo(todo.id)" class="delete-btn" title="Delete">
                <i class="glyphicon glyphicon-trash"></i>
              </button>
            </div>
          </div>

          <div *ngIf="editingTodo?.id === todo.id" class="todo-edit">
            <input
              type="text"
              [(ngModel)]="editingTodo.content"
              (keyup.enter)="saveEdit()"
              (keyup.escape)="cancelEdit()"
              class="edit-input"
              #editInput
            />
            <div class="edit-actions">
              <button (click)="saveEdit()" class="save-btn">
                <i class="glyphicon glyphicon-ok"></i>
              </button>
              <button (click)="cancelEdit()" class="cancel-btn">
                <i class="glyphicon glyphicon-remove"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="todos.length === 0" class="empty-todos">
        No tasks yet. Add one above!
      </div>
    </div>
  `,
  styles: [`
    .category-todos {
      margin-top: 10px;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 4px;
      border-left: 3px solid #007bff;
    }

    .todos-header h4 {
      margin: 0 0 10px 0;
      color: #495057;
      font-size: 14px;
      font-weight: 600;
    }

    .add-todo {
      display: flex;
      gap: 5px;
      margin-bottom: 10px;
    }

    .todo-input {
      flex: 1;
      padding: 6px 8px;
      border: 1px solid #ced4da;
      border-radius: 3px;
      font-size: 13px;
    }

    .add-todo-btn {
      padding: 6px 10px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
    }

    .add-todo-btn:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }

    .todos-list {
      max-height: 200px;
      overflow-y: auto;
    }

    .todo-item {
      display: flex;
      align-items: center;
      padding: 6px 0;
      border-bottom: 1px solid #e9ecef;
    }

    .todo-item:last-child {
      border-bottom: none;
    }

    .todo-view {
      display: flex;
      align-items: center;
      width: 100%;
      gap: 8px;
    }

    .todo-checkbox {
      margin: 0;
    }

    .todo-content {
      flex: 1;
      font-size: 13px;
      color: #495057;
    }

    .todo-content.done {
      text-decoration: line-through;
      color: #6c757d;
    }

    .todo-actions {
      display: flex;
      gap: 3px;
    }

    .edit-btn, .delete-btn, .save-btn, .cancel-btn {
      padding: 2px 6px;
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 11px;
    }

    .edit-btn {
      background: #ffc107;
      color: #212529;
    }

    .delete-btn {
      background: #dc3545;
      color: white;
    }

    .save-btn {
      background: #28a745;
      color: white;
    }

    .cancel-btn {
      background: #6c757d;
      color: white;
    }

    .todo-edit {
      display: flex;
      align-items: center;
      width: 100%;
      gap: 8px;
    }

    .edit-input {
      flex: 1;
      padding: 4px 6px;
      border: 1px solid #ced4da;
      border-radius: 2px;
      font-size: 13px;
    }

    .edit-actions {
      display: flex;
      gap: 3px;
    }

    .empty-todos {
      text-align: center;
      color: #6c757d;
      font-size: 12px;
      padding: 10px;
    }

    .completed {
      opacity: 0.7;
    }
  `]
})
export class CategoryTodosComponent implements OnInit, OnChanges, OnDestroy {
  @Input() categoryId: string = '';
  
  todos: any[] = [];
  newTodoContent: string = '';
  editingTodo: any = null;
  private todoSubscription: Subscription | null = null;

  ngOnInit(): void {
    if (this.categoryId) {
      this.listTodos();
    }
  }

  ngOnChanges(): void {
    if (this.categoryId) {
      this.listTodos();
    }
  }

  ngOnDestroy(): void {
    if (this.todoSubscription) {
      this.todoSubscription.unsubscribe();
    }
  }

  listTodos() {
    if (!this.categoryId) return;
    
    if (this.todoSubscription) {
      this.todoSubscription.unsubscribe();
    }
    
    try {
      this.todoSubscription = client.models.Todo.observeQuery({
        filter: { categoryID: { eq: this.categoryId } }
      }).subscribe({
        next: ({ items }) => {
          this.todos = items;
        },
        error: (error) => console.error('Error fetching category todos', error)
      });
    } catch (error) {
      console.error('Error setting up category todos subscription', error);
    }
  }

  createTodo() {
    if (!this.newTodoContent.trim() || !this.categoryId) return;
    
    try {
      client.models.Todo.create({
        content: this.newTodoContent,
        isDone: false,
        categoryID: this.categoryId
      });
      this.newTodoContent = '';
    } catch (error) {
      console.error('Error creating category todo', error);
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
      console.error('Error toggling category todo status', error);
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
      console.error('Error updating category todo', error);
    }
  }

  deleteTodo(id: string) {
    if (!id) return;
    
    try {
      client.models.Todo.delete({ id });
    } catch (error) {
      console.error('Error deleting category todo', error);
    }
  }
}