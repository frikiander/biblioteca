'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  Search, 
  BookOpen, 
  Filter, 
  RefreshCw, 
  AlertCircle, 
  Layers, 
  Building2, 
  GraduationCap,
  Sparkles,
  Database,
  Plus,
  BookPlus,
  CheckCircle2,
  Printer,
  Trash2,
  Share2,
  Globe
} from 'lucide-react';
import type { Work, Branch, Copy, WorkWithCopiesCount } from '../../types/database';
import { supabase, isSupabaseConfigured, INITIAL_WORKS, INITIAL_BRANCHES, INITIAL_COPIES, getWorksWithInventory, getStoredBranches, getStoredCopies, clearAllPlatformData } from '../../lib/supabaseClient';
import { BookCard } from './BookCard';
import { DublinCoreModal } from './DublinCoreModal';
import { Marc21Modal } from './Marc21Modal';
import { RegisterWorkModal } from '../works/RegisterWorkModal';
import { QuickAddCopyModal } from '../copies/QuickAddCopyModal';
import { PrintSpineLabelsModal } from '../copies/PrintSpineLabelsModal';
import { DEWEY_GROUPS, DEWEY_CLASSES } from '../../lib/dewey';

interface BookCatalogProps {
  onSelectWorkForCopy?: (work: Work) => void;
  refreshTrigger?: number;
}

