/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { useIndexStore } from '../store';
import { 
  Key, 
  Globe, 
  Bot, 
  Settings2, 
  Play, 
  Square, 
  Pause, 
  Terminal, 
  Search, 
  Download, 
  Copy, 
  Trash2, 
  Upload, 
  FileText, 
  ShieldCheck, 
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  validateUrl, 
  removeDuplicate, 
  csvExport, 
  txtExport, 
  copyClipboard, 
  formatNumber,
  parseCSV
} from '../utils/helpers';
import { motion } from 'motion/react';

export default function Submit() {
  const {
    tokens,
    rawTokensText,
    setRawTokensText,
    checkAllBalances,
    clearTokens,

    rawUrlsText,
    setRawUrlsText,
    urls,
    queue,

    // Execution state
    isProcessing,
    isPaused,
    activeWorkers,
    totalUrlsToProcess,
    processedCount,
    successCount,
    failedCount,
    speedUrlPerMinute,
    estimatedTimeRemaining,
    durationInSeconds,

    logs,
    clearLogs,

    // Bot Config
    selectedBot,
    setSelectedBot,

    // Options
    optRemoveDuplicates,
    setOptRemoveDuplicates,
    optShuffleUrls,
    setOptShuffleUrls,
    optSkipInvalid,
    setOptSkipInvalid,
    optRetryFailed,
    setOptRetryFailed,
    optContinueAuto,
    setOptContinueAuto,
    optSaveSession,
    setOptSaveSession,
    optResumePrevious,
    setOptResumePrevious,
    optEnableParallel,
    setOptEnableParallel,
    optAutoCheckBalance,
    setOptAutoCheckBalance,
    optAutoExport,
    setOptAutoExport,

    // Advanced Configurations
    workerCount,
    setWorkerCount,
    retryCount,
    setRetryCount,
    retryDelay,
    setRetryDelay,
    requestTimeout,
    setRequestTimeout,

    // Core Controls
    startIndexing,
    stopIndexing,
    pauseIndexing,
    resumeIndexing,
  } = useIndexStore();

  // Component states
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [sortField, setSortField] = React.useState<'url' | 'status' | 'time' | 'timestamp'>('timestamp');
  const [sortAsc, setSortAsc] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  // File Input Refs
  const tokenFileRef = useRef<HTMLInputElement>(null);
  const urlFileRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto Scroll Logs
  React.useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Compute live URL counts
  const urlLines = rawUrlsText
    .split('\n')
    .map(u => u.trim())
    .filter(u => u.length > 0);
  
  const totalUrlsCount = urlLines.length;
  const uniqueUrlsCount = removeDuplicate(urlLines).length;
  const duplicateCount = Math.max(0, totalUrlsCount - uniqueUrlsCount);
  
  const validUrlsCount = urlLines.filter(validateUrl).length;
  const invalidUrlsCount = Math.max(0, totalUrlsCount - validUrlsCount);

  // Filter & Sort Results
  const filteredUrls = urls.filter(u => {
    const term = searchTerm.toLowerCase();
    return u.url.toLowerCase().includes(term) || 
           (u.tokenUsed || '').toLowerCase().includes(term) || 
           (u.response || '').toLowerCase().includes(term);
  });

  const sortedUrls = [...filteredUrls].sort((a, b) => {
    let valA: any = a[sortField] || '';
    let valB: any = b[sortField] || '';
    
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedUrls.length / itemsPerPage);
  const paginatedUrls = sortedUrls.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (field: 'url' | 'status' | 'time' | 'timestamp') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // TXT Loader
  const handleTokenFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawTokensText(text);
    };
    reader.readAsText(file);
  };

  const handleUrlFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'txt' | 'csv') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (type === 'csv') {
        const parsed = parseCSV(text);
        setRawUrlsText(parsed.join('\n'));
      } else {
        setRawUrlsText(text);
      }
    };
    reader.readAsText(file);
  };

  // Clipboard Paste Helpers
  const pasteTokens = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRawTokensText(text);
    } catch (_) {
      // fallback
    }
  };

  const pasteUrls = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRawUrlsText(text);
    } catch (_) {
      // fallback
    }
  };

  // Exports
  const handleExport = (type: 'csv' | 'txt', mode: 'all' | 'success' | 'failed') => {
    const items = urls.filter(u => {
      if (mode === 'success') return u.status === 'success';
      if (mode === 'failed') return u.status === 'failed';
      return true;
    });

    if (type === 'csv') {
      const headers = ['URL', 'Status', 'Response', 'Worker', 'Token Used', 'Latency (ms)', 'Time'];
      const rows = items.map((u, i) => [
        u.url,
        u.status,
        u.response || '',
        u.workerId || '',
        u.tokenUsed || '',
        String(u.time || 0),
        u.timestamp
      ]);
      csvExport(headers, rows, `indexjump_export_${mode}_${Date.now()}.csv`);
    } else {
      const content = items.map(u => u.url).join('\n');
      txtExport(content, `indexjump_export_${mode}_${Date.now()}.txt`);
    }
  };

  return (
    <div className="flex-1 space-y-8 overflow-y-auto max-h-[calc(100vh-5rem)] p-8" id="submit-tab">
      
      {/* 2-Column Core Interface Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: Configuration and Inputs */}
        <div className="space-y-8">
          
          {/* Section 1: API Tokens Panel */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm" id="token-input-panel">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-[#fe4c6f]" />
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                  Section 1: API Tokens
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  ref={tokenFileRef} 
                  accept=".txt" 
                  className="hidden" 
                  onChange={handleTokenFileUpload} 
                />
                <button
                  id="btn-import-tokens-txt"
                  onClick={() => tokenFileRef.current?.click()}
                  className="text-xs bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
                  title="Import from text file (.txt)"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Import TXT</span>
                </button>
                <button
                  id="btn-paste-tokens"
                  onClick={pasteTokens}
                  className="text-xs bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Paste</span>
                </button>
                <button
                  id="btn-clear-tokens"
                  onClick={clearTokens}
                  className="text-xs text-rose-500 hover:bg-rose-500/10 px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            <textarea
              id="token-textarea-input"
              value={rawTokensText}
              onChange={(e) => setRawTokensText(e.target.value)}
              placeholder="Enter your IndexJump API Tokens here (one token per line)...&#10;e.g.&#10;mock_token_1_500&#10;mock_token_2_1200"
              className="w-full h-32 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 text-xs font-mono text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#fe4c6f]/50 resize-y"
            />

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">
                Tokens Loaded: {tokens.length}
              </span>
              <button
                id="btn-check-balance-action"
                onClick={checkAllBalances}
                className="px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Verify & Check Balances</span>
              </button>
            </div>

            {/* Token grid list */}
            {tokens.length > 0 && (
              <div className="mt-4 border-t border-zinc-100 dark:border-zinc-900 pt-4 space-y-2 max-h-[140px] overflow-y-auto">
                <table className="w-full text-left text-xs text-zinc-500">
                  <thead>
                    <tr className="text-[10px] uppercase font-bold text-zinc-400 border-b border-zinc-100 dark:border-zinc-900 pb-2">
                      <th className="py-1">API Token</th>
                      <th>Balance</th>
                      <th>Status</th>
                      <th>Health</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokens.map((tok, idx) => (
                      <tr key={idx} className="border-b border-zinc-50 dark:border-zinc-900/50">
                        <td className="py-2 font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                          {tok.token.substring(0, 10)}...{tok.token.substring(tok.token.length - 4)}
                        </td>
                        <td className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {formatNumber(tok.balance)}
                        </td>
                        <td>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase ${
                            tok.status === 'ready' ? 'bg-emerald-500/10 text-emerald-500' :
                            tok.status === 'checking' ? 'bg-indigo-500/10 text-indigo-500 animate-pulse' :
                            tok.status === 'empty' ? 'bg-amber-500/10 text-amber-500' :
                            'bg-rose-500/10 text-rose-500'
                          }`}>
                            {tok.status}
                          </span>
                        </td>
                        <td className="text-[10px] text-zinc-400 font-medium">
                          {tok.health || 'healthy'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: URLs Intake Panel */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm" id="urls-input-panel">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-[#fe4c6f]" />
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                  Section 2: URLs Intake
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  ref={urlFileRef} 
                  accept=".txt,.csv" 
                  className="hidden" 
                  onChange={(e) => {
                    const ext = e.target.files?.[0]?.name.split('.').pop() || 'txt';
                    handleUrlFileUpload(e, ext === 'csv' ? 'csv' : 'txt');
                  }} 
                />
                <button
                  id="btn-import-urls-txt"
                  onClick={() => urlFileRef.current?.click()}
                  className="text-xs bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>TXT</span>
                </button>
                <button
                  id="btn-import-urls-csv"
                  onClick={() => urlFileRef.current?.click()}
                  className="text-xs bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
                  title="Upload CSV containing links"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  id="btn-paste-urls"
                  onClick={pasteUrls}
                  className="text-xs bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Paste</span>
                </button>
                <button
                  id="btn-clear-urls"
                  onClick={() => setRawUrlsText('')}
                  className="text-xs text-rose-500 hover:bg-rose-500/10 px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            <textarea
              id="urls-textarea-input"
              value={rawUrlsText}
              onChange={(e) => setRawUrlsText(e.target.value)}
              placeholder="Enter your target backlink URLs here (one URL per line)...&#10;e.g.&#10;https://example.com/blog/seo-guide&#10;https://example.com/products/software"
              className="w-full h-32 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 text-xs font-mono text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#fe4c6f]/50 resize-y"
            />

            {/* URL Meta Statistics */}
            {totalUrlsCount > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-3.5 border border-zinc-100 dark:border-zinc-900 text-xs">
                <div>
                  <span className="text-zinc-400 block font-medium">Total Input</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{formatNumber(totalUrlsCount)}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block font-medium">Unique URLs</span>
                  <span className="font-bold text-[#fe4c6f] font-mono">{formatNumber(uniqueUrlsCount)}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block font-medium">Duplicates</span>
                  <span className="font-bold text-amber-500 font-mono">{formatNumber(duplicateCount)}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block font-medium">Valid / Invalid</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">
                    <span className="text-emerald-500">{formatNumber(validUrlsCount)}</span>
                    <span className="text-zinc-300 dark:text-zinc-700 mx-1">/</span>
                    <span className="text-rose-500">{formatNumber(invalidUrlsCount)}</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section 3, 4 & 5: Simplified Bot & Anti-Spam Safety Engine */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm space-y-6" id="simplified-safety-engine">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-4">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-[#fe4c6f]" />
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                  Bot & Safety Engine
                </h3>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                <span>Safe Mode Active</span>
              </div>
            </div>

            {/* Bot Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block">
                Bot Agent Profile
              </label>
              <select
                id="select-bot-type"
                value={selectedBot}
                onChange={(e) => setSelectedBot(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#fe4c6f]/50 font-medium font-mono"
              >
                <option value="GoogleBot">GoogleBot (Default Optimized)</option>
                <option value="OpenAIBot">OpenAIBot (AI Indexing Core)</option>
                <option value="BingBot">BingBot (Microsoft Network)</option>
              </select>
            </div>

            {/* Automated Safety Rules List */}
            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-900 space-y-3.5 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 p-1 rounded bg-[#fe4c6f]/10 text-[#fe4c6f] shrink-0">
                  <Key className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-800 dark:text-zinc-100">Token Safety Reserve (Sisa 1)</h4>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 leading-relaxed">
                    Tokens are automatically rotated before they run out. Once a token has <strong>1 credit</strong> remaining, the system shifts to the next token to avoid complete depletion or spam flags.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 p-1 rounded bg-[#fe4c6f]/10 text-[#fe4c6f] shrink-0">
                  <Globe className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-800 dark:text-zinc-100">Natural Flow Simulation</h4>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 leading-relaxed">
                    Operates with a single concurrent thread and mimics random organic user submissions with dynamic timeouts and simulated delays (randomized between 100ms–1000ms).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 p-1 rounded bg-[#fe4c6f]/10 text-[#fe4c6f] shrink-0">
                  <CheckCircle className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-800 dark:text-zinc-100">Smart URL Filtering</h4>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 leading-relaxed">
                    The engine shuffles your batch automatically to break footprint patterns and filters out duplicate or invalid links, preserving your precious token quotas.
                  </p>
                </div>
              </div>
            </div>

            {/* Collapsible Advanced Settings for power users */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900">
              <button
                id="btn-toggle-advanced-configs"
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full py-2.5 px-4 text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 flex items-center justify-between transition-all rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer border border-dashed border-zinc-200 dark:border-zinc-800"
              >
                <span>{showAdvanced ? "Hide Custom Advanced Configurations" : "Show Custom Advanced Configurations"}</span>
                <ChevronRight className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`} />
              </button>

              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 space-y-6 pt-4 border-t border-zinc-100 dark:border-zinc-900/50"
                >
                  {/* Advanced settings section */}
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Fine-Tune Submission Rules</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { label: 'Remove Duplicate URL', value: optRemoveDuplicates, setter: setOptRemoveDuplicates },
                        { label: 'Shuffle URL List', value: optShuffleUrls, setter: setOptShuffleUrls },
                        { label: 'Skip Invalid URLs', value: optSkipInvalid, setter: setOptSkipInvalid },
                        { label: 'Retry Failed Requests', value: optRetryFailed, setter: setOptRetryFailed },
                        { label: 'Continue Automatically', value: optContinueAuto, setter: setOptContinueAuto },
                        { label: 'Save Active Sessions', value: optSaveSession, setter: setOptSaveSession },
                        { label: 'Enable Parallel Workers', value: optEnableParallel, setter: setOptEnableParallel },
                        { label: 'Auto Balance Verify', value: optAutoCheckBalance, setter: setOptAutoCheckBalance },
                        { label: 'Auto Export Results', value: optAutoExport, setter: setOptAutoExport },
                      ].map((opt, i) => (
                        <label 
                          key={i} 
                          className="flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-50 cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={opt.value}
                            onChange={(e) => opt.setter(e.target.checked)}
                            className="mt-0.5 rounded border-zinc-300 text-[#fe4c6f] focus:ring-[#fe4c6f]"
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-zinc-100 dark:border-zinc-900/30">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-zinc-500 dark:text-zinc-400">Worker Count</label>
                      <select
                        id="select-worker-count"
                        value={workerCount}
                        onChange={(e) => setWorkerCount(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 font-medium text-zinc-800 dark:text-zinc-100"
                      >
                        <option value={1}>1 Worker (Standard)</option>
                        <option value={2}>2 Workers</option>
                        <option value={4}>4 Workers</option>
                        <option value={8}>8 Workers</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-zinc-500 dark:text-zinc-400">Retry Count</label>
                      <select
                        id="select-retry-count"
                        value={retryCount}
                        onChange={(e) => setRetryCount(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 font-medium text-zinc-800 dark:text-zinc-100"
                      >
                        <option value={1}>1 Retry</option>
                        <option value={2}>2 Retries</option>
                        <option value={3}>3 Retries</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-zinc-500 dark:text-zinc-400">Retry Delay</label>
                      <select
                        id="select-retry-delay"
                        value={retryDelay}
                        onChange={(e) => setRetryDelay(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 font-medium text-zinc-800 dark:text-zinc-100"
                      >
                        <option value="random">Random Delay (100ms-1000ms)</option>
                        <option value="100ms">100ms</option>
                        <option value="500ms">500ms</option>
                        <option value="1000ms">1000ms (Safe Anti-Limit)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-zinc-500 dark:text-zinc-400">Request Timeout</label>
                      <select
                        id="select-request-timeout"
                        value={requestTimeout}
                        onChange={(e) => setRequestTimeout(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 font-medium text-zinc-800 dark:text-zinc-100"
                      >
                        <option value={5}>5 Seconds</option>
                        <option value={10}>10 Seconds (Standard)</option>
                        <option value={30}>30 Seconds</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Trigger action controls */}
          <div className="flex gap-4 p-1">
            {!isProcessing ? (
              <button
                id="btn-start-indexing"
                onClick={startIndexing}
                className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-[#fe4c6f] to-[#e83b61] hover:from-[#e83b61] hover:to-[#fe4c6f] text-white font-bold text-sm shadow-lg shadow-[#fe4c6f]/20 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="h-4.5 w-4.5" />
                <span>START INDEXING QUEUE</span>
              </button>
            ) : (
              <>
                <button
                  id="btn-stop-indexing"
                  onClick={stopIndexing}
                  className="flex-1 py-4 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Square className="h-4.5 w-4.5" />
                  <span>STOP PROCESS</span>
                </button>

                {isPaused ? (
                  <button
                    id="btn-resume-indexing"
                    onClick={resumeIndexing}
                    className="px-6 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Play className="h-4.5 w-4.5" />
                    <span>Resume</span>
                  </button>
                ) : (
                  <button
                    id="btn-pause-indexing"
                    onClick={pauseIndexing}
                    className="px-6 py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Pause className="h-4.5 w-4.5" />
                    <span>Pause</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Realtime Engine Logs & Live Table */}
        <div className="space-y-8">
          
          {/* Section: Queue Realtime Progress */}
          {isProcessing && (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm" id="live-progress-bar-container">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
                <span>INDEXING CORE QUEUE PROGRESS</span>
                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                  {processedCount} / {totalUrlsToProcess} ({Math.round((processedCount / totalUrlsToProcess) * 100)}%)
                </span>
              </div>
              
              {/* Massive active Progress Bar */}
              <div className="w-full h-3 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden mb-4 border border-zinc-200 dark:border-zinc-800">
                <motion.div 
                  className="h-full bg-gradient-to-r from-[#fe4c6f] to-[#e83b61]"
                  initial={{ width: '0%' }}
                  animate={{ width: `${(processedCount / totalUrlsToProcess) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Dynamic stats line */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                <div className="bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded-xl">
                  <span className="text-zinc-400 text-[10px] block font-medium">SUCCESS</span>
                  <span className="font-bold text-emerald-500 font-mono">{successCount}</span>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded-xl">
                  <span className="text-zinc-400 text-[10px] block font-medium">FAILED</span>
                  <span className="font-bold text-rose-500 font-mono">{failedCount}</span>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded-xl">
                  <span className="text-zinc-400 text-[10px] block font-medium">SPEED</span>
                  <span className="font-bold text-[#fe4c6f] font-mono">{speedUrlPerMinute} URLs/m</span>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded-xl">
                  <span className="text-zinc-400 text-[10px] block font-medium">REMAINING</span>
                  <span className="font-bold text-sky-500 font-mono">
                    {Math.ceil((totalUrlsToProcess - processedCount))} items
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Section: Live Terminal Log Monitor */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950 p-6 shadow-sm flex flex-col h-[320px] justify-between relative overflow-hidden" id="live-terminal-panel">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-4.5 w-4.5 text-[#fe4c6f] animate-pulse" />
                <span className="text-xs font-bold font-mono text-zinc-300">LIVE ENGINE TERMINAL LOG</span>
              </div>
              <button
                id="btn-clear-logs"
                onClick={clearLogs}
                className="text-[10px] text-zinc-500 hover:text-white font-mono cursor-pointer"
              >
                CLEAR LOGS
              </button>
            </div>

            {/* Scrollable text container */}
            <div className="flex-1 overflow-y-auto space-y-1.5 font-mono text-[10px] leading-relaxed pr-1 select-text">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-600">
                  <span>SYSTEM ONLINE. STANDBY FOR QUEUE TRIGGER...</span>
                </div>
              ) : (
                logs.map((log) => {
                  let colorClass = 'text-zinc-400';
                  if (log.level === 'success') colorClass = 'text-emerald-400 font-semibold';
                  if (log.level === 'warn') colorClass = 'text-amber-400 font-semibold';
                  if (log.level === 'error') colorClass = 'text-rose-400 font-semibold';
                  if (log.level === 'info') colorClass = 'text-cyan-400';

                  return (
                    <div key={log.id} className="flex gap-2">
                      <span className="text-zinc-600 font-light shrink-0">[{log.timestamp}]</span>
                      <span className={colorClass}>{log.message}</span>
                    </div>
                  );
                })
              )}
              <div ref={logEndRef} />
            </div>
          </div>

          {/* Section: Detailed Submission Results Table */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm space-y-4" id="results-table-panel">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Globe className="h-4.5 w-4.5 text-[#fe4c6f]" />
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                  Real-time Submissions Table
                </h3>
              </div>

              {/* Action Exports */}
              {urls.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-xs text-zinc-400 font-medium mr-1">Export:</div>
                  <button
                    id="btn-export-success-csv"
                    onClick={() => handleExport('csv', 'success')}
                    className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 px-2.5 py-1 rounded-md cursor-pointer flex items-center gap-1 hover:opacity-85"
                  >
                    <Download className="h-3 w-3" />
                    <span>Success CSV</span>
                  </button>
                  <button
                    id="btn-export-failed-csv"
                    onClick={() => handleExport('csv', 'failed')}
                    className="text-[10px] bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 px-2.5 py-1 rounded-md cursor-pointer flex items-center gap-1 hover:opacity-85"
                  >
                    <Download className="h-3 w-3" />
                    <span>Failed CSV</span>
                  </button>
                  <button
                    id="btn-export-all-txt"
                    onClick={() => handleExport('txt', 'all')}
                    className="text-[10px] bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 px-2.5 py-1 rounded-md cursor-pointer flex items-center gap-1 hover:opacity-85"
                  >
                    <Download className="h-3 w-3" />
                    <span>All TXT</span>
                  </button>
                </div>
              )}
            </div>

            {/* Table Search bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
              <input
                id="input-results-search"
                type="text"
                placeholder="Search processed URLs, tokens, or responses..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#fe4c6f]"
              />
            </div>

            {urls.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 border border-dashed border-zinc-100 dark:border-zinc-900 rounded-xl">
                <Globe className="h-8 w-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                <span className="text-xs font-semibold">Ready to process queue.</span>
                <p className="text-[10px] text-zinc-400 max-w-xs mx-auto mt-1">
                  Once started, live submission metrics, responses, and token assignments will populate this table instantly.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto border border-zinc-100 dark:border-zinc-900 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-900 text-zinc-500 text-[10px] uppercase font-bold select-none">
                        <th className="p-3">No</th>
                        <th className="p-3 cursor-pointer" onClick={() => handleSort('url')}>Target URL</th>
                        <th className="p-3 cursor-pointer" onClick={() => handleSort('status')}>Status</th>
                        <th className="p-3">Worker</th>
                        <th className="p-3 cursor-pointer" onClick={() => handleSort('time')}>Time (ms)</th>
                        <th className="p-3">Response</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedUrls.map((item, index) => {
                        const serialNum = (currentPage - 1) * itemsPerPage + index + 1;
                        return (
                          <tr 
                            key={item.id} 
                            className="border-b border-zinc-50 dark:border-zinc-900/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 font-medium"
                          >
                            <td className="p-3 font-mono text-zinc-400 text-[10px]">{serialNum}</td>
                            <td className="p-3 max-w-[180px] truncate font-mono text-[11px] text-zinc-700 dark:text-zinc-300" title={item.url}>
                              {item.url}
                            </td>
                            <td className="p-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                item.status === 'success' 
                                  ? 'bg-emerald-500/10 text-emerald-500' 
                                  : 'bg-rose-500/10 text-rose-500'
                              }`}>
                                {item.status === 'success' ? <CheckCircle className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                                <span>{item.status}</span>
                              </span>
                            </td>
                            <td className="p-3 font-mono text-[10px] text-zinc-500">{item.workerId || 'Worker'}</td>
                            <td className="p-3 font-mono text-[10px] text-zinc-600">{item.time || 0}ms</td>
                            <td className="p-3 text-[11px] text-zinc-500 truncate max-w-[120px]" title={item.response}>
                              {item.response || 'Pending'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between text-xs pt-2">
                    <span className="text-zinc-500">
                      Showing {paginatedUrls.length} of {sortedUrls.length} items
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        id="btn-pagination-prev"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-50 cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="px-3 font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        id="btn-pagination-next"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-50 cursor-pointer"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
