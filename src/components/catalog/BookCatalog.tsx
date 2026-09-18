'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  Search, 
  BookOpen, 
  Filter, 
  RefreshCw, 
  AlertCircle, 
  Sparkles,
  Plus,
  BookPlus,
  CheckCircle2,
  Printer,
  Trash2,
  Share2,
  LayoutGrid,
  List,
  FileCode,
  Info,
  RotateCcw,
  X,
  Pencil
} from 'lucide-react';
import type { Work, Branch, Copy, WorkWithCopiesCount } from '../../types/database';
import { 
  supabase, 
  isSupabaseConfigured, 
  INITIAL_WORKS, 
  INITIAL_BRANCHES, 
  INITIAL_COPIES, 
  CURATED_MOS_WORKS,
  CURATED_MOS_COPIES,
  loadCuratedCollection,
  getWorksWithInventory, 
  getStoredBranches, 
  getStoredCopies, 
  getStoredWorks,
  clearAllPlatformData 
} from '../../lib/supabaseClient';
import { BookCard } from './BookCard';
import { DublinCoreModal } from './DublinCoreModal';
import { Marc21Modal } from './Marc21Modal';
import { EditWorkModal } from './EditWorkModal';
import { RegisterWorkModal } from '../works/RegisterWorkModal';
import { QuickAddCopyModal } from '../copies/QuickAddCopyModal';
import { PrintSpineLabelsModal } from '../copies/PrintSpineLabelsModal';
import { DEWEY_GROUPS, getDeweyInfo } from '../../lib/dewey';

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
  const [viewMode, setViewMode] = useState<'gallery' | 'table'>('gallery');
  const [activeModalWork, setActiveModalWork] = useState<WorkWithCopiesCount | null>(null);
  const [activeMarcWork, setActiveMarcWork] = useState<WorkWithCopiesCount | null>(null);
  const [_dataSource, setDataSource] = useState<'supabase' | 'local'>('local');

  // Modals state
  const [editingWork, setEditingWork] = useState<WorkWithCopiesCount | null>(null);
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
    if (window.confirm('¿Deseas vaciar el inventario? Esta acción dejará el catálogo en blanco.')) {
      clearAllPlatformData();
      fetchWorksCatalog();
      showToast('Inventario vaciado exitosamente.', 'info');
    }
  };

  const handleRestoreCurated = () => {
    loadCuratedCollection();
    fetchWorksCatalog();
    showToast('Colección Fundamental de Miguel Otero Silva y Literatura Universal cargada exitosamente.', 'success');
  };

  // Fetch catalog data from Supabase or fallback store
  const fetchWorksCatalog = async () => {
    setLoading(true);
    setError(null);

    try {
      if (isSupabaseConfigured && supabase) {
        const { data: worksData, error: worksError } = await supabase
          .from('works')
          .select('*')
          .order('title', { ascending: true });

        if (worksError) throw new Error(worksError.message);

        const { data: branchesData, error: branchesError } = await supabase.from('branches').select('*');
        if (branchesError) throw new Error(branchesError.message);

        const { data: copiesData, error: copiesError } = await supabase.from('copies').select('*');
        if (copiesError) throw new Error(copiesError.message);

        // Sincronizar en localStorage para que todos los módulos tengan la data fresca de Supabase
        if (typeof window !== 'undefined') {
          if (worksData) localStorage.setItem('manglar_works', JSON.stringify(worksData));
          if (copiesData) localStorage.setItem('manglar_copies', JSON.stringify(copiesData));
          if (branchesData) localStorage.setItem('manglar_branches', JSON.stringify(branchesData));
        }

        const enriched = getWorksWithInventory(
          (worksData as Work[]) || [],
          (branchesData as Branch[]) || [],
          (copiesData as Copy[]) || []
        );

        setWorks(enriched);
        setDataSource('supabase');
      } else {
        const currentCopies = getStoredCopies();
        const currentWorks = getStoredWorks();
        const currentBranches = getStoredBranches();

        const enriched = getWorksWithInventory(currentWorks, currentBranches, currentCopies);
        setWorks(enriched);
        setDataSource('local');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al conectar con Supabase';
      setError(message);
      // Mantener los datos almacenados localmente sin forzar la colección estática si fue eliminada
      const currentCopies = getStoredCopies();
      const currentWorks = getStoredWorks();
      const currentBranches = getStoredBranches();
      const enriched = getWorksWithInventory(currentWorks, currentBranches, currentCopies);
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
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        work.title.toLowerCase().includes(query) ||
        work.author.toLowerCase().includes(query) ||
        (work.isbn && work.isbn.toLowerCase().includes(query)) ||
        work.dewey_code.includes(query) ||
        (work.subjects && work.subjects.some((s) => s.toLowerCase().includes(query)));

      if (!matchesSearch) return false;

      if (selectedDewey !== 'all') {
        const rawDewey = (work.dewey_code || '').trim();
        const numOnly = rawDewey.split('.')[0].replace(/[^0-9]/g, '');
        const padded = numOnly.padEnd(3, '0').slice(0, 3);
        const hundredGroup = padded.charAt(0) + '00';

        if (selectedDewey.startsWith('group_')) {
          const targetGroup = selectedDewey.replace('group_', '');
          if (hundredGroup !== targetGroup) return false;
        } else if (selectedDewey.endsWith('00')) {
          if (hundredGroup !== selectedDewey && !rawDewey.startsWith(selectedDewey.charAt(0))) {
            return false;
          }
        } else {
          const divisionPrefix = selectedDewey.slice(0, 2);
          const matchesPrefix = padded.startsWith(divisionPrefix) || rawDewey.startsWith(divisionPrefix);
          const matchesExact = padded === selectedDewey || rawDewey === selectedDewey || rawDewey.startsWith(selectedDewey);
          if (!matchesPrefix && !matchesExact) return false;
        }
      }

      if (selectedBranchFilter === 'all') {
        return true;
      } else if (selectedBranchFilter === 'central') {
        return work.copies_by_branch.some((b) => b.branch_type === 'internal' && b.count > 0);
      } else if (selectedBranchFilter === 'semilla') {
        return work.copies_by_branch.some((b) => b.branch_type === 'external_donation' && b.count > 0);
      } else {
        return work.copies_by_branch.some(
          (b) => (b.branch_id === selectedBranchFilter || b.branch_name.toLowerCase().includes(selectedBranchFilter.toLowerCase())) && b.count > 0
        );
      }
    });
  }, [works, searchQuery, selectedDewey, selectedBranchFilter]);

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
      {/* 1. Header de Archivo Integrado (Sin cajas burbuja flotantes) */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#83B141]">
              Inventario
            </span>
            <span className="text-neutral-300">•</span>
            <span className="text-xs font-semibold text-neutral-500">
              Colegio Integral El Manglar
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
            Inventario
          </h2>

          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-neutral-600">
            <span className="inline-flex items-center gap-1.5 font-semibold text-neutral-900">
              <span className="w-2 h-2 rounded-full bg-[#83B141]" />
              {works.length} Obras ({totalCopiesCount} Ejemplares)
            </span>
            <span className="text-neutral-300">|</span>
            <span>Campus Central: <strong className="text-neutral-900">{totalCentralCount}</strong></span>
            <span className="text-neutral-300">|</span>
            <span>Semilla Manglareña: <strong className="text-[#83B141]">{totalDonationsCount}</strong></span>
          </div>
        </div>

        {/* Acciones Curatoriales */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setPrintModalWork(null);
              setPrintModalCopies(undefined);
              setPrintModalTitle(undefined);
              setIsPrintSpineModalOpen(true);
            }}
            className="px-3 py-2 bg-white hover:bg-neutral-50 border border-[#D3D2D3] text-neutral-700 rounded-xl text-xs font-semibold shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
            title="Imprimir o exportar tejuelos catalográficos (25x38 mm)"
          >
            <Printer className="w-3.5 h-3.5 text-neutral-600" strokeWidth={1.5} />
            <span className="hidden sm:inline">Tejuelos</span>
          </button>

          <button
            onClick={() => {
              const publicUrl = `${window.location.origin}${window.location.pathname}?mode=public`;
              navigator.clipboard.writeText(publicUrl);
              showToast('Enlace de consulta pública OPAC copiado al portapapeles.', 'success');
            }}
            className="px-3 py-2 bg-white hover:bg-neutral-50 border border-[#D3D2D3] text-neutral-700 rounded-xl text-xs font-semibold shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
            title="Copiar enlace para estudiantes y familias"
          >
            <Share2 className="w-3.5 h-3.5 text-neutral-600" strokeWidth={1.5} />
            <span className="hidden sm:inline">OPAC Alumnos</span>
          </button>

          <button
            id="open-register-work-btn"
            onClick={() => setIsRegisterWorkModalOpen(true)}
            className="px-4 py-2 bg-[#83B141] hover:bg-[#719b35] text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            <BookPlus className="w-4 h-4" strokeWidth={2} />
            <span>+ Registrar Obra</span>
          </button>
        </div>
      </div>

      {/* 2. Barra Curatorial de Búsqueda y Filtros Unificada */}
      <div className="bg-white border-y border-[#D3D2D3]/70 py-3 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Campo de Búsqueda */}
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" strokeWidth={1.5} />
            <input
              id="catalog-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título, autor (e.g. Miguel Otero Silva), ISBN o CDD..."
              className="w-full pl-9 pr-8 py-2 bg-[#F8F9F8] border border-[#D3D2D3] rounded-xl text-xs sm:text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#83B141]/30 focus:border-[#83B141] transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro de Sedes y Alternador de Vistas */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Filtro de Sedes */}
            <select
              id="branch-filter-select"
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="px-3 py-2 bg-[#F8F9F8] border border-[#D3D2D3] rounded-xl text-xs font-semibold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#83B141]/30 focus:border-[#83B141] transition cursor-pointer"
            >
              <option value="all">Todas las sedes (6)</option>
              <option value="central">Campus Central (Primaria/Bachillerato)</option>
              <option value="semilla">Semilla Manglareña (Dotación Rural)</option>
            </select>

            {/* Alternador de Vista (Galería vs Tabla) */}
            <div className="flex bg-[#F8F9F8] p-1 rounded-xl border border-[#D3D2D3]">
              <button
                onClick={() => setViewMode('gallery')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'gallery'
                    ? 'bg-white text-neutral-950 shadow-2xs'
                    : 'text-neutral-400 hover:text-neutral-800'
                }`}
                title="Vista de Galería"
              >
                <LayoutGrid className="w-4 h-4" strokeWidth={1.75} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-neutral-950 shadow-2xs'
                    : 'text-neutral-400 hover:text-neutral-800'
                }`}
                title="Vista de Inventario (Tabla)"
              >
                <List className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>

        {/* Barra de Filtros Dewey con Scroll Lateral Fino */}
        <div className="flex items-center gap-1.5 custom-scrollbar-x pb-1 text-xs">
          <span className="text-neutral-400 text-[11px] font-medium mr-1 shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3 text-[#83B141]" strokeWidth={1.5} /> Clases CDD:
          </span>
          <button
            onClick={() => setSelectedDewey('all')}
            className={`px-3 py-1 rounded-lg font-semibold transition shrink-0 cursor-pointer text-xs ${
              selectedDewey === 'all'
                ? 'bg-[#83B141] text-white shadow-xs'
                : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-[#D3D2D3]'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setSelectedDewey('group_800')}
            className={`px-3 py-1 rounded-lg font-semibold transition shrink-0 cursor-pointer text-xs ${
              selectedDewey === 'group_800' || selectedDewey === '800'
                ? 'bg-[#83B141] text-white shadow-xs'
                : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-[#D3D2D3]'
            }`}
          >
            800 - Literatura
          </button>
          <button
            onClick={() => setSelectedDewey('860')}
            className={`px-3 py-1 rounded-lg font-semibold transition shrink-0 cursor-pointer text-xs ${
              selectedDewey === '860'
                ? 'bg-[#83B141] text-white shadow-xs'
                : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-[#D3D2D3]'
            }`}
          >
            860 - Literatura Hispanoamericana (Otero Silva)
          </button>
          <button
            onClick={() => setSelectedDewey('group_500')}
            className={`px-3 py-1 rounded-lg font-semibold transition shrink-0 cursor-pointer text-xs ${
              selectedDewey === 'group_500' || selectedDewey === '500'
                ? 'bg-[#83B141] text-white shadow-xs'
                : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-[#D3D2D3]'
            }`}
          >
            500 - Ciencias Puras
          </button>
          <button
            onClick={() => setSelectedDewey('group_300')}
            className={`px-3 py-1 rounded-lg font-semibold transition shrink-0 cursor-pointer text-xs ${
              selectedDewey === 'group_300' || selectedDewey === '300'
                ? 'bg-[#83B141] text-white shadow-xs'
                : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-[#D3D2D3]'
            }`}
          >
            300 - Ciencias Sociales
          </button>
          <button
            onClick={() => setSelectedDewey('group_900')}
            className={`px-3 py-1 rounded-lg font-semibold transition shrink-0 cursor-pointer text-xs ${
              selectedDewey === 'group_900' || selectedDewey === '900'
                ? 'bg-[#83B141] text-white shadow-xs'
                : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-[#D3D2D3]'
            }`}
          >
            900 - Historia & Geografía
          </button>
        </div>
      </div>

      {/* Notificación Toast */}
      {toastNotification && (
        <div className="p-4 rounded-xl bg-neutral-900 text-white shadow-lg flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4 text-[#83B141] shrink-0" />
            <span>{toastNotification.message}</span>
          </div>
          <button
            onClick={() => setToastNotification(null)}
            className="text-neutral-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg hover:bg-neutral-800 transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Skeletons de Carga */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#D3D2D3] p-4 space-y-4 animate-pulse">
              <div className="h-4 bg-neutral-200 rounded w-1/3"></div>
              <div className="flex gap-3">
                <div className="w-24 h-36 bg-neutral-200 rounded shrink-0"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-neutral-200 rounded w-full"></div>
                  <div className="h-3 bg-neutral-200 rounded w-2/3"></div>
                  <div className="h-3 bg-neutral-100 rounded w-4/5"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State con botón para restaurar la colección curada */}
      {!loading && works.length === 0 && (
        <div className="bg-white rounded-xl border border-[#D3D2D3] p-12 text-center max-w-lg mx-auto space-y-4 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-[#f2f7ec] text-[#83B141] mx-auto flex items-center justify-center border border-[#83B141]/30">
            <BookOpen className="w-7 h-7" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900">Inventario Listo para Cargar</h3>
            <p className="text-xs text-neutral-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
              El inventario está disponible. Puedes iniciar registrando un libro por ISBN o cargar de inmediato el Inventario Fundamental Miguel Otero Silva y Clásicos.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleRestoreCurated}
              className="px-4 py-2 bg-[#83B141] hover:bg-[#719b35] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" strokeWidth={1.75} />
              <span>Cargar Inventario Fundamental MOS</span>
            </button>
            <button
              onClick={() => setIsRegisterWorkModalOpen(true)}
              className="px-4 py-2 bg-white hover:bg-neutral-50 border border-[#D3D2D3] text-neutral-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <BookPlus className="w-4 h-4" strokeWidth={1.75} />
              <span>+ Registrar Obra</span>
            </button>
          </div>
        </div>
      )}

      {/* No Results Filter State */}
      {!loading && works.length > 0 && filteredWorks.length === 0 && (
        <div className="bg-white rounded-xl border border-[#D3D2D3] p-10 text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-xl bg-neutral-100 text-neutral-500 mx-auto flex items-center justify-center">
            <Search className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <h3 className="text-base font-bold text-neutral-900">No se encontraron obras coincidentes</h3>
          <p className="text-xs text-neutral-500">
            Intenta ajustar los términos de búsqueda o los filtros de clases Dewey seleccionados.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedDewey('all');
              setSelectedBranchFilter('all');
            }}
            className="px-4 py-2 bg-white hover:bg-neutral-50 text-neutral-700 border border-[#D3D2D3] rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Limpiar Filtros
          </button>
        </div>
      )}

      {/* 3. VISTA A: Galería Visual de Portadas */}
      {!loading && filteredWorks.length > 0 && viewMode === 'gallery' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredWorks.map((work) => (
            <BookCard
              key={work.id}
              work={work}
              onOpenDetails={(w) => setActiveModalWork(w)}
              onEdit={(w) => setEditingWork(w)}
              onOpenMarc21={(w) => setActiveMarcWork(w)}
              onQuickRegisterCopy={(w) => setQuickAddCopyWork(w)}
              onAddCopy={onSelectWorkForCopy}
              onPrintSpineLabels={(w) => {
                setPrintModalWork(w);
                setPrintModalCopies(undefined);
                setPrintModalTitle(w.title);
                setIsPrintSpineModalOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* 4. VISTA B: Fichero de Archivo (Tabla Tabular de Alta Densidad para Bibliotecarios) */}
      {!loading && filteredWorks.length > 0 && viewMode === 'table' && (
        <div className="bg-white rounded-xl border border-[#D3D2D3] overflow-hidden shadow-2xs">
          <div className="custom-scrollbar-x overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9F8] border-b border-[#D3D2D3] text-neutral-600 font-bold uppercase tracking-wider text-[10.5px]">
                <tr>
                  <th className="py-3 px-4">Portada</th>
                  <th className="py-3 px-4">Título & Autor</th>
                  <th className="py-3 px-4">Clasificación CDD</th>
                  <th className="py-3 px-4">ISBN</th>
                  <th className="py-3 px-4 text-center">Campus Central</th>
                  <th className="py-3 px-4 text-center">Dotación Rural</th>
                  <th className="py-3 px-4 text-center">Total</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D3D2D3]/60">
                {filteredWorks.map((work) => {
                  const deweyInfo = getDeweyInfo(work.dewey_code);
                  const central = (work.copies_by_branch || [])
                    .filter((b) => b.branch_type === 'internal')
                    .reduce((acc, curr) => acc + curr.count, 0);
                  const rural = (work.copies_by_branch || [])
                    .filter((b) => b.branch_type === 'external_donation')
                    .reduce((acc, curr) => acc + curr.count, 0);
                  const total = work.total_copies;

                  return (
                    <tr key={work.id} className="hover:bg-[#F8F9F8] transition-colors">
                      {/* Portada */}
                      <td className="py-2.5 px-4">
                        <div className="w-10 h-14 rounded bg-neutral-100 overflow-hidden border border-neutral-200 shrink-0">
                          <img
                            src={work.cover_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300'}
                            alt={work.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </td>

                      {/* Título & Autor */}
                      <td className="py-2.5 px-4 max-w-xs">
                        <div className="font-bold text-neutral-900 truncate" title={work.title}>
                          {work.title}
                        </div>
                        <div className="text-neutral-500 font-medium truncate">
                          {work.author} ({work.publication_year || 'S/F'})
                        </div>
                      </td>

                      {/* CDD */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded bg-neutral-100 border border-[#D3D2D3] text-neutral-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#83B141]"></span>
                          {work.dewey_code}
                        </span>
                        <div className="text-[10px] text-neutral-400 truncate max-w-[120px] mt-0.5">
                          {deweyInfo.name.replace(/^[0-9]+\s*/, '')}
                        </div>
                      </td>

                      {/* ISBN */}
                      <td className="py-2.5 px-4 font-mono text-[11px] text-neutral-500 whitespace-nowrap">
                        {work.isbn || '—'}
                      </td>

                      {/* Campus Central */}
                      <td className="py-2.5 px-4 text-center font-bold text-neutral-800">
                        {central}
                      </td>

                      {/* Dotación Rural */}
                      <td className="py-2.5 px-4 text-center font-bold text-[#83B141]">
                        {rural}
                      </td>

                      {/* Total */}
                      <td className="py-2.5 px-4 text-center font-black text-neutral-900">
                        {total}
                      </td>

                      {/* Acciones */}
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingWork(work)}
                            title="Editar obra y ejemplares"
                            className="p-1.5 rounded-lg bg-white hover:bg-[#f2f7ec] text-neutral-700 hover:text-[#3b5e14] border border-[#D3D2D3] hover:border-[#83B141]/50 transition cursor-pointer shadow-2xs"
                          >
                            <Pencil className="w-3.5 h-3.5 text-[#83B141]" strokeWidth={1.75} />
                          </button>

                          <button
                            onClick={() => setActiveModalWork(work)}
                            title="Ficha Dublin Core"
                            className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition cursor-pointer"
                          >
                            <Info className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </button>

                          <button
                            onClick={() => setActiveMarcWork(work)}
                            title="Ver MARC21"
                            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-[#83B141] transition cursor-pointer"
                          >
                            <FileCode className="w-3.5 h-3.5" strokeWidth={1.75} />
                          </button>

                          <button
                            onClick={() => setQuickAddCopyWork(work)}
                            title="Añadir Ejemplar"
                            className="p-1.5 rounded-lg bg-[#f2f7ec] hover:bg-[#83B141]/20 text-[#2c4210] border border-[#83B141]/30 transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                          </button>

                          <button
                            onClick={() => {
                              setPrintModalWork(work);
                              setPrintModalCopies(undefined);
                              setPrintModalTitle(work.title);
                              setIsPrintSpineModalOpen(true);
                            }}
                            title="Imprimir Tejuelo"
                            className="p-1.5 rounded-lg bg-white hover:bg-neutral-100 border border-[#D3D2D3] text-neutral-700 transition cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modales */}
      {activeModalWork && (
        <DublinCoreModal
          work={activeModalWork}
          onClose={() => setActiveModalWork(null)}
          onOpenEdit={(w) => setEditingWork(w)}
        />
      )}

      {editingWork && (
        <EditWorkModal
          work={editingWork}
          isOpen={Boolean(editingWork)}
          onClose={() => setEditingWork(null)}
          onWorkUpdated={(_updatedWork) => {
            fetchWorksCatalog();
            showToast('Inventario y ejemplares actualizados exitosamente.', 'success');
          }}
          onWorkDeleted={(_deletedWorkId) => {
            fetchWorksCatalog();
            showToast('Obra eliminada del inventario.', 'info');
          }}
        />
      )}

      {activeMarcWork && (
        <Marc21Modal
          work={activeMarcWork}
          onClose={() => setActiveMarcWork(null)}
        />
      )}

      {isRegisterWorkModalOpen && (
        <RegisterWorkModal
          isOpen={isRegisterWorkModalOpen}
          onClose={() => setIsRegisterWorkModalOpen(false)}
          onWorkCreated={(_newWork) => {
            fetchWorksCatalog();
            showToast('Nueva obra registrada exitosamente en el inventario.', 'success');
          }}
        />
      )}

      {quickAddCopyWork && (
        <QuickAddCopyModal
          isOpen={Boolean(quickAddCopyWork)}
          work={quickAddCopyWork}
          onClose={() => setQuickAddCopyWork(null)}
          onCopyAdded={(_newCopy) => {
            fetchWorksCatalog();
            showToast('Ejemplar físico registrado exitosamente con marbete.', 'success');
          }}
        />
      )}

      {isPrintSpineModalOpen && (
        <PrintSpineLabelsModal
          isOpen={isPrintSpineModalOpen}
          onClose={() => setIsPrintSpineModalOpen(false)}
          selectedWork={printModalWork || undefined}
          initialCopies={printModalCopies}
          singleWorkTitle={printModalTitle}
        />
      )}
    </div>
  );
};
