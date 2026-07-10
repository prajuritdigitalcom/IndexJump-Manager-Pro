/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useIndexStore } from '../store';
import { dbService } from '../utils/indexedDB';
import { SubmittedURL, LogEntry, IndexJobSession } from '../types';
import { 
  Database, 
  Clock, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  FileText, 
  ChevronRight, 
  X,
  ArrowDownCircle,
  Download,
  Search,
  Calendar,
  Loader2
} from 'lucide-react';
import { formatDate, formatNumber, csvExport } from '../utils/helpers';
import { motion, AnimatePresence } from 'motion/react';

export default function History() {
  const { historySessions, loadHistorySessions, deleteHistorySession, addLog } = useIndexStore();

  const [selectedSession, setSelectedSession] = React.useState<IndexJobSession | null>(null);
  const [sessionUrls, setSessionUrls] = React.useState<SubmittedURL[]>([]);
  const [sessionLogs, setSessionLogs] = React.useState<LogEntry[]>([]);
  const [loadingDetails, setLoadingDetails] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  React.useEffect(() => {
    loadHistorySessions();
  }, [loadHistorySessions]);

  const handleInspectSession = async (session: IndexJobSession) => {
    setSelectedSession(session);
    setLoadingDetails(true);
    try {
      const urls = await dbService.getHistoryUrls(session.id);
      const logs = await dbService.getHistoryLogs(session.id);
      setSessionUrls(urls);
      setSessionLogs(logs);
    } catch (e) {
      console.error(e);
      addLog('error', `Failed to load detailed files for session ${session.id}`);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to permanently delete this session record from your local storage?')) {
      await deleteHistorySession(id);
      if (selectedSession?.id === id) {
        setSelectedSession(null);
      }
    }
  };

  const handleExportSessionCSV = () => {
    if (!selectedSession) return;
    const headers = ['URL', 'Status', 'Response', 'Worker', 'Token Used', 'Response Time (ms)', 'Timestamp'];
    const rows = sessionUrls.map(u => [
      u.url,
      u.status,
      u.response || '',
      u.workerId || '',
      u.tokenUsed || '',
      String(u.time || 0),
      u.timestamp
    ]);
    csvExport(headers, rows, `indexjump_session_${selectedSession.id}_export.csv`);
  };

  // Filter history list
  const filteredSessions = historySessions.filter(s => {
    const term = searchTerm.toLowerCase();
    return s.id.toLowerCase().includes(term) || 
           s.bot.toLowerCase().includes(term) || 
           s.status.toLowerCase().includes(term);
  });

  return (
    <div className="flex-1 overflow-y-auto max-h-[calc(100vh-5rem)] p-8 relative" id="history-tab">
      
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Database className="h-4.5 w-4.5 text-[#fe4c6f]" />
              <span>Section: Local Storage History</span>
            </h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              All data is stored purely client-side inside IndexedDB to maintain absolute privacy.
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              id="input-history-search"
              type="text"
              placeholder="Search by bot, status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#fe4c6f]"
            />
          </div>
        </div>

        {/* Sessions list */}
        {filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-950/40 p-8">
            <Database className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-3 animate-pulse" />
            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No submission records in database</span>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-sm mt-1">
              Start submitting backlink queues in the "Submit Queue" tab and all execution outputs will persist here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                id={`history-row-${session.id}`}
                onClick={() => handleInspectSession(session)}
                className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#fe4c6f]/50 cursor-pointer transition-all shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl flex items-center justify-center shrink-0">
                    <Calendar className="h-5 w-5 text-[#fe4c6f]" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {session.totalUrls} URLs Submitted
                      </span>
                      <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded font-mono uppercase font-semibold">
                        {session.bot}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                      <span>{formatDate(session.timestamp)}</span>
                      <span>•</span>
                      <span>Duration: {session.duration}s</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-0 border-zinc-100 dark:border-zinc-900 pt-3 md:pt-0">
                  <div className="flex items-center gap-6">
                    <div className="text-left md:text-right text-xs">
                      <span className="text-emerald-500 font-bold block">{session.successCount} Success</span>
                      <span className="text-rose-500 font-bold block">{session.failedCount} Failed</span>
                    </div>
                    <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full border font-bold uppercase ${
                      session.status === 'completed' 
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                      {session.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id={`btn-delete-history-${session.id}`}
                      onClick={(e) => handleDeleteSession(e, session.id)}
                      className="p-2 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-500 rounded-xl cursor-pointer transition-colors"
                      title="Delete record from disk"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                    <ChevronRight className="h-5 w-5 text-zinc-300 dark:text-zinc-700 hidden md:block" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DETAILED DRILL-DOWN OVERLAY DRAWER */}
      <AnimatePresence>
        {selectedSession && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSession(null)}
              className="absolute inset-0 bg-black z-40"
            />

            {/* Slide-out Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 h-full w-full sm:w-[500px] bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 z-50 flex flex-col justify-between shadow-2xl"
              id="history-inspect-panel"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 font-sans tracking-tight">
                    Detailed Diagnostics
                  </h4>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    SESSION ID: {selectedSession.id}
                  </p>
                </div>
                <button
                  id="btn-close-inspect-panel"
                  onClick={() => setSelectedSession(null)}
                  className="h-8 w-8 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 shadow-sm cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer Body (Content) */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {loadingDetails ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                    <Loader2 className="h-8 w-8 animate-spin text-[#fe4c6f] mb-2" />
                    <span className="text-xs">Asynchronously compiling session logs...</span>
                  </div>
                ) : (
                  <>
                    {/* Session overview details */}
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-900 text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-zinc-400 font-medium">Session Timestamp</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{formatDate(selectedSession.timestamp)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400 font-medium">Target Crawler</span>
                        <span className="font-semibold text-[#fe4c6f]">{selectedSession.bot}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400 font-medium">Processing Time</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">{selectedSession.duration} seconds</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400 font-medium">Conversion</span>
                        <span className="font-mono font-bold text-emerald-500">
                          {selectedSession.successCount} Success / {selectedSession.failedCount} Failed
                        </span>
                      </div>
                    </div>

                    {/* URLs List tab */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          <span>Processed URLs ({sessionUrls.length})</span>
                        </span>
                        <button
                          id="btn-export-session-csv"
                          onClick={handleExportSessionCSV}
                          className="text-[10px] bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="h-3 w-3" />
                          <span>Export CSV</span>
                        </button>
                      </div>

                      <div className="border border-zinc-100 dark:border-zinc-900 rounded-xl max-h-[180px] overflow-y-auto divide-y divide-zinc-50 dark:divide-zinc-900">
                        {sessionUrls.map((u, i) => (
                          <div key={i} className="p-3 text-xs flex justify-between gap-3 bg-white dark:bg-zinc-950 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20">
                            <span className="font-mono text-[10px] truncate max-w-[240px] text-zinc-700 dark:text-zinc-300" title={u.url}>
                              {u.url}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase shrink-0 h-fit ${
                              u.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                            }`}>
                              {u.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Logs List tab */}
                    <div className="space-y-3">
                      <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                        <Database className="h-3.5 w-3.5" />
                        <span>Console Output History</span>
                      </span>

                      <div className="border border-zinc-900 bg-zinc-950 rounded-xl p-4 max-h-[220px] overflow-y-auto space-y-1.5 font-mono text-[9px]">
                        {sessionLogs.length === 0 ? (
                          <span className="text-zinc-600 block text-center">No telemetry logs saved.</span>
                        ) : (
                          sessionLogs.map((log, idx) => (
                            <div key={idx} className="flex gap-1.5">
                              <span className="text-zinc-600 shrink-0">[{log.timestamp}]</span>
                              <span className={
                                log.level === 'success' ? 'text-emerald-400' :
                                log.level === 'warn' ? 'text-amber-400' :
                                log.level === 'error' ? 'text-rose-400' : 'text-zinc-400'
                              }>
                                {log.message}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900/20 text-center text-[10px] text-zinc-400">
                IndexJump Manager Pro • Privacy Preserved Locally
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
