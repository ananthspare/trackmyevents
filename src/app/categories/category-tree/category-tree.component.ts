import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CategoryService } from '../../services/category.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { CategoryDialogComponent } from './category-dialog.component';
import { MoveCategoryDialogComponent } from './move-category-dialog.component';

@Component({
  selector: 'app-category-tree',
  standalone: true,
  imports: [
    CommonModule, 
    MatButtonModule, 
    MatIconModule, 
    MatMenuModule, 
    MatDialogModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    CategoryDialogComponent,
    MoveCategoryDialogComponent
  ],
  templateUrl: './category-tree.component.html',
  styleUrls: ['./category-tree.component.css']
})
export class CategoryTreeComponent implements OnInit {
  categories: any[] = [];
  rootCategories: any[] = [];
  selectedCategoryId: string | null = null;
  
  // Drag and drop properties
  draggedCategory: any = null;
  draggedElement: HTMLElement | null = null;
  dragTarget: any = null;
  dragPosition: 'before' | 'after' | 'inside' = 'after';
  
  @Output() categorySelected = new EventEmitter<string>();

  constructor(
    private categoryService: CategoryService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.categoryService.categories$.subscribe(categories => {
      this.categories = categories;
      this.rootCategories = this.categoryService.getCategoryHierarchy(categories);
    });
  }

  openAddCategoryDialog(): void {
    console.log('Opening add category dialog');
    const dialogRef = this.dialog.open(CategoryDialogComponent, {
      width: '400px',
      data: { title: 'Add Root Category' }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('Dialog closed with result:', result);
      if (result) {
        console.log('Creating category:', result.name, result.description);
        this.categoryService.createCategory(result.name, result.description)
          .then(newCategory => {
            console.log('Category created:', newCategory);
          })
          .catch(error => {
            console.error('Error creating category:', error);
          });
      }
    });
  }

