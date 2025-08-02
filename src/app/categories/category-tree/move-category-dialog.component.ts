import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-move-category-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatRadioModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>Move Category</h2>
    <mat-dialog-content>
      <p>Select a destination for "{{ data.category.name }}":</p>
      
      <div class="radio-group">
        <mat-radio-group [(ngModel)]="selectedOption">
          <div class="radio-option">
            <mat-radio-button [value]="'root'">Root Level</mat-radio-button>
          </div>
          
          <div *ngFor="let category of availableCategories" class="radio-option">
            <mat-radio-button [value]="category.id" [disabled]="isDisabled(category)">
              <span [style.padding-left.px]="(category.level || 0) * 20">
                <mat-icon *ngIf="category.level > 0">subdirectory_arrow_right</mat-icon>
                {{ category.name }}
              </span>
            </mat-radio-button>
          </div>
        </mat-radio-group>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-button [mat-dialog-close]="{ targetCategoryId: selectedOption === 'root' ? null : selectedOption }">Move</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .radio-group {
      display: flex;
      flex-direction: column;
      margin: 15px 0;
    }
    .radio-option {
      margin: 5px 0;
    }
    mat-icon {
      vertical-align: middle;
      font-size: 18px;
      height: 18px;
      width: 18px;
      margin-right: 5px;
    }
  `]
})
export class MoveCategoryDialogComponent {
  selectedOption: string = 'root';
  availableCategories: any[] = [];
  
  constructor(
    public dialogRef: MatDialogRef<MoveCategoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.availableCategories = this.flattenCategories(data.categories);
    this.selectedOption = data.category.isRoot ? 'root' : (data.category.parentCategoryID || 'root');
  }
  
  // Flatten the category hierarchy for display
  private flattenCategories(categories: any[]): any[] {
    let result: any[] = [];
    
    for (const category of categories) {
      // Skip the category being moved and its children
      if (category.id !== this.data.category.id) {
        result.push(category);
        
        if (category.children && category.children.length > 0) {
          result = [...result, ...this.flattenCategories(category.children)];
        }
      }
    }
    
    return result;
  }
  
  // Check if a category should be disabled (to prevent circular references)
  isDisabled(category: any): boolean {
    // Can't move a category to itself or its descendants
    return this.isDescendant(this.data.category, category.id);
  }
  
  // Check if potentialAncestor is an ancestor of the category with targetId
  private isDescendant(category: any, targetId: string): boolean {
    if (category.id === targetId) {
      return true;
    }
    
    if (category.children && category.children.length > 0) {
      for (const child of category.children) {
        if (this.isDescendant(child, targetId)) {
          return true;
        }
      }
    }
    
    return false;
  }
}