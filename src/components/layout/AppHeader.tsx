import React, { useState } from 'react';
import { 
  Menu, 
  Globe, 
  Wifi, 
  WifiOff, 
  BookOpen, 
  BookMarked, 
  Users, 
  Bookmark, 
  ScanLine, 
  Lightbulb, 
  Building2, 
  BarChart3, 
  PlusCircle,
  ExternalLink,
  Database
} from 'lucide-react';
import type { TabType } from './AppSidebar';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { SupabaseConnectionModal } from './SupabaseConnectionModal';

interface AppHeaderProps {
  activeTab: TabType;
  onToggleMobileMenu: () => void;
  onOpenPublicPortal: () => void;
  isOnline?: boolean;
  offlineCount?: number;
}

const TAB_METADATA: Record<TabType, { category: string; title: string; icon: React.FC<{ className?: string; strokeWidth?: number }> }> = {
  reports: { category: 'Métricas & KPIs', title: 'Dashboard General', icon: BarChart3 },
  catalog: { category: 'Inventario', title: 'Inventario', icon: BookOpen },
  register_copy: { category: 'Inventario', title: 'Registrar Ejemplar', icon: PlusCircle },
  shelves: { category: 'Inventario', title: 'Estantes & Plan Lector', icon: Bookmark },
  suggestions: { category: 'Inventario', title: 'Desideratas', icon: Lightbulb },
  loans: { category: 'Circulación & Lectores', title: 'Préstamos & Circulación', icon: BookMarked },
  patrons: { category: 'Circulación & Lectores', title: 'Estudiantes & Comunidad', icon: Users },
  inventory: { category: 'Control Físico & Sedes', title: 'Auditoría & Conservación', icon: ScanLine },
  branches: { category: 'Control Físico & Sedes', title: 'Sedes & Semilla Manglareña', icon: Building2 },
};

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeTab,
  onToggleMobileMenu,
  onOpenPublicPortal,
  isOnline = true,
  offlineCount = 0,
}) => {
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const currentMeta = TAB_METADATA[activeTab] || TAB_METADATA.catalog;
  const TabIcon = currentMeta.icon;

  return (
    <>
      <header className="h-16 bg-white border-b border-[#D3D2D3]/80 px-4 sm:px-6 flex items-center justify-between shrink-0 z-10 shadow-2xs">
        {/* Left: Mobile Toggle & Breadcrumbs */}
        <div className="flex items-center gap-3">
          {/* Mobile Hamburger Toggle */}
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 transition cursor-pointer"
            title="Abrir menú"
          >
            <Menu className="w-5 h-5" strokeWidth={1.5} />
          </button>

          {/* Dynamic Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            {currentMeta.category !== currentMeta.title && (
              <>
                <span className="text-neutral-400 font-medium hidden sm:inline">
                  {currentMeta.category}
                </span>
                <span className="text-neutral-300 hidden sm:inline">/</span>
              </>
            )}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#83B141]/10 text-[#83B141] flex items-center justify-center">
                <TabIcon className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <h1 className="font-bold text-neutral-900 text-sm sm:text-base tracking-tight">
                {currentMeta.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Right: Supabase Connection Badge & Quick OPAC Access */}
        <div className="flex items-center gap-3">
          {/* Honest Supabase Connection Pill */}
          <button
            type="button"
            onClick={() => setIsSupabaseModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition border cursor-pointer shadow-2xs ${
              isSupabaseConfigured
                ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-800'
            }`}
            title={
              isSupabaseConfigured
                ? 'Conectado a Supabase (Clic para ver estado o migrar)'
                : 'Modo Local / Almacenamiento Local (Clic para configurar Supabase)'
            }
          >
            {isSupabaseConfigured ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <Database className="w-3 h-3 text-emerald-700 shrink-0" />
                <span className="hidden md:inline">Supabase Conectado</span>
                <span className="md:hidden">Supabase</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <Database className="w-3 h-3 text-amber-700 shrink-0" />
                <span className="hidden md:inline">Modo Local (Offline)</span>
                <span className="md:hidden">Local</span>
              </>
            )}
          </button>

          {/* Quick OPAC Public Button */}
          <button
            onClick={onOpenPublicPortal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#83B141] hover:bg-[#719b35] text-white text-xs font-bold transition shadow-2xs cursor-pointer"
            title="Abrir Portal Público de Consulta (OPAC)"
          >
            <Globe className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Ver OPAC</span>
          </button>
        </div>
      </header>

      {/* Supabase Connection & Sync Modal */}
      <SupabaseConnectionModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
    </>
  );
};
