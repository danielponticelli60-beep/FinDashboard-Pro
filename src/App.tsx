import React, { useState } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Navbar } from './components/layout/Navbar';
import { GlobalFiltersBar } from './components/layout/GlobalFiltersBar';
import { DashboardView } from './components/dashboard/DashboardView';
import { TransactionsView } from './components/transactions/TransactionsView';
import { AccountsView } from './components/accounts/AccountsView';
import { AllocationView } from './components/allocation/AllocationView';
import { WealthView } from './components/wealth/WealthView';
import { GoalsView } from './components/goals/GoalsView';
import { QuarterlyView } from './components/quarterly/QuarterlyView';
import { AnnualView } from './components/annual/AnnualView';
import { SettingsView } from './components/settings/SettingsView';
import { TransactionModal } from './components/transactions/TransactionModal';
import { AccountConfigModal } from './components/accounts/AccountConfigModal';
import { ExcelImportModal } from './components/import/ExcelImportModal';
import { BackupModal } from './components/backup/BackupModal';
import { DataDiagnosticsModal } from './components/diagnostics/DataDiagnosticsModal';
import { ResetPersonalDataModal } from './components/diagnostics/ResetPersonalDataModal';
import { TypeMigrationModal } from './components/transactions/TypeMigrationModal';
import { CategoryMigrationModal } from './components/categories/CategoryMigrationModal';
import { Database, ShieldCheck } from 'lucide-react';

const MainContent: React.FC = () => {
  const { activePage } = useFinance();

  return (
    <main className="w-full max-w-[1700px] mx-auto px-4 lg:px-8 py-5">
      {activePage === 'dashboard' && <DashboardView />}
      {activePage === 'transactions' && <TransactionsView />}
      {activePage === 'accounts' && <AccountsView />}
      {activePage === 'allocation' && <AllocationView />}
      {activePage === 'wealth' && <WealthView />}
      {activePage === 'goals' && <GoalsView />}
      {activePage === 'quarterly' && <QuarterlyView />}
      {activePage === 'annual' && <AnnualView />}
      {activePage === 'settings' && <SettingsView />}
    </main>
  );
};

export default function App() {
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

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
