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
  Tag,
  Bookmark,
  Lightbulb
} from 'lucide-react';
import type { WorkWithCopiesCount, Branch, Work, Copy as CopyType, VirtualShelf } from '../../types/database';
import { 
  getWorksWithInventory, 
  getStoredBranches, 
  getStoredCopies, 
  getStoredWorks, 
  isSupabaseConfigured, 
  supabase 
} from '../../lib/supabaseClient';
import { DEWEY_GROUPS, getDeweyInfo } from '../../lib/dewey';
import { getStoredShelves } from '../../lib/shelves';
import { submitSuggestion } from '../../lib/suggestions';

interface PublicCatalogPortalProps {
  onSwitchToAdmin?: () => void;
}

export const PublicCatalogPortal: React.FC<PublicCatalogPortalProps> = ({ onSwitchToAdmin }) => {
  const [works, setWorks] = useState<WorkWithCopiesCount[]>([]);
  const [shelves, setShelves] = useState<VirtualShelf[]>([]);
  const [selectedShelfId, setSelectedShelfId] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDewey, setSelectedDewey] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'central_only'>('all');
  const [selectedBook, setSelectedBook] = useState<WorkWithCopiesCount | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedBookInfo, setCopiedBookInfo] = useState<boolean>(false);

  // Desiderata suggestion modal
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState<boolean>(false);
  const [sugTitle, setSugTitle] = useState<string>('');
  const [sugAuthor, setSugAuthor] = useState<string>('');
  const [sugReason, setSugReason] = useState<string>('');
  const [sugName, setSugName] = useState<string>('');
  const [sugGrade, setSugGrade] = useState<string>('');
  const [sugSent, setSugSent] = useState<boolean>(false);

  useEffect(() => {
    const loadCatalog = async () => {
      setLoading(true);
      try {
        setShelves(getStoredShelves());
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

  const handleShareCatalog = () => {
    const publicUrl = `${window.location.origin}${window.location.pathname}?mode=public`;
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyBookData = (work: WorkWithCopiesCount) => {
    const text = `📖 Solicitud de Préstamo - Biblioteca Miguel Otero Silva\nColegio Integral El Manglar\n\n• Título: ${work.title}\n• Autor: ${work.author}\n• Clasificación CDD: ${work.dewey_code}\n• ISBN: ${work.isbn || 'N/A'}`;
    navigator.clipboard.writeText(text);
    setCopiedBookInfo(true);
    setTimeout(() => setCopiedBookInfo(false), 2500);
  };

  const handleSendSuggestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sugTitle.trim() || !sugAuthor.trim() || !sugName.trim()) return;

    submitSuggestion({
      title: sugTitle,
      author: sugAuthor,
      reason: sugReason,
      suggestedByName: sugName,
      suggestedByGrade: sugGrade,
    });

    setSugSent(true);
    setTimeout(() => {
      setSugSent(false);
      setIsSuggestModalOpen(false);
      setSugTitle('');
      setSugAuthor('');
      setSugReason('');
      setSugName('');
      setSugGrade('');
    }, 2000);
  };

  const filteredWorks = useMemo(() => {
    return works.filter((w) => {
      // 1. Shelf filter
      if (selectedShelfId !== 'all') {
        const shelf = shelves.find((s) => s.id === selectedShelfId);
        if (shelf && shelf.items) {
          const inShelf = shelf.items.some((i) => i.work_id === w.id);
          if (!inShelf) return false;
        }
      }

      // 2. Search query filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        w.title.toLowerCase().includes(q) ||
        w.author.toLowerCase().includes(q) ||
        (w.isbn && w.isbn.toLowerCase().includes(q)) ||
        (w.dewey_code && w.dewey_code.includes(q)) ||
        (w.subjects && w.subjects.some((s) => s.toLowerCase().includes(q))) ||
        (w.description && w.description.toLowerCase().includes(q));

      // 3. Dewey classification filter
      const matchesDewey =
        selectedDewey === 'all' || w.dewey_code.startsWith(selectedDewey.charAt(0));

      // 4. Availability filter
      const centralCount = (w.copies_by_branch || [])
        .filter((b) => b.branch_type === 'internal')
        .reduce((acc, curr) => acc + curr.count, 0);

      const matchesAvailability =
        availabilityFilter === 'all' ||
        (availabilityFilter === 'central_only' && (centralCount > 0 || (w.total_copies > 0)));

      return matchesSearch && matchesDewey && matchesAvailability;
    });
  }, [works, searchQuery, selectedDewey, availabilityFilter, selectedShelfId, shelves]);

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
                    Catálogo Abierto (OPAC)
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

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSuggestModalOpen(true)}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer"
                title="Proponer un libro para que el colegio lo adquiera"
              >
                <Lightbulb className="w-4 h-4" />
                <span className="hidden sm:inline">Proponer un Libro</span>
                <span className="sm:hidden">Proponer</span>
              </button>

              <button
                onClick={handleShareCatalog}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer"
                title="Copiar enlace directo"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-200" /> : <Share2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{copiedLink ? '¡Copiado!' : 'Compartir'}</span>
              </button>

              {onSwitchToAdmin && (
                <button
                  onClick={onSwitchToAdmin}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-medium transition cursor-pointer hidden md:flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Panel Admin</span>
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
          </div>
        </div>

        {/* Virtual Shelves (Plan Lector & Colecciones Curadas) */}
        {shelves.length > 0 && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Bookmark className="w-4 h-4 text-emerald-700" />
              <span>Colecciones Curadas & Plan Lector:</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setSelectedShelfId('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
                  selectedShelfId === 'all'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Todas las Obras ({works.length})
              </button>
              {shelves.map((shelf) => (
                <button
                  key={shelf.id}
                  onClick={() => setSelectedShelfId(shelf.id)}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    selectedShelfId === shelf.id
                      ? 'bg-emerald-800 text-white font-bold shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{shelf.name}</span>
                  <span className="text-[10px] opacity-75">({shelf.items?.length || 0})</span>
                </button>
              ))}
            </div>
          </div>
        )}

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
              Áreas Dewey:
            </span>
            <button
              onClick={() => setSelectedDewey('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition shrink-0 cursor-pointer ${
                selectedDewey === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              Todas ({works.length})
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
                setSelectedShelfId('all');
                setAvailabilityFilter('all');
              }}
              className="px-4 py-2 bg-emerald-800 text-white font-bold rounded-xl text-xs"
            >
              Restablecer Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredWorks.map((work) => {
              const deweyInfo = getDeweyInfo(work.dewey_code);
              const centralCopies = (work.copies_by_branch || [])
                .filter((b) => b.branch_type === 'internal')
                .reduce((acc, curr) => acc + curr.count, 0);

              const isAvailable = centralCopies > 0 || work.total_copies > 0;

              return (
                <div
                  key={work.id}
                  onClick={() => setSelectedBook(work)}
                  className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-xl hover:border-emerald-300 transition duration-300 flex flex-col justify-between overflow-hidden cursor-pointer group"
                >
                  <div>
                    {/* Dewey Badge */}
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${deweyInfo.badgeBg} ${deweyInfo.badgeText}`}>
                        CDD {work.dewey_code}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {isAvailable ? 'Disponible' : 'Consultar'}
                      </span>
                    </div>

                    {/* Book Cover & Info */}
                    <div className="p-4 flex gap-3.5">
                      {work.cover_url ? (
                        <img
                          src={work.cover_url}
                          alt={work.title}
                          className="w-20 h-28 object-cover rounded-xl shadow-xs shrink-0 group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="w-20 h-28 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                          <BookOpen className="w-8 h-8" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-800 transition line-clamp-2 leading-tight">
                          {work.title}
                        </h3>
                        <p className="text-xs text-slate-600 font-medium mt-1 truncate">
                          {work.author}
                        </p>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
                          {work.description || 'Sin sinopsis registrada.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span className="font-semibold text-emerald-800">
                      {centralCopies > 0 ? `${centralCopies} ejemplar(es) en sede` : 'Consultar en sala'}
                    </span>
                    <span className="text-[11px] text-slate-400 group-hover:text-emerald-700 font-bold transition">
                      Ver Ficha →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal: Book Detail (Public) */}
      {selectedBook && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                {selectedBook.cover_url && (
                  <img
                    src={selectedBook.cover_url}
                    alt={selectedBook.title}
                    className="w-16 h-22 object-cover rounded-xl shadow-xs shrink-0"
                  />
                )}
                <div>
                  <span className="text-[10px] font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    CDD {selectedBook.dewey_code}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1 leading-tight">
                    {selectedBook.title}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">{selectedBook.author}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedBook(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-700 space-y-2">
              <p className="leading-relaxed">{selectedBook.description || 'Sin descripción registrada.'}</p>
              {selectedBook.publisher && <div><strong>Editorial:</strong> {selectedBook.publisher}</div>}
              {selectedBook.publication_year && <div><strong>Año:</strong> {selectedBook.publication_year}</div>}
              {selectedBook.isbn && <div><strong>ISBN:</strong> {selectedBook.isbn}</div>}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => handleCopyBookData(selectedBook)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedBookInfo ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedBookInfo ? '¡Copiado!' : 'Copiar para Solicitar'}</span>
              </button>

              <button
                onClick={() => setSelectedBook(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Public Suggestion / Desiderata */}
      {isSuggestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-600" />
                Proponer un Libro a la Biblioteca
              </h3>
              <button
                onClick={() => setIsSuggestModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {sugSent ? (
              <div className="py-8 text-center text-emerald-700 space-y-2">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600 animate-bounce" />
                <h4 className="font-bold text-sm">¡Sugerencia enviada con éxito!</h4>
                <p className="text-xs text-slate-500">El equipo de la biblioteca evaluará tu propuesta para próximas compras y dotaciones.</p>
              </div>
            ) : (
              <form onSubmit={handleSendSuggestion} className="mt-4 space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Título del Libro *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Fiebre o Relato de un Náufrago"
                    value={sugTitle}
                    onChange={(e) => setSugTitle(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Autor / Escritor *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Gabriel García Márquez"
                    value={sugAuthor}
                    onChange={(e) => setSugAuthor(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">¿Por qué te gustaría que esté en la biblioteca?</label>
                  <textarea
                    rows={2}
                    placeholder="ej. Para el club de lectura de 5to año o investigación..."
                    value={sugReason}
                    onChange={(e) => setSugReason(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Tu Nombre *</label>
                    <input
                      type="text"
                      required
                      placeholder="ej. Santiago Rivas"
                      value={sugName}
                      onChange={(e) => setSugName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Grado / Sección</label>
                    <input
                      type="text"
                      placeholder="ej. 5to Grado B"
                      value={sugGrade}
                      onChange={(e) => setSugGrade(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSuggestModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-sm"
                  >
                    Enviar Propuesta
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-3 text-slate-700 font-semibold">
            <span>Colegio Integral El Manglar</span>
            <span>•</span>
            <span>Biblioteca Miguel Otero Silva</span>
            <span>•</span>
            <span>Colección Abierta & Donaciones Rurales</span>
          </div>
          <p className="text-slate-400 max-w-lg mx-auto">
            Plataforma de consulta bibliográfica abierta a la comunidad educativa. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicCatalogPortal;
