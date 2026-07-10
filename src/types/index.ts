/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TokenStatus = 'ready' | 'invalid' | 'empty' | 'rate_limited' | 'offline' | 'checking' | 'idle';

export interface TokenInfo {
  token: string;
  balance: number;
  status: TokenStatus;
  workerId?: string;
  health?: string;
  lastChecked?: string;
}

export type URLStatus = 'pending' | 'processing' | 'success' | 'failed';

export interface SubmittedURL {
  id: string;
  url: string;
  status: URLStatus;
  tokenUsed?: string;
  workerId?: string;
  response?: string;
  time?: number; // Response time in ms
  timestamp: string;
}

export type LogLevel = 'info' | 'success' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
}

export interface IndexJobSession {
  id: string;
  timestamp: string;
  totalUrls: number;
  successCount: number;
  failedCount: number;
  duration: number; // in seconds
  bot: string;
  status: 'completed' | 'stopped' | 'failed' | 'running' | 'paused';
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  defaultWorkerCount: number;
  defaultRetryCount: number;
  defaultRetryDelay: 'random' | '100ms' | '300ms' | '500ms' | '1000ms';
  requestTimeout: number; // in seconds
  autoSave: boolean;
  notifications: boolean;
  animations: boolean;
  apiBaseUrl: string;
}

export interface QueueItem {
  id: string;
  url: string;
  status: 'queued' | 'processing' | 'success' | 'failed';
  retryCount: number;
}
