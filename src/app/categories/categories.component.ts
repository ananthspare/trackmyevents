import { Component, OnInit, OnDestroy } from '@angular/core';
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
export class CategoriesComponent implements OnInit, OnDestroy {
  categories: any[] = [];
  selectedCategoryId: string | null = null;
  selectedCategory: any = null;
  events: any[] = [];
  newCategory = { name: '', description: '', parentID: '' };
  editingCategory: any = null;
  newEvent = { title: '', description: '', targetDate: '' };
  editingEvent: any = null;
  countdowns: { [key: string]: any } = {};
  countdownInterval: any;
  expandedCategories = new Set<string>();
  dragOverCategory: string | null = null;
  
  private categorySubscription: Subscription | null = null;
  private eventSubscription: Subscription | null = null;

  ngOnInit(): void {
    this.listCategories();
    this.countdownInterval = setInterval(() => this.updateCountdowns(), 1000);
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    if (this.categorySubscription) this.categorySubscription.unsubscribe();
    if (this.eventSubscription) this.eventSubscription.unsubscribe();
  }

  listCategories() {
    try {
      if (this.categorySubscription) this.categorySubscription.unsubscribe();
      
      this.categorySubscription = client.models.Category.observeQuery().subscribe({
        next: ({ items }) => {
          console.log('All categories from DB:', items);
          this.categories = items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          
          if (this.categories.length > 0 && !this.selectedCategoryId) {
            this.selectCategory(this.categories[0].id);
          }
        },
        error: (error) => console.error('Error fetching categories', error)
      });
    } catch (error) {
      console.error('Error setting up categories subscription', error);
    }
  }

  getRootCategories() {
    // Use description field to store parent ID if parentID field is not available
    const roots = this.categories.filter(cat => {
      if (cat.parentID) return false;
      if (cat.description && cat.description.startsWith('PARENT:')) return false;
      return true;
    });
    console.log('Root categories:', roots);
    return roots;
  }

  getSubCategories(parentId: string) {
    // Check both parentID field and description field
    const subs = this.categories.filter(cat => {
      if (cat.parentID === parentId) return true;
      if (cat.description && cat.description.startsWith(`PARENT:${parentId}`)) return true;
      return false;
    });
    console.log(`Subcategories for ${parentId}:`, subs);
    return subs;
  }

  hasChildren(categoryId: string): boolean {
    return this.categories.some(cat => {
      if (cat.parentID === categoryId) return true;
      if (cat.description && cat.description.startsWith(`PARENT:${categoryId}`)) return true;
      return false;
    });
  }

  selectCategory(categoryId: string) {
    this.selectedCategoryId = categoryId;
    this.selectedCategory = this.categories.find(cat => cat.id === categoryId);
    this.listEvents();
  }

