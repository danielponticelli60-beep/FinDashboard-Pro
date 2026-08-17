import { Category, TransactionType } from '../types';
import { getCategoryColor as getCatColorFromManager, BASE_CATEGORIES } from './categoryManager';

export const formatCurrency = (amount: number, includeDecimals = true): string => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(amount);
};

export const formatPercent = (value: number, decimals = 1): string => {
  return new Intl.NumberFormat('it-IT', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
};

export const formatDateItalian = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

export const formatDateShort = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
  }).format(date);
};

export const MONTH_NAMES_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

export const MONTH_SHORT_IT = [
  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
];

export const QUARTERS_IT = [
  { id: 'Q1', name: 'Q1 (Gen-Mar)', months: [1, 2, 3] },
  { id: 'Q2', name: 'Q2 (Apr-Giu)', months: [4, 5, 6] },
  { id: 'Q3', name: 'Q3 (Lug-Set)', months: [7, 8, 9] },
  { id: 'Q4', name: 'Q4 (Ott-Dic)', months: [10, 11, 12] },
];

export const CATEGORY_COLORS: Record<string, string> = Object.fromEntries(
  BASE_CATEGORIES.map(c => [c.label, c.color])
);

export const getCategoryColor = (category: string): string => {
  return getCatColorFromManager(category);
};

export const getAccountBadgeColor = (account: string): { bg: string; text: string; border: string } => {
  switch (account) {
    case 'Conto Principale':
      return { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/30' };
    case 'Carta di Credito':
      return { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/30' };
    case 'Conto Risparmio':
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' };
    case 'Portafoglio Investimenti':
      return { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' };
    case 'Contanti':
      return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' };
    default:
      return { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' };
  }
};

export const getTypeBadgeConfig = (type: TransactionType): {
  label: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
  sign: string;
  badgeClass: string;
} => {
  switch (type) {
    case 'income':
      return {
        label: 'Entrata',
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-300',
        border: 'border-emerald-500/30',
        dot: 'bg-emerald-400',
        sign: '+',
        badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      };
    case 'expense':
      return {
        label: 'Uscita',
        bg: 'bg-rose-500/15',
        text: 'text-rose-300',
        border: 'border-rose-500/30',
        dot: 'bg-rose-400',
        sign: '-',
        badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      };
    case 'to_verify':
      return {
        label: 'Da verificare',
        bg: 'bg-amber-500/15',
        text: 'text-amber-300',
        border: 'border-amber-500/30',
        dot: 'bg-amber-400',
        sign: '?',
        badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      };
    case 'transfer':
      return {
        label: 'Giroconto',
        bg: 'bg-sky-500/15',
        text: 'text-sky-300',
        border: 'border-sky-500/30',
        dot: 'bg-sky-400',
        sign: '⇄',
        badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
      };
    default:
      return {
        label: 'Da verificare',
        bg: 'bg-amber-500/15',
        text: 'text-amber-300',
        border: 'border-amber-500/30',
        dot: 'bg-amber-400',
        sign: '?',
        badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      };
  }
};

