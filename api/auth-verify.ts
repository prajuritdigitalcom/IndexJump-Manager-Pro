/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { safeCompare, createSessionToken, getClientIp } from '../lib/authCore';
import { getLockStatus, registerFailedAttempt, clearAttempts } from '../lib/rateLimiter';

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // sesi login berlaku 8 jam (independen dari lockout 12 jam)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const { password } = req.body || {};

  // 1. Cek apakah IP ini sedang dikunci
  const lockStatus = getLockStatus(ip);
  if (lockStatus.locked) {
    return res.status(429).json({
      success: false,
      locked: true,
      unlockAt: lockStatus.unlockAt,
      error: 'Terlalu banyak percobaan gagal. Coba lagi setelah masa kunci berakhir.',
    });
  }

  const correctPassword = process.env.PASSWORD;
  const sessionSecret = process.env.AUTH_SESSION_SECRET;

  if (!correctPassword || !sessionSecret) {
    console.error('[auth-verify] PASSWORD atau AUTH_SESSION_SECRET belum diset di Environment Variables');
    return res.status(500).json({ success: false, error: 'Server belum dikonfigurasi. Hubungi admin.' });
  }

  // 2. Verifikasi password
  if (!password || typeof password !== 'string' || !safeCompare(password, correctPassword)) {
    const result = registerFailedAttempt(ip);
    return res.status(401).json({
      success: false,
      locked: result.locked,
      unlockAt: result.unlockAt,
      remainingAttempts: result.remainingAttempts,
      error: result.locked
        ? 'Password salah. Percobaan habis — akses dikunci selama 12 jam.'
        : `Password salah. Sisa percobaan: ${result.remainingAttempts}.`,
    });
  }

  // 3. Password benar → reset counter & terbitkan session token
  clearAttempts(ip);
  const sessionToken = createSessionToken(sessionSecret, SESSION_TTL_MS);

  return res.status(200).json({
    success: true,
    sessionToken,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
}
