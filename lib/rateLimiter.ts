/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const MAX_ATTEMPTS = 3;
const LOCK_DURATION_MS = 12 * 60 * 60 * 1000; // 12 jam

interface AttemptRecord {
  count: number;
  lockedUntil: number | null;
  firstAttemptAt: number;
}

// CATATAN: disimpan di memory (bukan database). Reset otomatis kalau function
// mengalami cold start / redeploy. Cukup untuk tahap awal — lihat Bagian 3.1
// kalau nanti mau upgrade ke penyimpanan yang lebih persist (Redis/Vercel KV).
const attemptsStore = new Map<string, AttemptRecord>();

export interface LockStatus {
  locked: boolean;
  unlockAt?: number;
}

export interface AttemptResult {
  locked: boolean;
  unlockAt?: number;
  remainingAttempts?: number;
}

export function getLockStatus(ip: string): LockStatus {
  const record = attemptsStore.get(ip);
  if (record?.lockedUntil && Date.now() < record.lockedUntil) {
    return { locked: true, unlockAt: record.lockedUntil };
  }
  return { locked: false };
}

export function registerFailedAttempt(ip: string): AttemptResult {
  const now = Date.now();
  let record = attemptsStore.get(ip);

  // reset kalau percobaan pertama sudah lebih dari 12 jam lalu (window kedaluwarsa)
  if (record && now - record.firstAttemptAt > LOCK_DURATION_MS) {
    record = undefined;
  }

  if (!record) {
    record = { count: 0, lockedUntil: null, firstAttemptAt: now };
  }

  record.count += 1;

  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCK_DURATION_MS;
    attemptsStore.set(ip, record);
    return { locked: true, unlockAt: record.lockedUntil };
  }

  attemptsStore.set(ip, record);
  return { locked: false, remainingAttempts: MAX_ATTEMPTS - record.count };
}

export function clearAttempts(ip: string): void {
  attemptsStore.delete(ip);
}
