/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useIndexStore } from './store';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Submit from './pages/Submit';
import History from './pages/History';
import { motion, AnimatePresence } from 'motion/react';
import { dbService } from './utils/indexedDB';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';

export default function App() {
  const { 
    activeTab, 
    loadSettings, 
    checkSavedSession, 
    optResumePrevious, 
    clearSavedSession,
    addLog,
    setRawTokensText,
    setRawUrlsText,
    setUrls,
    setTokens
  } = useIndexStore();

  const [showResumeBanner, setShowResumeBanner] = React.useState(false);

  React.useEffect(() => {
    // Initial loads
    const initApp = async () => {
      await loadSettings();
      const hasSaved = await checkSavedSession();
      if (hasSaved) {
        setShowResumeBanner(true);
      }
    };
    initApp();
  }, [loadSettings, checkSavedSession]);

  const handleResumeSession = async () => {
    try {
      const activeState = await dbService.getActiveSessionState('active_indexing_state');
      if (activeState) {
        // Hydrate inputs
        setRawTokensText(activeState.rawTokensText || '');
        setRawUrlsText(activeState.rawUrlsText || '');
        if (activeState.urls) setUrls(activeState.urls);
        if (activeState.tokens) setTokens(activeState.tokens);
        
        // Populate stats & queue
        useIndexStore.setState({
          queue: activeState.queue || [],
          processedCount: activeState.processedCount || 0,
          successCount: activeState.successCount || 0,
          failedCount: activeState.failedCount || 0,
          totalUrlsToProcess: activeState.totalUrlsToProcess || 0,
          selectedBot: activeState.selectedBot || 'GoogleBot',
          activeTab: 'submit' // switch to submit view
        });

        addLog('success', 'Restored previous active indexing session successfully.');
      }
    } catch (e) {
      console.error(e);
      addLog('error', 'Failed to resume previous session state.');
    } finally {
      setShowResumeBanner(false);
    }
  };

  const handleDismissResume = async () => {
    await clearSavedSession();
    setShowResumeBanner(false);
  };

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard key="dashboard" />;
      case 'submit':
        return <Submit key="submit" />;
      case 'history':
        return <History key="history" />;
      default:
        return <Dashboard key="dashboard" />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans">
      
      {/* Persistent Left Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Global Floating Resume Alert Banner */}
        <AnimatePresence>
          {showResumeBanner && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="absolute top-22 left-8 right-8 z-50 bg-gradient-to-r from-amber-500/90 to-amber-600/90 backdrop-blur-md text-white px-5 py-4 rounded-2xl shadow-xl flex items-center justify-between gap-4 border border-amber-400/20"
              id="resume-banner-notification"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <AlertTriangle className="h-5 w-5 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">Unfinished Session Detected!</h4>
                  <p className="text-xs opacity-90 mt-0.5">
                    Your previous indexing workspace was saved. Would you like to restore your active queue and submission progress?
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  id="btn-resume-saved-session"
                  onClick={handleResumeSession}
                  className="px-4 py-2 bg-white text-amber-700 hover:bg-zinc-100 font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Resume Workspace</span>
                </button>
                <button
                  id="btn-dismiss-saved-session"
                  onClick={handleDismissResume}
                  className="p-1.5 hover:bg-white/10 rounded-lg cursor-pointer text-white/85 hover:text-white"
                  title="Dismiss and delete backup"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Header Controls bar */}
        <Header />

        {/* Active Route View Transition Workspace */}
        <main className="flex-1 flex flex-col min-h-0 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="h-full w-full flex flex-col"
            >
              {renderActivePage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
