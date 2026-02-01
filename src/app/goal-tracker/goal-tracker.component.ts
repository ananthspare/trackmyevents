import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

const client = generateClient<Schema>();

export interface SubTask {
  id: string;
  content: string;
  dueDate: string;
  isCompleted: boolean;
  order: number;
  priority: string;
}

export interface GoalNote {
  id: string;
  goalID: string;
  content: string;
  updatedAt: string;
}

export interface ScheduleItem {
  id: string;
  goalID: string;
  title: string;
  date: string;
  isCompleted: boolean;
  order: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  isCompleted: boolean;
  status: string;
  priority: string;
  emoji: string;
  color: string;
  subTasks: SubTask[];
  notes: GoalNote[];
  scheduleItems: ScheduleItem[];
}

const GOAL_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];
const GOAL_EMOJIS = ['🎯', '🚀', '📚', '💪', '🌟', '🏆', '💡', '🎨', '🔬', '💼', '🌱', '✈️'];

@Component({
  selector: 'app-goal-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './goal-tracker.component.html',
  styleUrl: './goal-tracker.component.css'
})
export class GoalTrackerComponent implements OnInit {
  goals: Goal[] = [];
  filteredGoals: Goal[] = [];
  selectedGoalId: string | null = null;
  selectedGoal: Goal | null = null;
  activeTab: 'tasks' | 'notes' | 'schedule' = 'tasks';

  // Filters & Search
  searchQuery = '';
  filterStatus: 'all' | 'active' | 'completed' = 'all';
  filterPriority: string = 'all';

  // New goal form
  showAddGoalForm = false;
  newGoal = { title: '', description: '', dueDate: '', priority: 'medium', emoji: '🎯', color: '#6366f1' };

  // Inline editing
  editingGoalTitle = false;
  editingGoalDescription = false;
  editingGoalDueDate = false;

  // SubTask state
  newSubTaskContent = '';
  newSubTaskDueDate = '';
  newSubTaskPriority = 'medium';
  editingSubTask: { [key: string]: boolean } = {};
  sortSubTasksByDate = false;

  // Note state
  noteContent = '';
  noteId: string | null = null;
  noteSaving = false;
  noteLastSaved = '';
  private noteDebounceTimer: any = null;

  // Schedule state
  newScheduleTitle = '';
  newScheduleDate = '';
  editingScheduleItem: { [key: string]: boolean } = {};

  // UI helpers
  goalColors = GOAL_COLORS;
  goalEmojis = GOAL_EMOJIS;
  showEmojiPicker = false;
  showColorPicker = false;
  loading = true;

  async ngOnInit() {
    await this.loadGoals();
  }

  // ── Data Loading ──────────────────────────────────────────────────────────

  async loadGoals() {
    this.loading = true;
    try {
      const { data: goalsData } = await client.models.Goal.list();
      this.goals = await Promise.all(goalsData.map(async (g) => {
        // Fetch subtasks (always available)
        let subTasks: SubTask[] = [];
        try {
          const subTasksRes = await client.models.SubTask.list({ filter: { goalID: { eq: g.id } } });
          subTasks = subTasksRes.data.map(st => ({
            id: st.id,
            content: st.content || '',
            dueDate: st.dueDate || '',
            isCompleted: st.isCompleted || false,
            order: st.order || 0,
            priority: (st as any).priority || 'medium',
          })).sort((a, b) => a.order - b.order);
        } catch (e) {
          console.warn('Could not load subtasks for goal', g.id, e);
        }

        // Fetch notes (may not exist if backend not yet redeployed)
        let notes: GoalNote[] = [];
        try {
          const notesRes = await (client.models as any).GoalNote.list({ filter: { goalID: { eq: g.id } } });
          notes = notesRes.data.map((n: any) => ({
            id: n.id,
            goalID: n.goalID || '',
            content: n.content || '',
            updatedAt: n.updatedAt || '',
          }));
        } catch (e) {
          // Model not deployed yet — silently skip
        }

        // Fetch schedule items (may not exist if backend not yet redeployed)
        let scheduleItems: ScheduleItem[] = [];
        try {
          const scheduleRes = await (client.models as any).GoalScheduleItem.list({ filter: { goalID: { eq: g.id } } });
          scheduleItems = scheduleRes.data.map((s: any) => ({
            id: s.id,
            goalID: s.goalID || '',
            title: s.title || '',
            date: s.date || '',
            isCompleted: s.isCompleted || false,
            order: s.order || 0,
          })).sort((a: ScheduleItem, b: ScheduleItem) => {
            if (!a.date && !b.date) return a.order - b.order;
            if (!a.date) return 1;
            if (!b.date) return -1;
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          });
        } catch (e) {
          // Model not deployed yet — silently skip
        }

        return {
          id: g.id,
          title: g.title || '',
          description: g.description || '',
          dueDate: g.dueDate || '',
          isCompleted: g.isCompleted || false,
          status: (g as any).status || 'active',
          priority: (g as any).priority || 'medium',
          emoji: (g as any).emoji || '🎯',
          color: (g as any).color || '#6366f1',
          subTasks,
          notes,
          scheduleItems,
        } as Goal;
      }));
      this.applyFilters();
      this.updateSelectedGoal();
      if (this.selectedGoal) {
        this.loadNoteForGoal(this.selectedGoal);
      }
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      this.loading = false;
    }
  }

