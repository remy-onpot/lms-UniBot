import Dexie, { Table } from 'dexie';
import { ChatMessage } from '@/types'; 

// Define Interfaces for our Tables
export interface OfflineAction {
  id?: number;
  type: 'quiz_submission' | 'assignment_submission' | 'announcement' | 'chat_message' | 'mark_read' | 'update_profile';
  payload: any;
  status: 'pending' | 'synced' | 'failed';
  created_at: string;
}

export interface CachedMaterial {
  id: string; // UUID from Supabase
  courseId: string;
  type: 'handout' | 'syllabus';
  content: Blob | string; // The file data or text
  last_updated: string;
}

// The Database Class
export class UniBotDB extends Dexie {
  offlineActions!: Table<OfflineAction, number>; 
  cachedMaterials!: Table<CachedMaterial, string>;
  chatHistory!: Table<ChatMessage, string>;

  constructor() {
    super('UniBotOfflineDB');
    
    // Define Schema
    this.version(1).stores({
      offlineActions: '++id, type, status, created_at', // ++id means auto-increment
      cachedMaterials: 'id, courseId, type',
      chatHistory: 'id, session_id' // session_id is indexed for searching
    });
  }
}

// Export a single instance
export const db = new UniBotDB();