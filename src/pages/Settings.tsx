/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useIndexStore } from '../store';
import { dbService } from '../utils/indexedDB';
import { 
  Settings as SettingsIcon, 
  Sun, 
  Moon, 
  Monitor, 
  Cpu, 
  RefreshCw, 
  AlertOctagon, 
  CheckCircle,
  Bell,
  Sparkles,
  Database,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';

export default function Settings() {
  const { 
    settings, 
    updateSettings, 
    resetSettings,
    addLog
  } = useIndexStore();

  const [notifSupported, setNotifSupported] = React.useState(false);
  const [showSavedMsg, setShowSavedMsg] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  React.useEffect(() => {
    setNotifSupported('Notification' in window);
  }, []);

  const handleReset = async () => {
    if (confirm('Are you absolute sure you want to reset all configurations to factory defaults? Your loaded tokens and index settings will revert.')) {
      await resetSettings();
      addLog('warn', 'Application settings reset to defaults.');
      triggerToast();
    }
  };

  const handleClearDatabase = async () => {
    if (confirm('WARNING: This will permanently wipe ALL historical session logs, details, and active queues from your local IndexedDB storage. This is irreversible. Proceed?')) {
      await dbService.clearAllData();
      addLog('error', 'Completely wiped local IndexedDB database.');
      alert('Local IndexedDB database wiped successfully!');
    }
  };

  const handleToggleNotification = async () => {
    if (!notifSupported) return;
    
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      updateSettings({ notifications: permission === 'granted' });
    } else {
      updateSettings({ notifications: !settings.notifications });
    }
    triggerToast();
  };

  const triggerToast = () => {
    setShowSavedMsg(true);
    setTimeout(() => setShowSavedMsg(false), 2000);
  };

  const setSettingValue = async (key: keyof typeof settings, value: any) => {
    await updateSettings({ [key]: value });
    triggerToast();
  };

  return (
    <div className="flex-1 overflow-y-auto max-h-[calc(100vh-5rem)] p-8" id="settings-tab">
      
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Settings Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <SettingsIcon className="h-4.5 w-4.5 text-[#fe4c6f]" />
              <span>Section: Settings & Configurations</span>
            </h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Customize local parallel worker metrics, network timeouts, and interface themes.
            </p>
          </div>
          
          {showSavedMsg && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-xs font-semibold"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Auto-Saved</span>
            </motion.div>
          )}
        </div>

        {/* 1. Theme Configuration */}
        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <Monitor className="h-4.5 w-4.5 text-[#fe4c6f]" />
            <span>Theme & Visual Environment</span>
          </span>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Select your preferred display theme. Dark theme features optimized contrast for low-light developer workflows.
          </p>

          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'light', name: 'Light Mode', icon: Sun },
              { id: 'dark', name: 'Dark Mode', icon: Moon },
              { id: 'system', name: 'System Sync', icon: Monitor },
            ].map((theme) => {
              const Icon = theme.icon;
              const isSelected = settings.theme === theme.id;
              return (
                <button
                  key={theme.id}
                  id={`btn-settings-theme-${theme.id}`}
                  onClick={() => setSettingValue('theme', theme.id)}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-[#fe4c6f] bg-[#fe4c6f]/5 text-[#fe4c6f]' 
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{theme.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Collapsible Advanced Configurations */}
        <div className="pt-2">
          <button
            id="btn-settings-toggle-advanced"
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full py-4 px-6 text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 flex items-center justify-between transition-all rounded-2xl bg-white dark:bg-zinc-950 border border-dashed border-zinc-200 dark:border-zinc-800 cursor-pointer shadow-sm hover:shadow-md"
          >
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-4.5 w-4.5 text-zinc-400 animate-pulse" />
              <span>Show Custom Advanced Options (Queue Defaults, Endpoint, Safety Resets)</span>
            </div>
            <ChevronRight className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`} />
          </button>

          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-6 space-y-8"
            >
              {/* 2. Worker & Queue Defaults */}
              <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-6">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <Cpu className="h-4.5 w-4.5 text-[#fe4c6f]" />
                  <span>Worker Queue Defaults</span>
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-500 dark:text-zinc-400">Default Worker Count</label>
                    <select
                      id="settings-select-worker"
                      value={settings.defaultWorkerCount}
                      onChange={(e) => setSettingValue('defaultWorkerCount', Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 font-medium text-zinc-800 dark:text-zinc-100 focus:outline-none"
                    >
                      <option value={1}>1 Worker</option>
                      <option value={2}>2 Workers</option>
                      <option value={4}>4 Workers</option>
                      <option value={8}>8 Workers</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-500 dark:text-zinc-400">Default Retry Count</label>
                    <select
                      id="settings-select-retry"
                      value={settings.defaultRetryCount}
                      onChange={(e) => setSettingValue('defaultRetryCount', Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 font-medium text-zinc-800 dark:text-zinc-100 focus:outline-none"
                    >
                      <option value={1}>1 Retry</option>
                      <option value={2}>2 Retries</option>
                      <option value={3}>3 Retries</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-500 dark:text-zinc-400">Default Delay</label>
                    <select
                      id="settings-select-delay"
                      value={settings.defaultRetryDelay}
                      onChange={(e) => setSettingValue('defaultRetryDelay', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 font-medium text-zinc-800 dark:text-zinc-100 focus:outline-none"
                    >
                      <option value="random">Random Delay</option>
                      <option value="100ms">100ms</option>
                      <option value="300ms">300ms</option>
                      <option value="500ms">500ms</option>
                      <option value="1000ms">1000ms</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-500 dark:text-zinc-400">Network Timeout (Seconds)</label>
                    <input
                      id="settings-input-timeout"
                      type="number"
                      min={2}
                      max={60}
                      value={settings.requestTimeout}
                      onChange={(e) => setSettingValue('requestTimeout', Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 font-medium text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#fe4c6f]"
                    />
                  </div>
                </div>
              </div>

              {/* 3. API Integrations Config */}
              <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <RefreshCw className="h-4.5 w-4.5 text-[#fe4c6f]" />
                  <span>Target API Provider Endpoint</span>
                </span>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  Configure the target IndexJump API base URL. This lets you swap endpoints, route through corporate local tunnels, or use custom developer mock endpoints.
                </p>

                <input
                  id="settings-input-api-url"
                  type="text"
                  value={settings.apiBaseUrl}
                  onChange={(e) => setSettingValue('apiBaseUrl', e.target.value)}
                  placeholder="https://api.indexjump.com"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-mono text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#fe4c6f]"
                />
              </div>

              {/* 4. Platform Settings Switches */}
              <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <Bell className="h-4.5 w-4.5 text-[#fe4c6f]" />
                  <span>System Preferences</span>
                </span>

                <div className="space-y-4 text-xs">
                  <label className="flex items-center justify-between text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-100 cursor-pointer select-none">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold">Active Resume Saving</span>
                      <span className="text-[10px] text-zinc-400 font-medium">Auto-saves current URL progress so you can resume in case of browser refresh.</span>
                    </div>
                    <input
                      id="settings-toggle-autosave"
                      type="checkbox"
                      checked={settings.autoSave}
                      onChange={(e) => setSettingValue('autoSave', e.target.checked)}
                      className="rounded border-zinc-300 text-[#fe4c6f] focus:ring-[#fe4c6f]"
                    />
                  </label>

                  <label className={`flex items-center justify-between text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-100 cursor-pointer select-none ${!notifSupported ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold">Push Notifications</span>
                      <span className="text-[10px] text-zinc-400 font-medium">Trigger browser notification triggers when the active URL queues finish.</span>
                    </div>
                    <input
                      id="settings-toggle-notifications"
                      type="checkbox"
                      checked={settings.notifications}
                      onChange={handleToggleNotification}
                      disabled={!notifSupported}
                      className="rounded border-zinc-300 text-[#fe4c6f] focus:ring-[#fe4c6f]"
                    />
                  </label>

                  <label className="flex items-center justify-between text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-100 cursor-pointer select-none">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold">Smooth Motion Layouts</span>
                      <span className="text-[10px] text-zinc-400 font-medium">Enable cinematic transitions, micro-animations, and responsive panel bounces.</span>
                    </div>
                    <input
                      id="settings-toggle-animations"
                      type="checkbox"
                      checked={settings.animations}
                      onChange={(e) => setSettingValue('animations', e.target.checked)}
                      className="rounded border-zinc-300 text-[#fe4c6f] focus:ring-[#fe4c6f]"
                    />
                  </label>
                </div>
              </div>

              {/* 5. Dangerous / Utility resets */}
              <div className="bg-red-500/5 rounded-2xl border border-red-500/20 p-6 space-y-4">
                <div className="flex items-center gap-2 text-rose-500">
                  <AlertOctagon className="h-5 w-5" />
                  <h4 className="text-xs font-black uppercase tracking-wider">Danger Zone Controls</h4>
                </div>
                <p className="text-xs text-rose-500/80 leading-relaxed font-medium">
                  Perform destructive resets. Be extremely careful. Cleansing database files clears all historical run charts and log details permanently from your browser cache.
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    id="btn-settings-factory-reset"
                    onClick={handleReset}
                    className="px-4 py-2.5 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold rounded-xl cursor-pointer transition-all"
                  >
                    Reset to Factory Defaults
                  </button>
                  <button
                    id="btn-settings-wipe-indexeddb"
                    onClick={handleClearDatabase}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-all"
                  >
                    Wipe Local IndexedDB Database
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

      </div>

    </div>
  );
}
