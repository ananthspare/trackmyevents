import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { RouterModule } from '@angular/router';

const client = generateClient<Schema>();

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css',
})
export class CategoriesComponent implements OnInit {
  categories: any[] = [];
  newCategory = { name: '', description: '' };
  editingCategory: any = null;

  ngOnInit(): void {
    this.listCategories();
  }

  listCategories() {
    try {
      client.models.Category.observeQuery().subscribe({
        next: ({ items }) => {
          console.log('Categories received:', items);
          this.categories = items;
        },
        error: (error) => console.error('Error fetching categories', error)
      });
    } catch (error) {
      console.error('Error setting up categories subscription', error);
    }
  }

  async createCategory() {
    if (!this.newCategory.name.trim()) return;
    
    console.log('Creating category:', this.newCategory);
    try {
      const result = await client.models.Category.create({
        name: this.newCategory.name,
        description: this.newCategory.description || '' // Ensure description is not undefined
      });
      console.log('Category created:', result);
      this.newCategory = { name: '', description: '' };
    } catch (error) {
      console.error('Error creating category', error);
    }
  }

  startEdit(category: any) {
    this.editingCategory = { 
      ...category,
      description: category.description || '' // Ensure description is not undefined
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
        description: this.editingCategory.description || '' // Ensure description is not undefined
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