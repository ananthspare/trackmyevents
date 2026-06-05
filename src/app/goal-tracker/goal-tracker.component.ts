import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

const client = generateClient<Schema>();

export type Priority = 'high' | 'medium' | 'low';

export interface SubTask {
  id: string;
  content: string;
  dueDate: string;
  isCompleted: boolean;
  order: number;
  note: string;
  noteId: string | null;
  showNote: boolean;
  noteSaving: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  isCompleted: boolean;
  category: string;
  priority: Priority;
  subTasks: SubTask[];
  note: string;
  noteId: string | null;
}

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];
const EMOJIS = ['🎯','🚀','📚','💪','🌟','🏆','💡','🎨','🔬','💼','🌱','✈️'];

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; icon: string }> = {
  high:   { label: 'High',   color: '#dc2626', bg: '#fef2f2', icon: '🔴' },
  medium: { label: 'Medium', color: '#d97706', bg: '#fffbeb', icon: '🟡' },
  low:    { label: 'Low',    color: '#16a34a', bg: '#f0fdf4', icon: '🟢' },
};

const DEFAULT_CATEGORIES = ['General', 'Health', 'Career', 'Learning', 'Finance', 'Personal', 'Side Project'];

@Component({
  selector: 'app-goal-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './goal-tracker.component.html',
  styleUrl: './goal-tracker.component.css'
})
export class GoalTrackerComponent implements OnInit {

  // ── Data ──────────────────────────────────────────────────────────────────
  goals: Goal[] = [];
  filteredGoals: Goal[] = [];
  selectedGoalId: string | null = null;
  selectedGoal: Goal | null = null;
  loading = false;

  // ── UI State ──────────────────────────────────────────────────────────────
  activeTab: 'tasks' | 'notes' = 'tasks';
  showAddForm = false;
  searchQuery = '';
  filterStatus: 'all' | 'active' | 'done' = 'all';
  filterPriority: 'all' | Priority = 'all';
  filterCategory = 'all';
  groupByCategory = false;

  goalMeta: { [id: string]: { color: string; emoji: string } } = {};
  readonly colors = COLORS;
  readonly emojis = EMOJIS;
  readonly priorityConfig = PRIORITY_CONFIG;
  readonly priorities: Priority[] = ['high', 'medium', 'low'];
  readonly defaultCategories = DEFAULT_CATEGORIES;
  showEmojiPicker: { [id: string]: boolean } = {};
  showColorPicker: { [id: string]: boolean } = {};

  // categories derived from loaded goals + defaults
  availableCategories: string[] = [...DEFAULT_CATEGORIES];

  // goal-level note
  private goalNoteTimer: any = null;
  goalNoteSaving = false;
  goalNoteLastSaved = '';

  // task note drawer
  activeTaskNote: SubTask | null = null;

  // ── New goal form ─────────────────────────────────────────────────────────
  newGoal = { title: '', description: '', dueDate: '', category: 'General', priority: 'medium' as Priority };
  newCategoryInput = '';
  showNewCategoryInput = false;

  // ── Editing ───────────────────────────────────────────────────────────────
  editingGoalId: string | null = null;
  editGoalDraft: Partial<Goal & { newCategory?: string }> = {};
  editingSubTask: { [id: string]: boolean } = {};

  // ── SubTask add ───────────────────────────────────────────────────────────
  newSubTask: { [goalId: string]: { content: string; dueDate: string } } = {};

  // ── Sort ──────────────────────────────────────────────────────────────────
  sortByDate: { [goalId: string]: boolean } = {};

  // ── Resize ────────────────────────────────────────────────────────────────
  private isResizing = false;
  private startX = 0;
  private startWidth = 0;

  async ngOnInit() {
    await this.loadGoals();
  }

  // ── Load ──────────────────────────────────────────────────────────────────

