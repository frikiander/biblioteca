import React, { useState, useEffect } from 'react';
import { 
  BookMarked, 
  RotateCcw, 
  History, 
  BookOpen, 
  Sparkles, 
  Layers, 
  Library,
  ArrowRight,
  Bookmark,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { CheckoutTab } from './CheckoutTab';
import { CheckinTab } from './CheckinTab';
import { LoanHistoryTraceability } from './LoanHistoryTraceability';
import { HoldsTab } from './HoldsTab';
import type { Loan } from '../../types/database';
import { getStoredLoans } from '../../lib/loans';
import { getStoredHolds } from '../../lib/holds';
import { getOfflineQueue, processOfflineQueue } from '../../lib/offlineCirc';

interface LoansHubProps {
  initialTab?: 'checkout' | 'checkin' | 'holds' | 'history';
  initialMarbeteCode?: string;
  onDataChange?: () => void;
}

export const LoansHub: React.FC<LoansHubProps> = ({
  initialTab = 'checkout',
  initialMarbeteCode = '',
  onDataChange,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'checkout' | 'checkin' | 'holds' | 'history'>(initialTab);
  const [prefilledCheckinCode, setPrefilledCheckinCode] = useState<string>(initialMarbeteCode);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [offlineCount, setOfflineCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setOfflineCount(getOfflineQueue().length);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshTrigger]);

  const loans = getStoredLoans();
  const activeLoansCount = loans.filter((l) => l.status === 'active' || l.status === 'overdue').length;
  
  const holds = getStoredHolds();
  const activeHoldsCount = holds.filter((h) => h.status === 'waiting' || h.status === 'ready_for_pickup').length;

  const handleSyncOffline = async () => {
    setIsSyncing(true);
    await processOfflineQueue();
    setOfflineCount(getOfflineQueue().length);
    setIsSyncing(false);
    setRefreshTrigger((prev) => prev + 1);
    if (onDataChange) onDataChange();
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-2.5 rounded-2xl border border-[#D3D2D3] shadow-2xs">
        <div className="flex items-center gap-1.5 custom-scrollbar-x p-1">
          <button
            id="tab-loan-checkout"
            onClick={() => setActiveSubTab('checkout')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'checkout'
                ? 'bg-[#83B141] text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-950 hover:bg-[#F8F9F8]'
            }`}
          >
            <BookMarked className="w-4 h-4" strokeWidth={1.75} />
            <span>Prestar Libro (Checkout)</span>
          </button>

          <button
            id="tab-loan-checkin"
            onClick={() => setActiveSubTab('checkin')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'checkin'
                ? 'bg-[#83B141] text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-950 hover:bg-[#F8F9F8]'
            }`}
          >
            <RotateCcw className="w-4 h-4" strokeWidth={1.75} />
            <span>Devolver Libro (Check-in)</span>
            {activeLoansCount > 0 && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeSubTab === 'checkin'
                    ? 'bg-white text-[#2c4210]'
                    : 'bg-[#f2f7ec] text-[#2c4210] border border-[#83B141]/30'
                }`}
              >
                {activeLoansCount} activo{activeLoansCount === 1 ? '' : 's'}
              </span>
            )}
          </button>

          <button
            id="tab-loan-holds"
            onClick={() => setActiveSubTab('holds')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'holds'
                ? 'bg-[#83B141] text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-950 hover:bg-[#F8F9F8]'
            }`}
          >
            <Bookmark className="w-4 h-4" strokeWidth={1.75} />
            <span>Reservas (Holds)</span>
            {activeHoldsCount > 0 && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeSubTab === 'holds'
                    ? 'bg-white text-neutral-900'
                    : 'bg-[#EFDA18] text-neutral-900 shadow-2xs'
                }`}
              >
                {activeHoldsCount} en espera
              </span>
            )}
          </button>

          <button
            id="tab-loan-history"
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'history'
                ? 'bg-[#83B141] text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-950 hover:bg-[#F8F9F8]'
            }`}
          >
            <History className="w-4 h-4" strokeWidth={1.75} />
            <span>Historial y Trazabilidad</span>
          </button>
        </div>

        {/* Offline sync / network indicator */}
        <div className="flex items-center gap-2 text-xs pr-3">
          {offlineCount > 0 ? (
            <button
              onClick={handleSyncOffline}
              disabled={isSyncing}
              className="px-3 py-1.5 bg-[#EFDA18] hover:bg-[#d6c311] text-neutral-900 font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} strokeWidth={1.75} />
              Sincronizar Offline ({offlineCount})
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-neutral-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#83B141]" />
              <span>Modo Online</span>
            </div>
          )}
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

      {activeSubTab === 'holds' && (
        <HoldsTab onNavigateToCheckout={() => setActiveSubTab('checkout')} />
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
