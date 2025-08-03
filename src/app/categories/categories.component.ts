import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { RouterModule } from '@angular/router';
import { TodoListComponent } from '../todo-list/todo-list.component';

import { Subscription } from 'rxjs';

const client = generateClient<Schema>();

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TodoListComponent],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css',
})
export class CategoriesComponent implements OnInit, OnDestroy, AfterViewInit {
  categories: any[] = [];
  rootCategories: any[] = [];
  subcategories: { [key: string]: any[] } = {};
  selectedCategoryId: string | null = null;
  selectedCategory: any = null;
  events: any[] = [];
  newCategory = { name: '', description: '', parentCategoryID: null as string | null };
  editingCategory: any = null;
  newEvent = { title: '', description: '', targetDate: '' };
  editingEvent: any = null;
  countdowns: { [key: string]: any } = {};
  countdownInterval: any;
  isDragging = false;
  draggedIndex: number = -1;
  draggedCategoryId: string | null = null;
  expandedCategories: Set<string> = new Set();
  
  private categorySubscription: Subscription | null = null;
  private eventSubscription: Subscription | null = null;

  constructor(private elementRef: ElementRef) {}

  ngOnInit(): void {
    this.listCategories();
    
    // Update countdowns every second
    this.countdownInterval = setInterval(() => this.updateCountdowns(), 1000);
  }

  ngAfterViewInit(): void {
    this.initDraggableSidebar();
    this.initResizeHandle();
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    
    if (this.categorySubscription) {
      this.categorySubscription.unsubscribe();
    }
    
    if (this.eventSubscription) {
      this.eventSubscription.unsubscribe();
    }
  }

  initDraggableSidebar(): void {
    const sidebar = this.elementRef.nativeElement.querySelector('#categoriesSidebar');
    const dragHandle = this.elementRef.nativeElement.querySelector('#dragHandle');
    
    if (!sidebar || !dragHandle) return;
    
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    dragHandle.onmousedown = (e: MouseEvent) => {
      e.preventDefault();
      this.isDragging = true;
      pos3 = e.clientX;
      pos4 = e.clientY;
      
      document.onmousemove = (e: MouseEvent) => {
        if (!this.isDragging) return;
        
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        sidebar.style.left = (sidebar.offsetLeft - pos1) + "px";
      };
      
      document.onmouseup = () => {
        this.isDragging = false;
        document.onmouseup = null;
        document.onmousemove = null;
      };
    };
  }

  initResizeHandle(): void {
    const resizeHandle = this.elementRef.nativeElement.querySelector('#resizeHandle');
    const sidebar = this.elementRef.nativeElement.querySelector('#categoriesSidebar');
    
    if (!resizeHandle || !sidebar) return;
    
    let isResizing = false;
    
    resizeHandle.onmousedown = (e: MouseEvent) => {
      e.preventDefault();
      isResizing = true;
      
      document.onmousemove = (e: MouseEvent) => {
        if (!isResizing) return;
        
        const containerRect = this.elementRef.nativeElement.querySelector('.two-column-layout').getBoundingClientRect();
        const newWidth = e.clientX - containerRect.left;
        
        if (newWidth >= 200 && newWidth <= 400) {
          sidebar.style.width = newWidth + 'px';
        }
      };
      
      document.onmouseup = () => {
        isResizing = false;
        document.onmouseup = null;
        document.onmousemove = null;
      };
    };
  }