  async loadGoals() {
    this.loading = true;
    try {
      const { data: goalsData } = await client.models.Goal.list();

      this.goals = await Promise.all(goalsData.map(async (g) => {
        const { data: stData } = await client.models.SubTask.list({ filter: { goalID: { eq: g.id } } });

        let allNotes: Array<{ id: string; goalID: string | null; subTaskID: string | null; content: string | null }> = [];
        try {
          const { data: nd } = await (client.models as any).GoalNote.list({ filter: { goalID: { eq: g.id } } });
          allNotes = nd;
        } catch { /* not yet deployed */ }

        const goalNote = allNotes.find(n => !n.subTaskID) ?? null;

        const subTasks: SubTask[] = stData.map(st => {
          const tn = allNotes.find(n => n.subTaskID === st.id) ?? null;
          return {
            id: st.id,
            content: st.content || '',
            dueDate: st.dueDate || '',
            isCompleted: st.isCompleted || false,
            order: st.order || 0,
            note: tn?.content || '',
            noteId: tn?.id || null,
            showNote: false,
            noteSaving: false,
          };
        });

        if (!this.sortByDate[g.id]) this.sortByDate[g.id] = true;
        this.applySortToGoal(g.id, subTasks);
        if (!this.goalMeta[g.id]) {
          this.goalMeta[g.id] = { color: COLORS[Math.floor(Math.random() * COLORS.length)], emoji: '🎯' };
        }

        const category = (g as any).category || 'General';
        const priority: Priority = ((g as any).priority as Priority) || 'medium';

        return { id: g.id, title: g.title || '', description: g.description || '',
          dueDate: g.dueDate || '', isCompleted: g.isCompleted || false,
          category, priority, subTasks, note: goalNote?.content || '', noteId: goalNote?.id || null };
      }));

      // rebuild available categories from actual data
      const cats = new Set<string>([...DEFAULT_CATEGORIES, ...this.goals.map(g => g.category)]);
      this.availableCategories = Array.from(cats).sort();

    } catch (e) {
      console.error('Error loading goals:', e);
    } finally {
      this.loading = false;
      this.applyFilters();
      this.syncSelected();
    }
  }

  private applySortToGoal(goalId: string, subTasks: SubTask[]) {
    if (this.sortByDate[goalId]) {
      subTasks.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return a.content.localeCompare(b.content);
        if (!a.dueDate) return 1; if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    } else {
      subTasks.sort((a, b) => a.order - b.order);
    }
  }

  // ── Filters ───────────────────────────────────────────────────────────────

