/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { useIndexStore } from '../store';
import { 
  Key, 
  Globe, 
  Play, 
  Square, 
  Pause, 
  Terminal, 
  Search, 
  Download, 
  Trash2, 
  Upload, 
  FileText, 
  ShieldCheck, 
  CheckCircle,
  XCircle,
  AlertTriangle,
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

    // Server Token Auth
    isServerUnlocked,
    useServerTokens,
    setUseServerTokens,
    serverTokens,

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
    submissionError,
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
  const terminalScrollRef = useRef<HTMLDivElement>(null);

  // Auto Scroll Logs
  React.useEffect(() => {
    if (terminalScrollRef.current) {
      terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight;
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
    <div className="flex-1 space-y-6 overflow-y-auto max-h-[calc(100vh-5rem)] p-6 md:p-8" id="submit-tab">
      
      {/* TOP ROW: Section 1 (API Tokens) & Section 2 (URLs Intake) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Section 1: API Tokens Panel */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm flex flex-col justify-between space-y-4" id="token-input-panel">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
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

            {/* Optional Server Tokens Toggle */}
            {isServerUnlocked && (
              <div className="flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-900/30 rounded-xl px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 uppercase">
                    Server Tokens
                  </span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-300">
                    Sertakan {serverTokens.length} token dari server
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="toggle-use-server-tokens"
                    checked={useServerTokens}
                    onChange={(e) => setUseServerTokens(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:after:border-zinc-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            )}

            {/* Token grid list */}
            {tokens.length > 0 && (
              <div className="border-t border-zinc-100 dark:border-zinc-900 pt-3 space-y-2 max-h-[140px] overflow-y-auto">
                <table className="w-full text-left text-xs text-zinc-500">
                  <thead>
                    <tr className="text-[10px] uppercase font-bold text-zinc-400 border-b border-zinc-100 dark:border-zinc-900 pb-2">
                      <th className="py-1">API Token</th>
                      <th>Sumber</th>
                      <th>Balance</th>
                      <th>Available</th>
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
                        <td>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase ${
                            tok.source === 'server'
                              ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                              : 'bg-zinc-500/10 text-zinc-400'
                          }`}>
                            {tok.source === 'server' ? 'Server' : 'Lokal'}
                          </span>
                        </td>
                        <td className="font-mono text-zinc-500">
                          {formatNumber(tok.balance)}
                        </td>
                        <td className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatNumber(Math.max(0, tok.balance - 1))}
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

          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-zinc-500 font-semibold font-mono">
                Tokens Loaded: {tokens.length}
              </span>
              {tokens.length > 0 && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                  Available Balance: {formatNumber(tokens.reduce((acc, t) => acc + Math.max(0, t.balance - 1), 0))} credits
                </span>
              )}
            </div>
            <button
              id="btn-check-balance-action"
              onClick={checkAllBalances}
              className="px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Verify & Check Balances</span>
            </button>
          </div>
        </div>

        {/* Section 2: URLs Intake Panel */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm flex flex-col justify-between space-y-4" id="urls-input-panel">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-3 border border-zinc-100 dark:border-zinc-900 text-xs">
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

            {/* Submission Error Alert */}
            {submissionError && (
              <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs flex items-start gap-2.5 shadow-sm">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Peringatan: Token Tidak Cukup</p>
                  <p className="mt-0.5 leading-relaxed">{submissionError}</p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-zinc-500 font-semibold font-mono">
                URLs Ready: {uniqueUrlsCount}
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">
                GoogleBot / Organic Speed Mode
              </span>
            </div>

            {!isProcessing ? (
              <button
                id="btn-start-indexing"
                onClick={startIndexing}
                className="px-5 py-2.5 rounded-xl bg-[#fe4c6f] hover:bg-[#e83b61] text-white text-xs font-bold shadow-md shadow-[#fe4c6f]/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Play className="h-4 w-4" />
                <span>START INDEXING QUEUE</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  id="btn-stop-indexing"
                  onClick={stopIndexing}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Square className="h-3.5 w-3.5" />
                  <span>STOP</span>
                </button>
                {isPaused ? (
                  <button
                    id="btn-resume-indexing"
                    onClick={resumeIndexing}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Resume</span>
                  </button>
                ) : (
                  <button
                    id="btn-pause-indexing"
                    onClick={pauseIndexing}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Pause className="h-3.5 w-3.5" />
                    <span>Pause</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Section: Queue Realtime Progress */}
      {isProcessing && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm" id="live-progress-bar-container">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
            <span>INDEXING CORE QUEUE PROGRESS</span>
            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
              {processedCount} / {totalUrlsToProcess} ({Math.round((processedCount / totalUrlsToProcess) * 100)}%)
            </span>
          </div>
          
          {/* Active Progress Bar */}
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

      {/* BOTTOM ROW: Live Terminal Log & Real-Time Submissions Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Section: Live Terminal Log Monitor */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950 p-6 shadow-sm flex flex-col justify-between h-[420px] overflow-hidden" id="live-terminal-panel">
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
          <div 
            ref={terminalScrollRef}
            className="flex-1 overflow-y-auto space-y-1.5 font-mono text-[10px] leading-relaxed pr-1 select-text"
          >
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
          </div>
        </div>

        {/* Section: Detailed Submission Results Table */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm flex flex-col justify-between h-[420px] overflow-hidden space-y-3" id="results-table-panel">
          <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#fe4c6f]"
              />
            </div>

            {urls.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-6 text-zinc-400 border border-dashed border-zinc-100 dark:border-zinc-900 rounded-xl">
                <Globe className="h-8 w-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                <span className="text-xs font-semibold">Ready to process queue.</span>
                <p className="text-[10px] text-zinc-400 max-w-xs mx-auto mt-1">
                  Once started, live submission metrics, responses, and token assignments will populate this table instantly.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden space-y-2">
                <div className="flex-1 overflow-auto border border-zinc-100 dark:border-zinc-900 rounded-xl">
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
                  <div className="flex items-center justify-between text-xs pt-1 shrink-0">
                    <span className="text-zinc-500 text-[11px]">
                      {paginatedUrls.length} of {sortedUrls.length} items
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        id="btn-pagination-prev"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="p-1 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-50 cursor-pointer"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <span className="px-2 font-mono font-semibold text-[11px] text-zinc-700 dark:text-zinc-300">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        id="btn-pagination-next"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-50 cursor-pointer"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
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
