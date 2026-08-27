import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Building2, 
  PlusCircle, 
  Layers, 
  Terminal, 
  GraduationCap, 
  HeartHandshake, 
  Library, 
  Sparkles, 
  ExternalLink, 
  Code2, 
  BookMarked 
} from 'lucide-react';
import { BookCatalog } from './components/catalog/BookCatalog';
import { RegisterCopyForm } from './components/copies/RegisterCopyForm';
import { BranchInventory } from './components/branches/BranchInventory';
import { ArchitectureHub } from './components/dev/ArchitectureHub';
import { LoansHub } from './components/loans/LoansHub';
import { getStoredLoans } from './lib/loans';
import type { Work, Copy } from './types/database';

export default function App() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'loans' | 'register_copy' | 'branches' | 'architecture'>('catalog');
  const [selectedWorkForCopy, setSelectedWorkForCopy] = useState<Work | null>(null);
  const [catalogRefreshCounter, setCatalogRefreshCounter] = useState<number>(0);
  const [prefilledLoanMarbete, setPrefilledLoanMarbete] = useState<string>('');
  const [loanInitialTab, setLoanInitialTab] = useState<'checkout' | 'checkin' | 'history'>('checkout');

  const activeLoansCount = getStoredLoans().filter((l) => l.status === 'active' || l.status === 'overdue').length;

  const handleSelectWorkForCopy = (work: Work) => {
    setSelectedWorkForCopy(work);
    setActiveTab('register_copy');
  };

  const handleCopyRegistered = (newCopy: Copy) => {
    setCatalogRefreshCounter((prev) => prev + 1);
  };

  const handleOpenLoanForCopy = (marbeteCode: string, mode: 'checkout' | 'checkin' = 'checkout') => {
    setPrefilledLoanMarbete(marbeteCode);
    setLoanInitialTab(mode);
    setActiveTab('loans');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans antialiased">
      {/* Top Navbar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Institution Brand */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-md shadow-emerald-950/40 text-white shrink-0 ring-2 ring-emerald-400/30">
                <Library className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
                    Colegio Integral El Manglar
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                    Multisede
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Biblioteca Miguel Otero Silva
                </h1>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Catálogo universal (Dublin Core + CDD) y dotaciones descentralizadas para escuelas rurales
                </p>
              </div>
            </div>

            {/* Quick Action Button for Dev Hub */}
            <button
              onClick={() => setActiveTab('architecture')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition border cursor-pointer ${
                activeTab === 'architecture'
                  ? 'bg-emerald-700 text-white border-emerald-600'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">Ver Código & SQL</span>
              <span className="md:hidden">SQL</span>
            </button>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 border-t border-slate-800/80 overflow-x-auto py-1 text-xs sm:text-sm font-medium">
            <button
              id="tab-catalog"
              onClick={() => setActiveTab('catalog')}
              className={`py-3 px-4 rounded-xl flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'catalog'
                  ? 'bg-emerald-800 text-white font-semibold shadow-inner'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Catálogo Universal de Obras
            </button>

            <button
              id="tab-loans"
              onClick={() => {
                setPrefilledLoanMarbete('');
                setLoanInitialTab('checkout');
                setActiveTab('loans');
              }}
              className={`py-3 px-4 rounded-xl flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'loans'
                  ? 'bg-emerald-800 text-white font-semibold shadow-inner'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BookMarked className="w-4 h-4 text-emerald-400" />
              <span>Préstamos y Circulación</span>
              {activeLoansCount > 0 && (
                <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full shadow-2xs">
                  {activeLoansCount}
                </span>
              )}
            </button>

            <button
              id="tab-register-copy"
              onClick={() => setActiveTab('register_copy')}
              className={`py-3 px-4 rounded-xl flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'register_copy'
                  ? 'bg-emerald-800 text-white font-semibold shadow-inner'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              Registrar Ejemplar Físico
            </button>

            <button
              id="tab-branches"
              onClick={() => setActiveTab('branches')}
              className={`py-3 px-4 rounded-xl flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'branches'
                  ? 'bg-emerald-800 text-white font-semibold shadow-inner'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Sedes e Inventario Descentralizado
            </button>

            <button
              id="tab-architecture"
              onClick={() => setActiveTab('architecture')}
              className={`py-3 px-4 rounded-xl flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'architecture'
                  ? 'bg-emerald-800 text-white font-semibold shadow-inner'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Terminal className="w-4 h-4 text-amber-400" />
              SQL Supabase, Next.js & Server Action
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {activeTab === 'register_copy' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <RegisterCopyForm
              initialWork={selectedWorkForCopy}
              onCopyRegistered={handleCopyRegistered}
            />

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-2">
              <div className="font-bold flex items-center gap-1.5">
                <HeartHandshake className="w-4 h-4 text-blue-700" />
                Programa de Dotación Descentralizada "Semilla Manglareña"
              </div>
              <p className="text-blue-800 leading-relaxed">
                Este flujo registra unidades físicas que son transferidas a escuelas rurales aliadas en el oriente del país, manteniendo el marbete clasificado bajo el estándar decimal Dewey y permitiendo trazabilidad centralizada desde el Colegio Integral El Manglar.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'branches' && (
          <BranchInventory />
        )}

        {activeTab === 'architecture' && (
          <ArchitectureHub />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-4 text-slate-700 font-semibold">
            <span>Colegio Integral El Manglar</span>
            <span>•</span>
            <span>Biblioteca Miguel Otero Silva</span>
            <span>•</span>
            <span>Proyecto Semilla Manglareña</span>
          </div>
          <p className="text-slate-400 max-w-xl mx-auto">
            Plataforma Full-Stack desarrollada con Next.js (App Router), TypeScript, Tailwind CSS y Supabase PostgreSQL con RLS y estándares Dublin Core / Dewey.
          </p>
        </div>
      </footer>
    </div>
  );
}
