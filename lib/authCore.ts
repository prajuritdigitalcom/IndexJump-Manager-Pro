/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import crypto from 'crypto';

/** Perbandingan string tahan-timing-attack. Jangan pernah pakai `===` untuk password. */
export function safeCompare(input: string, secret: string): boolean {
  const inputBuf = Buffer.from(String(input ?? ''));
  const secretBuf = Buffer.from(String(secret ?? ''));
  if (inputBuf.length !== secretBuf.length) {
    // tetap jalankan timingSafeEqual dummy supaya waktu eksekusi konsisten
    crypto.timingSafeEqual(secretBuf, secretBuf);
    return false;
  }
  return crypto.timingSafeEqual(inputBuf, secretBuf);
}

interface SessionPayload {
  exp: number;
}

/** Buat session token ber-tanda-tangan HMAC (stateless, tidak perlu DB untuk validasinya). */
export function createSessionToken(secret: string, ttlMs: number): string {
  const payload: SessionPayload = { exp: Date.now() + ttlMs };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

/** Verifikasi session token: cek tanda tangan valid & belum kedaluwarsa. */
export function verifySessionToken(token: string | undefined | null, secret: string): boolean {
  if (!token || typeof token !== 'string' || !token.includes('.')) return false;
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return false;

  const expectedSig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }

  try {
    const payload: SessionPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    return typeof payload.exp === 'number' && Date.now() < payload.exp;
  } catch {
    return false;
  }
}

/** Ambil IP client, kompatibel Vercel (x-forwarded-for) maupun Express dev server. */
export function getClientIp(req: { headers: Record<string, any>; socket?: { remoteAddress?: string } }): string {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

/** Parse INDEX_JUMP_TOKENS, SERVER_TOKENS, atau TOKENS (dipisah baris baru atau koma). */
export function getServerTokensFromEnv(): string[] {
  const raw = process.env.INDEX_JUMP_TOKENS || process.env.SERVER_TOKENS || process.env.TOKENS || '';
  return raw
    .split(/\r?\n|,/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}
