/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { 
  TokenInfo, 
  SubmittedURL, 
  LogEntry, 
  IndexJobSession, 
  AppSettings, 
  QueueItem, 
  LogLevel,
  TokenStatus
} from '../types';
import { dbService } from '../utils/indexedDB';
import { validateUrl, removeDuplicate, shuffleArray, estimateTime } from '../utils/helpers';
import axios from 'axios';

// Default App Settings
const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark', // default modern dark mode matching SaaS style
  defaultWorkerCount: 4,
  defaultRetryCount: 3,
  defaultRetryDelay: '300ms',
  requestTimeout: 10,
  autoSave: true,
  notifications: true,
  animations: true,
  apiBaseUrl: 'https://api.indexjump.com',
};

interface ActiveWorkerInfo {
  workerId: string;
  currentToken: string;
  currentUrl: string;
  status: string;
}

interface IndexState {
  // Navigation
  activeTab: 'dashboard' | 'submit' | 'history' | 'settings' | 'about';
  setActiveTab: (tab: 'dashboard' | 'submit' | 'history' | 'settings' | 'about') => void;

  // Settings
  settings: AppSettings;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;

  // Token Store
  tokens: TokenInfo[];
  rawTokensText: string;
  setRawTokensText: (text: string) => void;
  setTokens: (tokens: TokenInfo[]) => void;
  checkAllBalances: () => Promise<void>;
  clearTokens: () => void;

  // URL Store
  rawUrlsText: string;
  setRawUrlsText: (text: string) => void;
  urls: SubmittedURL[];
  setUrls: (urls: SubmittedURL[]) => void;

  // Queue System
  queue: QueueItem[];
  isProcessing: boolean;
  isPaused: boolean;
  activeWorkers: ActiveWorkerInfo[];
  
  // Stats & Progress
  totalUrlsToProcess: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  speedUrlPerMinute: number;
  estimatedTimeRemaining: number;
  startTime: number | null;
  durationInSeconds: number;

  // Live Logs
  logs: LogEntry[];
  addLog: (level: LogLevel, message: string) => void;
  clearLogs: () => void;

  // History Store
  historySessions: IndexJobSession[];
  loadHistorySessions: () => Promise<void>;
  deleteHistorySession: (id: string) => Promise<void>;

  // Bot & Processing configuration (Submit wizard states)
  selectedBot: string;
  setSelectedBot: (bot: string) => void;
  
  // Processing options
  optRemoveDuplicates: boolean;
  setOptRemoveDuplicates: (v: boolean) => void;
  optShuffleUrls: boolean;
  setOptShuffleUrls: (v: boolean) => void;
  optSkipInvalid: boolean;
  setOptSkipInvalid: (v: boolean) => void;
  optRetryFailed: boolean;
  setOptRetryFailed: (v: boolean) => void;
  optContinueAuto: boolean;
  setOptContinueAuto: (v: boolean) => void;
  optSaveSession: boolean;
  setOptSaveSession: (v: boolean) => void;
  optResumePrevious: boolean;
  setOptResumePrevious: (v: boolean) => void;
  optEnableParallel: boolean;
  setOptEnableParallel: (v: boolean) => void;
  optAutoCheckBalance: boolean;
  setOptAutoCheckBalance: (v: boolean) => void;
  optAutoExport: boolean;
  setOptAutoExport: (v: boolean) => void;

  // Advanced Configurations
  workerCount: number;
  setWorkerCount: (v: number) => void;
  retryCount: number;
  setRetryCount: (v: number) => void;
  retryDelay: 'random' | '100ms' | '300ms' | '500ms' | '1000ms';
  setRetryDelay: (v: 'random' | '100ms' | '300ms' | '500ms' | '1000ms') => void;
  requestTimeout: number;
  setRequestTimeout: (v: number) => void;

  // Controller Actions
  startIndexing: () => Promise<void>;
  stopIndexing: () => void;
  pauseIndexing: () => void;
  resumeIndexing: () => void;

  // Resume state checker
  checkSavedSession: () => Promise<boolean>;
  clearSavedSession: () => Promise<void>;
}

