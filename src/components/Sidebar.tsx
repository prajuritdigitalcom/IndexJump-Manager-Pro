/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useIndexStore } from '../store';
import { 
  LayoutDashboard, 
  Send, 
  History, 
  Settings as SettingsIcon, 
  Info,
  Terminal,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';

export default function Sidebar() {
  const { activeTab, setActiveTab, isProcessing, activeWorkers } = useIndexStore();
  const [collapsed, setCollapsed] = React.useState(false);

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'submit', name: 'Submit Queue', icon: Send },
    { id: 'history', name: 'History Logs', icon: History },
    { id: 'settings', name: 'Settings', icon: SettingsIcon },
    { id: 'about', name: 'About Software', icon: Info },
  ] as const;

  return (
    <div 
      className={`h-screen border-r bg-zinc-950 text-zinc-200 flex flex-col justify-between transition-all duration-300 relative ${
        collapsed ? 'w-20' : 'w-64'
      }`}
      id="sidebar-container"
    >
      {/* Brand Header */}
      <div>
        <div className="p-6 flex items-center gap-3 border-b border-zinc-800">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-tr from-[#fe4c6f] to-[#e83b61] flex items-center justify-center shadow-lg shadow-[#fe4c6f]/20">
            <Layers className="h-5 w-5 text-white animate-pulse" />
          </div>
          {!collapsed && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col"
            >
              <span className="font-bold tracking-tight text-lg bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                IndexJump
              </span>
              <span className="text-[10px] font-mono tracking-wider text-[#fe4c6f] font-semibold">
                MANAGER PRO
              </span>
            </motion.div>
          )}
        </div>

        {/* Navigation Tabs */}
        <nav className="p-4 space-y-2 flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-btn-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer relative ${
                  isActive 
                    ? 'text-white' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
                }`}
              >
                {/* Active Highlight Pill */}
                {isActive && (
                  <motion.div
                    layoutId="activePill"
                    className="absolute inset-0 bg-[#fe4c6f] rounded-xl -z-10 shadow-md shadow-[#fe4c6f]/15"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                
                <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                
                {!collapsed && (
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="truncate"
                  >
                    {item.name}
                  </motion.span>
                )}

                {/* Submitting indicator */}
                {item.id === 'submit' && isProcessing && !collapsed && (
                  <span className="ml-auto flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Branding & Collapse Button */}
      <div className="p-4 border-t border-zinc-800 flex flex-col gap-4">
        {/* Worker state info */}
        {!collapsed && isProcessing && (
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3 text-xs flex flex-col gap-1">
            <div className="flex items-center gap-2 font-semibold text-zinc-300">
              <Terminal className="h-3.5 w-3.5 text-[#fe4c6f]" />
              <span>Active Workers</span>
            </div>
            <div className="flex gap-1.5 flex-wrap mt-1">
              {activeWorkers.map((w, i) => (
                <span 
                  key={i} 
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold ${
                    w.status === 'processing' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                  }`}
                >
                  {w.workerId.replace('Worker-', '')}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 font-mono">DEVELOPER</span>
              <span className="text-xs font-semibold text-zinc-300 hover:text-[#fe4c6f] transition-colors">
                Prajurit Digital
              </span>
            </div>
          )}
          
          <button
            id="sidebar-toggle-collapse"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer self-end ml-auto"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
