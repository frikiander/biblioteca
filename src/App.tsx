import React, { useState, useEffect } from 'react';
import { 
  HeartHandshake
} from 'lucide-react';
import { BookCatalog } from './components/catalog/BookCatalog';
import { RegisterCopyForm } from './components/copies/RegisterCopyForm';
import { BranchInventory } from './components/branches/BranchInventory';
import { LoansHub } from './components/loans/LoansHub';
import { PatronManager } from './components/patrons/PatronManager';
import { VirtualShelvesHub } from './components/shelves/VirtualShelvesHub';
import { StocktakingHub } from './components/inventory/StocktakingHub';
import { SuggestionsHub } from './components/suggestions/SuggestionsHub';
import { KohaReportsDashboard } from './components/reports/KohaReportsDashboard';
import { PublicCatalogPortal } from './components/public/PublicCatalogPortal';
import { AppSidebar, TabType } from './components/layout/AppSidebar';
import { AppHeader } from './components/layout/AppHeader';
import { getStoredLoans } from './lib/loans';
import { getStoredHolds } from './lib/holds';
import { getStoredSuggestions } from './lib/suggestions';
import { getOfflineQueue } from './lib/offlineCirc';
import type { Work, Copy } from './types/database';

// Reset previo de datos demo/precargados para dejar la plataforma totalmente en blanco y lista desde cero
if (typeof window !== 'undefined') {
  const CLEAN_SLATE_KEY = 'manglar_clean_slate_zero_v1';
  if (!localStorage.getItem(CLEAN_SLATE_KEY)) {
    localStorage.setItem('manglar_patrons_v2', JSON.stringify([]));
    localStorage.setItem('manglar_students', JSON.stringify([]));
    localStorage.setItem('manglar_suggestions', JSON.stringify([]));
    localStorage.setItem('manglar_loans', JSON.stringify([]));
    localStorage.setItem('manglar_holds', JSON.stringify([]));
    localStorage.setItem('manglar_virtual_shelves', JSON.stringify([]));
    localStorage.setItem('manglar_preservation_items', JSON.stringify([]));
    localStorage.setItem('manglar_audit_sessions', JSON.stringify([]));
    localStorage.setItem('manglar_works', JSON.stringify([]));
    localStorage.setItem('manglar_copies', JSON.stringify([]));
    localStorage.setItem(CLEAN_SLATE_KEY, 'true');
  }
}

export default function App() {
  // Check if URL has ?mode=public or ?view=public
  const [isPublicMode, setIsPublicMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'public' || params.get('view') === 'public' || params.get('public') === 'true';
  });

  const [activeTab, setActiveTab] = useState<TabType>('catalog');
  const [selectedWorkForCopy, setSelectedWorkForCopy] = useState<Work | null>(null);
  const [catalogRefreshCounter, setCatalogRefreshCounter] = useState<number>(0);
  const [prefilledLoanMarbete, setPrefilledLoanMarbete] = useState<string>('');
  const [loanInitialTab, setLoanInitialTab] = useState<'checkout' | 'checkin' | 'holds' | 'history'>('checkout');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [offlineCount, setOfflineCount] = useState<number>(0);

  // Synchronize network state
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
  }, [catalogRefreshCounter]);

  // Synchronize browser history / back-forward navigation for public mode
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setIsPublicMode(params.get('mode') === 'public' || params.get('view') === 'public' || params.get('public') === 'true');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleOpenPublicPortal = () => {
    setIsPublicMode(true);
    const newUrl = `${window.location.pathname}?mode=public`;
    window.history.pushState({}, '', newUrl);
  };

  const handleReturnToAdmin = () => {
    setIsPublicMode(false);
    window.history.pushState({}, '', window.location.pathname);
  };

  // If in public mode, render the dedicated Public Catalog Portal (OPAC)
  if (isPublicMode) {
    return <PublicCatalogPortal onSwitchToAdmin={handleReturnToAdmin} />;
  }

  const activeLoansCount = getStoredLoans().filter((l) => l.status === 'active' || l.status === 'overdue').length;
  const activeHoldsCount = getStoredHolds().filter((h) => h.status === 'waiting' || h.status === 'ready_for_pickup').length;
  const pendingSuggestionsCount = getStoredSuggestions().filter((s) => s.status === 'pending').length;

  const handleSelectWorkForCopy = (work: Work) => {
    setSelectedWorkForCopy(work);
    setActiveTab('register_copy');
  };

  const handleCopyRegistered = (_newCopy: Copy) => {
    setCatalogRefreshCounter((prev) => prev + 1);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8F9F8] text-neutral-800 antialiased font-sans">
      {/* Sleek Floating Sidebar Navigation (Image 1 reference) */}
      <AppSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeLoansCount={activeLoansCount}
        activeHoldsCount={activeHoldsCount}
        pendingSuggestionsCount={pendingSuggestionsCount}
        onOpenPublicPortal={handleOpenPublicPortal}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Viewport with Header and Independent Fluid Scroll */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Modern Top Breadcrumb Header */}
        <AppHeader
          activeTab={activeTab}
          onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onOpenPublicPortal={handleOpenPublicPortal}
          isOnline={isOnline}
          offlineCount={offlineCount}
        />

        {/* Independent Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 lg:px-8 bg-[#F9FAF9]">
          <div className="w-full space-y-6 pb-12">
            {activeTab === 'catalog' && (
              <BookCatalog
                onSelectWorkForCopy={handleSelectWorkForCopy}
                refreshTrigger={catalogRefreshCounter}
              />
            )}

            {activeTab === 'loans' && (
              <LoansHub
                initialTab={loanInitialTab}
                initialMarbeteCode={prefilledLoanMarbete}
                onDataChange={() => setCatalogRefreshCounter((prev) => prev + 1)}
              />
            )}

            {activeTab === 'patrons' && (
              <PatronManager
                onOpenLoanForPatron={(_patron) => {
                  setActiveTab('loans');
                }}
              />
            )}

            {activeTab === 'shelves' && (
              <VirtualShelvesHub />
            )}

            {activeTab === 'inventory' && (
              <StocktakingHub />
            )}

            {activeTab === 'suggestions' && (
              <SuggestionsHub />
            )}

            {activeTab === 'branches' && (
              <BranchInventory />
            )}

            {activeTab === 'reports' && (
              <KohaReportsDashboard />
            )}

            {activeTab === 'register_copy' && (
              <div className="max-w-3xl mx-auto space-y-6">
                <RegisterCopyForm
                  initialWork={selectedWorkForCopy}
                  onCopyRegistered={handleCopyRegistered}
                />

                <div className="p-4 rounded-2xl bg-[#f2f7ec] border border-[#83B141]/30 text-xs text-[#2c4210] space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-[#83B141]">
                    <HeartHandshake className="w-4 h-4" strokeWidth={1.75} />
                    Programa de Dotación Descentralizada "Semilla Manglareña"
                  </div>
                  <p className="leading-relaxed text-neutral-700">
                    Este flujo registra unidades físicas que son transferidas a escuelas rurales aliadas en el oriente del país, manteniendo el marbete clasificado bajo el estándar decimal Dewey y permitiendo trazabilidad centralizada desde el Colegio Integral El Manglar.
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
