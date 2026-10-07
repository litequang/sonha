import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * Formats a number to Vietnamese Dong string: e.g. 150.000đ or -150.000đ
 * If forcePlusSign is true, positive amounts get a leading '+': e.g. +150.000đ
 */
export function formatVND(amount: number, forcePlusSign: boolean = false): string {
  const rounded = Math.round(amount || 0);
  const absAmount = Math.abs(rounded);
  const formatted = new Intl.NumberFormat('vi-VN').format(absAmount) + 'đ';
  
  if (rounded < 0) {
    return `-${formatted}`;
  }
  if (forcePlusSign && rounded > 0) {
    return `+${formatted}`;
  }
  return formatted;
}

/**
 * Formats a number compactly: e.g. 1.5 tr, 250 k, -1.5 tr
 */
export function formatCompactVND(amount: number): string {
  const rounded = Math.round(amount || 0);
  const abs = Math.abs(rounded);
  const sign = rounded < 0 ? '-' : '';
  if (abs >= 1_000_000_000) {
    return sign + (abs / 1_000_000_000).toFixed(1).replace('.0', '') + ' tỷ';
  }
  if (abs >= 1_000_000) {
    return sign + (abs / 1_000_000).toFixed(1).replace('.0', '') + ' tr';
  }
  if (abs >= 1_000) {
    return sign + (abs / 1_000).toFixed(0) + ' k';
  }
  return formatVND(amount);
}

/**
 * Formats a date string (YYYY-MM-DD or ISO) into friendly Vietnamese format
 */
export function formatFriendlyDate(dateStr: string): string {
  try {
    const date = typeof dateStr === 'string' && dateStr.length === 10
      ? parseISO(dateStr + 'T00:00:00')
      : new Date(dateStr);

    if (isToday(date)) {
      return 'Hôm nay';
    }
    if (isYesterday(date)) {
      return 'Hôm qua';
    }
    return format(date, 'EEEE, dd/MM/yyyy', { locale: vi });
  } catch {
    return dateStr;
  }
}

/**
 * Formats month YYYY-MM into "Tháng MM / YYYY"
 */
export function formatMonthYear(monthStr: string): string {
  try {
    const [year, month] = monthStr.split('-');
    return `Tháng ${parseInt(month, 10)} / ${year}`;
  } catch {
    return monthStr;
  }
}

/**
 * Formats month YYYY-MM into compact "T.MM/YYYY" e.g. "T.10/2026"
 */
export function formatShortMonthYear(monthStr: string): string {
  try {
    const [year, month] = monthStr.split('-');
    return `T${parseInt(month, 10)}/${year}`;
  } catch {
    return monthStr;
  }
}

/**
 * Gets current month in YYYY-MM
 */
export function getCurrentMonthStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Gets today in YYYY-MM-DD
 */
export function getTodayStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates previous month string in YYYY-MM
 */
export function getPreviousMonthStr(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  if (month === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(month - 1).padStart(2, '0')}`;
}

/**
 * Calculates next month string in YYYY-MM
 */
export function getNextMonthStr(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  if (month === 12) {
    return `${year + 1}-01`;
  }
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/**
 * Generates a crypto-secure token (for household invites)
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