  listEvents() {
    if (!this.selectedCategoryId) return;
    
    try {
      if (this.eventSubscription) this.eventSubscription.unsubscribe();
      
      this.eventSubscription = client.models.Event.observeQuery({
        filter: { categoryID: { eq: this.selectedCategoryId } }
      }).subscribe({
        next: ({ items }) => {
          this.events = items.sort((a, b) => {
            if (!a.targetDate && !b.targetDate) return 0;
            if (!a.targetDate) return 1;
            if (!b.targetDate) return -1;
            return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
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
      if (!event?.targetDate) return;
      
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
        console.error('Error calculating countdown', error);
      }
    });
  }

  async createCategory() {
    if (!this.newCategory.name.trim()) return;
    
    try {
      console.log('Creating category with data:', this.newCategory);
      
      // Store parent ID in description if parentID field is not available
      let description = this.newCategory.description || '';
      if (this.newCategory.parentID) {
        description = `PARENT:${this.newCategory.parentID}|${description}`;
      }
      
      // Create the category
      const result = await client.models.Category.create({
        name: this.newCategory.name,
        description: description,
        order: 0
      });
      
      console.log('Category created:', result);
      
      // Reset the form
      this.newCategory = { name: '', description: '', parentID: '' };
    } catch (error) {
      console.error('Error creating category', error);
    }
  }

  addSubCategory(parentCategory: any) {
    console.log('Adding subcategory to parent:', parentCategory.id);
    this.newCategory = { 
      name: '', 
      description: '', 
      parentID: parentCategory.id 
    };
    this.expandedCategories.add(parentCategory.id);
    
    // Focus on the name input
    setTimeout(() => {
      const nameInput = document.querySelector('.add-category-form input[name="categoryName"]') as HTMLInputElement;
      if (nameInput) nameInput.focus();
    }, 100);
  }

  toggleExpand(categoryId: string) {
    if (this.expandedCategories.has(categoryId)) {
      this.expandedCategories.delete(categoryId);
    } else {
      this.expandedCategories.add(categoryId);
    }
  }

  startEdit(category: any) {
    // Extract parent ID from description if needed
    let parentID = category.parentID || '';
    if (!parentID && category.description && category.description.startsWith('PARENT:')) {
      const match = category.description.match(/PARENT:([^|]+)\|/);
      if (match) {
        parentID = match[1];
      }
    }
    
    // Extract actual description
    let description = category.description || '';
    if (description.startsWith('PARENT:')) {
      description = description.split('|')[1] || '';
    }
    
    this.editingCategory = { 
      ...category,
      description: description,
      parentID: parentID
    };
  }

  cancelEdit() {
    this.editingCategory = null;
  }

  async saveEdit() {
    if (!this.editingCategory?.name.trim()) return;
    
    try {
      // Store parent ID in description if needed
      let description = this.editingCategory.description || '';
      if (this.editingCategory.parentID) {
        description = `PARENT:${this.editingCategory.parentID}|${description}`;
      }
      
      await client.models.Category.update({
        id: this.editingCategory.id,
        name: this.editingCategory.name,
        description: description
      });
      this.editingCategory = null;
    } catch (error) {
      console.error('Error updating category', error);
    }
  }

  async deleteCategory(id: string) {
    if (!confirm('Delete this category?')) return;
    
    try {
      await client.models.Category.delete({ id });
      if (id === this.selectedCategoryId) {
        this.selectedCategoryId = null;
        this.selectedCategory = null;
        this.events = [];
      }
    } catch (error) {
      console.error('Error deleting category', error);
    }
  }

  async onDrop(event: DragEvent, targetCategory: any) {
    event.preventDefault();
    const draggedId = event.dataTransfer?.getData('text/plain');
    this.dragOverCategory = null;
    
    if (!draggedId || draggedId === targetCategory.id) return;
    
    try {
      // Find the dragged category
      const draggedCategory = this.categories.find(c => c.id === draggedId);
      if (!draggedCategory) return;
      
      // Update with parent ID in description
      let description = draggedCategory.description || '';
      if (description.startsWith('PARENT:')) {
        description = description.split('|')[1] || '';
      }
      
      await client.models.Category.update({
        id: draggedId,
        description: `PARENT:${targetCategory.id}|${description}`
      });
      
      this.expandedCategories.add(targetCategory.id);
    } catch (error) {
      console.error('Error moving category', error);
    }
  }

  onDragStart(event: DragEvent, category: any) {
    event.dataTransfer?.setData('text/plain', category.id);
  }

  onDragOver(event: DragEvent, category: any) {
    event.preventDefault();
    this.dragOverCategory = category.id;
  }

  onDragLeave() {
    this.dragOverCategory = null;
  }

  getParentId(category: any): string | null {
    if (category.parentID) return category.parentID;
    
    if (category.description && category.description.startsWith('PARENT:')) {
      const match = category.description.match(/PARENT:([^|]+)\|/);
      return match ? match[1] : null;
    }
    
    return null;
  }

  getDescription(category: any): string {
    if (!category.description) return '';
    
    if (category.description.startsWith('PARENT:')) {
      const parts = category.description.split('|');
      return parts.length > 1 ? parts[1] : '';
    }
    
    return category.description;
  }

  getCategoryPath(category: any): string {
    if (!category) return '';
    const path = [category.name];
    let current = category;
    
    while (true) {
      const parentId = this.getParentId(current);
      if (!parentId) break;
      
      const parent = this.categories.find(c => c.id === parentId);
      if (parent) {
        path.unshift(parent.name);
        current = parent;
      } else break;
    }
    
    return path.join(' > ');
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
    try {
      const date = new Date(event.targetDate);
      const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      this.editingEvent = { 
        ...event, 
        description: event.description || '',
        targetDate: localDate.toISOString().slice(0, 16)
      };
    } catch (error) {
      this.editingEvent = { ...event, description: event.description || '', targetDate: '' };
    }
  }

  cancelEditEvent() {
    this.editingEvent = null;
  }

  saveEditEvent() {
    if (!this.editingEvent?.title.trim() || !this.editingEvent.targetDate) return;
    
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
    if (!confirm('Delete this event?')) return;
    
    try {
      client.models.Event.delete({ id });
    } catch (error) {
      console.error('Error deleting event', error);
    }
  }
}