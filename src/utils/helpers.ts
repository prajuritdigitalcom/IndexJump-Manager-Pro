/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Simple robust regex for URL validation
export function validateUrl(url: string): boolean {
  try {
    const trimmed = url.trim();
    if (!trimmed) return false;
    // Basic structural check
    new URL(trimmed);
    return true;
  } catch (_) {
    return false;
  }
}

export function removeDuplicate<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function shuffleArray<T>(arr: T[]): T[] {
  const newArr = [...arr];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export function estimateTime(
  urlCount: number,
  workerCount: number,
  delayString: 'random' | '100ms' | '300ms' | '500ms' | '1000ms'
): number {
  if (urlCount <= 0 || workerCount <= 0) return 0;
  
  // Resolve delay in ms
  let delayMs = 200; // default average
  if (delayString === '100ms') delayMs = 100;
  else if (delayString === '300ms') delayMs = 300;
  else if (delayString === '500ms') delayMs = 500;
  else if (delayString === '1000ms') delayMs = 1000;
  else if (delayString === 'random') delayMs = 500; // estimated random average

  // Estimate seconds: (URL count * typical network duration + delay) / active workers
  const networkDurationMs = 400; // typical time per request
  const totalMs = urlCount * (networkDurationMs + delayMs);
  return Math.ceil(totalMs / workerCount / 1000);
}

export function csvExport(headers: string[], rows: string[][], filename: string): void {
  const content = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function txtExport(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function copyClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  } else {
    // Fallback
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return Promise.resolve(success);
    } catch (_) {
      return Promise.resolve(false);
    }
  }
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(d);
  } catch (_) {
    return dateStr;
  }
}

// Minimalist CSV parser for user convenience when uploading URLs
export function parseCSV(text: string): string[] {
  const urls: string[] = [];
  const lines = text.split(/\r?\n/);
  
  for (const line of lines) {
    if (!line.trim()) continue;
    // Simple splitting by commas, taking first item if it looks like a URL
    const cells = line.split(',');
    for (const cell of cells) {
      const cleaned = cell.replace(/^["']|["']$/g, '').trim();
      if (validateUrl(cleaned)) {
        urls.push(cleaned);
      } else if (cleaned.includes('.') && !cleaned.includes(' ') && cleaned.length > 4) {
        // Fallback guess for URL without protocol
        const withProtocol = cleaned.startsWith('http') ? cleaned : `https://${cleaned}`;
        if (validateUrl(withProtocol)) {
          urls.push(withProtocol);
        }
      }
    }
  }
  return urls;
}