  applyFilters() {
    let list = [...this.goals];
    const q = this.searchQuery.trim().toLowerCase();
    if (q) list = list.filter(g => g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q));
    if (this.filterStatus === 'active') list = list.filter(g => !g.isCompleted);
    if (this.filterStatus === 'done')   list = list.filter(g => g.isCompleted);
    if (this.filterPriority !== 'all')  list = list.filter(g => g.priority === this.filterPriority);
    if (this.filterCategory !== 'all')  list = list.filter(g => g.category === this.filterCategory);
    this.filteredGoals = list;
  }

  // returns unique categories present in filtered list, sorted by priority order
  getGroupedCategories(): string[] {
    const cats = new Set(this.filteredGoals.map(g => g.category));
    return Array.from(cats).sort();
  }

  getGoalsForCategory(cat: string): Goal[] {
    return this.filteredGoals.filter(g => g.category === cat);
  }

  // ── Category management ───────────────────────────────────────────────────

  addCustomCategory(target: 'new' | 'edit') {
    const name = this.newCategoryInput.trim();
    if (!name) return;
    if (!this.availableCategories.includes(name)) {
      this.availableCategories = [...this.availableCategories, name].sort();
    }
    if (target === 'new') this.newGoal.category = name;
    else if (this.editGoalDraft) this.editGoalDraft.category = name;
    this.newCategoryInput = '';
    this.showNewCategoryInput = false;
  }

  // ── Goal CRUD ─────────────────────────────────────────────────────────────

  async addGoal() {
    if (!this.newGoal.title.trim()) return;
    try {
      const { data: created } = await client.models.Goal.create({
        title: this.newGoal.title,
        description: this.newGoal.description,
        dueDate: this.newGoal.dueDate,
        isCompleted: false,
        category: this.newGoal.category,
        priority: this.newGoal.priority,
      } as any);
      this.newGoal = { title: '', description: '', dueDate: '', category: 'General', priority: 'medium' };
      this.showAddForm = false;
      await this.loadGoals();
      if (created?.id) this.selectGoal(created.id);
    } catch (e) { console.error(e); }
  }

  startEditGoal(goal: Goal, event: Event) {
    event.stopPropagation();
    this.editingGoalId = goal.id;
    this.editGoalDraft = { title: goal.title, description: goal.description,
      dueDate: goal.dueDate, category: goal.category, priority: goal.priority };
  }

  cancelEditGoal() { this.editingGoalId = null; this.editGoalDraft = {}; }

  get editDraftPriority(): Priority {
    return (this.editGoalDraft.priority as Priority) || 'medium';
  }

  getPriorityConfig(p: string) {
    return this.priorityConfig[(p as Priority)] || this.priorityConfig['medium'];
  }

  async saveGoal(goal: Goal, event: Event) {
    event.stopPropagation();
    try {
      await client.models.Goal.update({
        id: goal.id,
        title: this.editGoalDraft.title ?? goal.title,
        description: this.editGoalDraft.description ?? goal.description,
        dueDate: this.editGoalDraft.dueDate ?? goal.dueDate,
        category: this.editGoalDraft.category ?? goal.category,
        priority: this.editGoalDraft.priority ?? goal.priority,
      } as any);
      this.editingGoalId = null;
      await this.loadGoals();
    } catch (e) { console.error(e); }
  }

  async toggleGoal(goal: Goal, event: Event) {
    event.stopPropagation();
    try {
      await client.models.Goal.update({ id: goal.id, isCompleted: !goal.isCompleted } as any);
      await this.loadGoals();
    } catch (e) { console.error(e); }
  }

  async deleteGoal(goalId: string, event: Event) {
    event.stopPropagation();
    if (!confirm('Delete this goal and all its tasks and notes?')) return;
    try {
      const goal = this.goals.find(g => g.id === goalId);
      if (goal) {
        const deletes: Promise<any>[] = goal.subTasks.map(st => client.models.SubTask.delete({ id: st.id }));
        try {
          const { data: notes } = await (client.models as any).GoalNote.list({ filter: { goalID: { eq: goalId } } });
          notes.forEach((n: any) => deletes.push((client.models as any).GoalNote.delete({ id: n.id })));
        } catch { /* ignore */ }
        await Promise.allSettled(deletes);
      }
      await client.models.Goal.delete({ id: goalId });
      if (this.selectedGoalId === goalId) { this.selectedGoalId = null; this.selectedGoal = null; }
      await this.loadGoals();
    } catch (e) { console.error(e); }
  }

  // ── Goal notes ────────────────────────────────────────────────────────────

  onGoalNoteChange() {
    if (this.goalNoteTimer) clearTimeout(this.goalNoteTimer);
    this.goalNoteTimer = setTimeout(() => this.saveGoalNote(), 1000);
  }

  async saveGoalNote() {
    if (!this.selectedGoal) return;
    this.goalNoteSaving = true;
    try {
      const content = this.selectedGoal.note;
      if (this.selectedGoal.noteId) {
        await (client.models as any).GoalNote.update({ id: this.selectedGoal.noteId, content });
      } else {
        const { data: created } = await (client.models as any).GoalNote.create(
          { goalID: this.selectedGoal.id, subTaskID: null, content });
        this.selectedGoal.noteId = created?.id ?? null;
      }
      this.goalNoteLastSaved = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { console.error(e); }
    finally { this.goalNoteSaving = false; }
  }

  // ── SubTask CRUD ──────────────────────────────────────────────────────────

  getNewSubTask(goalId: string) {
    if (!this.newSubTask[goalId]) this.newSubTask[goalId] = { content: '', dueDate: '' };
    return this.newSubTask[goalId];
  }

  async addSubTask(goalId: string) {
    const st = this.newSubTask[goalId];
    if (!st?.content.trim()) return;
    try {
      const goal = this.goals.find(g => g.id === goalId);
      const maxOrder = goal?.subTasks.length ? Math.max(...goal.subTasks.map(s => s.order)) + 1 : 0;
      await client.models.SubTask.create({ goalID: goalId, content: st.content,
        dueDate: st.dueDate, isCompleted: false, order: maxOrder });
      delete this.newSubTask[goalId];
      await this.loadGoals();
    } catch (e) { console.error(e); }
  }

  async toggleSubTask(goalId: string, subTask: SubTask) {
    try {
      await client.models.SubTask.update({ id: subTask.id, isCompleted: !subTask.isCompleted });
      await this.loadGoals();
    } catch (e) { console.error(e); }
  }

  async saveSubTask(subTask: SubTask) {
    try {
      await client.models.SubTask.update({ id: subTask.id, content: subTask.content, dueDate: subTask.dueDate });
      this.editingSubTask[subTask.id] = false;
      await this.loadGoals();
    } catch (e) { console.error(e); }
  }

  async deleteSubTask(goalId: string, subTask: SubTask) {
    try {
      if (subTask.noteId) {
        try { await (client.models as any).GoalNote.delete({ id: subTask.noteId }); } catch { /* ignore */ }
      }
      await client.models.SubTask.delete({ id: subTask.id });
      await this.loadGoals();
    } catch (e) { console.error(e); }
  }

  // ── Task note drawer ──────────────────────────────────────────────────────

  toggleTaskNote(subTask: SubTask) {
    this.activeTaskNote = this.activeTaskNote?.id === subTask.id ? null : subTask;
  }

  closeTaskNote() { this.activeTaskNote = null; }

  private taskNoteTimers: { [id: string]: any } = {};

  onTaskNoteChange(subTask: SubTask) {
    if (this.taskNoteTimers[subTask.id]) clearTimeout(this.taskNoteTimers[subTask.id]);
    this.taskNoteTimers[subTask.id] = setTimeout(() => this.saveTaskNote(subTask), 1000);
  }

  async saveTaskNote(subTask: SubTask) {
    if (!this.selectedGoal) return;
    subTask.noteSaving = true;
    try {
      if (subTask.noteId) {
        await (client.models as any).GoalNote.update({ id: subTask.noteId, content: subTask.note });
      } else {
        const { data: created } = await (client.models as any).GoalNote.create(
          { goalID: this.selectedGoal.id, subTaskID: subTask.id, content: subTask.note });
        subTask.noteId = created?.id ?? null;
      }
    } catch (e) { console.error(e); }
    finally { subTask.noteSaving = false; }
  }

  // ── Drag & sort ───────────────────────────────────────────────────────────

  async onSubTaskDrop(event: CdkDragDrop<SubTask[]>, goalId: string) {
    if (event.previousIndex === event.currentIndex) return;
    const goal = this.goals.find(g => g.id === goalId);
    if (!goal) return;
    this.sortByDate[goalId] = false;
    moveItemInArray(goal.subTasks, event.previousIndex, event.currentIndex);
    try {
      for (let i = 0; i < goal.subTasks.length; i++) {
        await client.models.SubTask.update({ id: goal.subTasks[i].id, order: i });
        goal.subTasks[i].order = i;
      }
      this.syncSelected();
    } catch (e) { console.error(e); await this.loadGoals(); }
  }

  toggleSort(goalId: string) {
    this.sortByDate[goalId] = !this.sortByDate[goalId];
    const goal = this.goals.find(g => g.id === goalId);
    if (goal) { this.applySortToGoal(goalId, goal.subTasks); this.syncSelected(); }
  }

  // ── Selection ─────────────────────────────────────────────────────────────

  selectGoal(goalId: string) {
    this.selectedGoalId = goalId;
    this.activeTab = 'tasks';
    this.showEmojiPicker = {};
    this.showColorPicker = {};
    this.goalNoteLastSaved = '';
    this.activeTaskNote = null;
    this.syncSelected();
  }

  syncSelected() {
    this.selectedGoal = this.goals.find(g => g.id === this.selectedGoalId) || null;
    if (this.activeTaskNote && this.selectedGoal) {
      this.activeTaskNote = this.selectedGoal.subTasks.find(st => st.id === this.activeTaskNote!.id) || null;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getProgress(goal: Goal): number {
    if (!goal.subTasks.length) return 0;
    return Math.round(goal.subTasks.filter(st => st.isCompleted).length / goal.subTasks.length * 100);
  }

  getCompletedCount(goal: Goal): string {
    return `${goal.subTasks.filter(st => st.isCompleted).length}/${goal.subTasks.length}`;
  }

  getDaysLeft(dueDate: string): number | null {
    if (!dueDate) return null;
    return Math.ceil((new Date(dueDate).getTime() - new Date().setHours(0,0,0,0)) / 86400000);
  }

  getDueLabel(dueDate: string): string {
    const d = this.getDaysLeft(dueDate);
    if (d === null) return '';
    if (d < 0) return `${Math.abs(d)}d overdue`;
    if (d === 0) return 'Due today';
    if (d === 1) return 'Due tomorrow';
    return `${d}d left`;
  }

  getDueClass(dueDate: string): string {
    const d = this.getDaysLeft(dueDate);
    if (d === null) return '';
    if (d < 0) return 'overdue';
    if (d <= 3) return 'urgent';
    if (d <= 7) return 'soon';
    return 'ok';
  }

  formatDate(s: string): string {
    if (!s) return '';
    return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getCircumference() { return 2 * Math.PI * 16; }
  getDashOffset(goal: Goal) { return this.getCircumference() * (1 - this.getProgress(goal) / 100); }

  getMeta(goalId: string) {
    if (!this.goalMeta[goalId]) this.goalMeta[goalId] = { color: COLORS[0], emoji: '🎯' };
    return this.goalMeta[goalId];
  }
  setEmoji(goalId: string, e: string) { this.getMeta(goalId).emoji = e; this.showEmojiPicker[goalId] = false; }
  setColor(goalId: string, c: string) { this.getMeta(goalId).color = c; this.showColorPicker[goalId] = false; }

  activeCount() { return this.goals.filter(g => !g.isCompleted).length; }
  doneCount()   { return this.goals.filter(g => g.isCompleted).length; }

  countByPriority(p: Priority) { return this.goals.filter(g => g.priority === p && !g.isCompleted).length; }

  // ── Resize ────────────────────────────────────────────────────────────────

  onResizeStart(event: MouseEvent) {
    this.isResizing = true;
    this.startX = event.clientX;
    const sidebar = document.querySelector('.gt-sidebar') as HTMLElement;
    this.startWidth = sidebar.offsetWidth;
    document.addEventListener('mousemove', this.onResize);
    document.addEventListener('mouseup', this.onResizeEnd);
    event.preventDefault();
  }

  private onResize = (e: MouseEvent) => {
    if (!this.isResizing) return;
    const s = document.querySelector('.gt-sidebar') as HTMLElement;
    const w = this.startWidth + (e.clientX - this.startX);
    if (w >= 220 && w <= 520) s.style.width = w + 'px';
  };

  private onResizeEnd = () => {
    this.isResizing = false;
    document.removeEventListener('mousemove', this.onResize);
    document.removeEventListener('mouseup', this.onResizeEnd);
  };

  onTouchStart(event: TouchEvent) {
    this.isResizing = true;
    this.startX = event.touches[0].clientX;
    const s = document.querySelector('.gt-sidebar') as HTMLElement;
    this.startWidth = s.offsetWidth;
    document.addEventListener('touchmove', this.onTouchMove);
    document.addEventListener('touchend', this.onTouchEnd);
    event.preventDefault();
  }

  private onTouchMove = (e: TouchEvent) => {
    if (!this.isResizing) return;
    const s = document.querySelector('.gt-sidebar') as HTMLElement;
    const w = this.startWidth + (e.touches[0].clientX - this.startX);
    if (w >= 220 && w <= 520) s.style.width = w + 'px';
  };

  private onTouchEnd = () => {
    this.isResizing = false;
    document.removeEventListener('touchmove', this.onTouchMove);
    document.removeEventListener('touchend', this.onTouchEnd);
  };

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event) {
    const t = e.target as HTMLElement;
    if (!t.closest('.picker-anchor')) { this.showEmojiPicker = {}; this.showColorPicker = {}; }
  }
}
