/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useIndexStore } from '../store';
import { 
  RefreshCw, 
  Coins, 
  Cpu, 
  CheckCircle,
} from 'lucide-react';
import { formatNumber } from '../utils/helpers';

export default function Header() {
  const { 
    activeTab, 
    tokens, 
    checkAllBalances, 
    isProcessing,
    processedCount,
    totalUrlsToProcess
  } = useIndexStore();

  // Compute stats
  const totalTokens = tokens.length;
  const availableBalance = tokens.reduce((acc, t) => acc + Math.max(0, t.balance - 1), 0);

  const applyTheme = () => {
    const root = window.document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
  };

  React.useEffect(() => {
    applyTheme();
  }, []);

  // Tab Title helper
  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'submit': return 'Submit Queue Engine';
      case 'history': return 'Submission History';
      default: return 'IndexJump Manager';
    }
  };

  return (
    <header 
      className="h-20 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-8 flex items-center justify-between"
      id="top-header"
    >
      {/* Page Title & Status */}
      <div className="flex flex-col">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 font-sans tracking-tight">
          {getTabTitle()}
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
          {isProcessing ? (
            <span className="text-emerald-500 dark:text-emerald-400 flex items-center gap-1.5 font-semibold">
              <Cpu className="h-3.5 w-3.5 animate-spin" />
              RUNNING INDEXING QUEUE ({processedCount}/{totalUrlsToProcess})
            </span>
          ) : (
            <span className="text-zinc-500 flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-[#fe4c6f]" />
              ENGINE STATUS: STANDBY
            </span>
          )}
        </p>
      </div>

      {/* Global Context Indicators */}
      <div className="flex items-center gap-4">
        {/* Available balance Quick Card */}
        {totalTokens > 0 && (
          <div className="hidden md:flex items-center gap-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm shadow-sm">
            <Coins className="h-4 w-4 text-amber-500" />
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 font-mono uppercase leading-none">Available Balance</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">
                {formatNumber(availableBalance)}
              </span>
            </div>
            <button
              id="header-btn-sync-balance"
              onClick={() => checkAllBalances()}
              className="ml-2 h-7 w-7 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center transition-all duration-200 cursor-pointer"
              title="Refresh all token balances"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Software brand signature */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#fe4c6f]/20 bg-[#fe4c6f]/5 text-[10px] font-mono font-semibold text-[#fe4c6f]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#fe4c6f] animate-ping" />
          <span>v1.0.0 PRO</span>
        </div>
      </div>
    </header>
  );
}
