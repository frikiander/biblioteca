'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  Search, 
  Library, 
  Share2, 
  Copy, 
  Check, 
  Info, 
  MapPin, 
  GraduationCap, 
  Clock, 
  ArrowLeft, 
  HeartHandshake, 
  BookCheck, 
  Sparkles,
  Layers,
  X,
  Filter,
  CheckCircle2,
  Calendar,
  Building,
  Tag
} from 'lucide-react';
import type { WorkWithCopiesCount, Branch, Work, Copy as CopyType } from '../../types/database';
import { 
  getWorksWithInventory, 
  getStoredBranches, 
  getStoredCopies, 
  getStoredWorks, 
  isSupabaseConfigured, 
  supabase 
} from '../../lib/supabaseClient';
import { DEWEY_GROUPS, getDeweyInfo } from '../../lib/dewey';

interface PublicCatalogPortalProps {
  onSwitchToAdmin?: () => void;
}

export const PublicCatalogPortal: React.FC<PublicCatalogPortalProps> = ({ onSwitchToAdmin }) => {
  const [works, setWorks] = useState<WorkWithCopiesCount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDewey, setSelectedDewey] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'central_only'>('all');
  const [selectedBook, setSelectedBook] = useState<WorkWithCopiesCount | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedBookInfo, setCopiedBookInfo] = useState<boolean>(false);

  // Cargar catálogo público desde Supabase o localStorage
  useEffect(() => {
    const loadCatalog = async () => {
      setLoading(true);
      try {
        if (isSupabaseConfigured && supabase) {
          const { data: worksData } = await supabase.from('works').select('*').order('title', { ascending: true });
          const { data: branchesData } = await supabase.from('branches').select('*');
          const { data: copiesData } = await supabase.from('copies').select('*');

          const enriched = getWorksWithInventory(
            (worksData as Work[]) || [],
            (branchesData as Branch[]) || [],
            (copiesData as CopyType[]) || []
          );
          setWorks(enriched);
        } else {
          const savedWorks = getStoredWorks();
          const savedBranches = getStoredBranches();
          const savedCopies = getStoredCopies();
          const enriched = getWorksWithInventory(savedWorks, savedBranches, savedCopies);
          setWorks(enriched);
        }
      } catch (err) {
        console.error('Error cargando catálogo público:', err);
        const savedWorks = getStoredWorks();
        const savedBranches = getStoredBranches();
        const savedCopies = getStoredCopies();
        setWorks(getWorksWithInventory(savedWorks, savedBranches, savedCopies));
      } finally {
        setLoading(false);
      }
    };

    loadCatalog();
  }, []);

  // Generar enlace para compartir catálogo público
  const handleShareCatalog = () => {
    const publicUrl = `${window.location.origin}${window.location.pathname}?mode=public`;
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Copiar datos del libro para solicitarlo
  const handleCopyBookData = (work: WorkWithCopiesCount) => {
    const text = `📖 Solicitud de Préstamo - Biblioteca Miguel Otero Silva\nColegio Integral El Manglar\n\n• Título: ${work.title}\n• Autor: ${work.author}\n• Clasificación CDD: ${work.dewey_code}\n• ISBN: ${work.isbn || 'N/A'}`;
    navigator.clipboard.writeText(text);
    setCopiedBookInfo(true);
    setTimeout(() => setCopiedBookInfo(false), 2500);
  };

  // Filtrado de obras
  const filteredWorks = useMemo(() => {
    return works.filter((w) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        w.title.toLowerCase().includes(q) ||
        w.author.toLowerCase().includes(q) ||
        w.dewey_code.includes(q) ||
        (w.isbn && w.isbn.toLowerCase().includes(q)) ||
        (w.subjects && w.subjects.some((s) => s.toLowerCase().includes(q)));

      const matchesDewey =
        selectedDewey === 'all' ||
        w.dewey_code.startsWith(selectedDewey.charAt(0));

      const centralCount = (w.copies_by_branch || [])
        .filter((b) => b.branch_type === 'internal')
        .reduce((acc, curr) => acc + curr.count, 0);

      const matchesAvailability =
        availabilityFilter === 'all' ||
        (availabilityFilter === 'central_only' && (centralCount > 0 || (w.total_copies > 0)));

      return matchesSearch && matchesDewey && matchesAvailability;
    });
  }, [works, searchQuery, selectedDewey, availabilityFilter]);

  const totalCentralAvailable = works.reduce((sum, w) => {
    const centralCount = (w.copies_by_branch || [])
      .filter((b) => b.branch_type === 'internal')
      .reduce((acc, curr) => acc + curr.count, 0);
    return sum + (centralCount > 0 ? centralCount : (w.total_copies > 0 ? w.total_copies : 0));
  }, 0);

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-800 flex flex-col font-sans">
      {/* Public Top Navbar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-lg">
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
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    Catálogo Abierto
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Biblioteca Miguel Otero Silva
                </h1>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Portal de consulta bibliográfica para estudiantes, docentes y familias
                </p>
              </div>
            </div>

            {/* Actions: Share Public Link & Admin Return */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleShareCatalog}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/20 transition cursor-pointer"
                title="Copiar enlace directo de este catálogo para enviar a estudiantes y representantes"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-200" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedLink ? '¡Enlace Copiado!' : 'Compartir Catálogo'}</span>
              </button>

              {onSwitchToAdmin && (
                <button
                  onClick={onSwitchToAdmin}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-medium transition cursor-pointer hidden md:flex items-center gap-1.5"
                  title="Regresar al panel de gestión bibliotecaria interna"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Panel Administrativo</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        
        {/* Welcome Hero Banner */}
        <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-emerald-800/40 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fondo Bibliográfico Escolar & Sala de Lectura</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Encuentra tu próximo libro y solicítalo en la biblioteca
            </h2>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Explora todas las obras registradas bajo el estándar de Clasificación Decimal Dewey. Consulta sinopsis, autores y disponibilidad para solicitar tu préstamo directamente en el campus del Colegio Integral El Manglar.
            </p>

            {/* 3 Steps Guide to borrow a book */}
            <div className="pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-emerald-800/50">
              <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10 flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div className="text-xs">
                  <span className="font-bold text-white block">Busca tu libro</span>
                  <span className="text-[11px] text-slate-300">Por título, autor o tu tema preferido.</span>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10 flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div className="text-xs">
                  <span className="font-bold text-white block">Anota el CDD / Título</span>
                  <span className="text-[11px] text-slate-300">Guarda la clasificación del libro.</span>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10 flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div className="text-xs">
                  <span className="font-bold text-white block">Solicítalo en Biblioteca</span>
                  <span className="text-[11px] text-slate-300">En el Módulo de Primaria o Bachillerato.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="md:col-span-8 relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por título, autor (ej: Miguel Otero Silva, Cervantes), tema o CDD..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Availability Filter */}
            <div className="md:col-span-4">
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value as 'all' | 'central_only')}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition cursor-pointer"
              >
                <option value="all">Todos los libros del catálogo</option>
                <option value="central_only">🟢 Solo disponibles en el Colegio</option>
              </select>
            </div>
          </div>

          {/* Dewey Category Quick Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-semibold uppercase text-[10px] shrink-0 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Áreas:
            </span>
            <button
              onClick={() => setSelectedDewey('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition shrink-0 cursor-pointer ${
                selectedDewey === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              Todas las Áreas ({works.length})
            </button>
            {DEWEY_GROUPS.map((group) => {
              const countInGroup = works.filter((w) => w.dewey_code.startsWith(group.code.charAt(0))).length;
              return (
                <button
                  key={group.code}
                  onClick={() => setSelectedDewey(group.code)}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    selectedDewey === group.code
                      ? 'bg-emerald-800 text-white font-bold shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{group.name.split(' ')[1] || group.name}</span>
                  <span className="text-[10px] opacity-75 font-mono">({countInGroup})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Info Header */}
        <div className="flex items-center justify-between text-xs text-slate-600 px-1">
          <span>
            Mostrando <strong>{filteredWorks.length}</strong> {filteredWorks.length === 1 ? 'libro' : 'libros'} en el catálogo
          </span>
          <span className="text-emerald-800 font-semibold flex items-center gap-1">
            <BookCheck className="w-3.5 h-3.5" />
            {totalCentralAvailable} ejemplares en el campus escolar
          </span>
        </div>

        {/* Book Grid */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Cargando catálogo bibliográfico...</p>
          </div>
        ) : filteredWorks.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No se encontraron libros con estos filtros</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Intenta buscar por otro término o restablece los filtros de categoría para ver todos los libros disponibles.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedDewey('all');
                setAvailabilityFilter('all');
              }}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Ver Todo el Catálogo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredWorks.map((work) => {
              const deweyInfo = getDeweyInfo(work.dewey_code);
              const centralCopies = (work.copies_by_branch || [])
                .filter((b) => b.branch_type === 'internal')
                .reduce((acc, curr) => acc + curr.count, 0);
              const ruralCopies = (work.copies_by_branch || [])
                .filter((b) => b.branch_type === 'external_donation')
                .reduce((acc, curr) => acc + curr.count, 0);

              const displayCentral = (centralCopies + ruralCopies === 0 && work.total_copies > 0)
                ? work.total_copies
                : centralCopies;

              return (
                <div
                  key={work.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-xl hover:border-emerald-300 transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Top Dewey Pill */}
                  <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${deweyInfo.badgeBg} ${deweyInfo.badgeText}`}>
                      CDD {work.dewey_code}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono truncate">
                      {work.publication_year || 'S/A'}
                    </span>
                  </div>

                  {/* Book Cover and Basic Info */}
                  <div className="p-4 flex gap-3.5 flex-1">
                    <img
                      src={work.cover_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300'}
                      alt={work.title}
                      className="w-20 h-28 object-cover rounded-xl shadow-md border border-slate-200 bg-slate-100 shrink-0 group-hover:scale-102 transition duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300';
                      }}
                    />

                    <div className="space-y-1 min-w-0 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2" title={work.title}>
                          {work.title}
                        </h4>
                        <p className="text-xs text-emerald-800 font-medium truncate mt-0.5">
                          {work.author}
                        </p>
                      </div>

                      {/* Stock availability indicator */}
                      <div className="pt-2">
                        {displayCentral > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            {displayCentral} {displayCentral === 1 ? 'ejemplar en colegio' : 'ejemplares en colegio'}
                          </span>
                        ) : ruralCopies > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                            🌿 Dotación Rural ({ruralCopies})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                            Consultar en biblioteca
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="p-3 bg-slate-50 border-t border-slate-100">
                    <button
                      onClick={() => setSelectedBook(work)}
                      className="w-full py-2 bg-slate-900 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>Ver Ficha & Solicitar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Book Detail Modal for Public */}
      {selectedBook && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => e.target === e.currentTarget && setSelectedBook(null)}
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 my-6">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between sticky top-0 backdrop-blur-md z-10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Ficha de Consulta Bibliográfica</h3>
                  <p className="text-xs text-slate-500">Biblioteca Miguel Otero Silva • Colegio Integral El Manglar</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBook(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Book Header */}
              <div className="flex flex-col sm:flex-row gap-5 items-start bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <img
                  src={selectedBook.cover_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300'}
                  alt={selectedBook.title}
                  className="w-24 h-36 object-cover rounded-xl shadow-md border border-slate-200 shrink-0 mx-auto sm:mx-0"
                />
                <div className="space-y-2 flex-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getDeweyInfo(selectedBook.dewey_code).badgeBg} ${getDeweyInfo(selectedBook.dewey_code).badgeText}`}>
                    CDD {selectedBook.dewey_code} • {getDeweyInfo(selectedBook.dewey_code).name}
                  </span>
                  <h4 className="text-lg font-bold text-slate-900 leading-snug">{selectedBook.title}</h4>
                  <p className="text-xs font-semibold text-emerald-800">Por {selectedBook.author}</p>
                  <p className="text-xs text-slate-600 line-clamp-3">
                    {selectedBook.description || 'Sin sinopsis bibliográfica registrada.'}
                  </p>
                </div>
              </div>

              {/* Physical Availability Info */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-emerald-700" />
                  Disponibilidad en Sedes
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {selectedBook.copies_by_branch.map((b) => (
                    <div
                      key={b.branch_id}
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        b.count > 0 ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <div>
                        <span className="font-bold block text-xs">{b.branch_name}</span>
                        <span className="text-[10px] opacity-80">
                          {b.branch_type === 'internal' ? 'Campus Colegio El Manglar' : 'Dotación Rural'}
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${b.count > 0 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        {b.count} {b.count === 1 ? 'ud.' : 'uds.'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* How to borrow this book card */}
              <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white p-5 rounded-2xl border border-emerald-800/40 space-y-3">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                  <GraduationCap className="w-4 h-4" />
                  <span>¿Cómo solicitar el préstamo de este libro?</span>
                </div>
                <ul className="text-xs text-slate-200 space-y-2 list-disc list-inside">
                  <li>
                    <strong>Ubicación:</strong> Dirígete a la <strong>Biblioteca Miguel Otero Silva</strong> en el campus del Colegio Integral El Manglar (Edificio Primaria o Bachillerato).
                  </li>
                  <li>
                    <strong>Identificación del libro:</strong> Pídele al bibliotecario la obra <em>"{selectedBook.title}"</em> bajo la clasificación Dewey <strong>CDD {selectedBook.dewey_code}</strong>.
                  </li>
                  <li>
                    <strong>Requisito:</strong> Indica tu nombre completo, grado/sección o carnet estudiantil institucional.
                  </li>
                  <li>
                    <strong>Tiempo de préstamo:</strong> 7 a 14 días renovables para estudio y lectura en casa.
                  </li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <button
                onClick={() => handleCopyBookData(selectedBook)}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedBookInfo ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                <span>{copiedBookInfo ? '¡Datos Copiados!' : 'Copiar Datos para Solicitud'}</span>
              </button>

              <button
                onClick={() => setSelectedBook(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Public Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-3 text-slate-700 font-semibold">
            <span>Colegio Integral El Manglar</span>
            <span>•</span>
            <span>Biblioteca Miguel Otero Silva</span>
            <span>•</span>
            <span>Colección Pública y Donaciones Rurales</span>
          </div>
          <p className="text-slate-400 max-w-lg mx-auto">
            Plataforma de consulta bibliográfica abierta a la comunidad educativa. Todos los derechos reservados.
          </p>
          {onSwitchToAdmin && (
            <div className="pt-2">
              <button
                onClick={onSwitchToAdmin}
                className="text-[11px] text-emerald-800 hover:text-emerald-950 underline font-semibold cursor-pointer"
              >
                Acceso para Bibliotecarios y Personal Docente
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};

export default PublicCatalogPortal;