export const BookCatalog: React.FC<BookCatalogProps> = ({ onSelectWorkForCopy, refreshTrigger }) => {
  const [works, setWorks] = useState<WorkWithCopiesCount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDewey, setSelectedDewey] = useState<string>('all');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [activeModalWork, setActiveModalWork] = useState<WorkWithCopiesCount | null>(null);
  const [activeMarcWork, setActiveMarcWork] = useState<WorkWithCopiesCount | null>(null);
  const [dataSource, setDataSource] = useState<'supabase' | 'local'>('local');

  // Modals state
  const [isRegisterWorkModalOpen, setIsRegisterWorkModalOpen] = useState<boolean>(false);
  const [quickAddCopyWork, setQuickAddCopyWork] = useState<WorkWithCopiesCount | null>(null);
  const [isPrintSpineModalOpen, setIsPrintSpineModalOpen] = useState<boolean>(false);
  const [printModalWork, setPrintModalWork] = useState<WorkWithCopiesCount | null>(null);
  const [printModalCopies, setPrintModalCopies] = useState<Copy[] | undefined>(undefined);
  const [printModalTitle, setPrintModalTitle] = useState<string | undefined>(undefined);
  const [toastNotification, setToastNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToastNotification({ message, type });
    setTimeout(() => setToastNotification(null), 4000);
  };

  const handleClearAllData = () => {
    if (window.confirm('¿Deseas vaciar todos los libros y ejemplares del inventario? Esta acción dejará la plataforma completamente limpia sin ningún registro.')) {
      clearAllPlatformData();
      fetchWorksCatalog();
      showToast('Inventario y plataforma limpiados exitosamente. No hay datos registrados.', 'info');
    }
  };

  // Fetch catalog data from Supabase or fallback store
  const fetchWorksCatalog = async () => {
    setLoading(true);
    setError(null);

    try {
      if (isSupabaseConfigured && supabase) {
        // Fetch from live Supabase instance with joined copies and branches
        const { data: worksData, error: worksError } = await supabase
          .from('works')
          .select('*')
          .order('title', { ascending: true });

        if (worksError) {
          throw new Error(`Error en Supabase works: ${worksError.message}`);
        }

        const { data: branchesData, error: branchesError } = await supabase
          .from('branches')
          .select('*');

        if (branchesError) {
          throw new Error(`Error en Supabase branches: ${branchesError.message}`);
        }

        const { data: copiesData, error: copiesError } = await supabase
          .from('copies')
          .select('*');

        if (copiesError) {
          throw new Error(`Error en Supabase copies: ${copiesError.message}`);
        }

        if (typeof window !== 'undefined' && copiesData) {
          localStorage.setItem('manglar_copies', JSON.stringify(copiesData));
        }

        const enriched = getWorksWithInventory(
          (worksData as Work[]) || [],
          (branchesData as Branch[]) || [],
          (copiesData as Copy[]) || []
        );

        setWorks(enriched);
        setDataSource('supabase');
      } else {
        // Read from local sync store
        const savedCopiesStr = localStorage.getItem('manglar_copies');
        const currentCopies: Copy[] = savedCopiesStr ? JSON.parse(savedCopiesStr) : INITIAL_COPIES;

        const savedWorksStr = localStorage.getItem('manglar_works');
        const currentWorks: Work[] = savedWorksStr ? JSON.parse(savedWorksStr) : INITIAL_WORKS;

        const currentBranches: Branch[] = getStoredBranches();

        const enriched = getWorksWithInventory(currentWorks, currentBranches, currentCopies);
        setWorks(enriched);
        setDataSource('local');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido al cargar el catálogo bibliográfico';
      setError(message);
      
      // Graceful fallback to initial seed
      const enriched = getWorksWithInventory(INITIAL_WORKS, getStoredBranches(), INITIAL_COPIES);
      setWorks(enriched);
      setDataSource('local');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorksCatalog();
  }, [refreshTrigger]);

  // Filtered works computed efficiently
  const filteredWorks = useMemo(() => {
    return works.filter((work) => {
      // 1. Text search (Title, Author, ISBN, Dewey Code, Subject keywords)
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        work.title.toLowerCase().includes(query) ||
        work.author.toLowerCase().includes(query) ||
        (work.isbn && work.isbn.toLowerCase().includes(query)) ||
        work.dewey_code.includes(query) ||
        (work.subjects && work.subjects.some((s) => s.toLowerCase().includes(query)));

      if (!matchesSearch) return false;

      // 2. Dewey Category Filter
      if (selectedDewey !== 'all') {
        const rawDewey = (work.dewey_code || '').trim();
        const numOnly = rawDewey.split('.')[0].replace(/[^0-9]/g, '');
        const padded = numOnly.padEnd(3, '0').slice(0, 3);
        const hundredGroup = padded.charAt(0) + '00';

        if (selectedDewey.startsWith('group_')) {
          const targetGroup = selectedDewey.replace('group_', '');
          if (hundredGroup !== targetGroup) return false;
        } else if (selectedDewey.endsWith('00')) {
          // If a broad class is selected (e.g. 800, 500, 000)
          if (hundredGroup !== selectedDewey && !rawDewey.startsWith(selectedDewey.charAt(0))) {
            return false;
          }
        } else {
          // Specific 3-digit division (e.g. 860, 370, 510, 810, etc.)
          const divisionPrefix = selectedDewey.slice(0, 2);
          const matchesPrefix = padded.startsWith(divisionPrefix) || rawDewey.startsWith(divisionPrefix);
          const matchesExact = padded === selectedDewey || rawDewey === selectedDewey || rawDewey.startsWith(selectedDewey);
          if (!matchesPrefix && !matchesExact) return false;
        }
      }

      // 3. Branch filter
      if (selectedBranchFilter === 'all') {
        return true;
      } else if (selectedBranchFilter === 'central') {
        return work.copies_by_branch.some(
          (b) => b.branch_type === 'internal' && b.count > 0
        );
      } else if (selectedBranchFilter === 'semilla') {
        return work.copies_by_branch.some(
          (b) => b.branch_type === 'external_donation' && b.count > 0
        );
      } else {
        // Specific branch matching ID or Name fragment
        return work.copies_by_branch.some(
          (b) => (b.branch_id === selectedBranchFilter || b.branch_name.toLowerCase().includes(selectedBranchFilter.toLowerCase())) && b.count > 0
        );
      }
    });
  }, [works, searchQuery, selectedDewey, selectedBranchFilter]);

  // Total summary counts
  const totalCopiesCount = useMemo(() => {
    return works.reduce((sum, w) => sum + w.total_copies, 0);
  }, [works]);

  const totalCentralCount = useMemo(() => {
    return works.reduce((sum, w) => {
      const central = (w.copies_by_branch || [])
        .filter((b) => b.branch_type === 'internal')
        .reduce((acc, curr) => acc + curr.count, 0);
      const rural = (w.copies_by_branch || [])
        .filter((b) => b.branch_type === 'external_donation')
        .reduce((acc, curr) => acc + curr.count, 0);
      const displayCentral = (central + rural === 0 && w.total_copies > 0) ? w.total_copies : central;
      return sum + displayCentral;
    }, 0);
  }, [works]);

  const totalDonationsCount = useMemo(() => {
    return works.reduce((sum, w) => {
      const rural = (w.copies_by_branch || [])
        .filter((b) => b.branch_type === 'external_donation')
        .reduce((acc, curr) => acc + curr.count, 0);
      return sum + rural;
    }, 0);
  }, [works]);

  return (
    <div id="book-catalog-container" className="space-y-6">
      {/* Top Banner / Metrics bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Catálogo Bibliográfico Universal</h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                <Sparkles className="w-3 h-3" />
                {works.length} Obras Catalogadas
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Colegio Integral El Manglar • Clasificación Decimal Dewey & Formato Dublin Core
            </p>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/70 text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total</span>
              <span className="text-sm font-bold text-slate-800">{totalCopiesCount} uds.</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-blue-50/80 border border-blue-200/60 text-right">
              <span className="text-[10px] uppercase font-bold text-blue-700 block tracking-wider">Sede Central</span>
              <span className="text-sm font-bold text-blue-950">{totalCentralCount} uds.</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50/80 border border-emerald-200/60 text-right">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block tracking-wider">Dotación Rural</span>
              <span className="text-sm font-bold text-emerald-950">{totalDonationsCount} uds.</span>
            </div>

            <button
              id="refresh-catalog-btn"
              onClick={fetchWorksCatalog}
              disabled={loading}
              title="Refrescar catálogo"
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-700' : ''}`} />
            </button>

            <button
              id="open-public-link-btn"
              onClick={() => {
                const publicUrl = `${window.location.origin}${window.location.pathname}?mode=public`;
                navigator.clipboard.writeText(publicUrl);
                showToast('¡Enlace del Catálogo Público copiado al portapapeles para compartir con alumnos y familias!', 'success');
              }}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
              title="Copiar enlace del catálogo público para compartir con estudiantes y padres"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Link Público Alumnos</span>
            </button>

            <button
              id="open-print-spines-btn"
              onClick={() => {
                setPrintModalWork(null);
                setPrintModalCopies(undefined);
                setPrintModalTitle(undefined);
                setIsPrintSpineModalOpen(true);
              }}
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
              title="Imprimir o descargar tejuelos (25x38 mm) en lote"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Imprimir Tejuelos</span>
            </button>

            {works.length > 0 && (
              <button
                id="clear-all-data-btn"
                onClick={handleClearAllData}
                className="p-2 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-700 transition cursor-pointer"
                title="Vaciar inventario y limpiar todos los datos"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              id="open-register-work-btn"
              onClick={() => setIsRegisterWorkModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/20 transition flex items-center gap-1.5 cursor-pointer"
            >
              <BookPlus className="w-4 h-4 text-emerald-300" />
              <span>+ Catalogar Obra</span>
            </button>
          </div>
        </div>

        {/* Search and Filters Control Row */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-12 gap-3 pt-4 border-t border-slate-100">
          {/* Search bar */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="catalog-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título, autor (e.g. Miguel Otero Silva), ISBN o CDD..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
            />
          </div>

          {/* Dewey Category Selector */}
          <div className="sm:col-span-3">
            <select
              id="dewey-filter-select"
              value={selectedDewey}
              onChange={(e) => setSelectedDewey(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
            >
              <option value="all">Todas las clases Dewey (000 - 990)</option>
              {DEWEY_GROUPS.map((group) => (\n                <optgroup key={group.code} label={group.name}>\n                  <option value={`group_${group.code}`}>\n                    Toda la clase {group.code} — {group.name.replace(/^[0-9]+\\s*/, '')}\n                  </option>\n                  {group.divisions.map((div) => (\n                    <option key={div.code} value={div.code}>\n                      CDD {div.code} — {div.name.replace(/^[0-9]+\\s*/, '')}\n                    </option>\n                  ))}\n                </optgroup>\n              ))}\n            </select>\n          </div>\n\n          {/* Branch filter */}\n          <div className=\"sm:col-span-3\">\n            <select\n              id=\"branch-filter-select\"\n              value={selectedBranchFilter}\n              onChange={(e) => setSelectedBranchFilter(e.target.value)}\n              className=\"w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition\"\n            >\n              <option value=\"all\">Todas las sedes (6)</option>\n              <optgroup label=\"Sedes Centrales (Campus)\">\n                <option value=\"primaria\">Biblioteca Miguel Otero Silva - Primaria</option>\n                <option value=\"bachillerato\">Biblioteca Miguel Otero Silva - Bachillerato</option>\n              </optgroup>\n              <optgroup label=\"Semilla Manglareña (Dotaciones Rurales)\">\n                <option value=\"guárico\">Semilla Manglareña - Guárico</option>\n                <option value=\"caripe\">Semilla Manglareña - Caripe</option>\n                <option value=\"merida\">Semilla Manglareña - Mérida</option>\n                <option value=\"delta\">Semilla Manglareña - Delta</option>\n              </optgroup>\n              <optgroup label=\"Filtros Generales\">\n                <option value=\"central\">Todas las Sedes Centrales</option>\n                <option value=\"semilla\">Todos los núcleos Semilla Manglareña</option>\n              </optgroup>\n            </select>\n          </div>\n        </div>\n\n        {/* Active Dewey Pills */}\n        <div className=\"mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs\">\n          <span className=\"text-slate-400 text-[11px] font-medium mr-1 shrink-0 flex items-center gap-1\">\n            <Filter className=\"w-3 h-3\" /> Clases CDD:\n          </span>\n          <button\n            onClick={() => setSelectedDewey('all')}\n            className={`px-2.5 py-1 rounded-lg font-medium transition shrink-0 cursor-pointer ${\n              selectedDewey === 'all'\n                ? 'bg-slate-900 text-white shadow-xs'\n                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'\n            }`}\n          >\n            Todas\n          </button>\n          <button\n            onClick={() => setSelectedDewey('group_800')}\n            className={`px-2.5 py-1 rounded-lg font-medium transition shrink-0 cursor-pointer ${\n              selectedDewey === 'group_800' || selectedDewey === '800'\n                ? 'bg-blue-600 text-white shadow-xs'\n                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'\n            }`}\n          >\n            800 - Literatura\n          </button>\n          <button\n            onClick={() => setSelectedDewey('860')}\n            className={`px-2.5 py-1 rounded-lg font-medium transition shrink-0 cursor-pointer ${\n              selectedDewey === '860'\n                ? 'bg-indigo-600 text-white shadow-xs'\n                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'\n            }`}\n          >\n            860 - Literatura Hispanoamericana (Otero Silva)\n          </button>\n          <button\n            onClick={() => setSelectedDewey('group_500')}\n            className={`px-2.5 py-1 rounded-lg font-medium transition shrink-0 cursor-pointer ${\n              selectedDewey === 'group_500' || selectedDewey === '500'\n                ? 'bg-emerald-600 text-white shadow-xs'\n                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'\n            }`}\n          >\n            500 - Ciencias Puras\n          </button>\n          <button\n            onClick={() => setSelectedDewey('group_300')}\n            className={`px-2.5 py-1 rounded-lg font-medium transition shrink-0 cursor-pointer ${\n              selectedDewey === 'group_300' || selectedDewey === '300'\n                ? 'bg-sky-600 text-white shadow-xs'\n                : 'bg-sky-50 text-sky-700 hover:bg-sky-100'\n            }`}\n          >\n            300 - Ciencias Sociales\n          </button>\n          <button\n            onClick={() => setSelectedDewey('group_900')}\n            className={`px-2.5 py-1 rounded-lg font-medium transition shrink-0 cursor-pointer ${\n              selectedDewey === 'group_900' || selectedDewey === '900'\n                ? 'bg-purple-600 text-white shadow-xs'\n                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'\n            }`}\n          >\n            900 - Historia & Geografía\n          </button>\n        </div>\n      </div>\n\n      {/* Toast Notification */}\n      {toastNotification && (\n        <div className=\"p-4 rounded-2xl bg-emerald-900 text-white shadow-lg flex items-center justify-between gap-3 animate-in slide-in-from-top-2\">\n          <div className=\"flex items-center gap-2.5 text-xs sm:text-sm font-semibold\">\n            <CheckCircle2 className=\"w-5 h-5 text-emerald-400 shrink-0\" />\n            <span>{toastNotification.message}</span>\n          </div>\n          <button\n            onClick={() => setToastNotification(null)}\n            className=\"text-slate-300 hover:text-white text-xs font-bold px-2 py-1 rounded-lg hover:bg-emerald-800 transition cursor-pointer\"\n          >\n            Cerrar\n          </button>\n        </div>\n      )}\n\n      {/* Database Warning / Status Notice */}\n      {error && (\n        <div className=\"p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3\">\n          <AlertCircle className=\"w-4 h-4 text-amber-600 shrink-0 mt-0.5\" />\n          <div>\n            <span className=\"font-bold\">Aviso de sincronización:</span> {error}\n            <p className=\"text-amber-700 text-[11px] mt-0.5\">\n              Se están mostrando los registros de respaldo de la Biblioteca Miguel Otero Silva.\n            </p>\n          </div>\n        </div>\n      )}\n\n      {/* Loading Skeletons */}\n      {loading && (\n        <div className=\"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5\">\n          {[...Array(6)].map((_, i) => (\n            <div key={i} className=\"bg-white rounded-2xl border border-slate-200 p-4 space-y-4 animate-pulse\">\n              <div className=\"h-4 bg-slate-200 rounded w-1/3\"></div>\n              <div className=\"flex gap-3\">\n                <div className=\"w-20 h-28 bg-slate-200 rounded-lg shrink-0\"></div>\n                <div className=\"space-y-2 flex-1\">\n                  <div className=\"h-4 bg-slate-200 rounded w-full\"></div>\n                  <div className=\"h-3 bg-slate-200 rounded w-2/3\"></div>\n                  <div className=\"h-3 bg-slate-100 rounded w-4/5\"></div>\n                </div>\n              </div>\n              <div className=\"h-14 bg-slate-100 rounded-xl\"></div>\n              <div className=\"h-8 bg-slate-200 rounded-xl\"></div>\n            </div>\n          ))}\n        </div>\n      )}\n\n      {/* Empty State */}\n      {!loading && works.length === 0 && (\n        <div className=\"bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto space-y-4 shadow-sm\">\n          <div className=\"w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center border border-emerald-100\">\n            <BookOpen className=\"w-8 h-8\" />\n          </div>\n          <div>\n            <h3 className=\"text-lg font-bold text-slate-900\">Inventario y Catálogo Limpio</h3>\n            <p className=\"text-xs text-slate-500 mt-1.5 max-w-sm mx-auto\">\n              No hay obras ni ejemplares en la plataforma actualmente. Puedes iniciar catalogando obras maestras o títulos escolares con clasificación Dewey y formato Dublin Core.\n            </p>\n          </div>\n          <div className=\"pt-3\">\n            <button\n              onClick={() => setIsRegisterWorkModalOpen(true)}\n              className=\"px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs sm:text-sm font-bold transition inline-flex items-center gap-2 shadow-md shadow-emerald-950/15 cursor-pointer\"\n            >\n              <BookPlus className=\"w-4 h-4 text-emerald-300\" />\n              <span>+ Catalogar Primera Obra</span>\n            </button>\n          </div>\n        </div>\n      )}\n\n      {!loading && works.length > 0 && filteredWorks.length === 0 && (\n        <div className=\"bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-4\">\n          <div className=\"w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center border border-emerald-100\">\n            <BookOpen className=\"w-7 h-7\" />\n          </div>\n          <div>\n            <h3 className=\"text-base font-bold text-slate-800\">No se encontraron obras coincidentes</h3>\n            <p className=\"text-xs text-slate-500 mt-1\">\n              Intenta ajustar los filtros de búsqueda o cataloga una nueva obra en el sistema universal.\n            </p>\n          </div>\n          <div className=\"flex flex-wrap items-center justify-center gap-2 pt-2\">\n            <button\n              onClick={() => {\n                setSearchQuery('');\n                setSelectedDewey('all');\n                setSelectedBranchFilter('all');\n              }}\n              className=\"px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer\"\n            >\n              Restablecer Filtros\n            </button>\n            <button\n              onClick={() => setIsRegisterWorkModalOpen(true)}\n              className=\"px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer\"\n            >\n              <BookPlus className=\"w-3.5 h-3.5\" />\n              + Catalogar Obra\n            </button>\n          </div>\n        </div>\n      )}\n\n      {/* Grid of Books */}\n      {!loading && filteredWorks.length > 0 && (\n        <div className=\"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5\">\n          {filteredWorks.map((work) => (\n            <BookCard\n              key={work.id}\n              work={work}\n              onOpenDetails={(selected) => setActiveModalWork(selected)}\n              onOpenMarc21={(selected) => setActiveMarcWork(selected)}\n              onQuickRegisterCopy={(selected) => onSelectWorkForCopy && onSelectWorkForCopy(selected)}\n              onAddCopy={(selected) => setQuickAddCopyWork(selected)}\n              onPrintSpineLabels={(selected) => {\n                const allCopies = getStoredCopies();\n                const workCopies = allCopies.filter(c => c.work_id === selected.id);\n                setPrintModalWork(selected);\n                setPrintModalCopies(workCopies);\n                setPrintModalTitle(selected.title);\n                setIsPrintSpineModalOpen(true);\n              }}\n            />\n          ))}\n        </div>\n      )}\n\n      {/* Dublin Core Metadata Inspector Modal */}\n      <DublinCoreModal\n        work={activeModalWork}\n        onClose={() => setActiveModalWork(null)}\n      />\n\n      {/* Koha MARC21 Standard Inspector Modal */}\n      {activeMarcWork && (\n        <Marc21Modal\n          work={activeMarcWork}\n          onClose={() => setActiveMarcWork(null)}\n        />\n      )}\n\n      {/* Bulk / Single Spine Labels Modal */}\n      <PrintSpineLabelsModal\n        isOpen={isPrintSpineModalOpen}\n        onClose={() => {\n          setIsPrintSpineModalOpen(false);\n          setPrintModalWork(null);\n          setPrintModalCopies(undefined);\n          setPrintModalTitle(undefined);\n        }}\n        selectedWork={printModalWork}\n        initialCopies={printModalCopies}\n        singleWorkTitle={printModalTitle}\n      />\n\n      {/* Register Work in Universal Catalog Modal */}\n      <RegisterWorkModal\n        isOpen={isRegisterWorkModalOpen}\n        onClose={() => setIsRegisterWorkModalOpen(false)}\n        onWorkCreated={(newWork, copiesCount) => {\n          fetchWorksCatalog();\n          showToast(\n            `Obra \"${newWork.title}\" catalogada exitosamente con ${copiesCount} ${copiesCount === 1 ? 'ejemplar inicial' : 'ejemplares iniciales'}.`\n          );\n        }}\n      />\n\n      {/* Quick Add Copy Modal */}\n      <QuickAddCopyModal\n        work={quickAddCopyWork}\n        isOpen={Boolean(quickAddCopyWork)}\n        onClose={() => setQuickAddCopyWork(null)}\n        onCopyAdded={(newCopy) => {\n          fetchWorksCatalog();\n          showToast(`Nuevo ejemplar ${newCopy.internal_code} agregado al inventario con éxito.`);\n        }}\n      />\n    </div>\n  );\n};\n