  // ── Filtering ─────────────────────────────────────────────────────────────

  applyFilters() {
    let result = [...this.goals];
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(g =>
        g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)
      );
    }
    if (this.filterStatus !== 'all') {
      result = result.filter(g => this.filterStatus === 'completed' ? g.isCompleted : !g.isCompleted);
    }
    if (this.filterPriority !== 'all') {
      result = result.filter(g => g.priority === this.filterPriority);
    }
    this.filteredGoals = result;
  }

  onSearch() { this.applyFilters(); }
  onFilterChange() { this.applyFilters(); }

  // ── Goal CRUD ─────────────────────────────────────────────────────────────

  async addGoal() {
    if (!this.newGoal.title.trim()) return;
    try {
      const created = await client.models.Goal.create({
        title: this.newGoal.title,
        description: this.newGoal.description,
        dueDate: this.newGoal.dueDate,
        isCompleted: false,
        ...(this.newGoal.priority && { priority: this.newGoal.priority }),
        ...(this.newGoal.emoji && { emoji: this.newGoal.emoji }),
        ...(this.newGoal.color && { color: this.newGoal.color }),
      } as any);
      this.newGoal = { title: '', description: '', dueDate: '', priority: 'medium', emoji: '🎯', color: '#6366f1' };
      this.showAddGoalForm = false;
      await this.loadGoals();
      if (created.data?.id) {
        this.selectGoal(created.data.id);
      }
    } catch (error) {
      console.error('Error adding goal:', error);
    }
  }

  async toggleGoal(goal: Goal, event?: Event) {
    event?.stopPropagation();
    try {
      await client.models.Goal.update({ id: goal.id, isCompleted: !goal.isCompleted } as any);
      await this.loadGoals();
    } catch (error) {
      console.error('Error toggling goal:', error);
    }
  }

  async saveGoalField(field: keyof Goal, value: any) {
    if (!this.selectedGoal) return;
    try {
      await client.models.Goal.update({ id: this.selectedGoal.id, [field]: value } as any);
      this.editingGoalTitle = false;
      this.editingGoalDescription = false;
      this.editingGoalDueDate = false;
      await this.loadGoals();
    } catch (error) {
      console.error('Error saving goal field:', error);
    }
  }

  async deleteGoal(goalId: string, event?: Event) {
    event?.stopPropagation();
    if (!confirm('Delete this goal and all its tasks, notes, and schedule items?')) return;
    try {
      const goal = this.goals.find(g => g.id === goalId);
      if (goal) {
        const cleanups: Promise<any>[] = [
          ...goal.subTasks.map(st => client.models.SubTask.delete({ id: st.id })),
        ];
        try {
          cleanups.push(...goal.notes.map(n => (client.models as any).GoalNote.delete({ id: n.id })));
          cleanups.push(...goal.scheduleItems.map(s => (client.models as any).GoalScheduleItem.delete({ id: s.id })));
        } catch (e) { /* models may not be deployed yet */ }
        await Promise.allSettled(cleanups);
      }
      await client.models.Goal.delete({ id: goalId });
      if (this.selectedGoalId === goalId) {
        this.selectedGoalId = null;
        this.selectedGoal = null;
        this.noteContent = '';
        this.noteId = null;
      }
      await this.loadGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  }

  async updateGoalEmoji(emoji: string) {
    if (!this.selectedGoal) return;
    this.selectedGoal.emoji = emoji;
    this.showEmojiPicker = false;
    await client.models.Goal.update({ id: this.selectedGoal.id, emoji } as any);
    await this.loadGoals();
  }

  async updateGoalColor(color: string) {
    if (!this.selectedGoal) return;
    this.selectedGoal.color = color;
    this.showColorPicker = false;
    await client.models.Goal.update({ id: this.selectedGoal.id, color } as any);
    await this.loadGoals();
  }

  // ── SubTask CRUD ──────────────────────────────────────────────────────────

  async addSubTask() {
    if (!this.selectedGoal || !this.newSubTaskContent.trim()) return;
    try {
      const maxOrder = this.selectedGoal.subTasks.length
        ? Math.max(...this.selectedGoal.subTasks.map(st => st.order)) + 1
        : 0;
      await client.models.SubTask.create({
        goalID: this.selectedGoal.id,
        content: this.newSubTaskContent,
        dueDate: this.newSubTaskDueDate,
        isCompleted: false,
        order: maxOrder,
        priority: this.newSubTaskPriority,
      } as any);
      this.newSubTaskContent = '';
      this.newSubTaskDueDate = '';
      this.newSubTaskPriority = 'medium';
      await this.loadGoals();
    } catch (error) {
      console.error('Error adding sub-task:', error);
    }
  }

  async toggleSubTask(subTask: SubTask) {
    try {
      await client.models.SubTask.update({ id: subTask.id, isCompleted: !subTask.isCompleted });
      await this.loadGoals();
    } catch (error) {
      console.error('Error toggling sub-task:', error);
    }
  }

  async saveSubTask(subTask: SubTask) {
    try {
      await client.models.SubTask.update({
        id: subTask.id,
        content: subTask.content,
        dueDate: subTask.dueDate,
        priority: (subTask as any).priority,
      } as any);
      this.editingSubTask[subTask.id] = false;
      await this.loadGoals();
    } catch (error) {
      console.error('Error saving sub-task:', error);
    }
  }

  async deleteSubTask(id: string) {
    try {
      await client.models.SubTask.delete({ id });
      await this.loadGoals();
    } catch (error) {
      console.error('Error deleting sub-task:', error);
    }
  }

  async onSubTaskDrop(event: CdkDragDrop<SubTask[]>) {
    if (!this.selectedGoal || event.previousIndex === event.currentIndex) return;
    moveItemInArray(this.selectedGoal.subTasks, event.previousIndex, event.currentIndex);
    this.sortSubTasksByDate = false;
    try {
      for (let i = 0; i < this.selectedGoal.subTasks.length; i++) {
        await client.models.SubTask.update({ id: this.selectedGoal.subTasks[i].id, order: i });
        this.selectedGoal.subTasks[i].order = i;
      }
    } catch (error) {
      console.error('Error reordering sub-tasks:', error);
      await this.loadGoals();
    }
  }

  getSortedSubTasks(): SubTask[] {
    if (!this.selectedGoal) return [];
    const tasks = [...this.selectedGoal.subTasks];
    if (this.sortSubTasksByDate) {
      return tasks.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return a.content.localeCompare(b.content);
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    }
    return tasks.sort((a, b) => a.order - b.order);
  }

  // ── Notes ─────────────────────────────────────────────────────────────────

  loadNoteForGoal(goal: Goal) {
    const note = goal.notes[0];
    if (note) {
      this.noteContent = note.content;
      this.noteId = note.id;
      this.noteLastSaved = note.updatedAt ? this.formatTime(note.updatedAt) : '';
    } else {
      this.noteContent = '';
      this.noteId = null;
      this.noteLastSaved = '';
    }
  }

  onNoteChange() {
    if (this.noteDebounceTimer) clearTimeout(this.noteDebounceTimer);
    this.noteDebounceTimer = setTimeout(() => this.saveNote(), 1200);
  }

  async saveNote() {
    if (!this.selectedGoal) return;
    this.noteSaving = true;
    try {
      const now = new Date().toISOString();
      if (this.noteId) {
        await (client.models as any).GoalNote.update({ id: this.noteId, content: this.noteContent, updatedAt: now });
      } else {
        const res = await (client.models as any).GoalNote.create({
          goalID: this.selectedGoal.id,
          content: this.noteContent,
          updatedAt: now,
        });
        this.noteId = res.data?.id || null;
      }
      this.noteLastSaved = this.formatTime(now);
      await this.loadGoals();
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      this.noteSaving = false;
    }
  }

  // ── Schedule CRUD ─────────────────────────────────────────────────────────

  async addScheduleItem() {
    if (!this.selectedGoal || !this.newScheduleTitle.trim()) return;
    try {
      const maxOrder = this.selectedGoal.scheduleItems.length
        ? Math.max(...this.selectedGoal.scheduleItems.map(s => s.order)) + 1
        : 0;
      await (client.models as any).GoalScheduleItem.create({
        goalID: this.selectedGoal.id,
        title: this.newScheduleTitle,
        date: this.newScheduleDate,
        isCompleted: false,
        order: maxOrder,
      });
      this.newScheduleTitle = '';
      this.newScheduleDate = '';
      await this.loadGoals();
    } catch (error) {
      console.error('Error adding schedule item:', error);
    }
  }

  async toggleScheduleItem(item: ScheduleItem) {
    try {
      await (client.models as any).GoalScheduleItem.update({ id: item.id, isCompleted: !item.isCompleted });
      await this.loadGoals();
    } catch (error) {
      console.error('Error toggling schedule item:', error);
    }
  }

  async saveScheduleItem(item: ScheduleItem) {
    try {
      await (client.models as any).GoalScheduleItem.update({ id: item.id, title: item.title, date: item.date });
      this.editingScheduleItem[item.id] = false;
      await this.loadGoals();
    } catch (error) {
      console.error('Error saving schedule item:', error);
    }
  }

  async deleteScheduleItem(id: string) {
    try {
      await (client.models as any).GoalScheduleItem.delete({ id });
      await this.loadGoals();
    } catch (error) {
      console.error('Error deleting schedule item:', error);
    }
  }

  // ── Selection ─────────────────────────────────────────────────────────────

  selectGoal(goalId: string) {
    this.selectedGoalId = goalId;
    this.updateSelectedGoal();
    this.activeTab = 'tasks';
    this.editingGoalTitle = false;
    this.editingGoalDescription = false;
    this.editingGoalDueDate = false;
    this.showEmojiPicker = false;
    this.showColorPicker = false;
    if (this.selectedGoal) {
      this.loadNoteForGoal(this.selectedGoal);
    }
  }

  updateSelectedGoal() {
    this.selectedGoal = this.goals.find(g => g.id === this.selectedGoalId) || null;
  }

  // ── Computed helpers ──────────────────────────────────────────────────────

  getProgress(goal: Goal): number {
    if (!goal.subTasks.length) return 0;
    return Math.round((goal.subTasks.filter(st => st.isCompleted).length / goal.subTasks.length) * 100);
  }

  getCompletedCount(goal: Goal): string {
    const done = goal.subTasks.filter(st => st.isCompleted).length;
    return `${done}/${goal.subTasks.length}`;
  }

  getDaysUntilDue(dueDate: string): number | null {
    if (!dueDate) return null;
    const diff = new Date(dueDate).getTime() - new Date().setHours(0, 0, 0, 0);
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  getDueDateLabel(dueDate: string): string {
    const days = this.getDaysUntilDue(dueDate);
    if (days === null) return '';
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `${days}d left`;
  }

  getDueDateClass(dueDate: string): string {
    const days = this.getDaysUntilDue(dueDate);
    if (days === null) return '';
    if (days < 0) return 'overdue';
    if (days <= 3) return 'urgent';
    if (days <= 7) return 'soon';
    return 'ok';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatTime(isoStr: string): string {
    if (!isoStr) return '';
    return new Date(isoStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#94a3b8';
    }
  }

  getCircumference(): number { return 2 * Math.PI * 18; }
  getStrokeDashoffset(goal: Goal): number {
    return this.getCircumference() * (1 - this.getProgress(goal) / 100);
  }

  getActiveGoalsCount(): number { return this.goals.filter(g => !g.isCompleted).length; }
  getCompletedGoalsCount(): number { return this.goals.filter(g => g.isCompleted).length; }
  getTotalTasksCount(): number { return this.goals.reduce((sum, g) => sum + g.subTasks.length, 0); }

  isScheduleOverdue(item: ScheduleItem): boolean {
    if (!item.date || item.isCompleted) return false;
    return new Date(item.date) < new Date(new Date().setHours(0, 0, 0, 0));
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.emoji-picker-trigger') && !target.closest('.emoji-picker')) {
      this.showEmojiPicker = false;
    }
    if (!target.closest('.color-picker-trigger') && !target.closest('.color-picker')) {
      this.showColorPicker = false;
    }
  }
}