// Keep track of active asynchronous worker loops to cancel them when stopped
let activeWorkerIntervals: any[] = [];
let abortControllers: AbortController[] = [];
let timerRef: any = null;

export const useIndexStore = create<IndexState>((set, get) => ({
  // Navigation
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Settings
  settings: DEFAULT_SETTINGS,
  loadSettings: async () => {
    try {
      const saved = await dbService.getSettings();
      if (saved) {
        set({ settings: { ...DEFAULT_SETTINGS, ...saved } });
        // Set initial user inputs based on loaded settings
        set({
          workerCount: saved.defaultWorkerCount,
          retryCount: saved.defaultRetryCount,
          retryDelay: saved.defaultRetryDelay,
          requestTimeout: saved.requestTimeout,
        });
      }
    } catch (e) {
      console.error("Failed to load settings from IndexedDB", e);
    }
  },
  updateSettings: async (newSettings) => {
    const updated = { ...get().settings, ...newSettings };
    set({ settings: updated });
    try {
      await dbService.saveSettings(updated);
    } catch (e) {
      console.error(e);
    }
  },
  resetSettings: async () => {
    set({ settings: DEFAULT_SETTINGS });
    try {
      await dbService.saveSettings(DEFAULT_SETTINGS);
      set({
        workerCount: DEFAULT_SETTINGS.defaultWorkerCount,
        retryCount: DEFAULT_SETTINGS.defaultRetryCount,
        retryDelay: DEFAULT_SETTINGS.defaultRetryDelay,
        requestTimeout: DEFAULT_SETTINGS.requestTimeout,
      });
    } catch (e) {
      console.error(e);
    }
  },

  // Token Store
  tokens: [],
  rawTokensText: '',
  setRawTokensText: (text) => set({ rawTokensText: text }),
  setTokens: (tokens) => set({ tokens }),
  clearTokens: () => set({ tokens: [], rawTokensText: '' }),

  checkAllBalances: async () => {
    const { rawTokensText, settings, addLog } = get();
    const tokenLines = rawTokensText
      .split('\n')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (tokenLines.length === 0) {
      addLog('error', 'No tokens specified to check balance.');
      return;
    }

    addLog('info', `Checking balance for ${tokenLines.length} token(s)...`);

    // Map initial tokens as checking
    const initialTokens = tokenLines.map((t) => {
      // Keep existing token properties if available, else new
      const existing = get().tokens.find((old) => old.token === t);
      return {
        token: t,
        balance: existing?.balance || 0,
        status: 'checking' as TokenStatus,
        health: existing?.health || 'unknown',
      };
    });
    set({ tokens: initialTokens });

    // Multi-token balance checks in parallel
    const checkedTokens = await Promise.all(
      initialTokens.map(async (tok) => {
        try {
          const response = await axios.get(`/api/proxy/balance`, {
            params: { token: tok.token },
            headers: {
              'x-api-token': tok.token,
              'x-target-base-url': settings.apiBaseUrl,
            },
            timeout: settings.requestTimeout * 1000,
          });

          const rawData = response.data;
          if (rawData?.err) {
            throw new Error(rawData.err);
          }

          const balance = rawData.res?.balance !== undefined 
            ? rawData.res.balance 
            : (rawData.balance !== undefined ? rawData.balance : 1000);
          const status = balance <= 0 ? 'empty' : 'ready';
          
          addLog('success', `Token [${tok.token.substring(0, 8)}...] verified. Balance: ${balance}`);
          return {
            token: tok.token,
            balance,
            status: status as TokenStatus,
            health: rawData.res?.worker_health || rawData.worker_health || 'healthy',
            lastChecked: new Date().toLocaleTimeString(),
          };
        } catch (err: any) {
          const status = err.response?.status;
          const responseData = err.response?.data;
          let tokenStatus: TokenStatus = 'invalid';
          let msg = `Token validation failed [${tok.token.substring(0, 8)}...]`;

          if (status === 401) {
            tokenStatus = 'invalid';
            msg += ' - Invalid / Expired Token (401)';
          } else if (status === 403) {
            tokenStatus = 'invalid';
            msg += ' - Authorization Error (403) from IndexJump. Check your token.';
          } else if (status === 404) {
            tokenStatus = 'offline';
            msg += ' - Proxy Not Found (404). If deployed on Vercel, please check deployment log or serverless rewrite.';
          } else if (status === 429) {
            tokenStatus = 'rate_limited';
            msg += ' - Rate Limited (429)';
          } else if (status === 503 || status === 502) {
            tokenStatus = 'offline';
            msg += ' - Provider Offline (503)';
          } else {
            msg += ` - Error: ${err.message || 'Network Timeout'}`;
          }

          if (responseData) {
            const dataString = typeof responseData === 'object' ? JSON.stringify(responseData) : String(responseData);
            msg += ` | Details: ${dataString.substring(0, 200)}`;
          }

          addLog('error', msg);
          return {
            token: tok.token,
            balance: 0,
            status: tokenStatus,
            health: 'offline',
            lastChecked: new Date().toLocaleTimeString(),
          };
        }
      })
    );

    set({ tokens: checkedTokens });
    
    const totalBalance = checkedTokens.reduce((acc, t) => acc + t.balance, 0);
    addLog('info', `Balance check completed. Total Available Balance: ${totalBalance}`);
  },

  // URL Store
  rawUrlsText: '',
  setRawUrlsText: (text) => set({ rawUrlsText: text }),
  urls: [],
  setUrls: (urls) => set({ urls }),

  // Queue and workers state
  queue: [],
  isProcessing: false,
  isPaused: false,
  activeWorkers: [],

  // Stats
  totalUrlsToProcess: 0,
  processedCount: 0,
  successCount: 0,
  failedCount: 0,
  speedUrlPerMinute: 0,
  estimatedTimeRemaining: 0,
  startTime: null,
  durationInSeconds: 0,

  // Live Logs
  logs: [],
  addLog: (level, message) => {
    const timestamp = new Date().toLocaleTimeString();
    const newLog: LogEntry = {
      id: Math.random().toString(36).substring(2, 11),
      timestamp,
      level,
      message,
    };
    set((state) => ({ logs: [...state.logs, newLog].slice(-1000) })); // keep last 1000 logs for memory safety
  },
  clearLogs: () => set({ logs: [] }),

  // History sessions
  historySessions: [],
  loadHistorySessions: async () => {
    try {
      const sessions = await dbService.getAllHistorySessions();
      set({ historySessions: sessions });
    } catch (e) {
      console.error(e);
    }
  },
  deleteHistorySession: async (id) => {
    try {
      await dbService.deleteHistorySession(id);
      await get().loadHistorySessions();
      get().addLog('info', `Deleted history session ${id}`);
    } catch (e) {
      console.error(e);
    }
  },

  // Wizard States
  selectedBot: 'GoogleBot',
  setSelectedBot: (bot) => set({ selectedBot: bot }),
  
  optRemoveDuplicates: true,
  setOptRemoveDuplicates: (v) => set({ optRemoveDuplicates: v }),
  optShuffleUrls: false,
  setOptShuffleUrls: (v) => set({ optShuffleUrls: v }),
  optSkipInvalid: true,
  setOptSkipInvalid: (v) => set({ optSkipInvalid: v }),
  optRetryFailed: true,
  setOptRetryFailed: (v) => set({ optRetryFailed: v }),
  optContinueAuto: true,
  setOptContinueAuto: (v) => set({ optContinueAuto: v }),
  optSaveSession: true,
  setOptSaveSession: (v) => set({ optSaveSession: v }),
  optResumePrevious: false,
  setOptResumePrevious: (v) => set({ optResumePrevious: v }),
  optEnableParallel: true,
  setOptEnableParallel: (v) => set({ optEnableParallel: v }),
  optAutoCheckBalance: true,
  setOptAutoCheckBalance: (v) => set({ optAutoCheckBalance: v }),
  optAutoExport: false,
  setOptAutoExport: (v) => set({ optAutoExport: v }),

  workerCount: 4,
  setWorkerCount: (v) => set({ workerCount: v }),
  retryCount: 3,
  setRetryCount: (v) => set({ retryCount: v }),
  retryDelay: '300ms',
  setRetryDelay: (v) => set({ retryDelay: v }),
  requestTimeout: 10,
  setRequestTimeout: (v) => set({ requestTimeout: v }),

  // Helper checking saved session for resume state
  checkSavedSession: async () => {
    try {
      const activeState = await dbService.getActiveSessionState('active_indexing_state');
      if (activeState) {
        set({ optResumePrevious: true });
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  },

  clearSavedSession: async () => {
    try {
      await dbService.clearActiveSessionState('active_indexing_state');
      set({ optResumePrevious: false });
    } catch (e) {
      console.error(e);
    }
  },

  // Core Indexing Controller Loops (The heart of IndexJump Manager Pro)
  startIndexing: async () => {
    const state = get();
    if (state.isProcessing) return;

    state.clearLogs();
    state.addLog('info', 'Initializing Indexing Session...');

    // 1. Gather & parse tokens
    let tokenLines = state.rawTokensText
      .split('\n')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (tokenLines.length === 0) {
      state.addLog('error', 'API Token List is empty! Please insert at least one token.');
      return;
    }

    // Pre-check balance if requested
    if (state.optAutoCheckBalance) {
      await state.checkAllBalances();
      tokenLines = get().tokens
        .filter(t => t.status === 'ready' && t.balance > 0)
        .map(t => t.token);

      if (tokenLines.length === 0) {
        state.addLog('error', 'No ready tokens with available balance found after auto-check!');
        return;
      }
    } else {
      // Build immediate tokens
      const initialTokens: TokenInfo[] = tokenLines.map((t) => ({
        token: t,
        balance: 9999, // default hypothetical high balance if unchecked
        status: 'ready',
        health: 'unknown',
      }));
      set({ tokens: initialTokens });
    }

    // 2. Gather & parse URLs
    let urlsToSubmit = state.rawUrlsText
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urlsToSubmit.length === 0) {
      state.addLog('error', 'URL List is empty! Please input URLs.');
      return;
    }

    // Remove duplicates if selected
    const initialRawCount = urlsToSubmit.length;
    if (state.optRemoveDuplicates) {
      urlsToSubmit = removeDuplicate(urlsToSubmit);
      state.addLog('info', `Removed duplicates. Cleaned list from ${initialRawCount} to ${urlsToSubmit.length} URLs.`);
    }

    // Validate URLs and skip invalid if selected
    const validatedUrls: string[] = [];
    let invalidCount = 0;
    for (const u of urlsToSubmit) {
      if (validateUrl(u)) {
        validatedUrls.push(u);
      } else {
        invalidCount++;
        if (state.optSkipInvalid) {
          state.addLog('warn', `Skipping invalid URL: ${u}`);
        } else {
          validatedUrls.push(u); // keep it if not skipping
        }
      }
    }

    if (invalidCount > 0 && state.optSkipInvalid) {
      state.addLog('info', `Skipped ${invalidCount} invalid URLs based on processing options.`);
    }

    if (validatedUrls.length === 0) {
      state.addLog('error', 'No valid URLs remaining to process!');
      return;
    }

    // Shuffle URLs if selected
    let processingUrls = [...validatedUrls];
    if (state.optShuffleUrls) {
      processingUrls = shuffleArray(processingUrls);
      state.addLog('info', 'URLs shuffled successfully.');
    }

    // Create Initial Queue
    const initialQueue: QueueItem[] = processingUrls.map((url, i) => ({
      id: `q_${i}_${Math.random().toString(36).substring(2, 7)}`,
      url,
      status: 'queued',
      retryCount: 0,
    }));

    // Setup initial Stats
    set({
      queue: initialQueue,
      urls: [], // clear result table on start
      isProcessing: true,
      isPaused: false,
      totalUrlsToProcess: initialQueue.length,
      processedCount: 0,
      successCount: 0,
      failedCount: 0,
      speedUrlPerMinute: 0,
      durationInSeconds: 0,
      startTime: Date.now(),
    });

    state.addLog('success', `Parallel Queue Started: Processing ${initialQueue.length} URL(s) using ${state.optEnableParallel ? state.workerCount : 1} Worker(s)`);

    // Reset abort and worker handles
    abortControllers = [];
    activeWorkerIntervals = [];

    // Trigger workers
    const finalWorkerCount = state.optEnableParallel ? state.workerCount : 1;
    const workersList: ActiveWorkerInfo[] = Array.from({ length: finalWorkerCount }).map((_, i) => ({
      workerId: `Worker-${String.fromCharCode(65 + i)}`, // Worker-A, Worker-B, etc.
      currentToken: '',
      currentUrl: '',
      status: 'idle',
    }));
    set({ activeWorkers: workersList });

    // Launch worker async threads
    for (let i = 0; i < finalWorkerCount; i++) {
      const workerId = `Worker-${String.fromCharCode(65 + i)}`;
      spawnWorker(workerId);
    }

    // Start timer for duration and speed
    if (timerRef) clearInterval(timerRef);
    timerRef = setInterval(() => {
      const s = get();
      if (!s.isProcessing || s.isPaused) return;

      const elapsedSec = s.startTime ? Math.floor((Date.now() - s.startTime) / 1000) : s.durationInSeconds + 1;
      
      // Calculate speed (URLs per minute)
      const speed = elapsedSec > 0 ? Math.round((s.processedCount / elapsedSec) * 60) : 0;
      
      // Calculate estimated remaining time
      const remainingCount = s.totalUrlsToProcess - s.processedCount;
      const avgTimePerUrlSec = s.processedCount > 0 ? elapsedSec / s.processedCount : 1.2;
      const estRemaining = Math.ceil(remainingCount * avgTimePerUrlSec / finalWorkerCount);

      set({
        durationInSeconds: elapsedSec,
        speedUrlPerMinute: speed,
        estimatedTimeRemaining: estRemaining > 0 ? estRemaining : 0,
      });

      // Save Session State for Resume support
      if (s.optSaveSession) {
        dbService.saveActiveSessionState('active_indexing_state', {
          queue: s.queue,
          urls: s.urls,
          tokens: s.tokens,
          processedCount: s.processedCount,
          successCount: s.successCount,
          failedCount: s.failedCount,
          totalUrlsToProcess: s.totalUrlsToProcess,
          selectedBot: s.selectedBot,
          rawTokensText: s.rawTokensText,
          rawUrlsText: s.rawUrlsText,
        }).catch(e => console.error(e));
      }
    }, 1000);
  },

  stopIndexing: () => {
    // Abort active HTTP requests
    abortControllers.forEach(ctrl => ctrl.abort());
    abortControllers = [];

    if (timerRef) {
      clearInterval(timerRef);
      timerRef = null;
    }

    const { processedCount, successCount, failedCount, durationInSeconds, selectedBot, addLog, queue, urls, logs, optSaveSession } = get();
    
    // Set final states
    set({
      isProcessing: false,
      isPaused: false,
      activeWorkers: [],
      estimatedTimeRemaining: 0,
      speedUrlPerMinute: 0,
    });

    addLog('warn', `Process stopped by user. Cleaned up workers. Total processed: ${processedCount}/${queue.length + urls.length}`);

    // Persist Session to History DB
    if (processedCount > 0) {
      const sessionId = `session_${Date.now()}`;
      const sessionRecord: IndexJobSession = {
        id: sessionId,
        timestamp: new Date().toISOString(),
        totalUrls: queue.length + urls.length,
        successCount,
        failedCount,
        duration: durationInSeconds,
        bot: selectedBot,
        status: 'stopped',
      };

      dbService.saveHistorySession(sessionRecord)
        .then(() => dbService.saveHistoryUrls(sessionId, urls.map(u => ({ ...u, sessionId }))))
        .then(() => dbService.saveHistoryLogs(sessionId, logs.map(l => ({ ...l, sessionId }))))
        .then(() => get().loadHistorySessions())
        .catch(e => console.error("Failed to save history on stop", e));
    }

    // Clean active state
    if (optSaveSession) {
      dbService.clearActiveSessionState('active_indexing_state').catch(e => console.error(e));
    }
  },

  pauseIndexing: () => {
    set({ isPaused: true });
    get().addLog('warn', 'Indexing queue paused.');
  },

  resumeIndexing: () => {
    set({ isPaused: false });
    get().addLog('info', 'Indexing queue resumed.');
  },
}));

// Background Async Worker Thread Simulator / Connector
async function spawnWorker(workerId: string) {
  const store = useIndexStore.getState();
  store.addLog('info', `[${workerId}] Worker spawned and listening to queue.`);

  while (true) {
    // Get state fresh each iteration to support pauses/stops
    const currentState = useIndexStore.getState();
    
    if (!currentState.isProcessing) {
      break; // stop worker loop completely
    }

    if (currentState.isPaused) {
      // Loop with sleep if paused
      await new Promise(resolve => setTimeout(resolve, 500));
      continue;
    }

    // 1. Fetch next queued URL from the shared atomic state queue
    const queue = currentState.queue;
    const nextItemIndex = queue.findIndex(item => item.status === 'queued');

    if (nextItemIndex === -1) {
      // No more items in the queue
      break;
    }

    // Mutate state atomically: mark item as processing
    const targetItem = queue[nextItemIndex];
    const updatedQueue = [...queue];
    updatedQueue[nextItemIndex] = { ...targetItem, status: 'processing' };
    
    // Also find an available API Token for this worker
    const tokens = currentState.tokens;
    // Find first token that is 'ready' (balance > 0) and ideally not locked by another worker
    // Or just any valid token if parallel workers share
    const eligibleTokenIndex = tokens.findIndex(t => t.status === 'ready' && t.balance > 0);
    
    if (eligibleTokenIndex === -1) {
      // ALL TOKENS EMPTY OR INVALID! Halt and stop!
      currentState.addLog('error', `[${workerId}] CRITICAL ERROR: No available API Tokens with remaining balance! Halting worker.`);
      // Update queue item back to queued
      updatedQueue[nextItemIndex] = { ...targetItem, status: 'queued' };
      useIndexStore.setState({ queue: updatedQueue });
      break;
    }

    const assignedToken = tokens[eligibleTokenIndex];

    // Lock token for worker and update queue item
    const activeWorkers = currentState.activeWorkers.map(w => 
      w.workerId === workerId 
        ? { ...w, currentToken: assignedToken.token, currentUrl: targetItem.url, status: 'processing' }
        : w
    );

    useIndexStore.setState({ 
      queue: updatedQueue,
      activeWorkers
    });

    // 2. Compute dynamic request configurations
    const timeoutVal = currentState.requestTimeout;
    const retryLimit = currentState.retryCount;
    let delayMs = 100;
    if (currentState.retryDelay === '100ms') delayMs = 100;
    else if (currentState.retryDelay === '300ms') delayMs = 300;
    else if (currentState.retryDelay === '500ms') delayMs = 500;
    else if (currentState.retryDelay === '1000ms') delayMs = 1000;
    else if (currentState.retryDelay === 'random') delayMs = Math.floor(100 + Math.random() * 900);

    // Perform submission request with customized retries
    let success = false;
    let attempt = 0;
    let responseText = '';
    let responseTimeMs = 0;

    const abortCtrl = new AbortController();
    abortControllers.push(abortCtrl);

    while (attempt <= retryLimit && !success) {
      if (!useIndexStore.getState().isProcessing) break;
      
      attempt++;
      const startTime = Date.now();
      try {
        currentState.addLog('info', `[${workerId}] Submitting URL [Attempt ${attempt}/${retryLimit + 1}] using Token [${assignedToken.token.substring(0, 8)}...]: ${targetItem.url}`);

        const res = await axios.get('/api/proxy/index', {
          params: {
            token: assignedToken.token,
            url: targetItem.url,
            bot: currentState.selectedBot
          },
          headers: {
            'x-api-token': assignedToken.token,
            'x-target-base-url': currentState.settings.apiBaseUrl,
            'x-request-timeout': String(timeoutVal * 1000),
          },
          signal: abortCtrl.signal,
          timeout: timeoutVal * 1000
        });

        const rawResData = res.data;
        if (rawResData?.err) {
          throw new Error(rawResData.err);
        }

        responseTimeMs = Date.now() - startTime;
        success = true;
        responseText = rawResData?.res?.message || rawResData?.message || (rawResData?.res?.success ? `Success (ID: ${rawResData.res.id || 'N/A'})` : 'Success');

        // Deduct 1 unit from token balance
        const updatedTokens = [...useIndexStore.getState().tokens];
        const tokIndex = updatedTokens.findIndex(t => t.token === assignedToken.token);
        if (tokIndex !== -1) {
          const currentBal = updatedTokens[tokIndex].balance;
          const nextBal = currentBal > 0 ? currentBal - 1 : 0;
          updatedTokens[tokIndex] = {
            ...updatedTokens[tokIndex],
            balance: nextBal,
            status: nextBal === 0 ? 'empty' : 'ready'
          };
          useIndexStore.setState({ tokens: updatedTokens });
        }
      } catch (err: any) {
        responseTimeMs = Date.now() - startTime;
        const status = err.response?.status;
        const responseData = err.response?.data;
        const detailsString = responseData
          ? (typeof responseData === 'object' ? JSON.stringify(responseData) : String(responseData))
          : '';
        
        responseText = responseData?.error || responseData?.msg || err.message || 'Timeout / Connection Failure';
        if (detailsString) {
          responseText += ` | Details: ${detailsString.substring(0, 250)}`;
        }

        // Error Handlers defined in PRD
        if (status === 401) {
          // Token Invalid - Skip Token immediately!
          currentState.addLog('error', `[${workerId}] TOKEN CRITICAL (401): Token [${assignedToken.token.substring(0, 8)}...] is invalid! Skipping this token.`);
          const updatedTokens = [...useIndexStore.getState().tokens];
          const tokIndex = updatedTokens.findIndex(t => t.token === assignedToken.token);
          if (tokIndex !== -1) {
            updatedTokens[tokIndex] = { ...updatedTokens[tokIndex], status: 'invalid' };
            useIndexStore.setState({ tokens: updatedTokens });
          }
          break; // break retry loop of this URL, let next loop try with another token
        }

        if (status === 400) {
          // Invalid URL - Skip URL immediately!
          currentState.addLog('error', `[${workerId}] URL CRITICAL (400): URL ${targetItem.url} is rejected as invalid by IndexJump!`);
          break; // break retry loop completely, count as failed
        }

        if (status === 429) {
          // Rate Limit
          currentState.addLog('warn', `[${workerId}] RATE LIMIT (429) on token [${assignedToken.token.substring(0, 8)}...].`);
          if (attempt > retryLimit) {
            // Out of retries, skip token
            currentState.addLog('warn', `[${workerId}] Skipping rate-limited token [${assignedToken.token.substring(0, 8)}...].`);
            const updatedTokens = [...useIndexStore.getState().tokens];
            const tokIndex = updatedTokens.findIndex(t => t.token === assignedToken.token);
            if (tokIndex !== -1) {
              updatedTokens[tokIndex] = { ...updatedTokens[tokIndex], status: 'rate_limited' };
              useIndexStore.setState({ tokens: updatedTokens });
            }
          }
        }

        currentState.addLog('warn', `[${workerId}] Attempt ${attempt} failed: ${responseText}`);
        
        // Wait retry delay with backoff
        if (attempt <= retryLimit && useIndexStore.getState().isProcessing) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    // Clean up current abort controller
    const ctrlIdx = abortControllers.indexOf(abortCtrl);
    if (ctrlIdx !== -1) abortControllers.splice(ctrlIdx, 1);

    // Save submission result record
    const resultRecord: SubmittedURL = {
      id: Math.random().toString(36).substring(2, 11),
      url: targetItem.url,
      status: success ? 'success' : 'failed',
      tokenUsed: assignedToken.token,
      workerId,
      response: responseText,
      time: responseTimeMs,
      timestamp: new Date().toLocaleTimeString(),
    };

    // Append to processed URL list
    const updatedUrls = [resultRecord, ...useIndexStore.getState().urls];
    
    // Remove completed item from activeQueue
    const finalQueue = useIndexStore.getState().queue.filter(item => item.url !== targetItem.url);

    // Compute dynamic running stats
    const processed = useIndexStore.getState().processedCount + 1;
    const successCount = useIndexStore.getState().successCount + (success ? 1 : 0);
    const failedCount = useIndexStore.getState().failedCount + (success ? 0 : 1);

    useIndexStore.setState({
      queue: finalQueue,
      urls: updatedUrls,
      processedCount: processed,
      successCount,
      failedCount,
    });

    if (success) {
      currentState.addLog('success', `[${workerId}] SUCCESS! URL indexed: ${targetItem.url}`);
    } else {
      currentState.addLog('error', `[${workerId}] FAILED to index URL: ${targetItem.url}`);
    }

    // Wait processing options interval before moving to next item
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  // Worker loop ended. Clean worker display status
  const finalState = useIndexStore.getState();
  const nextQueueItems = finalState.queue.filter(item => item.status === 'queued');
  
  // Update worker info
  const activeWorkers = useIndexStore.getState().activeWorkers.map(w => 
    w.workerId === workerId 
      ? { ...w, currentToken: '', currentUrl: '', status: 'finished' }
      : w
  );
  useIndexStore.setState({ activeWorkers });

  // If ALL workers are finished or queue is empty, finalize job session!
  const runningWorkers = activeWorkers.filter(w => w.status === 'processing');
  if (runningWorkers.length === 0 || nextQueueItems.length === 0) {
    finalizeSession();
  }
}

function finalizeSession() {
  const s = useIndexStore.getState();
  if (!s.isProcessing) return;

  if (timerRef) {
    clearInterval(timerRef);
    timerRef = null;
  }

  set({
    isProcessing: false,
    activeWorkers: [],
    estimatedTimeRemaining: 0,
    speedUrlPerMinute: 0,
  });

  s.addLog('success', `QUEUE COMPLETED! Finished processing ${s.processedCount} URLs. Success: ${s.successCount}, Failed: ${s.failedCount}`);

  // Create final session record and store in IndexedDB
  const sessionId = `session_${Date.now()}`;
  const sessionRecord: IndexJobSession = {
    id: sessionId,
    timestamp: new Date().toISOString(),
    totalUrls: s.urls.length,
    successCount: s.successCount,
    failedCount: s.failedCount,
    duration: s.durationInSeconds,
    bot: s.selectedBot,
    status: 'completed',
  };

  dbService.saveHistorySession(sessionRecord)
    .then(() => dbService.saveHistoryUrls(sessionId, s.urls.map(u => ({ ...u, sessionId }))))
    .then(() => dbService.saveHistoryLogs(sessionId, s.logs.map(l => ({ ...l, sessionId }))))
    .then(() => s.loadHistorySessions())
    .catch(e => console.error("Failed to save final session history", e));

  // Trigger browser notifications if enabled
  if (s.settings.notifications && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification('IndexJump Manager Pro', {
        body: `Queue completed! Processed ${s.processedCount} URLs successfully.`,
        icon: '/favicon.ico',
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('IndexJump Manager Pro', {
            body: `Queue completed! Processed ${s.processedCount} URLs successfully.`,
          });
        }
      });
    }
  }

  // Clear Saved State if auto-saved session is enabled
  if (s.optSaveSession) {
    dbService.clearActiveSessionState('active_indexing_state').catch(e => console.error(e));
  }
}

// Quick state mutator helper for nested callbacks inside spawnWorker
function set(partial: Partial<IndexState>) {
  useIndexStore.setState(partial);
}
