import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/api';
import { Schema } from '../../../amplify/data/resource';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private client = generateClient<Schema>();
  private categoriesSubject = new BehaviorSubject<any[]>([]);
  public categories$ = this.categoriesSubject.asObservable();

  constructor() {
    this.fetchCategories();
  }

  async fetchCategories() {
    try {
      console.log('Fetching categories...');
      const response = await this.client.models['Category']['list']({});
      console.log('Categories fetched:', response);
      this.categoriesSubject.next(response.data);
      console.log('Categories subject updated with:', response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }

  async createCategory(name: string, description: string, parentCategoryID?: string) {
    try {
      console.log('Creating category in service:', name, description, parentCategoryID);
      
      const isRoot = !parentCategoryID;
      let level = 0;
      
      // If this is a subcategory, determine its level
      if (parentCategoryID) {
        const parentCategory = await this.getCategoryById(parentCategoryID);
        if (parentCategory) {
          level = (parentCategory.level || 0) + 1;
        }
      }
      
      const categoryData: any = {
        name,
        description,
        order: 0,
        isRoot,
        level
      };
      
      if (parentCategoryID) {
        categoryData.parentCategoryID = parentCategoryID;
      }
      
      console.log('Category data to be sent:', categoryData);
      const newCategory = await this.client.models['Category']['create'](categoryData);
      console.log('Category created response:', newCategory);
      await this.fetchCategories();
      return newCategory;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  async getCategoryById(id: string) {
    try {
      const response = await this.client.models['Category']['get']({ id });
      return response.data;
    } catch (error) {
      console.error('Error getting category by ID:', error);
      return null;
    }
  }

  async updateCategory(id: string, data: { 
    name?: string; 
    description?: string; 
    parentCategoryID?: string | null; 
    isRoot?: boolean; 
    order?: number;
    level?: number;
  }) {
    try {
      const updateData: any = {
        id
      };
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.order !== undefined) updateData.order = data.order;
      if (data.isRoot !== undefined) updateData.isRoot = data.isRoot;
      if (data.level !== undefined) updateData.level = data.level;
      
      // Handle parentCategoryID specially
      if (data.parentCategoryID !== undefined) {
        updateData.parentCategoryID = data.parentCategoryID;
      }
      
      console.log('Updating category with data:', updateData);
      const updatedCategory = await this.client.models['Category']['update'](updateData);
      console.log('Category updated response:', updatedCategory);
      await this.fetchCategories();
      return updatedCategory;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  async deleteCategory(id: string) {
    try {
      console.log('Deleting category:', id);
      
      // First, find all subcategories
      const allCategories = this.categoriesSubject.getValue();
      const subcategories = this.getAllSubcategories(id, allCategories);
      
      // Delete all subcategories
      for (const subcategory of subcategories) {
        await this.client.models['Category']['delete']({ id: subcategory.id });
      }
      
      // Delete the category itself
      await this.client.models['Category']['delete']({ id });
      console.log('Category and all subcategories deleted');
      await this.fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  private getAllSubcategories(categoryId: string, allCategories: any[]): any[] {
    const directSubcategories = allCategories.filter(cat => cat.parentCategoryID === categoryId);
    let allSubcategories = [...directSubcategories];
    
    for (const subcategory of directSubcategories) {
      const nestedSubcategories = this.getAllSubcategories(subcategory.id, allCategories);
      allSubcategories = [...allSubcategories, ...nestedSubcategories];
    }
    
    return allSubcategories;
  }

  async moveCategory(categoryId: string, newParentId: string | null) {
    try {
      const category = await this.getCategoryById(categoryId);
      if (!category) {
        throw new Error('Category not found');
      }
      
      const isRoot = newParentId === null;
      let level = 0;
      
      // If moving to a parent, determine the new level
      if (newParentId) {
        const newParent = await this.getCategoryById(newParentId);
        if (newParent) {
          level = (newParent.level || 0) + 1;
        }
      }
      
      const updateData: any = { 
        id: categoryId,
        isRoot,
        level
      };
      
      if (newParentId) {
        updateData.parentCategoryID = newParentId;
      } else {
        // When moving to root, we need to remove the parentCategoryID
        updateData.parentCategoryID = null;
      }
      
      console.log('Moving category with data:', updateData);
      await this.client.models['Category']['update'](updateData);
      console.log('Category moved');
      
      // Update levels of all subcategories
      await this.updateSubcategoryLevels(categoryId, level);
      
      await this.fetchCategories();
    } catch (error) {
      console.error('Error moving category:', error);
      throw error;
    }
  }

  private async updateSubcategoryLevels(categoryId: string, parentLevel: number) {
    const allCategories = this.categoriesSubject.getValue();
    const directSubcategories = allCategories.filter(cat => cat.parentCategoryID === categoryId);
    
    for (const subcategory of directSubcategories) {
      const newLevel = parentLevel + 1;
      await this.updateCategory(subcategory.id, { level: newLevel });
      await this.updateSubcategoryLevels(subcategory.id, newLevel);
    }
  }

  async convertToRootCategory(categoryId: string) {
    try {
      await this.moveCategory(categoryId, null);
    } catch (error) {
      console.error('Error converting to root category:', error);
      throw error;
    }
  }

  async reorderCategories(categoryIds: string[]) {
    try {
      const updatePromises = categoryIds.map((id, index) => 
        this.updateCategory(id, { order: index })
      );
      
      await Promise.all(updatePromises);
      await this.fetchCategories();
    } catch (error) {
      console.error('Error reordering categories:', error);
      throw error;
    }
  }

  getCategoryHierarchy(categories: any[]): any[] {
    console.log('Building category hierarchy from:', categories);
    
    // Sort categories by order
    const sortedCategories = [...categories].sort((a, b) => (a.order || 0) - (b.order || 0));
    
    // First, find all root categories
    const rootCategories = sortedCategories.filter(cat => cat.isRoot === true);
    console.log('Root categories:', rootCategories);
    
    // Then build the hierarchy
    const result = rootCategories.map(root => this.buildCategoryTree(root, sortedCategories));
    console.log('Final hierarchy:', result);
    return result;
  }

  private buildCategoryTree(category: any, allCategories: any[]): any {
    // Find direct children and sort them by order
    const children = allCategories
      .filter(cat => cat.parentCategoryID === category.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    return {
      ...category,
      children: children.map(child => this.buildCategoryTree(child, allCategories))
    };
  }
}