  openAddSubcategoryDialog(parentCategory: any): void {
    const dialogRef = this.dialog.open(CategoryDialogComponent, {
      width: '400px',
      data: { title: `Add Subcategory to ${parentCategory.name}` }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.categoryService.createCategory(result.name, result.description, parentCategory.id)
          .then(newCategory => {
            console.log('Subcategory created:', newCategory);
          })
          .catch(error => {
            console.error('Error creating subcategory:', error);
          });
      }
    });
  }

  openEditCategoryDialog(category: any): void {
    const dialogRef = this.dialog.open(CategoryDialogComponent, {
      width: '400px',
      data: { 
        title: 'Edit Category',
        name: category.name,
        description: category.description
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.categoryService.updateCategory(category.id, {
          name: result.name,
          description: result.description
        });
      }
    });
  }

  openMoveCategoryDialog(category: any): void {
    const dialogRef = this.dialog.open(MoveCategoryDialogComponent, {
      width: '400px',
      data: { 
        category,
        categories: this.rootCategories
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.categoryService.moveCategory(category.id, result.targetCategoryId);
      }
    });
  }

  deleteCategory(categoryId: string): void {
    if (confirm('Are you sure you want to delete this category? All subcategories will also be deleted.')) {
      this.categoryService.deleteCategory(categoryId);
    }
  }

  convertToRootCategory(categoryId: string): void {
    this.categoryService.convertToRootCategory(categoryId);
  }
  
  selectCategory(categoryId: string): void {
    this.selectedCategoryId = categoryId;
    this.categorySelected.emit(categoryId);
  }
  
  // Drag and drop methods
  onDragStart(event: DragEvent, category: any, element: HTMLElement): void {
    this.draggedCategory = category;
    this.draggedElement = element;
    
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', category.id);
      
      // Add a class to the dragged element
      element.classList.add('dragging');
    }
  }
  
  onDragOver(event: DragEvent, category: any, element: HTMLElement): void {
    event.preventDefault();
    
    if (!this.draggedCategory || this.draggedCategory.id === category.id) {
      return;
    }
    
    // Prevent dragging a category into its own descendant
    if (this.isDescendant(this.draggedCategory, category.id)) {
      return;
    }
    
    this.dragTarget = category;
    
    // Determine drop position (before, after, or inside)
    const rect = element.getBoundingClientRect();
    const mouseY = event.clientY;
    const threshold = 5; // pixels
    
    // Remove any existing drop indicators
    document.querySelectorAll('.drop-before, .drop-after, .drop-inside').forEach(el => {
      el.classList.remove('drop-before', 'drop-after', 'drop-inside');
    });
    
    if (mouseY < rect.top + threshold) {
      // Drop before
      this.dragPosition = 'before';
      element.classList.add('drop-before');
    } else if (mouseY > rect.bottom - threshold) {
      // Drop after
      this.dragPosition = 'after';
      element.classList.add('drop-after');
    } else {
      // Drop inside (as a child)
      this.dragPosition = 'inside';
      element.classList.add('drop-inside');
    }
  }
  
  onDragLeave(event: DragEvent, element: HTMLElement): void {
    // Remove drop indicators
    element.classList.remove('drop-before', 'drop-after', 'drop-inside');
  }
  
  onDrop(event: DragEvent, category: any): void {
    event.preventDefault();
    
    if (!this.draggedCategory || !this.dragTarget) {
      return;
    }
    
    // Remove any drop indicators
    document.querySelectorAll('.drop-before, .drop-after, .drop-inside').forEach(el => {
      el.classList.remove('drop-before', 'drop-after', 'drop-inside');
    });
    
    // Remove dragging class
    if (this.draggedElement) {
      this.draggedElement.classList.remove('dragging');
    }
    
    // Handle the drop based on position
    if (this.dragPosition === 'inside') {
      // Move as a child
      this.categoryService.moveCategory(this.draggedCategory.id, this.dragTarget.id);
    } else {
      // Reorder at the same level
      const parent = this.findParentCategory(this.dragTarget);
      const siblings = this.getSiblings(this.dragTarget);
      const targetIndex = siblings.findIndex(c => c.id === this.dragTarget.id);
      
      // First, move to the same parent if needed
      if (this.draggedCategory.parentCategoryID !== (parent ? parent.id : null)) {
        this.categoryService.moveCategory(this.draggedCategory.id, parent ? parent.id : null)
          .then(() => {
            // Then reorder
            const newSiblings = [...siblings];
            const draggedIndex = newSiblings.findIndex(c => c.id === this.draggedCategory.id);
            
            if (draggedIndex !== -1) {
              newSiblings.splice(draggedIndex, 1);
            }
            
            const insertIndex = this.dragPosition === 'before' ? targetIndex : targetIndex + 1;
            newSiblings.splice(insertIndex, 0, this.draggedCategory);
            
            this.categoryService.reorderCategories(newSiblings.map(c => c.id));
          });
      } else {
        // Just reorder
        const newSiblings = [...siblings];
        const draggedIndex = newSiblings.findIndex(c => c.id === this.draggedCategory.id);
        
        if (draggedIndex !== -1) {
          newSiblings.splice(draggedIndex, 1);
        }
        
        const insertIndex = this.dragPosition === 'before' ? targetIndex : targetIndex + 1;
        newSiblings.splice(insertIndex, 0, this.draggedCategory);
        
        this.categoryService.reorderCategories(newSiblings.map(c => c.id));
      }
    }
    
    // Reset drag state
    this.draggedCategory = null;
    this.draggedElement = null;
    this.dragTarget = null;
  }
  
  onDragEnd(event: DragEvent): void {
    // Reset drag state
    if (this.draggedElement) {
      this.draggedElement.classList.remove('dragging');
    }
    
    this.draggedCategory = null;
    this.draggedElement = null;
    this.dragTarget = null;
    
    // Remove any drop indicators
    document.querySelectorAll('.drop-before, .drop-after, .drop-inside').forEach(el => {
      el.classList.remove('drop-before', 'drop-after', 'drop-inside');
    });
  }
  
  // Helper methods for drag and drop
  private isDescendant(category: any, targetId: string): boolean {
    if (!category.children || category.children.length === 0) {
      return false;
    }
    
    for (const child of category.children) {
      if (child.id === targetId) {
        return true;
      }
      
      if (this.isDescendant(child, targetId)) {
        return true;
      }
    }
    
    return false;
  }
  
  private findParentCategory(category: any): any | null {
    // For root categories
    if (category.isRoot) {
      return null;
    }
    
    // For subcategories
    return this.categories.find(c => c.id === category.parentCategoryID);
  }
  
  private getSiblings(category: any): any[] {
    if (category.isRoot) {
      return this.rootCategories;
    } else {
      const parent = this.findParentCategory(category);
      if (parent) {
        return parent.children || [];
      }
    }
    return [];
  }
}