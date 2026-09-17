import React, { useState } from 'react';
import { 
  LayoutGrid, 
  Folder, 
  ChevronDown, 
  ChevronUp, 
  Users, 
  Box, 
  Globe, 
  BookOpen, 
  PlusCircle, 
  Bookmark, 
  Lightbulb, 
  BookMarked, 
  ScanLine, 
  Building2,
  ExternalLink,
  ChevronRight,
  Library,
  Share2,
  Check
} from 'lucide-react';

export type TabType = 
  | 'catalog' 
  | 'loans' 
  | 'patrons' 
  | 'shelves' 
  | 'inventory' 
  | 'suggestions' 
  | 'branches' 
  | 'reports' 
  | 'register_copy';

interface AppSidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  activeLoansCount: number;
  activeHoldsCount: number;
  pendingSuggestionsCount: number;
  onOpenPublicPortal: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  setActiveTab,
  activeLoansCount,
  activeHoldsCount,
  pendingSuggestionsCount,
  onOpenPublicPortal,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  // Collapsible groups state
  const [isCatalogOpen, setIsCatalogOpen] = useState<boolean>(true);
  const [isCirculationOpen, setIsCirculationOpen] = useState<boolean>(true);
  const [isControlOpen, setIsControlOpen] = useState<boolean>(true);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const handleSelectTab = (tab: TabType) => {
    setActiveTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const publicUrl = `${window.location.origin}${window.location.pathname}?mode=public`;
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const totalCirculationCount = activeLoansCount + activeHoldsCount;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-50 w-[275px] bg-[#F2F3F2] border-r border-[#D3D2D3] flex flex-col justify-between
          transition-transform duration-250 ease-in-out lg:translate-x-0 lg:static lg:h-screen lg:shrink-0
          ${isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        `}
      >
        {/* Top Header with Geometric Quadrant Emblem & Brand */}
        <div className="p-4.5 pb-2">
          <div className="flex items-center gap-3 px-1 py-1">
            {/* Geometric Quadrant Emblem (as seen in Image 1 reference) */}
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-neutral-800 via-neutral-900 to-neutral-950 p-[2px] shadow-sm shrink-0 flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-neutral-900 p-1 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-[2px] w-6 h-6">
                  <div className="rounded-tl-full bg-gradient-to-br from-neutral-300 to-neutral-400 opacity-90"></div>
                  <div className="rounded-tr-full bg-gradient-to-bl from-[#83B141] to-neutral-400 opacity-90"></div>
                  <div className="rounded-bl-full bg-gradient-to-tr from-neutral-400 to-neutral-500 opacity-90"></div>
                  <div className="rounded-br-full bg-gradient-to-tl from-[#EFDA18] to-neutral-400 opacity-90"></div>
                </div>
              </div>
            </div>

            {/* Institution Brand Text */}
            <div className="leading-tight overflow-hidden">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#83B141] truncate">
                Colegio El Manglar
              </div>
              <div className="text-sm font-bold text-neutral-900 truncate">
                Biblioteca MOS
              </div>
              <div className="text-[10px] text-neutral-500 font-medium truncate">
                Koha Remix Edition
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-4 text-xs font-medium">
          
          {/* Section 1: Dashboard / Vista General (Single Level Item) */}
          <div className="space-y-1">
            <button
              id="sidebar-tab-dashboard"
              onClick={() => handleSelectTab('reports')}
              className={`
                w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl transition-all cursor-pointer text-left
                ${activeTab === 'reports' 
                  ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-neutral-950 font-bold' 
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60 font-medium'
                }
              `}
            >
              <LayoutGrid 
                className={`w-4 h-4 ${activeTab === 'reports' ? 'text-[#83B141]' : 'text-neutral-500'}`} 
                strokeWidth={1.75} 
              />
              <span className="flex-1 text-[13px]">Dashboard</span>
            </button>
          </div>

          {/* Section 2: Inventario (Collapsible Group with Tree Lines) */}
          <div className="space-y-1">
            {/* Parent Header */}
            <button
              onClick={() => setIsCatalogOpen(!isCatalogOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-neutral-700 hover:text-neutral-950 hover:bg-white/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Folder className="w-4 h-4 text-neutral-500" strokeWidth={1.5} />
                <span className="text-[13px] font-bold text-neutral-800">Inventario</span>
              </div>
              {isCatalogOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
              )}
            </button>

            {/* Tree Children Items */}
            {isCatalogOpen && (
              <div className="tree-connector-container ml-5 pl-4 space-y-1 pt-1">
                {/* 1. Inventario */}
                <div className="tree-connector-item">
                  <button
                    id="sidebar-tab-catalog"
                    onClick={() => handleSelectTab('catalog')}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 rounded-2xl transition-all cursor-pointer text-left
                      ${activeTab === 'catalog'
                        ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-neutral-950 font-bold'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60 font-medium'
                      }
                    `}
                  >
                    <span className="text-[12.5px] truncate">Inventario</span>
                  </button>
                </div>

                {/* 2. Registrar Ejemplar */}
                <div className="tree-connector-item">
                  <button
                    id="sidebar-tab-register-copy"
                    onClick={() => handleSelectTab('register_copy')}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 rounded-2xl transition-all cursor-pointer text-left
                      ${activeTab === 'register_copy'
                        ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-neutral-950 font-bold'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60 font-medium'
                      }
                    `}
                  >
                    <span className="text-[12.5px] truncate">+ Registrar Ejemplar</span>
                  </button>
                </div>

                {/* 3. Estantes & Plan Lector */}
                <div className="tree-connector-item">
                  <button
                    id="sidebar-tab-shelves"
                    onClick={() => handleSelectTab('shelves')}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 rounded-2xl transition-all cursor-pointer text-left
                      ${activeTab === 'shelves'
                        ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-neutral-950 font-bold'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60 font-medium'
                      }
                    `}
                  >
                    <span className="text-[12.5px] truncate">Estantes & Plan Lector</span>
                  </button>
                </div>

                {/* 4. Desideratas con Badge */}
                <div className="tree-connector-item">
                  <button
                    id="sidebar-tab-suggestions"
                    onClick={() => handleSelectTab('suggestions')}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 rounded-2xl transition-all cursor-pointer text-left
                      ${activeTab === 'suggestions'
                        ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-neutral-950 font-bold'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60 font-medium'
                      }
                    `}
                  >
                    <span className="text-[12.5px] truncate">Desideratas</span>
                    {pendingSuggestionsCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#EFDA18] text-neutral-900 shadow-2xs">
                        {pendingSuggestionsCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Circulación & Lectores (Collapsible Group with Tree Lines) */}
          <div className="space-y-1">
            <button
              onClick={() => setIsCirculationOpen(!isCirculationOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-neutral-700 hover:text-neutral-950 hover:bg-white/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-neutral-500" strokeWidth={1.5} />
                <span className="text-[13px] font-bold text-neutral-800">Circulación & Lectores</span>
              </div>
              {isCirculationOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
              )}
            </button>

            {isCirculationOpen && (
              <div className="tree-connector-container ml-5 pl-4 space-y-1 pt-1">
                {/* 1. Préstamos & Circulación */}
                <div className="tree-connector-item">
                  <button
                    id="sidebar-tab-loans"
                    onClick={() => handleSelectTab('loans')}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 rounded-2xl transition-all cursor-pointer text-left
                      ${activeTab === 'loans'
                        ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-neutral-950 font-bold'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60 font-medium'
                      }
                    `}
                  >
                    <span className="text-[12.5px] truncate">Préstamos & Circulación</span>
                    {totalCirculationCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#83B141] text-white shadow-2xs">
                        {totalCirculationCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* 2. Lectores & Carnetización */}
                <div className="tree-connector-item">
                  <button
                    id="sidebar-tab-patrons"
                    onClick={() => handleSelectTab('patrons')}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 rounded-2xl transition-all cursor-pointer text-left
                      ${activeTab === 'patrons'
                        ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-neutral-950 font-bold'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60 font-medium'
                      }
                    `}
                  >
                    <span className="text-[12.5px] truncate">Lectores & Carnetización</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Control Físico & Sedes (Collapsible Group with Tree Lines) */}
          <div className="space-y-1">
            <button
              onClick={() => setIsControlOpen(!isControlOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-neutral-700 hover:text-neutral-950 hover:bg-white/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Box className="w-4 h-4 text-neutral-500" strokeWidth={1.5} />
                <span className="text-[13px] font-bold text-neutral-800">Control Físico & Sedes</span>
              </div>
              {isControlOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
              )}
            </button>

            {isControlOpen && (
              <div className="tree-connector-container ml-5 pl-4 space-y-1 pt-1">
                {/* 1. Auditoría & Conservación */}
                <div className="tree-connector-item">
                  <button
                    id="sidebar-tab-inventory"
                    onClick={() => handleSelectTab('inventory')}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 rounded-2xl transition-all cursor-pointer text-left
                      ${activeTab === 'inventory'
                        ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-neutral-950 font-bold'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60 font-medium'
                      }
                    `}
                  >
                    <span className="text-[12.5px] truncate">Auditoría & Conservación</span>
                  </button>
                </div>

                {/* 2. Sedes & Semilla Manglareña */}
                <div className="tree-connector-item">
                  <button
                    id="sidebar-tab-branches"
                    onClick={() => handleSelectTab('branches')}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 rounded-2xl transition-all cursor-pointer text-left
                      ${activeTab === 'branches'
                        ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-neutral-950 font-bold'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60 font-medium'
                      }
                    `}
                  >
                    <span className="text-[12.5px] truncate">Sedes & Semilla Manglareña</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Area: OPAC Portal Link & System Info */}
        <div className="p-3 border-t border-[#D3D2D3]/80 bg-[#F2F3F2] space-y-2">
          {/* Public Catalog OPAC Button */}
          <div className="flex items-center gap-1.5">
            <button
              id="sidebar-btn-public-portal"
              onClick={onOpenPublicPortal}
              className="flex-1 flex items-center justify-between px-3 py-2.5 rounded-2xl bg-white hover:bg-neutral-50 text-neutral-900 border border-[#D3D2D3] shadow-2xs font-bold text-xs transition cursor-pointer"
              title="Abrir el catálogo público de consulta OPAC"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#83B141]" strokeWidth={1.75} />
                <span>Portal Público OPAC</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
            </button>

            <button
              onClick={handleCopyLink}
              className="p-2.5 rounded-2xl bg-white hover:bg-neutral-50 text-neutral-700 border border-[#D3D2D3] shadow-2xs transition cursor-pointer shrink-0"
              title="Copiar enlace del catálogo público"
            >
              {copiedLink ? (
                <Check className="w-4 h-4 text-[#83B141]" strokeWidth={2} />
              ) : (
                <Share2 className="w-4 h-4 text-neutral-500" strokeWidth={1.5} />
              )}
            </button>
          </div>

          <div className="px-2 pt-1 flex items-center justify-between text-[10px] text-neutral-500">
            <span>Colegio Integral El Manglar</span>
            <span className="font-semibold text-[#83B141]">v1.0.0</span>
          </div>
        </div>
      </aside>
    </>
  );
};