  listCategories() {
    try {
      // Unsubscribe from previous subscription if exists
      if (this.categorySubscription) {
        this.categorySubscription.unsubscribe();
      }
      
      this.categorySubscription = client.models.Category.observeQuery().subscribe({
        next: ({ items }) => {
          // Store all categories sorted by order
          this.categories = items.sort((a, b) => (a.order || 0) - (b.order || 0));
          
          // Organize categories into hierarchy
          this.rootCategories = this.categories
            .filter(cat => !cat.parentCategoryID)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
          
          // Group subcategories by parent
          this.subcategories = {};
          this.categories
            .filter(cat => cat.parentCategoryID)
            .forEach(cat => {
              if (!this.subcategories[cat.parentCategoryID]) {
                this.subcategories[cat.parentCategoryID] = [];
              }
              this.subcategories[cat.parentCategoryID].push(cat);
            });
          
          // Sort subcategories by order
          Object.keys(this.subcategories).forEach(parentId => {
            this.subcategories[parentId].sort((a, b) => (a.order || 0) - (b.order || 0));
          });
          
          // Select first category if none selected
          if (this.categories.length > 0 && !this.selectedCategoryId) {
            this.selectCategory(this.rootCategories.length > 0 ? this.rootCategories[0].id : this.categories[0].id);
          }
        },
        error: (error) => console.error('Error fetching categories', error)
      });
    } catch (error) {
      console.error('Error setting up categories subscription', error);
    }
  }

  selectCategory(categoryId: string) {
    this.selectedCategoryId = categoryId;
    this.selectedCategory = this.categories.find(cat => cat.id === categoryId);
    this.listEvents();
  }

  listEvents() {
    if (!this.selectedCategoryId) return;
    
    try {
      // Unsubscribe from previous subscription if exists
      if (this.eventSubscription) {
        this.eventSubscription.unsubscribe();
      }
      
      this.eventSubscription = client.models.Event.observeQuery({
        filter: { categoryID: { eq: this.selectedCategoryId } }
      }).subscribe({
        next: ({ items }) => {
          // Sort events by target date (nearest first), handling null values
          this.events = items.sort((a, b) => {
            if (!a.targetDate && !b.targetDate) return 0;
            if (!a.targetDate) return 1;
            if (!b.targetDate) return -1;
            
            const dateA = new Date(a.targetDate).getTime();
            const dateB = new Date(b.targetDate).getTime();
            return dateA - dateB;
          });
          this.updateCountdowns();
        },
        error: (error) => console.error('Error fetching events', error)
      });
    } catch (error) {
      console.error('Error setting up events subscription', error);
    }
  }

  updateCountdowns() {
    if (!this.events) return;
    
    const now = new Date().getTime();
    
    this.events.forEach(event => {
      if (!event || !event.targetDate) return;
      
      try {
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
      } catch (error) {
        console.error('Error calculating countdown for event', event.id, error);
      }
    });
  }

  async createCategory() {
    if (!this.newCategory.name.trim()) return;
    
    try {
      let maxOrder;
      if (this.newCategory.parentCategoryID) {
        // For subcategories, get max order within the parent's subcategories
        const parentSubcategories = this.subcategories[this.newCategory.parentCategoryID] || [];
        maxOrder = parentSubcategories.length > 0 
          ? Math.max(...parentSubcategories.map(c => c.order || 0)) 
          : -1;
      } else {
        // For root categories, get max order among root categories
        maxOrder = this.rootCategories.length > 0 
          ? Math.max(...this.rootCategories.map(c => c.order || 0)) 
          : -1;
      }
      
      const result = await client.models.Category.create({
        name: this.newCategory.name,
        description: this.newCategory.description || '',
        parentCategoryID: this.newCategory.parentCategoryID,
        order: maxOrder + 1
      });
      
      // Reset form
      this.newCategory = { name: '', description: '', parentCategoryID: null as string | null };
      
      // Access the id from the data property
      if (result && result.data && result.data.id) {
        this.selectCategory(result.data.id);
      }
    } catch (error) {
      console.error('Error creating category', error);
    }
  }

  startEdit(category: any) {
    this.editingCategory = { 
      ...category,
      description: category.description || ''
    };
  }
  
  toggleCategoryExpansion(categoryId: string, event: Event) {
    event.stopPropagation();
    if (this.expandedCategories.has(categoryId)) {
      this.expandedCategories.delete(categoryId);
    } else {
      this.expandedCategories.add(categoryId);
    }
  }
  
  addSubcategory(parentId: string, event: Event) {
    event.stopPropagation();
    this.newCategory.parentCategoryID = parentId as string | null;
    // Expand the parent category to show the new subcategory when created
    this.expandedCategories.add(parentId);
  }
  
  hasSubcategories(categoryId: string): boolean {
    return this.subcategories[categoryId] && this.subcategories[categoryId].length > 0;
  }
  
