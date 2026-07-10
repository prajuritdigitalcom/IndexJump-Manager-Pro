/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Info, 
  ShieldCheck, 
  Layers, 
  Github, 
  Globe, 
  Code, 
  Heart,
  ExternalLink,
  Cpu
} from 'lucide-react';

export default function About() {
  return (
    <div className="flex-1 overflow-y-auto max-h-[calc(100vh-5rem)] p-8" id="about-tab">
      
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Soft Modern Banner */}
        <div className="text-center space-y-4 py-8">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-tr from-[#fe4c6f] to-[#e83b61] flex items-center justify-center shadow-lg shadow-[#fe4c6f]/20">
            <Layers className="h-8 w-8 text-white animate-pulse" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
              IndexJump Manager Pro
            </h2>
            <span className="text-xs font-mono font-bold text-[#fe4c6f] tracking-widest uppercase">
              Version 1.0.0 Stable Build
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
            A premium client-side desktop manager designed to automate batch URL and backlink submissions to indexing crawlers via distributed parallel workers.
          </p>
        </div>

        {/* Info Grid */}
        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <Info className="h-4.5 w-4.5 text-[#fe4c6f]" />
            <span>Product Information</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs border-t border-zinc-100 dark:border-zinc-900 pt-4">
            <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-900 rounded-xl">
              <span className="text-zinc-400 font-medium block mb-0.5">Developer / Brand</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200">Prajurit Digital</span>
            </div>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-900 rounded-xl">
              <span className="text-zinc-400 font-medium block mb-0.5">Framework</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200">React 19 + TypeScript + Vite</span>
            </div>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-900 rounded-xl">
              <span className="text-zinc-400 font-medium block mb-0.5">License type</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200">MIT License</span>
            </div>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-900 rounded-xl">
              <span className="text-zinc-400 font-medium block mb-0.5">Runtime Architecture</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200">CORS-free Express API Proxy</span>
            </div>
          </div>
        </div>

        {/* Future Architecture Modules */}
        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <Cpu className="h-4.5 w-4.5 text-[#fe4c6f]" />
            <span>Future-Ready Indexing Architecture</span>
          </span>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            IndexJump Manager Pro was architected with modular service channels. This clean design makes it extremely simple to plug in third-party SEO indexing API providers in the future without altering UI cores:
          </p>

          <div className="space-y-2 font-mono text-[10px] text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-900">
            <div className="flex items-center gap-2 text-[#fe4c6f]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#fe4c6f]" />
              <span>[SUPPORTED] IndexJump Core Service</span>
            </div>
            <div className="flex items-center gap-2 opacity-60">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
              <span>[MODULAR] Google Indexing API</span>
            </div>
            <div className="flex items-center gap-2 opacity-60">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
              <span>[MODULAR] IndexNow (Bing/Yandex)</span>
            </div>
            <div className="flex items-center gap-2 opacity-60">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
              <span>[MODULAR] Rapid URL Indexer</span>
            </div>
            <div className="flex items-center gap-2 opacity-60">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
              <span>[MODULAR] Omega Indexer</span>
            </div>
          </div>
        </div>

        {/* Privacy & Security guarantee */}
        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-3">
          <div className="flex items-center gap-2 text-emerald-500">
            <ShieldCheck className="h-5 w-5" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Absolute Local Privacy Guarantee</h4>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Your IndexJump API Keys are exceptionally sensitive credentials. This application executes entirely inside your client browser environment. It does not possess, save, or transmit your API keys to any third-party clouds or background trackers. The server-side code acts purely as a passthrough proxy to resolve browser CORS limitations.
          </p>
        </div>

        {/* Footer Brand Credit */}
        <div className="text-center space-y-1 text-xs text-zinc-400 dark:text-zinc-500">
          <span className="flex items-center justify-center gap-1 font-semibold">
            <span>Made with</span>
            <Heart className="h-3.5 w-3.5 text-[#fe4c6f] fill-[#fe4c6f]" />
            <span>by</span>
            <span className="text-zinc-800 dark:text-zinc-200 font-bold hover:text-[#fe4c6f] transition-colors cursor-pointer">
              Prajurit Digital
            </span>
          </span>
          <p className="text-[10px] font-mono font-light text-zinc-400">
            Copyright © {new Date().getFullYear()} Prajurit Digital. All Rights Reserved.
          </p>
        </div>

      </div>

    </div>
  );
}
