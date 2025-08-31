import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notes.component.html',
  styleUrl: './notes.component.css'
})
export class NotesComponent implements OnInit, OnDestroy {
  notes: any[] = [];
  rootNotes: any[] = [];
  subNotes: { [key: string]: any[] } = {};
  selectedNote: any = null;
  editingNote: any = null;
  newNote = { title: '', content: '', parentNoteID: null as string | null };
  expandedNotes: Set<string> = new Set();

  ngOnInit(): void {
    this.loadNotes();
  }

  ngOnDestroy(): void {
    // No cleanup needed for localStorage
  }

  loadNotes() {
    try {
      const storedNotes = localStorage.getItem('notes');
      this.notes = storedNotes ? JSON.parse(storedNotes) : [];
      
      this.rootNotes = this.notes
        .filter(note => !note.parentNoteID)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      
      this.subNotes = {};
      this.notes
        .filter(note => note.parentNoteID)
        .forEach(note => {
          if (!this.subNotes[note.parentNoteID]) {
            this.subNotes[note.parentNoteID] = [];
          }
          this.subNotes[note.parentNoteID].push(note);
        });
      
      Object.keys(this.subNotes).forEach(parentId => {
        this.subNotes[parentId].sort((a, b) => (a.order || 0) - (b.order || 0));
      });
      
      if (this.rootNotes.length > 0 && !this.selectedNote) {
        this.selectNote(this.rootNotes[0]);
      }
    } catch (error) {
      console.error('Error loading notes from localStorage', error);
    }
  }

  saveNotes() {
    try {
      localStorage.setItem('notes', JSON.stringify(this.notes));
    } catch (error) {
      console.error('Error saving notes to localStorage', error);
    }
  }

  selectNote(note: any) {
    this.selectedNote = note;
    this.editingNote = null;
  }

  createNote() {
    if (!this.newNote.title.trim()) return;
    
    try {
      let maxOrder;
      if (this.newNote.parentNoteID) {
        const parentSubNotes = this.subNotes[this.newNote.parentNoteID] || [];
        maxOrder = parentSubNotes.length > 0 
          ? Math.max(...parentSubNotes.map(n => n.order || 0)) 
          : -1;
      } else {
        maxOrder = this.rootNotes.length > 0 
          ? Math.max(...this.rootNotes.map(n => n.order || 0)) 
          : -1;
      }
      
      const newNote = {
        id: Date.now().toString(),
        title: this.newNote.title,
        content: this.newNote.content || '',
        parentNoteID: this.newNote.parentNoteID,
        order: maxOrder + 1
      };
      
      this.notes.push(newNote);
      this.saveNotes();
      this.loadNotes();
      
      this.newNote = { title: '', content: '', parentNoteID: null };
      this.selectNote(newNote);
    } catch (error) {
      console.error('Error creating note', error);
    }
  }

  startEdit(note: any) {
    this.editingNote = { ...note };
  }

  cancelEdit() {
    this.editingNote = null;
  }

  saveEdit() {
    if (!this.editingNote || !this.editingNote.title.trim()) return;
    
    try {
      const noteIndex = this.notes.findIndex(n => n.id === this.editingNote.id);
      if (noteIndex !== -1) {
        this.notes[noteIndex] = { ...this.editingNote };
        this.saveNotes();
        this.loadNotes();
        
        if (this.selectedNote && this.selectedNote.id === this.editingNote.id) {
          this.selectedNote = { ...this.editingNote };
        }
      }
      
      this.editingNote = null;
    } catch (error) {
      console.error('Error updating note', error);
    }
  }

  deleteNote(id: string) {
    if (!id) return;
    
    const hasSubNotes = this.subNotes[id] && this.subNotes[id].length > 0;
    let confirmMessage = 'Are you sure you want to delete this note?';
    if (hasSubNotes) {
      confirmMessage = 'This note has sub-notes that will also be deleted. Are you sure?';
    }
    
    if (confirm(confirmMessage)) {
      try {
        if (hasSubNotes) {
          for (const subNote of this.subNotes[id]) {
            this.notes = this.notes.filter(n => n.id !== subNote.id);
          }
        }
        
        this.notes = this.notes.filter(n => n.id !== id);
        this.saveNotes();
        this.loadNotes();
        
        if (id === this.selectedNote?.id) {
          this.selectedNote = null;
          if (this.rootNotes.length > 0) {
            this.selectNote(this.rootNotes[0]);
          }
        }
      } catch (error) {
        console.error('Error deleting note', error);
      }
    }
  }

  toggleNoteExpansion(noteId: string, event: Event) {
    event.stopPropagation();
    if (this.expandedNotes.has(noteId)) {
      this.expandedNotes.delete(noteId);
    } else {
      this.expandedNotes.add(noteId);
    }
  }

  addSubNote(parentId: string, event: Event) {
    event.stopPropagation();
    this.newNote = { title: '', content: '', parentNoteID: parentId };
    this.expandedNotes.add(parentId);
  }

  hasSubNotes(noteId: string): boolean {
    return this.subNotes[noteId] && this.subNotes[noteId].length > 0;
  }

  saveNoteContent() {
    if (!this.selectedNote) return;
    
    try {
      const noteIndex = this.notes.findIndex(n => n.id === this.selectedNote.id);
      if (noteIndex !== -1) {
        this.notes[noteIndex].content = this.selectedNote.content || '';
        this.saveNotes();
      }
    } catch (error) {
      console.error('Error saving note content', error);
    }
  }
}