  getCategoryName(categoryId: string): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category ? category.name : '';
  }
  
  hasAncestor(category: any, potentialAncestorId: string): boolean {
    if (!category || !category.parentCategoryID) return false;
    if (category.parentCategoryID === potentialAncestorId) return true;
    
    const parentCategory = this.categories.find(c => c.id === category.parentCategoryID);
    return this.hasAncestor(parentCategory, potentialAncestorId);
  }
  
  async moveCategory(categoryId: string, newParentId: string | null) {
    const category = this.categories.find(c => c.id === categoryId);
    if (!category) return;
    
    // Prevent circular relationships
    if (newParentId && (categoryId === newParentId || this.hasAncestor({ parentCategoryID: newParentId }, categoryId))) {
      alert('Cannot move category: This would create a circular relationship.');
      return;
    }
    
    const confirmMessage = newParentId 
      ? `Move "${category.name}" to become a subcategory?`
      : `Promote "${category.name}" to a root category?`;
    
    if (confirm(confirmMessage)) {
      try {
        await client.models.Category.update({
          id: categoryId,
          parentCategoryID: newParentId
        });
        
        // Expand the new parent if moving to a subcategory
        if (newParentId) {
          this.expandedCategories.add(newParentId);
        }
      } catch (error) {
        console.error('Error moving category:', error);
        alert('Failed to move category. Please try again.');
      }
    }
  }
  
  promoteToRoot(categoryId: string) {
    this.moveCategory(categoryId, null);
  }
  
  async deleteSubcategoriesRecursively(parentId: string) {
    if (!this.subcategories[parentId]) return;
    
    // Get all direct subcategories
    const directSubcategories = this.subcategories[parentId];
    
    // For each subcategory
    for (const subcategory of directSubcategories) {
      // Delete its subcategories first (recursive)
      await this.deleteSubcategoriesRecursively(subcategory.id);
      
      // Then delete the subcategory itself
      await client.models.Category.delete({ id: subcategory.id });
    }
  }

  cancelEdit() {
    this.editingCategory = null;
  }

  async saveEdit() {
    if (!this.editingCategory || !this.editingCategory.name.trim()) return;
    
    try {
      await client.models.Category.update({
        id: this.editingCategory.id,
        name: this.editingCategory.name,
        description: this.editingCategory.description || '',
        parentCategoryID: this.editingCategory.parentCategoryID
      });
      this.editingCategory = null;
    } catch (error) {
      console.error('Error updating category', error);
    }
  }

  async deleteCategory(id: string) {
    if (!id) return;
    
    // Check if category has subcategories
    const hasSubcats = this.hasSubcategories(id);
    let confirmMessage = 'Are you sure you want to delete this category? All associated events will also be deleted.';
    if (hasSubcats) {
      confirmMessage = 'This category has subcategories that will also be deleted. Are you sure you want to proceed?';
    }
    
    if (confirm(confirmMessage)) {
      try {
        // First delete all subcategories recursively
        await this.deleteSubcategoriesRecursively(id);
        
        // Then delete the category itself
        await client.models.Category.delete({ id });
        
        // If the deleted category was selected, select another one
        if (id === this.selectedCategoryId) {
          this.selectedCategoryId = null;
          this.selectedCategory = null;
          this.events = [];
          
          // Find remaining categories after deletion
          const remainingCategories = this.categories.filter(c => c.id !== id);
          if (remainingCategories.length > 0) {
            this.selectCategory(remainingCategories[0].id);
          }
        }
      } catch (error) {
        console.error('Error deleting category', error);
      }
    }
  }

  createEvent() {
    if (!this.newEvent.title.trim() || !this.newEvent.targetDate || !this.selectedCategoryId) return;
    
    try {
      client.models.Event.create({
        title: this.newEvent.title,
        description: this.newEvent.description || '',
        targetDate: new Date(this.newEvent.targetDate).toISOString(),
        categoryID: this.selectedCategoryId
      });
      this.newEvent = { title: '', description: '', targetDate: '' };
    } catch (error) {
      console.error('Error creating event', error);
    }
  }

  startEditEvent(event: any) {
    if (!event) return;
    
    try {
      const date = new Date(event.targetDate);
      const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      const formattedDate = localDate.toISOString().slice(0, 16);
      
      this.editingEvent = { 
        ...event, 
        description: event.description || '',
        targetDate: formattedDate
      };
    } catch (error) {
      console.error('Error formatting date', error);
      this.editingEvent = { 
        ...event, 
        description: event.description || '',
        targetDate: ''
      };
    }
  }

  cancelEditEvent() {
    this.editingEvent = null;
  }

  saveEditEvent() {
    if (!this.editingEvent || !this.editingEvent.title.trim() || !this.editingEvent.targetDate) return;
    
    try {
      client.models.Event.update({
        id: this.editingEvent.id,
        title: this.editingEvent.title,
        description: this.editingEvent.description || '',
        targetDate: new Date(this.editingEvent.targetDate).toISOString()
      });
      this.editingEvent = null;
    } catch (error) {
      console.error('Error updating event', error);
    }
  }

  deleteEvent(id: string) {
    if (!id) return;
    
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        client.models.Event.delete({ id });
      } catch (error) {
        console.error('Error deleting event', error);
      }
    }
  }

  onDragStart(event: DragEvent, categoryId: string) {
    this.isDragging = true;
    this.draggedCategoryId = categoryId;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', categoryId);
    }
    
    // Add dragging class for visual feedback
    const element = event.target as HTMLElement;
    setTimeout(() => {
      element.classList.add('dragging');
    }, 0);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    
    // Add visual feedback for drop zones
    const element = event.target as HTMLElement;
    const categoryItem = element.closest('.category-item');
    if (categoryItem) {
      categoryItem.classList.add('drag-over');
    }
  }

  onDragLeave(event: DragEvent) {
    // Remove visual feedback
    const element = event.target as HTMLElement;
    const categoryItem = element.closest('.category-item');
    if (categoryItem) {
      categoryItem.classList.remove('drag-over');
    }
  }

  onDrop(event: DragEvent, targetCategoryId?: string) {
    event.preventDefault();
    if (!this.isDragging || !this.draggedCategoryId) return;
    
    // Remove visual feedback
    const element = event.target as HTMLElement;
    const categoryItem = element.closest('.category-item');
    if (categoryItem) {
      categoryItem.classList.remove('drag-over');
    }
    
    // Check if dropping on root area (promote to root)
    const isRootDrop = element.closest('.categories-list') && !targetCategoryId;
    
    if (isRootDrop) {
      this.moveCategory(this.draggedCategoryId, null);
    } else if (targetCategoryId && targetCategoryId !== this.draggedCategoryId) {
      // Prevent invalid movements in single-level hierarchy
      const draggedCategory = this.categories.find(c => c.id === this.draggedCategoryId);
      const targetCategory = this.categories.find(c => c.id === targetCategoryId);
      
      // Prevent subcategory to subcategory movement
      if (draggedCategory?.parentCategoryID && targetCategory?.parentCategoryID) {
        alert('Cannot move subcategory to another subcategory. Only root categories can have subcategories.');
        this.isDragging = false;
        this.draggedCategoryId = null;
        return;
      }
      
      // Prevent root category to subcategory movement
      if (!draggedCategory?.parentCategoryID && targetCategory?.parentCategoryID) {
        alert('Cannot move root category to subcategory. Only root categories can have subcategories.');
        this.isDragging = false;
        this.draggedCategoryId = null;
        return;
      }
      
      this.moveCategory(this.draggedCategoryId, targetCategoryId);
    }
    
    // Reset drag state
    this.isDragging = false;
    this.draggedCategoryId = null;
  }

  onDragEnd(event: DragEvent) {
    this.isDragging = false;
    this.draggedCategoryId = null;
    
    // Remove dragging class
    const element = event.target as HTMLElement;
    element.classList.remove('dragging');
    
    // Remove any remaining drag-over classes
    const dragOverElements = document.querySelectorAll('.drag-over');
    dragOverElements.forEach(el => el.classList.remove('drag-over'));
  }
}