import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { RouterModule } from '@angular/router';
import { TodoListComponent } from '../todo-list/todo-list.component';
import { TimezoneService } from '../shared/timezone.service';

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
  draggedEventId: string | null = null;
  expandedCategories: Set<string> = new Set();
  highlightedEventId: string | null = null;
  snoozeEvent: any = null;
  snoozeType = 'once';
  newSnoozeDate = '';
  customInterval = 1;
  customUnit = 'days';
  recurrenceEndDate = '';
  weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  selectedWeekdays = [false, false, false, false, false, false, false];
  weeklyTime = '09:00';
  
  private categorySubscription: Subscription | null = null;
  private eventSubscription: Subscription | null = null;
  


  constructor(private elementRef: ElementRef, private timezoneService: TimezoneService) {}

  async ngOnInit(): Promise<void> {
    await this.timezoneService.loadUserTimezone();
    this.listCategories();
    
    // Update countdowns every second
    this.countdownInterval = setInterval(() => this.updateCountdowns(), 1000);
  }

  ngAfterViewInit(): void {
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
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        this.countdowns[event.id] = { days, hours, minutes, seconds, expired: false };
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
    // Reset form and set parent
    this.newCategory = { name: '', description: '', parentCategoryID: parentId };
    // Expand the parent category to show the new subcategory when created
    this.expandedCategories.add(parentId);
    // Focus on name input
    setTimeout(() => {
      const nameInput = document.querySelector('input[name="categoryName"]') as HTMLInputElement;
      if (nameInput) nameInput.focus();
    }, 0);
  }
  
  hasSubcategories(categoryId: string): boolean {
    return this.subcategories[categoryId] && this.subcategories[categoryId].length > 0;
  }
  
  getCategoryName(categoryId: string): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category ? category.name : '';
  }
  
  getParentIds(): string[] {
    return Object.keys(this.subcategories);
  }
  
  hasAncestor(category: any, potentialAncestorId: string): boolean {
    if (!category || !category.parentCategoryID) return false;
    if (category.parentCategoryID === potentialAncestorId) return true;
    
    const parentCategory = this.categories.find(c => c.id === category.parentCategoryID);
    return this.hasAncestor(parentCategory, potentialAncestorId);
  }
  
  getDropPosition(event: DragEvent, categoryItem: Element | null): 'above' | 'center' | 'below' {
    if (!categoryItem) return 'center';
    
    const rect = categoryItem.getBoundingClientRect();
    const y = event.clientY;
    const itemHeight = rect.height;
    const relativeY = y - rect.top;
    
    // Divide item into three zones: top 25%, middle 50%, bottom 25%
    if (relativeY < itemHeight * 0.25) {
      return 'above';
    } else if (relativeY > itemHeight * 0.75) {
      return 'below';
    } else {
      return 'center';
    }
  }
  
  async reorderCategories(draggedId: string, targetId: string, position: 'above' | 'below') {
    const draggedCategory = this.categories.find(c => c.id === draggedId);
    const targetCategory = this.categories.find(c => c.id === targetId);
    if (!draggedCategory || !targetCategory) return;
    
    try {
      // Get the appropriate list for reordering
      const isRoot = !draggedCategory.parentCategoryID;
      const categoryList = isRoot ? this.rootCategories : this.subcategories[draggedCategory.parentCategoryID!];
      
      const draggedIndex = categoryList.findIndex(c => c.id === draggedId);
      const targetIndex = categoryList.findIndex(c => c.id === targetId);
      
      if (draggedIndex === -1 || targetIndex === -1) return;
      
      // Remove dragged item
      const [removed] = categoryList.splice(draggedIndex, 1);
      
      // Calculate new position based on drop position
      let newIndex = targetIndex;
      if (draggedIndex < targetIndex) {
        // Moving down: adjust for removed item
        newIndex = position === 'above' ? targetIndex - 1 : targetIndex;
      } else {
        // Moving up: no adjustment needed
        newIndex = position === 'above' ? targetIndex : targetIndex + 1;
      }
      
      // Insert at new position
      categoryList.splice(newIndex, 0, removed);
      
      // Update order values in database
      for (let i = 0; i < categoryList.length; i++) {
        await client.models.Category.update({
          id: categoryList[i].id,
          order: i
        });
      }
    } catch (error) {
      console.error('Error reordering categories:', error);
    }
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
      const utcDateTime = this.timezoneService.convertToUTC(this.newEvent.targetDate);
      client.models.Event.create({
        title: this.newEvent.title,
        description: this.newEvent.description || '',
        targetDate: utcDateTime,
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
      const localDateTime = this.timezoneService.convertFromUTC(event.targetDate);
      
      this.editingEvent = { 
        ...event, 
        description: event.description || '',
        targetDate: localDateTime,
        categoryID: event.categoryID
      };
    } catch (error) {
      console.error('Error formatting date', error);
      this.editingEvent = { 
        ...event, 
        description: event.description || '',
        targetDate: '',
        categoryID: event.categoryID
      };
    }
  }

  cancelEditEvent() {
    this.editingEvent = null;
  }

  async saveEditEvent() {
    if (!this.editingEvent || !this.editingEvent.title.trim() || !this.editingEvent.targetDate) return;
    
    try {
      const utcDateTime = this.timezoneService.convertToUTC(this.editingEvent.targetDate);
      
      await client.models.Event.update({
        id: this.editingEvent.id,
        title: this.editingEvent.title,
        description: this.editingEvent.description || '',
        targetDate: utcDateTime,
        categoryID: this.editingEvent.categoryID
      });
      
      // If category changed, refresh the current view
      if (this.editingEvent.categoryID !== this.selectedCategoryId) {
        this.listEvents(); // Refresh current category events
      }
      
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
      // Remove existing position classes
      categoryItem.classList.remove('drag-over', 'drag-over-above', 'drag-over-below', 'drag-over-center');
      
      if (this.draggedEventId) {
        // Event being dragged - always show as move to category
        categoryItem.classList.add('drag-over-center');
        categoryItem.setAttribute('data-drop-action', 'MOVE EVENT');
      } else {
        // Category being dragged - show position-based feedback
        const position = this.getDropPosition(event, categoryItem);
        if (position === 'center') {
          categoryItem.classList.add('drag-over-center');
          categoryItem.setAttribute('data-drop-action', 'MOVE');
        } else {
          categoryItem.classList.add(`drag-over-${position}`);
          categoryItem.setAttribute('data-drop-action', 'ARRANGE');
        }
      }
    }
  }

  onDragLeave(event: DragEvent) {
    // Remove visual feedback
    const element = event.target as HTMLElement;
    const categoryItem = element.closest('.category-item');
    if (categoryItem) {
      categoryItem.classList.remove('drag-over', 'drag-over-above', 'drag-over-below', 'drag-over-center');
      categoryItem.removeAttribute('data-drop-action');
    }
  }

  onDrop(event: DragEvent, targetCategoryId?: string) {
    event.preventDefault();
    if (!this.isDragging) return;
    
    // Remove visual feedback
    const element = event.target as HTMLElement;
    const categoryItem = element.closest('.category-item');
    if (categoryItem) {
      categoryItem.classList.remove('drag-over', 'drag-over-above', 'drag-over-below', 'drag-over-center');
      categoryItem.removeAttribute('data-drop-action');
    }
    
    if (this.draggedEventId && targetCategoryId) {
      // Event being dropped on category
      this.moveEventToCategory(this.draggedEventId, targetCategoryId);
    } else if (this.draggedCategoryId) {
      // Category being dropped - existing logic
      const isRootDrop = element.closest('.categories-list') && !targetCategoryId;
      
      if (isRootDrop) {
        this.moveCategory(this.draggedCategoryId, null);
      } else if (targetCategoryId && targetCategoryId !== this.draggedCategoryId) {
        const draggedCategory = this.categories.find(c => c.id === this.draggedCategoryId);
        const targetCategory = this.categories.find(c => c.id === targetCategoryId);
        
        const dropPosition = this.getDropPosition(event, categoryItem);
        
        if (dropPosition === 'center') {
          const bothAreRoot = !draggedCategory?.parentCategoryID && !targetCategory?.parentCategoryID;
          const subcategoryToRoot = draggedCategory?.parentCategoryID && !targetCategory?.parentCategoryID;
          
          if (bothAreRoot) {
            this.moveCategory(this.draggedCategoryId, targetCategoryId);
          } else if (subcategoryToRoot) {
            this.moveCategory(this.draggedCategoryId, targetCategoryId);
          } else {
            if (!draggedCategory?.parentCategoryID && targetCategory?.parentCategoryID) {
              alert('Cannot move root category to subcategory. Only root categories can have subcategories.');
            } else {
              alert('Invalid move operation.');
            }
            this.resetDragState();
            return;
          }
        } else {
          const bothAreRoot = !draggedCategory?.parentCategoryID && !targetCategory?.parentCategoryID;
          const bothAreSubcategoriesOfSameParent = draggedCategory?.parentCategoryID && 
            targetCategory?.parentCategoryID && 
            draggedCategory.parentCategoryID === targetCategory.parentCategoryID;
          
          if (bothAreRoot || bothAreSubcategoriesOfSameParent) {
            this.reorderCategories(this.draggedCategoryId, targetCategoryId, dropPosition);
          } else {
            alert('Can only reorder items within the same level.');
            this.resetDragState();
            return;
          }
        }
      }
    }
    
    this.resetDragState();
  }

  onDragEnd(event: DragEvent) {
    // Remove dragging class
    const element = event.target as HTMLElement;
    element.classList.remove('dragging');
    
    this.resetDragState();
  }
  
  resetDragState() {
    this.isDragging = false;
    this.draggedCategoryId = null;
    this.draggedEventId = null;
    
    // Remove all drag feedback classes
    const allCategoryItems = document.querySelectorAll('.category-item');
    allCategoryItems.forEach(item => {
      item.classList.remove('drag-over', 'drag-over-above', 'drag-over-below', 'drag-over-center');
      item.removeAttribute('data-drop-action');
    });
    
    const allEventItems = document.querySelectorAll('.event-item');
    allEventItems.forEach(item => {
      item.classList.remove('dragging');
    });
  }
  
  onEventDragStart(event: DragEvent, eventId: string) {
    this.isDragging = true;
    this.draggedEventId = eventId;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', eventId);
    }
    
    const element = event.target as HTMLElement;
    setTimeout(() => {
      element.classList.add('dragging');
    }, 0);
  }
  
  onEventDragEnd(event: DragEvent) {
    const element = event.target as HTMLElement;
    element.classList.remove('dragging');
    this.resetDragState();
  }
  
  async moveEventToCategory(eventId: string, categoryId: string) {
    try {
      await client.models.Event.update({
        id: eventId,
        categoryID: categoryId
      });
      
      // Refresh current category events if event was moved away
      if (categoryId !== this.selectedCategoryId) {
        this.listEvents();
      }
    } catch (error) {
      console.error('Error moving event to category:', error);
    }
  }
  
  highlightEvent(eventId: string) {
    this.highlightedEventId = eventId;
    
    // Scroll to the highlighted event
    setTimeout(() => {
      const eventElement = document.querySelector(`[data-event-id="${eventId}"]`);
      if (eventElement) {
        eventElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    
    // Remove highlight after 2 seconds
    setTimeout(() => {
      this.highlightedEventId = null;
    }, 2000);
  }
  
  navigateToEvent(eventId: string, categoryId: string) {
    const tryNavigate = () => {
      const category = this.categories.find(cat => cat.id === categoryId);
      if (!category) {
        setTimeout(tryNavigate, 100);
        return;
      }
      
      if (category.parentCategoryID) {
        this.expandedCategories.add(category.parentCategoryID);
      }
      
      this.selectCategory(categoryId);
      
      setTimeout(() => {
        if (this.events.some(event => event.id === eventId)) {
          this.highlightEvent(eventId);
        }
      }, 500);
    };
    
    tryNavigate();
  }
  
  showSnoozeModal(event: any) {
    this.snoozeEvent = event;
    
    // Parse existing snooze data if available
    let existingSnoozeData: any = null;
    if (event.snoozeDates) {
      try {
        const parsed = JSON.parse(event.snoozeDates);
        if (parsed.dates && parsed.dates.length > 0) {
          existingSnoozeData = parsed;
        }
      } catch (error) {
        console.error('Error parsing existing snooze data:', error);
      }
    }
    
    if (existingSnoozeData) {
      // Load existing snooze configuration
      this.snoozeType = existingSnoozeData.type || 'once';
      this.newSnoozeDate = this.timezoneService.convertFromUTC(existingSnoozeData.dates[0]);
      this.customInterval = existingSnoozeData.customInterval || 1;
      this.customUnit = existingSnoozeData.customUnit || 'days';
      this.recurrenceEndDate = existingSnoozeData.endDate || '';
      this.selectedWeekdays = existingSnoozeData.weekdays || [false, false, false, false, false, false, false];
      this.weeklyTime = existingSnoozeData.weeklyTime || '09:00';
    } else {
      // Set default values for new snooze
      const now = new Date();
      const eventDate = new Date(event.targetDate);
      let defaultDate: Date;
      
      if (eventDate > now) {
        defaultDate = new Date(eventDate);
        defaultDate.setDate(defaultDate.getDate() + 1);
      } else {
        defaultDate = new Date(now.getTime() + (60 * 60 * 1000));
      }
      
      this.newSnoozeDate = this.timezoneService.convertFromUTC(defaultDate.toISOString());
      this.snoozeType = 'once';
      this.customInterval = 1;
      this.customUnit = 'days';
      this.recurrenceEndDate = '';
      this.selectedWeekdays = [false, false, false, false, false, false, false];
      this.weeklyTime = '09:00';
    }
  }
  
  cancelSnooze() {
    this.snoozeEvent = null;
  }
  
  async clearSnooze() {
    if (!this.snoozeEvent) return;
    
    try {
      await client.models.Event.update({
        id: this.snoozeEvent.id,
        snoozeDates: null
      });
      
      this.snoozeEvent = null;
    } catch (error) {
      console.error('Error clearing snooze:', error);
      alert('Error clearing snooze. Please try again.');
    }
  }
  
  async confirmSnooze() {
    if (!this.snoozeEvent || !this.newSnoozeDate) return;
    
    // Validate weekly recurrence
    if (this.snoozeType === 'weekly' && !this.selectedWeekdays.some(day => day)) {
      alert('Please select at least one day for weekly recurrence.');
      return;
    }
    
    try {
      let snoozeData;
      
      if (this.snoozeType === 'once') {
        snoozeData = {
          type: 'once',
          startDate: this.newSnoozeDate.split('T')[0]
        };
      } else if (this.snoozeType === 'daily') {
        const endDate = this.recurrenceEndDate || (() => {
          const end = new Date(this.newSnoozeDate.split('T')[0]);
          end.setDate(end.getDate() + 90);
          return end.toISOString().split('T')[0];
        })();
        
        snoozeData = {
          type: 'daily',
          startDate: this.newSnoozeDate.split('T')[0],
          endDate: endDate,
          customInterval: 1,
          customUnit: 'days',
          weekdays: [false, false, false, false, false, false, false]
        };
      } else {
        const endDate = this.recurrenceEndDate || (() => {
          const end = new Date(this.newSnoozeDate.split('T')[0]);
          end.setDate(end.getDate() + 90);
          return end.toISOString().split('T')[0];
        })();
        
        snoozeData = {
          type: this.snoozeType,
          startDate: this.newSnoozeDate.split('T')[0],
          endDate: endDate,
          customInterval: this.customInterval,
          customUnit: this.customUnit,
          weekdays: this.selectedWeekdays
        };
      }
      
      await client.models.Event.update({
        id: this.snoozeEvent.id,
        snoozeDates: JSON.stringify(snoozeData)
      });
      
      this.snoozeEvent = null;
    } catch (error) {
      console.error('Error snoozing event:', error);
      alert('Error snoozing event. Please try again.');
    }
  }
  
  generateSnoozeDates(startDate: string): string[] {
    const start = new Date(startDate);
    const endDate = this.recurrenceEndDate ? 
      new Date(this.recurrenceEndDate + 'T23:59:59') : 
      new Date(start.getTime() + (90 * 24 * 60 * 60 * 1000));
    
    const dates: string[] = [];
    let currentDate = new Date(start);
    
    // Generate additional occurrences (not including the start date)
    while (dates.length < 50) {
      if (this.snoozeType === 'daily') {
        currentDate = new Date(currentDate.getTime() + (24 * 60 * 60 * 1000));
      } else if (this.snoozeType === 'weekly') {
        const nextWeekDate = this.getNextWeeklyOccurrence(currentDate);
        if (!nextWeekDate || nextWeekDate > endDate) break;
        currentDate = nextWeekDate;
      } else if (this.snoozeType === 'custom') {
        if (this.customUnit === 'days') {
          currentDate = new Date(currentDate.getTime() + (this.customInterval * 24 * 60 * 60 * 1000));
        } else if (this.customUnit === 'weeks') {
          currentDate = new Date(currentDate.getTime() + (this.customInterval * 7 * 24 * 60 * 60 * 1000));
        } else if (this.customUnit === 'months') {
          const newDate = new Date(currentDate);
          newDate.setMonth(newDate.getMonth() + this.customInterval);
          currentDate = newDate;
        }
      }
      
      if (currentDate > endDate) break;
      dates.push(currentDate.toISOString());
    }
    
    return dates;
  }
  
  getNextWeeklyOccurrence(fromDate: Date): Date | null {
    const selectedDays = this.selectedWeekdays.map((selected, index) => selected ? index : -1).filter(day => day !== -1);
    if (selectedDays.length === 0) return null;
    
    const [hours, minutes] = this.weeklyTime.split(':').map(Number);
    let nextDate = new Date(fromDate);
    nextDate.setDate(nextDate.getDate() + 1); // Start from next day
    
    // Look for the next occurrence within the next 7 days
    for (let i = 0; i < 7; i++) {
      const dayOfWeek = (nextDate.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
      if (selectedDays.includes(dayOfWeek)) {
        const resultDate = new Date(nextDate);
        resultDate.setHours(hours, minutes, 0, 0);
        return resultDate;
      }
      nextDate.setDate(nextDate.getDate() + 1);
    }
    
    return null;
  }
  
  getEventOccurrences(event: any): { date: string, isOriginal: boolean }[] {
    const occurrences = [{ date: event.targetDate, isOriginal: true }];
    
    if (event.snoozeDates) {
      try {
        const snoozeData = JSON.parse(event.snoozeDates);
        if (snoozeData.dates) {
          snoozeData.dates.forEach((date: string) => {
            occurrences.push({ date, isOriginal: false });
          });
        }
      } catch (error) {
        console.error('Error parsing snooze dates:', error);
      }
    }
    
    return occurrences;
  }
}