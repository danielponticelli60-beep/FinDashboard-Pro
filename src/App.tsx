import React, { Suspense, lazy, useState } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Navbar } from './components/layout/Navbar';
import { GlobalFiltersBar } from './components/layout/GlobalFiltersBar';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Database, ShieldCheck } from 'lucide-react';
import type { ActivePage } from './types';
import { useVoiceCommandDeepLink } from './features/voice/useVoiceCommandDeepLink';

const DashboardView = lazy(() => import('./components/dashboard/DashboardView').then(m => ({ default: m.DashboardView })));
const TransactionsView = lazy(() => import('./components/transactions/TransactionsView').then(m => ({ default: m.TransactionsView })));
const AccountsView = lazy(() => import('./components/accounts/AccountsView').then(m => ({ default: m.AccountsView })));
const AllocationView = lazy(() => import('./components/allocation/AllocationView').then(m => ({ default: m.AllocationView })));
const WealthView = lazy(() => import('./components/wealth/WealthView').then(m => ({ default: m.WealthView })));
const GoalsView = lazy(() => import('./components/goals/GoalsView').then(m => ({ default: m.GoalsView })));
const QuarterlyView = lazy(() => import('./components/quarterly/QuarterlyView').then(m => ({ default: m.QuarterlyView })));
const AnnualView = lazy(() => import('./components/annual/AnnualView').then(m => ({ default: m.AnnualView })));
const SettingsView = lazy(() => import('./components/settings/SettingsView').then(m => ({ default: m.SettingsView })));

const TransactionModal = lazy(() => import('./components/transactions/TransactionModal').then(m => ({ default: m.TransactionModal })));
const AccountConfigModal = lazy(() => import('./components/accounts/AccountConfigModal').then(m => ({ default: m.AccountConfigModal })));
const ExcelImportModal = lazy(() => import('./components/import/ExcelImportModal').then(m => ({ default: m.ExcelImportModal })));
const BackupModal = lazy(() => import('./components/backup/BackupModal').then(m => ({ default: m.BackupModal })));
const DataDiagnosticsModal = lazy(() => import('./components/diagnostics/DataDiagnosticsModal').then(m => ({ default: m.DataDiagnosticsModal })));
const ResetPersonalDataModal = lazy(() => import('./components/diagnostics/ResetPersonalDataModal').then(m => ({ default: m.ResetPersonalDataModal })));
const TypeMigrationModal = lazy(() => import('./components/transactions/TypeMigrationModal').then(m => ({ default: m.TypeMigrationModal })));
const CategoryMigrationModal = lazy(() => import('./components/categories/CategoryMigrationModal').then(m => ({ default: m.CategoryMigrationModal })));
const VoiceCommandReviewModal = lazy(() => import('./features/voice/VoiceCommandReviewModal').then(m => ({ default: m.VoiceCommandReviewModal })));

const PAGE_LABELS: Record<ActivePage, string> = {
  dashboard: 'Dashboard',
  transactions: 'Transazioni',
  accounts: 'Conti',
  allocation: 'Allocazione',
  wealth: 'Patrimonio',
  goals: 'Obiettivi',
  quarterly: 'Trimestrale',
  annual: 'Annuale',
  settings: 'Impostazioni',
};

const ViewLoadingFallback: React.FC = () => (
  <div className="w-full py-24 flex items-center justify-center text-slate-500 text-sm">
    Caricamento...
  </div>
);

const MainContent: React.FC = () => {
  const { activePage } = useFinance();

  return (
    <main className="w-full max-w-[1700px] mx-auto px-4 lg:px-8 py-5">
      <ErrorBoundary fallbackLabel={PAGE_LABELS[activePage]}>
        <Suspense fallback={<ViewLoadingFallback />}>
          {activePage === 'dashboard' && <DashboardView />}
          {activePage === 'transactions' && <TransactionsView />}
          {activePage === 'accounts' && <AccountsView />}
          {activePage === 'allocation' && <AllocationView />}
          {activePage === 'wealth' && <WealthView />}
          {activePage === 'goals' && <GoalsView />}
          {activePage === 'quarterly' && <QuarterlyView />}
          {activePage === 'annual' && <AnnualView />}
          {activePage === 'settings' && <SettingsView />}
        </Suspense>
      </ErrorBoundary>
    </main>
  );
};

export default function App() {
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const { pendingCommandText, clearPendingCommand } = useVoiceCommandDeepLink();

  return (
    <FinanceProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
        
        {/* Navigation Bar */}
        <Navbar />

        {/* Global Filter Toolbar */}
        <GlobalFiltersBar />

        {/* Dynamic Main Workspace */}
        <div className="flex-1">
          <MainContent />
        </div>

        <ErrorBoundary fallbackLabel="Finestra modale">
          <Suspense fallback={null}>
            {/* Global Transaction Modal */}
            <TransactionModal />

            {/* Account Initial Balance Config Modal */}
            <AccountConfigModal />

            {/* Excel Import Modal */}
            <ExcelImportModal />

            {/* Data Diagnostics Modal */}
            <DataDiagnosticsModal />

            {/* Reset Personal Data Modal (Double Confirmation) */}
            <ResetPersonalDataModal />

            {/* Type Reconstruction Modal (Deterministic Sign Migration) */}
            <TypeMigrationModal />

            {/* Canonical Category System & Integrity Migration Modal */}
            <CategoryMigrationModal />

            {/* Backup & Restore Modal */}
            <BackupModal
              isOpen={isBackupModalOpen}
              onClose={() => setIsBackupModalOpen(false)}
            />

            {/* Voice Command Review Modal - only rendered when a deep-link
                command is pending; never saves without explicit confirmation */}
            {pendingCommandText && (
              <VoiceCommandReviewModal rawText={pendingCommandText} onClose={clearPendingCommand} />
            )}
          </Suspense>
        </ErrorBoundary>

        {/* Minimal Footer */}
        <footer className="w-full border-t border-slate-800 bg-slate-950 px-4 lg:px-8 py-3 text-center text-xs text-slate-400">
          <div className="max-w-[1700px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-300">FinDashboard Pro &copy; 2026</span>
              <span>•</span>
              <span className="text-slate-400">Gestione Finanze & Patrimonio Personale</span>
            </div>
            
            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <button
                onClick={() => setIsBackupModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-800 transition cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Gestione Backup & CSV</span>
              </button>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Archiviazione Locale Riservata (100% Client-Side)</span>
              </span>
            </div>
          </div>
        </footer>

      </div>
    </FinanceProvider>
  );
}
