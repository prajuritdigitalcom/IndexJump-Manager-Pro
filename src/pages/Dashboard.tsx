/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useIndexStore } from '../store';
import { 
  Coins, 
  Key, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Activity, 
  Zap, 
  Database,
  ArrowRight,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { formatNumber, formatDate } from '../utils/helpers';
import { motion } from 'motion/react';

export default function Dashboard() {
  const { 
    tokens, 
    urls, 
    queue,
    isProcessing, 
    processedCount, 
    successCount, 
    failedCount, 
    totalUrlsToProcess, 
    speedUrlPerMinute, 
    estimatedTimeRemaining, 
    durationInSeconds,
    historySessions,
    loadHistorySessions,
    setActiveTab
  } = useIndexStore();

  React.useEffect(() => {
    loadHistorySessions();
  }, [loadHistorySessions]);

  // Compute live state sums
  const totalTokensCount = tokens.length;
  const totalBalance = tokens.reduce((acc, t) => acc + t.balance, 0);
  
  // Historical aggregates
  const totalSubmittedHistorical = historySessions.reduce((acc, s) => acc + s.totalUrls, 0);
  const totalSuccessHistorical = historySessions.reduce((acc, s) => acc + s.successCount, 0);
  const totalFailedHistorical = historySessions.reduce((acc, s) => acc + s.failedCount, 0);

  // Compute percentages
  const progressPercent = totalUrlsToProcess > 0 
    ? Math.round((processedCount / totalUrlsToProcess) * 100) 
    : 0;

  // Format dynamic timer (H:M:S)
  const formatTimer = (sec: number) => {
    if (sec <= 0) return '00:00:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return [
      h.toString().padStart(2, '0'),
      m.toString().padStart(2, '0'),
      s.toString().padStart(2, '0')
    ].join(':');
  };

  const statCards = [
    {
      id: 'stat-tokens',
      title: 'Total API Tokens',
      value: formatNumber(totalTokensCount),
      sub: `${tokens.filter(t => t.status === 'ready').length} Ready • ${tokens.filter(t => t.status === 'invalid').length} Invalid`,
      icon: Key,
      color: 'from-pink-500/10 to-rose-500/10 border-rose-500/20 text-[#fe4c6f]'
    },
    {
      id: 'stat-balance',
      title: 'Available Balance',
      value: formatNumber(totalBalance),
      sub: 'All active tokens pooled',
      icon: Coins,
      color: 'from-amber-500/10 to-yellow-500/10 border-yellow-500/20 text-amber-500'
    },
    {
      id: 'stat-submitted',
      title: 'Live Submitted URLs',
      value: formatNumber(urls.length),
      sub: `${processedCount} / ${totalUrlsToProcess} handled in current queue`,
      icon: Send,
      color: 'from-[#3b82f6]/10 to-indigo-500/10 border-[#3b82f6]/20 text-[#3b82f6]'
    },
    {
      id: 'stat-success',
      title: 'Success Submissions',
      value: formatNumber(successCount),
      sub: urls.length > 0 ? `${Math.round((successCount / Math.max(1, processedCount)) * 100)}% Conversion rate` : 'No active sessions',
      icon: CheckCircle2,
      color: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-500'
    },
    {
      id: 'stat-failed',
      title: 'Failed Attempts',
      value: formatNumber(failedCount),
      sub: 'Automated retries triggered',
      icon: XCircle,
      color: 'from-rose-500/10 to-red-500/10 border-red-500/20 text-rose-500'
    },
    {
      id: 'stat-remaining',
      title: 'Time Remaining',
      value: formatTimer(isProcessing ? estimatedTimeRemaining : 0),
      sub: `Speed: ${speedUrlPerMinute} URLs/Min`,
      icon: Clock,
      color: 'from-sky-500/10 to-blue-500/10 border-blue-500/20 text-sky-500'
    }
  ];

  return (
    <div className="flex-1 space-y-8 overflow-y-auto max-h-[calc(100vh-5rem)] p-8" id="dashboard-tab">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-900 to-zinc-950 p-8 border border-zinc-800 shadow-xl">
        {/* Subtle Decorative Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-pink-500/30 bg-pink-500/10 text-xs font-semibold text-[#fe4c6f]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>SaaS Platform Control Panel</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Welcome to IndexJump Manager Pro
            </h2>
            <p className="text-zinc-400 max-w-xl text-sm leading-relaxed">
              Automate high-velocity backlink and URL indexation submissions via distributed multi-token parallel workers natively. Perfect for large-scale SEO workflows.
            </p>
          </div>
          <button
            id="dashboard-btn-quick-queue"
            onClick={() => setActiveTab('submit')}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#fe4c6f] to-[#e83b61] hover:from-[#e83b61] hover:to-[#fe4c6f] text-white font-semibold text-sm transition-all duration-300 shadow-lg shadow-[#fe4c6f]/20 cursor-pointer flex items-center gap-2"
          >
            <span>Launch Submission Queue</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Primary Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-2xl border bg-white dark:bg-zinc-900/60 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow relative overflow-hidden`}
              id={card.id}
            >
              {/* Top spark */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                  {card.title}
                </span>
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${card.color} border flex items-center justify-center`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 space-y-1">
                <h3 className="text-2xl font-black font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
                  {card.value}
                </h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                  {card.sub}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Stats Segment: Progress Dial vs Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Dynamic Progress Indicator Ring */}
        <div className="lg:col-span-1 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 flex flex-col items-center justify-center shadow-sm min-h-[380px]" id="dashboard-progress-ring-card">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 self-start mb-6 flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#fe4c6f]" />
            <span>Active Progress Dial</span>
          </h3>

          <div className="relative h-44 w-44 flex items-center justify-center">
            {/* SVG Progress Ring */}
            <svg className="absolute inset-0 h-full w-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                className="stroke-zinc-100 dark:stroke-zinc-800"
                strokeWidth="8"
                fill="transparent"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="40"
                className="stroke-[#fe4c6f]"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray="251.2"
                initial={{ strokeDashoffset: 251.2 }}
                animate={{ strokeDashoffset: 251.2 - (251.2 * progressPercent) / 100 }}
                transition={{ duration: 1, ease: "easeOut" }}
                strokeLinecap="round"
              />
            </svg>
            
            {/* Value Indicator */}
            <div className="text-center">
              <span className="text-3xl font-black font-mono text-zinc-900 dark:text-zinc-50">
                {progressPercent}%
              </span>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">
                Completed
              </p>
            </div>
          </div>

          <div className="w-full mt-6 space-y-3.5 border-t border-zinc-100 dark:border-zinc-900 pt-5">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500 font-medium">Job Status</span>
              <span className={`font-semibold ${isProcessing ? 'text-emerald-500' : 'text-zinc-400'}`}>
                {isProcessing ? 'Processing Queue' : 'Idle / Standby'}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500 font-medium">Active Workers</span>
              <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                {isProcessing ? tokens.filter(t => t.status === 'ready').length : 0} Allocated
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500 font-medium">URLs Processed</span>
              <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                {processedCount} / {totalUrlsToProcess}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Session History List */}
        <div className="lg:col-span-2 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 flex flex-col justify-between shadow-sm" id="dashboard-history-feed">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <Database className="h-4 w-4 text-[#fe4c6f]" />
                <span>Recent System Runs</span>
              </h3>
              <button
                id="dashboard-btn-all-history"
                onClick={() => setActiveTab('history')}
                className="text-xs text-[#fe4c6f] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View All History</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {historySessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                <BarChart3 className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-2" />
                <span className="text-sm font-bold text-zinc-600 dark:text-zinc-400">No session runs detected</span>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-xs mt-1">
                  Once you start submissions in the "Submit Queue" tab, your complete session logs will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1">
                {historySessions.slice(0, 4).map((session) => (
                  <div
                    key={session.id}
                    className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                  >
                    <div className="space-y-1">
                      <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                        {formatDate(session.timestamp)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                          {session.totalUrls} URLs Submitting
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          {session.bot}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-xs text-emerald-500 font-semibold block">
                          {session.successCount} Success
                        </span>
                        <span className="text-xs text-rose-500 font-semibold block">
                          {session.failedCount} Failed
                        </span>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase font-mono ${
                        session.status === 'completed' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}>
                        {session.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-zinc-100 dark:border-zinc-900 pt-4 mt-6 text-xs text-zinc-500 flex items-center gap-2 justify-between">
            <span className="flex items-center gap-1">
              <Activity className="h-3.5 w-3.5 text-pink-500" />
              Aggregate: {formatNumber(totalSubmittedHistorical)} Submitted • {formatNumber(totalSuccessHistorical)} Indexed
            </span>
            <span className="font-mono text-[10px]">
              V1.0
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
