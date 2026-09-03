import { Building2, CreditCard, Coins, PiggyBank, TrendingUp, Wallet, LucideIcon } from 'lucide-react';
import { AccountKind } from '../types';

export interface AccountKindMeta {
  label: string;
  icon: LucideIcon;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  accentText: string;
  cardBorder: string;
}

// Tailwind's JIT scanner needs literal class strings present in source, so
// these are spelled out per kind rather than composed at runtime from a
// color token (e.g. `bg-${color}-500/15` would silently produce no CSS).
export const ACCOUNT_KIND_META: Record<AccountKind, AccountKindMeta> = {
  checking: {
    label: 'Conto Corrente',
    icon: Building2,
    badgeBg: 'bg-cyan-500/15',
    badgeText: 'text-cyan-300',
    badgeBorder: 'border-cyan-500/30',
    accentText: 'text-cyan-300',
    cardBorder: 'border-cyan-500/40',
  },
  credit_card: {
    label: 'Carta di Credito',
    icon: CreditCard,
    badgeBg: 'bg-rose-500/15',
    badgeText: 'text-rose-300',
    badgeBorder: 'border-rose-500/30',
    accentText: 'text-rose-300',
    cardBorder: 'border-rose-500/40',
  },
  prepaid_card: {
    label: 'Carta Prepagata',
    icon: CreditCard,
    badgeBg: 'bg-pink-500/15',
    badgeText: 'text-pink-300',
    badgeBorder: 'border-pink-500/30',
    accentText: 'text-pink-300',
    cardBorder: 'border-pink-500/40',
  },
  cash: {
    label: 'Contanti',
    icon: Coins,
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-500/30',
    accentText: 'text-amber-300',
    cardBorder: 'border-amber-500/40',
  },
  savings: {
    label: 'Risparmio',
    icon: PiggyBank,
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/30',
    accentText: 'text-emerald-300',
    cardBorder: 'border-emerald-500/40',
  },
  investment: {
    label: 'Investimenti',
    icon: TrendingUp,
    badgeBg: 'bg-violet-500/15',
    badgeText: 'text-violet-300',
    badgeBorder: 'border-violet-500/30',
    accentText: 'text-violet-300',
    cardBorder: 'border-violet-500/40',
  },
  other: {
    label: 'Altro',
    icon: Wallet,
    badgeBg: 'bg-slate-500/15',
    badgeText: 'text-slate-300',
    badgeBorder: 'border-slate-500/30',
    accentText: 'text-slate-300',
    cardBorder: 'border-slate-500/40',
  },
};
