/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifySessionToken, getServerTokensFromEnv } from '../lib/authCore.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const authHeader = String(req.headers['authorization'] || '');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const sessionSecret = process.env.AUTH_SESSION_SECRET;

  if (!sessionSecret || !verifySessionToken(token, sessionSecret)) {
    return res.status(401).json({
      success: false,
      error: 'Sesi tidak valid atau sudah kedaluwarsa. Silakan masukkan password lagi.',
    });
  }

  const tokens = getServerTokensFromEnv();
  return res.status(200).json({ success: true, tokens });
}
