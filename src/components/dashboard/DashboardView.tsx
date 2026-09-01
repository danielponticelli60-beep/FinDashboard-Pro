import React from 'react';
import { CompactMainAccountCard } from './CompactMainAccountCard';
import { KPICards } from './KPICards';
import { IncomeExpenseChart } from './IncomeExpenseChart';
import { CategoryExpenseChart } from './CategoryExpenseChart';
import { BudgetVsActualChart } from './BudgetVsActualChart';
import { CumulativeBalanceChart } from './CumulativeBalanceChart';
import { DailyActivityHeatmap } from './DailyActivityHeatmap';
import { TopCategoriesCard } from './TopCategoriesCard';
import { RecentTransactionsCard } from './RecentTransactionsCard';

export const DashboardView: React.FC = () => {
  return (
    <div className="space-y-4 w-full">
      
      {/* 1. Compact Main Account Card */}
      <CompactMainAccountCard />

      {/* 2. Top KPI Cards Row (Totale globale) */}
      <KPICards />

      {/* 3. Primary Charts Grid Row (Income vs Expense + Category Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full">
        <div className="lg:col-span-7">
          <IncomeExpenseChart />
        </div>
        <div className="lg:col-span-5">
          <CategoryExpenseChart />
        </div>
      </div>

      {/* 4. Mid Grid Row (Daily Activity Heatmap + Top Categories) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full">
        <div className="lg:col-span-8">
          <DailyActivityHeatmap />
        </div>
        <div className="lg:col-span-4">
          <TopCategoriesCard />
        </div>
      </div>

      {/* 5. Lower Grid Row (Budget vs Actual + Cumulative Balance) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full">
        <div className="lg:col-span-6">
          <BudgetVsActualChart />
        </div>
        <div className="lg:col-span-6">
          <CumulativeBalanceChart />
        </div>
      </div>

      {/* 6. Bottom Row: Recent Transactions */}
      <div className="w-full">
        <RecentTransactionsCard />
      </div>

    </div>
  );
};

