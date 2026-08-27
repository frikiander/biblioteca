import React, { useState } from 'react';
import { 
  BookMarked, 
  RotateCcw, 
  History, 
  BookOpen, 
  Sparkles, 
  Layers, 
  Library,
  ArrowRight
} from 'lucide-react';
import { CheckoutTab } from './CheckoutTab';
import { CheckinTab } from './CheckinTab';
import { LoanHistoryTraceability } from './LoanHistoryTraceability';
import type { Loan } from '../../types/database';
import { getStoredLoans } from '../../lib/loans';

interface LoansHubProps {
  initialTab?: 'checkout' | 'checkin' | 'history';
  initialMarbeteCode?: string;
  onDataChange?: () => void;
}

export const LoansHub: React.FC<LoansHubProps> = ({
  initialTab = 'checkout',
  initialMarbeteCode = '',
  onDataChange,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'checkout' | 'checkin' | 'history'>(initialTab);
  const [prefilledCheckinCode, setPrefilledCheckinCode] = useState<string>(initialMarbeteCode);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const loans = getStoredLoans();
  const activeLoansCount = loans.filter((l) => l.status === 'active' || l.status === 'overdue').length;

  const handleLoanCreated = (newLoan: Loan) => {
    setRefreshTrigger((prev) => prev + 1);
    if (onDataChange) onDataChange();
  };

  const handleLoanReturned = (returnedLoan: Loan) => {
    setRefreshTrigger((prev) => prev + 1);
    if (onDataChange) onDataChange();
  };

  const handleNavigateToCheckin = (marbeteCode: string) => {
    setPrefilledCheckinCode(marbeteCode);
    setActiveSubTab('checkin');
  };

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Bar for Loans */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto p-1">
          <button
            id="tab-loan-checkout"
            onClick={() => setActiveSubTab('checkout')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'checkout'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BookMarked className="w-4 h-4" />
            <span>Prestar Libro (Checkout)</span>
          </button>

          <button
            id="tab-loan-checkin"
            onClick={() => setActiveSubTab('checkin')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'checkin'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Devolver Libro (Check-in)</span>
            {activeLoansCount > 0 && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeSubTab === 'checkin'
                    ? 'bg-emerald-950 text-emerald-200'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {activeLoansCount} activo{activeLoansCount === 1 ? '' : 's'}
              </span>
            )}
          </button>

          <button
            id="tab-loan-history"
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'history'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Historial y Trazabilidad</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 pr-3 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
          <span>Validación instantánea por código de marbete</span>
        </div>
      </div>

      {/* Main Tab Panels */}
      {activeSubTab === 'checkout' && (
        <div className="max-w-4xl mx-auto">
          <CheckoutTab
            onLoanCreated={handleLoanCreated}
            onNavigateToCheckin={handleNavigateToCheckin}
          />
        </div>
      )}

      {activeSubTab === 'checkin' && (
        <div className="max-w-4xl mx-auto">
          <CheckinTab
            initialCode={prefilledCheckinCode}
            onLoanReturned={handleLoanReturned}
            onNavigateToCheckout={() => setActiveSubTab('checkout')}
          />
        </div>
      )}

      {activeSubTab === 'history' && (
        <LoanHistoryTraceability
          refreshTrigger={refreshTrigger}
          onSelectCheckinCode={handleNavigateToCheckin}
        />
      )}
    </div>
  );
};
