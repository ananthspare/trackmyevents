import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

interface SubTask {
  id: string;
  content: string;
  dueDate: string;
  isCompleted: boolean;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  isCompleted: boolean;
  subTasks: SubTask[];
}

@Component({
  selector: 'app-goal-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './goal-tracker.component.html',
  styleUrl: './goal-tracker.component.css'
})
export class GoalTrackerComponent implements OnInit {
  goals: Goal[] = [];
  newGoal = { title: '', description: '', dueDate: '' };
  newSubTask: { [goalId: string]: { content: string; dueDate: string } } = {};
  expandedGoals: Set<string> = new Set();

  async ngOnInit() {
    await this.loadGoals();
  }

  async loadGoals() {
    try {
      const { data } = await client.models.Goal.list();
      this.goals = await Promise.all(data.map(async (goal) => {
        const { data: subTasks } = await client.models.SubTask.list({
          filter: { goalID: { eq: goal.id } }
        });
        return {
          id: goal.id,
          title: goal.title || '',
          description: goal.description || '',
          dueDate: goal.dueDate || '',
          isCompleted: goal.isCompleted || false,
          subTasks: subTasks.map(st => ({
            id: st.id,
            content: st.content || '',
            dueDate: st.dueDate || '',
            isCompleted: st.isCompleted || false
          }))
        };
      }));
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  }

  async addGoal() {
    if (!this.newGoal.title.trim()) return;
    
    try {
      await client.models.Goal.create({
        title: this.newGoal.title,
        description: this.newGoal.description,
        dueDate: this.newGoal.dueDate,
        isCompleted: false
      });
      this.newGoal = { title: '', description: '', dueDate: '' };
      await this.loadGoals();
    } catch (error) {
      console.error('Error adding goal:', error);
    }
  }

  async toggleGoal(goal: Goal) {
    try {
      await client.models.Goal.update({
        id: goal.id,
        isCompleted: !goal.isCompleted
      });
      await this.loadGoals();
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  }

  async deleteGoal(goalId: string) {
    try {
      const goal = this.goals.find(g => g.id === goalId);
      if (goal) {
        for (const subTask of goal.subTasks) {
          await client.models.SubTask.delete({ id: subTask.id });
        }
      }
      await client.models.Goal.delete({ id: goalId });
      await this.loadGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  }

  async addSubTask(goalId: string) {
    const subTask = this.newSubTask[goalId];
    if (!subTask || !subTask.content.trim()) return;
    
    try {
      await client.models.SubTask.create({
        goalID: goalId,
        content: subTask.content,
        dueDate: subTask.dueDate,
        isCompleted: false
      });
      delete this.newSubTask[goalId];
      await this.loadGoals();
    } catch (error) {
      console.error('Error adding sub-task:', error);
    }
  }

  async toggleSubTask(goalId: string, subTask: SubTask) {
    try {
      await client.models.SubTask.update({
        id: subTask.id,
        isCompleted: !subTask.isCompleted
      });
      await this.loadGoals();
    } catch (error) {
      console.error('Error updating sub-task:', error);
    }
  }

  async deleteSubTask(subTaskId: string) {
    try {
      await client.models.SubTask.delete({ id: subTaskId });
      await this.loadGoals();
    } catch (error) {
      console.error('Error deleting sub-task:', error);
    }
  }

  toggleExpand(goalId: string) {
    if (this.expandedGoals.has(goalId)) {
      this.expandedGoals.delete(goalId);
    } else {
      this.expandedGoals.add(goalId);
    }
  }

  isExpanded(goalId: string): boolean {
    return this.expandedGoals.has(goalId);
  }

  initSubTask(goalId: string) {
    if (!this.newSubTask[goalId]) {
      this.newSubTask[goalId] = { content: '', dueDate: '' };
    }
  }

  updateSubTaskContent(goalId: string, content: string) {
    this.initSubTask(goalId);
    this.newSubTask[goalId].content = content;
  }

  updateSubTaskDate(goalId: string, date: string) {
    this.initSubTask(goalId);
    this.newSubTask[goalId].dueDate = date;
  }

  getCompletedCount(goal: Goal): string {
    const completed = goal.subTasks.filter(st => st.isCompleted).length;
    return `${completed}/${goal.subTasks.length}`;
  }
}
