import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-category-tree',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngFor="let category of categories" 
         class="category-item"
         [class.subcategory-item]="level > 0"
         [class.active]="selectedCategoryId === category.id"
         (click)="onSelectCategory(category.id)"
         draggable="true"
         (dragstart)="onDragStart.emit({event: $event, categoryId: category.id})"
         (dragover)="onDragOver.emit($event)"
         (dragleave)="onDragLeave.emit($event)"
         (drop)="onDrop.emit({event: $event, targetCategoryId: category.id})"
         (dragend)="onDragEnd.emit($event)">
      
      <div class="category-header">
        <div class="category-title-section">
          <button *ngIf="hasSubcategories(category.id)" 
                  (click)="onToggleExpansion(category.id, $event)" 
                  class="expand-btn">
            <i class="glyphicon" 
               [class.glyphicon-chevron-down]="expandedCategories.has(category.id)" 
               [class.glyphicon-chevron-right]="!expandedCategories.has(category.id)"></i>
          </button>
          <h3 [title]="category.name">{{ category.name }}</h3>
        </div>
        <div class="category-actions">
          <button (click)="onAddSubcategory(category.id, $event)" class="icon-btn" title="Add subcategory">
            <i class="glyphicon glyphicon-plus-sign"></i>
          </button>
          <button (click)="onPromoteToRoot(category.id, $event)" class="icon-btn" title="Promote to root" *ngIf="category.parentCategoryID">
            <i class="glyphicon glyphicon-arrow-up"></i>
          </button>
          <button (click)="onStartEdit(category, $event)" class="icon-btn" title="Edit category">
            <i class="glyphicon glyphicon-pencil"></i>
          </button>
          <button (click)="onDeleteCategory(category.id, $event)" class="icon-btn" title="Delete category">
            <i class="glyphicon glyphicon-trash"></i>
          </button>
        </div>
      </div>
      
      <p *ngIf="category.description" class="category-description" [title]="category.description">
        {{ category.description }}
      </p>
      
      <!-- Recursive subcategories -->
      <div *ngIf="expandedCategories.has(category.id) && subcategories[category.id]" 
           class="subcategories-container" 
           [attr.data-parent-id]="category.id">
        <app-category-tree
          [categories]="subcategories[category.id]"
          [subcategories]="subcategories"
          [selectedCategoryId]="selectedCategoryId"
          [expandedCategories]="expandedCategories"
          [level]="level + 1"
          (selectCategory)="onSelectCategory($event)"
          (toggleExpansion)="onToggleExpansion($event.categoryId, $event.event)"
          (addSubcategory)="onAddSubcategory($event.parentId, $event.event)"
          (promoteToRoot)="onPromoteToRoot($event.categoryId, $event.event)"
          (startEdit)="onStartEdit($event.category, $event.event)"
          (deleteCategory)="onDeleteCategory($event.categoryId, $event.event)"
          (dragStart)="onDragStart.emit($event)"
          (dragOver)="onDragOver.emit($event)"
          (dragLeave)="onDragLeave.emit($event)"
          (drop)="onDrop.emit($event)"
          (dragEnd)="onDragEnd.emit($event)">
        </app-category-tree>
      </div>
    </div>
  `
})
export class CategoryTreeComponent {
  @Input() categories: any[] = [];
  @Input() subcategories: { [key: string]: any[] } = {};
  @Input() selectedCategoryId: string | null = null;
  @Input() expandedCategories: Set<string> = new Set();
  @Input() level: number = 0;
  
  @Output() selectCategory = new EventEmitter<string>();
  @Output() toggleExpansion = new EventEmitter<{categoryId: string, event: Event}>();
  @Output() addSubcategory = new EventEmitter<{parentId: string, event: Event}>();
  @Output() promoteToRoot = new EventEmitter<{categoryId: string, event: Event}>();
  @Output() startEdit = new EventEmitter<{category: any, event: Event}>();
  @Output() deleteCategory = new EventEmitter<{categoryId: string, event: Event}>();
  @Output() dragStart = new EventEmitter<{event: DragEvent, categoryId: string}>();
  @Output() dragOver = new EventEmitter<DragEvent>();
  @Output() dragLeave = new EventEmitter<DragEvent>();
  @Output() drop = new EventEmitter<{event: DragEvent, targetCategoryId: string}>();
  @Output() dragEnd = new EventEmitter<DragEvent>();

  hasSubcategories(categoryId: string): boolean {
    return this.subcategories[categoryId] && this.subcategories[categoryId].length > 0;
  }

  onSelectCategory(categoryId: string) {
    this.selectCategory.emit(categoryId);
  }

  onToggleExpansion(categoryId: string, event: Event) {
    this.toggleExpansion.emit({categoryId, event});
  }

  onAddSubcategory(parentId: string, event: Event) {
    this.addSubcategory.emit({parentId, event});
  }

  onPromoteToRoot(categoryId: string, event: Event) {
    this.promoteToRoot.emit({categoryId, event});
  }

  onStartEdit(category: any, event: Event) {
    this.startEdit.emit({category, event});
  }

  onDeleteCategory(categoryId: string, event: Event) {
    this.deleteCategory.emit({categoryId, event});
  }
}