import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { RouterModule } from '@angular/router';
import { EventService } from '../services/event.service';
import { Subscription } from 'rxjs';

const client = generateClient<Schema>();

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css',
})
export class CategoriesComponent implements OnInit, OnDestroy {
  categories: any[] = [];
  newCategory = { name: '', description: '', color: '#4285F4' };
  editingCategory: any = null;
  private categorySubscription: Subscription | null = null;

  constructor(private eventService: EventService) {}

  ngOnInit(): void {
    this.categorySubscription = this.eventService.categories$.subscribe(categories => {
      this.categories = categories;
    });
  }

  ngOnDestroy(): void {
    if (this.categorySubscription) {
      this.categorySubscription.unsubscribe();
    }
  }

  async createCategory() {
    if (!this.newCategory.name.trim()) return;
    
    try {
      await client.models.Category.create({
        name: this.newCategory.name,
        description: this.newCategory.description || '',
        color: this.newCategory.color
      });
      this.newCategory = { name: '', description: '', color: '#4285F4' };
    } catch (error) {
      console.error('Error creating category', error);
    }
  }

  startEdit(category: any) {
    this.editingCategory = { 
      ...category,
      description: category.description || '',
      color: category.color || '#4285F4'
    };
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
        color: this.editingCategory.color
      });
      this.editingCategory = null;
    } catch (error) {
      console.error('Error updating category', error);
    }
  }

  async deleteCategory(id: string) {
    if (confirm('Are you sure you want to delete this category? All associated events and todos will also be deleted.')) {
      try {
        await client.models.Category.delete({ id });
      } catch (error) {
        console.error('Error deleting category', error);
      }
    }
  }
}