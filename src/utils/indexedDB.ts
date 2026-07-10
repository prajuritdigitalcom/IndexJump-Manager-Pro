/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IndexJobSession, AppSettings, LogEntry, SubmittedURL } from '../types';

const DB_NAME = 'IndexJumpManagerDB';
const DB_VERSION = 1;

export class IndexedDBService {
  private db: IDBDatabase | null = null;

  private initDB(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db);

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        // History Sessions Store
        if (!db.objectStoreNames.contains('history')) {
          db.createObjectStore('history', { keyPath: 'id' });
        }
        // Detailed History URLs Store (so we don't bloat the main history list)
        if (!db.objectStoreNames.contains('history_urls')) {
          const urlStore = db.createObjectStore('history_urls', { keyPath: 'id' });
          urlStore.createIndex('sessionId', 'sessionId', { unique: false });
        }
        // History Logs Store
        if (!db.objectStoreNames.contains('history_logs')) {
          const logStore = db.createObjectStore('history_logs', { keyPath: 'id' });
          logStore.createIndex('sessionId', 'sessionId', { unique: false });
        }
        // Key-Value Settings Store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
        // Saved State/Session Store
        if (!db.objectStoreNames.contains('session')) {
          db.createObjectStore('session');
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Settings
  async saveSettings(settings: AppSettings): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const req = store.put(settings, 'app_settings');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getSettings(): Promise<AppSettings | null> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get('app_settings');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  // History Sessions
  async saveHistorySession(session: IndexJobSession): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('history', 'readwrite');
      const store = tx.objectStore('history');
      const req = store.put(session);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getAllHistorySessions(): Promise<IndexJobSession[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('history', 'readonly');
      const store = tx.objectStore('history');
      const req = store.getAll();
      req.onsuccess = () => {
        // Sort by timestamp desc
        const sorted = (req.result || []).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        resolve(sorted);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async deleteHistorySession(id: string): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['history', 'history_urls', 'history_logs'], 'readwrite');
      
      // Delete session record
      tx.objectStore('history').delete(id);

      // Clean up index records
      const urlStore = tx.objectStore('history_urls');
      const urlIndex = urlStore.index('sessionId');
      urlIndex.openCursor(IDBKeyRange.only(id)).onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      const logStore = tx.objectStore('history_logs');
      const logIndex = logStore.index('sessionId');
      logIndex.openCursor(IDBKeyRange.only(id)).onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // History URLs
  async saveHistoryUrls(sessionId: string, urls: (SubmittedURL & { sessionId: string })[]): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('history_urls', 'readwrite');
      const store = tx.objectStore('history_urls');
      
      for (const url of urls) {
        store.put(url);
      }
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getHistoryUrls(sessionId: string): Promise<SubmittedURL[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('history_urls', 'readonly');
      const store = tx.objectStore('history_urls');
      const index = store.index('sessionId');
      const req = index.getAll(IDBKeyRange.only(sessionId));
      
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  // History Logs
  async saveHistoryLogs(sessionId: string, logs: (LogEntry & { sessionId: string })[]): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('history_logs', 'readwrite');
      const store = tx.objectStore('history_logs');
      
      for (const log of logs) {
        store.put(log);
      }
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getHistoryLogs(sessionId: string): Promise<LogEntry[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('history_logs', 'readonly');
      const store = tx.objectStore('history_logs');
      const index = store.index('sessionId');
      const req = index.getAll(IDBKeyRange.only(sessionId));
      
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  // Active Session Persistence (Resume / Session Save)
  async saveActiveSessionState(key: string, state: any): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('session', 'readwrite');
      const store = tx.objectStore('session');
      const req = store.put(state, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getActiveSessionState(key: string): Promise<any | null> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('session', 'readonly');
      const store = tx.objectStore('session');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async clearActiveSessionState(key: string): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('session', 'readwrite');
      const store = tx.objectStore('session');
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Complete DB Reset
  async clearAllData(): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['history', 'history_urls', 'history_logs', 'session'], 'readwrite');
      tx.objectStore('history').clear();
      tx.objectStore('history_urls').clear();
      tx.objectStore('history_logs').clear();
      tx.objectStore('session').clear();
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const dbService = new IndexedDBService();
