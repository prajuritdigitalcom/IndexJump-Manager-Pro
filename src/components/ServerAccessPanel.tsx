/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { useIndexStore } from '../store';
import { Lock, Unlock, ShieldCheck, LoaderCircle, KeyRound } from 'lucide-react';

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0j 0m';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}j ${minutes}m`;
}

interface Props {
  collapsed: boolean;
  onRequestExpand: () => void;
}

export default function ServerAccessPanel({ collapsed, onRequestExpand }: Props) {
  const {
    isServerUnlocked,
    isVerifyingPassword,
    authError,
    remainingAttempts,
    lockedUntil,
    serverTokens,
    verifyServerPassword,
    lockServerSession,
  } = useIndexStore();

  const [passwordInput, setPasswordInput] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [now, setNow] = React.useState(Date.now());

  // Update countdown tiap detik saat sedang terkunci
  React.useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const isLockedOut = !!lockedUntil && now < lockedUntil;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput || isVerifyingPassword || isLockedOut) return;
    const pwd = passwordInput;
    setPasswordInput(''); // hapus dari state secepat mungkin, jangan berlama-lama di memory
    await verifyServerPassword(pwd);
  };

  // Mode: Sidebar collapsed → tampilkan ikon saja
  if (collapsed) {
    return (
      <button
        id="server-access-collapsed-toggle"
        onClick={onRequestExpand}
        className={`h-9 w-9 rounded-lg flex items-center justify-center self-center border transition-colors cursor-pointer ${
          isServerUnlocked
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white'
        }`}
        title={isServerUnlocked ? 'Server Tokens Aktif' : 'Buka Akses Server Tokens'}
      >
        {isServerUnlocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
      </button>
    );
  }

  // Mode: sudah unlocked
  if (isServerUnlocked) {
    return (
      <div
        id="server-access-panel-unlocked"
        className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 flex flex-col gap-2"
      >
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Server Tokens Aktif</span>
        </div>
        <span className="text-[10px] text-zinc-400 font-mono">
          {serverTokens.length} token termuat dari Vercel
        </span>
        <button
          id="btn-lock-server-session"
          onClick={lockServerSession}
          className="text-[10px] text-zinc-400 hover:text-rose-400 flex items-center gap-1 mt-1 cursor-pointer"
        >
          <Lock className="h-3 w-3" />
          <span>Kunci kembali</span>
        </button>
      </div>
    );
  }

  // Mode: sedang terkunci akibat 3x gagal
  if (isLockedOut) {
    return (
      <div
        id="server-access-panel-lockedout"
        className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3 flex flex-col gap-1"
      >
        <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
          <Lock className="h-3.5 w-3.5" />
          <span>Terkunci</span>
        </div>
        <span className="text-[10px] text-zinc-400">
          Terlalu banyak percobaan gagal. Coba lagi dalam{' '}
          <span className="font-mono text-rose-300">{formatCountdown(lockedUntil! - now)}</span>
        </span>
      </div>
    );
  }

  // Mode default: form input password
  return (
    <form
      id="server-access-panel-form"
      onSubmit={handleSubmit}
      className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2"
    >
      <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold">
        <KeyRound className="h-3.5 w-3.5" />
        <span>Akses Server Tokens</span>
      </div>
      <div className="relative">
        <input
          id="server-access-password-input"
          type={showPassword ? 'text' : 'password'}
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          placeholder="Masukkan password..."
          autoComplete="off"
          className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 pr-9 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#fe4c6f]/50"
        />
        <button
          type="button"
          id="btn-toggle-password-visibility"
          onClick={() => setShowPassword((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 hover:text-zinc-300 cursor-pointer"
        >
          {showPassword ? 'Sembunyikan' : 'Lihat'}
        </button>
      </div>

      {authError && <span className="text-[10px] text-rose-400">{authError}</span>}
      {remainingAttempts !== null && !authError?.includes('terkunci') && (
        <span className="text-[10px] text-amber-400">Sisa percobaan: {remainingAttempts}</span>
      )}

      <button
        id="btn-submit-server-password"
        type="submit"
        disabled={isVerifyingPassword || !passwordInput}
        className="w-full rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 text-xs font-semibold py-2 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
      >
        {isVerifyingPassword ? (
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Unlock className="h-3.5 w-3.5" />
        )}
        <span>{isVerifyingPassword ? 'Memverifikasi...' : 'Buka Akses'}</span>
      </button>
    </form>
  );
}
