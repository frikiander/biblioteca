import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BookOpen, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  User, 
  Clock, 
  ArrowRight, 
  Check, 
  BookMarked,
  Sparkles,
  Building2,
  Tag,
  Infinity as InfinityIcon,
  Barcode,
  Layers,
  X,
  RotateCcw
} from 'lucide-react';
import type { Copy, Student, Loan, Work, Branch } from '../../types/database';
import { findCopyByCode, findActiveLoanByCopyCode, registerLoan, normalizeMarbeteCode } from '../../lib/loans';
import { getStoredWorks, getStoredCopies, getStoredBranches, isSupabaseConfigured, supabase } from '../../lib/supabaseClient';
import { getDeweyInfo } from '../../lib/dewey';
import { StudentSearchDropdown } from './StudentSearchDropdown';

interface CheckoutTabProps {
  onLoanCreated?: (loan: Loan) => void;
  onNavigateToCheckin?: (marbeteCode: string) => void;
}

export const CheckoutTab: React.FC<CheckoutTabProps> = ({
  onLoanCreated,
  onNavigateToCheckin,
}) => {
  // Inventory state
  const [allWorks, setAllWorks] = useState<Work[]>([]);
  const [allCopies, setAllCopies] = useState<Copy[]>([]);
  const [allBranches, setAllBranches] = useState<Branch[]>([]);

  // Search Mode: 'by_book' (default requested by user) | 'by_marbete'
  const [searchMode, setSearchMode] = useState<'by_book' | 'by_marbete'>('by_book');

  // Book search & selection
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [isBookDropdownOpen, setIsBookDropdownOpen] = useState(false);
  const bookDropdownRef = useRef<HTMLDivElement>(null);

  // Marbete input state (for direct barcode scanning)
  const [marbeteInput, setMarbeteInput] = useState('');
  const [detectedCopy, setDetectedCopy] = useState<Copy | null>(null);
  const [activeLoanOnCopy, setActiveLoanOnCopy] = useState<Loan | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Form State
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [dueDays, setDueDays] = useState<number | null>(7);
  const [isIndefinite, setIsIndefinite] = useState(false);
  const [customDueDate, setCustomDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successLoan, setSuccessLoan] = useState<Loan | null>(null);

  const refreshInventory = () => {
    const works = getStoredWorks();
    const copies = getStoredCopies();
    const branches = getStoredBranches();
    setAllWorks(works);
    setAllCopies(copies);
    setAllBranches(branches);

    if (isSupabaseConfigured && supabase) {
      supabase.from('works').select('*').then(({ data: wData }) => {
        if (wData && wData.length > 0) setAllWorks(wData);
      });
      supabase.from('copies').select('*').then(({ data: cData }) => {
        if (cData && cData.length > 0) setAllCopies(cData);
      });
      supabase.from('branches').select('*').then(({ data: bData }) => {
        if (bData && bData.length > 0) setAllBranches(bData);
      });
    }
  };

  useEffect(() => {
    refreshInventory();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bookDropdownRef.current && !bookDropdownRef.current.contains(e.target as Node)) {
        setIsBookDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredWorks = useMemo(() => {
    const q = bookSearchQuery.trim().toLowerCase();
    if (!q) return allWorks.slice(0, 10);
    return allWorks.filter((w) => {
      const matchTitle = w.title?.toLowerCase().includes(q);
      const matchAuthor = w.author?.toLowerCase().includes(q);
      const matchDewey = w.dewey_code?.toLowerCase().includes(q);
      const matchIsbn = w.isbn?.toLowerCase().includes(q);
      return matchTitle || matchAuthor || matchDewey || matchIsbn;
    }).slice(0, 15);
  }, [allWorks, bookSearchQuery]);

  const selectedWorkCopies = useMemo(() => {
    if (!selectedWork) return [];
    return allCopies
      .filter((c) => c.work_id === selectedWork.id)
      .map((copy) => {
        const branch = allBranches.find((b) => b.id === copy.branch_id);
        const activeLoan = findActiveLoanByCopyCode(copy.internal_code);
        return {
          ...copy,
          work: selectedWork,
          branch,
          activeLoan,
          isAvailable: !activeLoan && (copy.status === 'disponible' || !copy.status),
        };
      });
  }, [selectedWork, allCopies, allBranches]);

  const handleSelectWork = (work: Work) => {
    setSelectedWork(work);
    setBookSearchQuery('');
    setIsBookDropdownOpen(false);
    setErrorBanner(null);

    const copies = allCopies.filter((c) => c.work_id === work.id);
    if (copies.length === 1) {
      const singleCopy = copies[0];
      const active = findActiveLoanByCopyCode(singleCopy.internal_code);
      const branch = allBranches.find((b) => b.id === singleCopy.branch_id);
      const fullCopy = { ...singleCopy, work, branch };
      setDetectedCopy(fullCopy);
      setActiveLoanOnCopy(active);
    } else {
      setDetectedCopy(null);
      setActiveLoanOnCopy(null);
    }
  };

  const handleClearSelectedWork = () => {
    setSelectedWork(null);
    setDetectedCopy(null);
    setActiveLoanOnCopy(null);
    setBookSearchQuery('');
    setErrorBanner(null);
  };

  const handleSelectCopy = (copy: Copy & { activeLoan?: Loan | null; isAvailable?: boolean }) => {
    if (!copy.isAvailable) {
      if (copy.activeLoan) {
        setActiveLoanOnCopy(copy.activeLoan);
        setDetectedCopy(copy);
      }
      return;
    }
    setDetectedCopy(copy);
    setActiveLoanOnCopy(null);
    setErrorBanner(null);
  };

  // Validate marbete code
  const handleValidateMarbete = (codeToSearch: string) => {
    const clean = codeToSearch.trim();
    if (!clean) {
      setDetectedCopy(null);
      setActiveLoanOnCopy(null);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setErrorBanner(null);

    const foundCopy = findCopyByCode(clean);
    setHasSearched(true);

    if (foundCopy) {
      setDetectedCopy(foundCopy);
      if (foundCopy.work) {
        setSelectedWork(foundCopy.work);
      }
      const existingLoan = findActiveLoanByCopyCode(foundCopy.internal_code);
      setActiveLoanOnCopy(existingLoan);
    } else {
      setDetectedCopy(null);
      setActiveLoanOnCopy(null);
    }

    setIsSearching(false);
  };

  // Trigger search on typing (debounced) or Enter for direct marbete mode
  useEffect(() => {
    if (searchMode === 'by_marbete' && marbeteInput.trim().length >= 3) {
      const timer = setTimeout(() => {
        handleValidateMarbete(marbeteInput);
      }, 300);
      return () => clearTimeout(timer);
    } else if (searchMode === 'by_marbete' && marbeteInput.trim().length === 0) {
      setDetectedCopy(null);
      setActiveLoanOnCopy(null);
      setHasSearched(false);
    }
  }, [marbeteInput, searchMode]);

  const handleDueDaysChange = (days: number) => {
    setIsIndefinite(false);
    setDueDays(days);
    const d = new Date();
    d.setDate(d.getDate() + days);
    setCustomDueDate(d.toISOString().split('T')[0]);
  };

  const handleSelectIndefinite = () => {
    setIsIndefinite(true);
    setDueDays(null);
  };

  const handleCustomDateChange = (dateStr: string) => {
    setIsIndefinite(false);
    setCustomDueDate(dateStr);
    const target = new Date(dateStr);
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    setDueDays(Math.max(1, diffDays));
  };

  const handleSubmitCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detectedCopy) {
      setErrorBanner('Debes ingresar y validar un código de marbete válido.');
      return;
    }

    if (activeLoanOnCopy) {
      setErrorBanner(`Este ejemplar ya está prestado a ${activeLoanOnCopy.student_name}.`);
      return;
    }

    if (!selectedStudent || !selectedStudent.name.trim()) {
      setErrorBanner('Por favor selecciona o ingresa el nombre del alumno que retira el libro.');
      return;
    }

    setIsSubmitting(true);
    setErrorBanner(null);

    const result = registerLoan({
      copy: detectedCopy,
      student: selectedStudent,
      dueDays: isIndefinite ? null : dueDays,
      isIndefinite,
      customDueDate: isIndefinite ? null : customDueDate,
      checkoutNotes,
    });

    setIsSubmitting(false);

    if (!result.success || !result.loan) {
      setErrorBanner(result.error || 'Ocurrió un error al registrar el préstamo.');
      return;
    }

    setSuccessLoan(result.loan);
    if (onLoanCreated) {
      onLoanCreated(result.loan);
    }
  };

  const handleResetForNextLoan = () => {
    setMarbeteInput('');
    setBookSearchQuery('');
    setSelectedWork(null);
    setDetectedCopy(null);
    setActiveLoanOnCopy(null);
    setHasSearched(false);
    setSelectedStudent(null);
    setCheckoutNotes('');
    setErrorBanner(null);
    setSuccessLoan(null);
    setIsIndefinite(false);
    handleDueDaysChange(7);
    refreshInventory();
  };

  const deweyInfo = detectedCopy?.work?.dewey_code
    ? getDeweyInfo(detectedCopy.work.dewey_code)
    : null;

  return (
    <div className="space-y-6">
      {/* Success Confirmation Receipt Card */}
      {successLoan ? (
        <div className="p-6 sm:p-8 bg-white rounded-3xl border border-emerald-200 shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3.5 text-emerald-800">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Préstamo Confirmado
              </span>
              <h3 className="text-xl font-bold text-slate-900">
                ¡Libro Prestado con Éxito!
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <div className="space-y-2">
              <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">
                Datos del Libro
              </span>
              <p className="text-sm font-bold text-slate-900">{successLoan.work_title}</p>
              <p className="text-slate-600">{successLoan.work_author}</p>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-mono font-bold text-emerald-800 text-xs shadow-2xs">
                <Tag className="w-3 h-3 text-emerald-600" />
                <span>Marbete: {successLoan.copy_internal_code}</span>
              </div>
            </div>

            <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-4">
              <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">
                Lector & Plazo
              </span>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#83B141] text-white font-bold flex items-center justify-center text-[10px]">
                  {successLoan.student_name.charAt(0)}
                </div>
                <span className="font-bold text-slate-900 text-sm">{successLoan.student_name}</span>
              </div>
              <p className="text-slate-600">{successLoan.student_grade || 'Alumno Colegio El Manglar'}</p>
              <div className="space-y-1.5 text-xs text-neutral-700 pt-1">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#83B141]" />
                  <span>
                    Fecha y hora de salida:{' '}
                    <strong className="text-neutral-900">
                      {new Date(successLoan.loan_date).toLocaleDateString('es-VE', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}{' '}
                      a las{' '}
                      {new Date(successLoan.loan_date).toLocaleTimeString('es-VE', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {successLoan.is_indefinite || !successLoan.due_date ? (
                    <>
                      <InfinityIcon className="w-4 h-4 text-[#83B141]" />
                      <span className="text-neutral-900 font-bold bg-[#83B141]/10 px-2 py-0.5 rounded border border-[#83B141]/30">
                        Plazo Indefinido (Sin fecha límite)
                      </span>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-3.5 h-3.5 text-[#83B141]" />
                      <span>
                        Devolución esperada:{' '}
                        <strong className="text-neutral-900">
                          {new Date(successLoan.due_date).toLocaleDateString('es-VE', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </strong>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetForNextLoan}
              className="w-full sm:w-auto px-6 py-3 bg-[#83B141] hover:bg-[#719b35] text-white rounded-xl font-bold text-sm transition shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              Prestar Otro Libro
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmitCheckout} className="space-y-6">
          {/* Main Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-[#D3D2D3] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-[#83B141] uppercase tracking-widest flex items-center gap-1.5">
                  <BookMarked className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Módulo de Circulación • Salida de Material
                </span>
                <h2 className="text-xl font-bold text-neutral-900 mt-0.5">
                  Prestar Libro Físico (Checkout)
                </h2>
              </div>
              <div className="text-xs text-neutral-600 bg-[#F8F9F8] border border-[#D3D2D3] px-3.5 py-1.5 rounded-xl self-start sm:self-auto font-medium">
                Búsqueda por libro o autor • Selección y verificación de marbete
              </div>
            </div>

            {/* Error Banner */}
            {errorBanner && (
              <div className="m-6 mb-0 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="flex-1">{errorBanner}</p>
              </div>
            )}

            <div className="p-6 space-y-6">
              {/* STEP 1: Book & Physical Copy Selection */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      1. Seleccionar Libro y Ejemplar Físico <span className="text-rose-500">*</span>
                    </label>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      {searchMode === 'by_book'
                        ? 'Busca la obra por su nombre o autor y selecciona el ejemplar que sale en préstamo'
                        : 'Ingresa o escanea el código de marbete del lomo con un lector de código de barras'}
                    </p>
                  </div>

                  {/* Mode switcher tabs */}
                  <div className="inline-flex p-1 bg-[#F8F9F8] border border-[#D3D2D3] rounded-xl text-xs font-semibold self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setSearchMode('by_book')}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                        searchMode === 'by_book'
                          ? 'bg-[#83B141] text-white font-bold shadow-2xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Buscar Obra / Autor</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSearchMode('by_marbete')}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                        searchMode === 'by_marbete'
                          ? 'bg-[#83B141] text-white font-bold shadow-2xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      <Barcode className="w-3.5 h-3.5" />
                      <span>Escanear Marbete</span>
                    </button>
                  </div>
                </div>

                {/* MODE A: SEARCH BY BOOK / AUTHOR */}
                {searchMode === 'by_book' && (
                  <div className="space-y-3">
                    {!selectedWork ? (
                      <div className="relative" ref={bookDropdownRef}>
                        <div className="relative flex items-center">
                          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none" />
                          <input
                            type="text"
                            value={bookSearchQuery}
                            onChange={(e) => {
                              setBookSearchQuery(e.target.value);
                              setIsBookDropdownOpen(true);
                            }}
                            onFocus={() => setIsBookDropdownOpen(true)}
                            placeholder="Buscar libro por título, autor o clasificación CDD (ej: Casas Muertas, Cervantes)..."
                            className="w-full pl-10 pr-4 py-3 bg-[#F8F9F8] border-2 border-[#D3D2D3] rounded-2xl text-sm font-medium text-neutral-900 placeholder-neutral-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#83B141]/10 focus:border-[#83B141] transition"
                          />
                        </div>

                        {/* Dropdown list of matching works */}
                        {isBookDropdownOpen && (
                          <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-[#D3D2D3] rounded-2xl shadow-xl overflow-hidden max-h-80 flex flex-col animate-in fade-in-50 duration-150">
                            <div className="p-2.5 bg-[#F8F9F8] border-b border-[#D3D2D3] flex items-center justify-between text-xs text-neutral-600 font-semibold">
                              <span>Obras registradas en el Inventario ({filteredWorks.length})</span>
                              <span className="text-[11px] text-neutral-400">Selecciona una obra para ver sus ejemplares</span>
                            </div>

                            <div className="overflow-y-auto divide-y divide-neutral-100 flex-1 p-1">
                              {filteredWorks.length === 0 ? (
                                <div className="p-6 text-center text-xs text-neutral-500 space-y-1">
                                  <p className="font-semibold text-neutral-700">No se encontraron libros con "{bookSearchQuery}"</p>
                                  <p className="text-[11px] text-neutral-400">Prueba con otra palabra clave, autor o número CDD.</p>
                                </div>
                              ) : (
                                filteredWorks.map((work) => {
                                  const copies = allCopies.filter((c) => c.work_id === work.id);
                                  const availableCopies = copies.filter((c) => !findActiveLoanByCopyCode(c.internal_code) && (c.status === 'disponible' || !c.status));

                                  return (
                                    <button
                                      key={work.id}
                                      type="button"
                                      onClick={() => handleSelectWork(work)}
                                      className="w-full text-left p-3 rounded-xl transition hover:bg-[#F8F9F8] flex items-center justify-between gap-3 cursor-pointer group"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-14 rounded-lg bg-[#F8F9F8] border border-[#D3D2D3] overflow-hidden shrink-0 flex items-center justify-center">
                                          {work.cover_url ? (
                                            <img src={work.cover_url} alt={work.title} className="w-full h-full object-cover" />
                                          ) : (
                                            <BookOpen className="w-5 h-5 text-[#83B141]" strokeWidth={1.5} />
                                          )}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-sm text-neutral-900 truncate group-hover:text-[#83B141] transition">
                                              {work.title}
                                            </span>
                                            <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-[#EFDA18] text-neutral-900 border border-[#EFDA18]/40 shrink-0">
                                              CDD {work.dewey_code}
                                            </span>
                                          </div>
                                          <p className="text-xs text-neutral-500 truncate mt-0.5">{work.author}</p>
                                        </div>
                                      </div>

                                      <div className="text-right shrink-0">
                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                          availableCopies.length > 0
                                            ? 'bg-[#83B141]/15 text-[#83B141] border border-[#83B141]/30'
                                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                                        }`}>
                                          {availableCopies.length} {availableCopies.length === 1 ? 'disponible' : 'disponibles'}
                                        </span>
                                        <span className="block text-[10px] text-neutral-400 mt-0.5">
                                          de {copies.length} {copies.length === 1 ? 'ejemplar' : 'ejemplares'}
                                        </span>
                                      </div>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Selected Work Banner */
                      <div className="space-y-3">
                        <div className="p-4 bg-white border border-[#D3D2D3] rounded-2xl shadow-2xs flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-12 h-16 rounded-xl bg-[#F8F9F8] border border-[#D3D2D3] overflow-hidden shrink-0 flex items-center justify-center">
                              {selectedWork.cover_url ? (
                                <img src={selectedWork.cover_url} alt={selectedWork.title} className="w-full h-full object-cover" />
                              ) : (
                                <BookOpen className="w-6 h-6 text-[#83B141]" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold text-[#83B141] uppercase tracking-wider">
                                  Obra Seleccionada
                                </span>
                                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-[#EFDA18] text-neutral-900 border border-[#EFDA18]/40">
                                  CDD {selectedWork.dewey_code}
                                </span>
                              </div>
                              <h3 className="font-bold text-base text-neutral-900 truncate mt-0.5">
                                {selectedWork.title}
                              </h3>
                              <p className="text-xs text-neutral-600 truncate">{selectedWork.author}</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleClearSelectedWork}
                            className="px-3 py-1.5 bg-[#F8F9F8] hover:bg-neutral-100 text-neutral-700 border border-[#D3D2D3] rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Cambiar libro</span>
                          </button>
                        </div>

                        {/* Physical Copies Picker */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-neutral-800 flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-[#83B141]" />
                              Ejemplares Físicos Registrados ({selectedWorkCopies.length})
                            </span>
                            <span className="text-neutral-500 text-[11px]">
                              Haz clic sobre el ejemplar para seleccionarlo
                            </span>
                          </div>

                          {selectedWorkCopies.length === 0 ? (
                            <div className="p-5 text-center bg-[#F8F9F8] border border-dashed border-[#D3D2D3] rounded-2xl text-xs text-neutral-500 space-y-1">
                              <p className="font-semibold text-neutral-700">Esta obra aún no tiene ejemplares físicos registrados en el inventario.</p>
                              <p className="text-neutral-500">Debes registrar al menos un ejemplar físico en el inventario para poder prestarlo.</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {selectedWorkCopies.map((copy, index) => {
                                const isSelected = detectedCopy?.id === copy.id;
                                const isAvailable = copy.isAvailable;

                                return (
                                  <div
                                    key={copy.id}
                                    onClick={() => isAvailable && handleSelectCopy(copy)}
                                    className={`p-3.5 rounded-2xl border transition flex flex-col justify-between gap-3 ${
                                      isSelected
                                        ? 'bg-[#83B141]/5 border-2 border-[#83B141] shadow-xs'
                                        : isAvailable
                                        ? 'bg-white border-[#D3D2D3] hover:border-neutral-400 cursor-pointer'
                                        : 'bg-neutral-50 border-neutral-200 opacity-70 cursor-not-allowed'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                                            isSelected ? 'bg-[#83B141] text-white' : 'bg-neutral-200 text-neutral-700'
                                          }`}>
                                            {index + 1}
                                          </span>
                                          <span className="font-bold text-xs text-neutral-800">
                                            Ejemplar #{index + 1}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-neutral-500 flex items-center gap-1">
                                          <Building2 className="w-3 h-3 text-neutral-400" />
                                          <span>{copy.branch?.name || 'Sede Central'}</span>
                                        </p>
                                      </div>

                                      <div>
                                        {isAvailable ? (
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#83B141]/15 text-[#83B141] border border-[#83B141]/30">
                                            Disponible
                                          </span>
                                        ) : (
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                                            Prestado
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Marbete display in copy card */}
                                    <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                                      <div>
                                        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">
                                          Código Marbete
                                        </span>
                                        <span className="font-mono text-xs sm:text-sm font-bold text-neutral-900">
                                          {copy.internal_code}
                                        </span>
                                      </div>

                                      <span className="text-[10px] font-medium text-neutral-500 capitalize bg-neutral-100 px-2 py-0.5 rounded-md">
                                        {copy.condition}
                                      </span>
                                    </div>

                                    {/* Loan notice if occupied */}
                                    {!isAvailable && copy.activeLoan && (
                                      <p className="text-[10px] text-amber-800 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                                        En préstamo con <strong>{copy.activeLoan.student_name}</strong>
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* MODE B: DIRECT MARBETE SCANNER ENTRY */}
                {searchMode === 'by_marbete' && (
                  <div className="space-y-2">
                    <div className="relative flex items-center">
                      <input
                        id="marbete-code-input"
                        type="text"
                        value={marbeteInput}
                        onChange={(e) => setMarbeteInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleValidateMarbete(marbeteInput);
                          }
                        }}
                        placeholder="Escanea o teclea el marbete (ej: MOS-PRI-860-OTEc-001)..."
                        className="w-full px-4 py-3 bg-[#F8F9F8] border-2 border-[#D3D2D3] rounded-2xl text-base font-mono font-bold text-neutral-900 placeholder-neutral-400 focus:bg-white focus:outline-none focus:border-[#83B141] focus:ring-4 focus:ring-[#83B141]/10 transition uppercase tracking-wider"
                      />
                      {marbeteInput && (
                        <button
                          type="button"
                          onClick={() => handleValidateMarbete(marbeteInput)}
                          className="absolute right-2 px-3 py-1.5 bg-[#83B141] hover:bg-[#719b35] text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <Search className="w-3.5 h-3.5" />
                          Validar
                        </button>
                      )}
                    </div>

                    {/* Validation Status Display */}
                    {hasSearched && !detectedCopy && (
                      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">No se encontró ningún ejemplar con el marbete "{marbeteInput.toUpperCase()}"</p>
                          <p className="text-amber-800 text-[11px] mt-0.5">
                            Verifica que el marbete coincida con el inventario o búscalo por el título o autor en la pestaña anterior.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* COPY ALREADY LOANED ALERT */}
                {detectedCopy && activeLoanOnCopy && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <span className="font-bold text-sm text-amber-900">
                          ⚠️ Este ejemplar ya se encuentra PRESTADO
                        </span>
                        <p className="text-amber-800">
                          El libro <span className="font-bold">"{detectedCopy.work?.title}"</span> con marbete <span className="font-mono font-bold">{detectedCopy.internal_code}</span> está actualmente en manos de:
                        </p>
                        <div className="p-2.5 bg-white/90 rounded-xl border border-amber-200 font-semibold text-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-amber-700" />
                            <span>{activeLoanOnCopy.student_name} ({activeLoanOnCopy.student_grade || 'Alumno'})</span>
                          </div>
                          <div className="text-[11px] text-neutral-600 space-y-0.5 text-right">
                            <span className="block">
                              Salida: <strong className="text-neutral-900">
                                {new Date(activeLoanOnCopy.loan_date).toLocaleDateString('es-VE', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}{' '}
                                a las{' '}
                                {new Date(activeLoanOnCopy.loan_date).toLocaleTimeString('es-VE', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true,
                                })}
                              </strong>
                            </span>
                            <span className="block text-neutral-500">
                              Retorno previsto: <strong className="text-amber-900">
                                {activeLoanOnCopy.due_date
                                  ? new Date(activeLoanOnCopy.due_date).toLocaleDateString('es-VE', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    })
                                  : 'Indefinido'}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {onNavigateToCheckin && (
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => onNavigateToCheckin(detectedCopy.internal_code)}
                          className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <span>Ir a Devolver este Libro Ahora</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* PROMINENT MARBETE VERIFICATION BANNER */}
                {detectedCopy && !activeLoanOnCopy && (
                  <div className="p-4.5 rounded-2xl bg-[#F8F9F8] border-2 border-[#83B141] shadow-xs space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between pb-2.5 border-b border-[#D3D2D3]">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-[#83B141]" />
                        <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                          Paso de Verificación de Marbete
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-[#83B141] bg-[#83B141]/10 px-2 py-0.5 rounded-full border border-[#83B141]/30">
                        ✓ Ejemplar Listo para Salida
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                          Código de Marbete Impreso en el Lomo del Libro:
                        </span>
                        <div className="inline-flex items-center gap-2 bg-white border-2 border-neutral-900 px-4 py-2 rounded-xl shadow-2xs">
                          <Barcode className="w-5 h-5 text-neutral-700" />
                          <span className="font-mono text-lg font-black text-neutral-900 tracking-wider select-all">
                            {detectedCopy.internal_code}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-neutral-600 bg-white p-3 rounded-xl border border-[#D3D2D3] sm:max-w-xs">
                        <p className="font-semibold text-neutral-800">Verificación física:</p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          Confirma que el marbete en el lomo del libro físico coincida exactamente con <span className="font-mono font-bold text-neutral-900">{detectedCopy.internal_code}</span>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 2: Student Searchable Dropdown */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  2. Alumno / Lector que Recibe el Libro <span className="text-rose-500">*</span>
                </label>
                <StudentSearchDropdown
                  selectedStudent={selectedStudent}
                  onSelectStudent={(student) => setSelectedStudent(student)}
                  disabled={!detectedCopy || Boolean(activeLoanOnCopy)}
                />
                {!detectedCopy && (
                  <p className="text-[11px] text-slate-400">
                    Selecciona primero el libro y el ejemplar arriba para habilitar la selección del alumno.
                  </p>
                )}
              </div>

              {/* STEP 3: Loan Duration & Return Date with INDEFINIDO */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    3. Plazo de Devolución
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Selecciona un plazo o marca <strong className="text-teal-800">Indefinido</strong> para préstamos docentes o prolongados
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {[
                    { label: '3 Días', sub: 'Lectura corta', days: 3 },
                    { label: '7 Días', sub: '1 Semana', days: 7 },
                    { label: '14 Días', sub: '2 Semanas', days: 14 },
                    { label: '30 Días', sub: '1 Mes', days: 30 },
                  ].map((preset) => (
                    <button
                      key={preset.days}
                      type="button"
                      disabled={!detectedCopy || Boolean(activeLoanOnCopy)}
                      onClick={() => handleDueDaysChange(preset.days)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                        !isIndefinite && dueDays === preset.days
                          ? 'bg-[#83B141] text-white border-[#83B141] shadow-xs'
                          : 'bg-[#F8F9F8] text-neutral-700 border-[#D3D2D3] hover:bg-neutral-100'
                      } ${(!detectedCopy || Boolean(activeLoanOnCopy)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span>{preset.label}</span>
                      <span className={`text-[10px] font-normal ${!isIndefinite && dueDays === preset.days ? 'text-white/90' : 'text-neutral-400'}`}>
                        {preset.sub}
                      </span>
                    </button>
                  ))}

                  {/* Indefinite Option Button */}
                  <button
                    id="btn-loan-preset-indefinite"
                    type="button"
                    disabled={!detectedCopy || Boolean(activeLoanOnCopy)}
                    onClick={handleSelectIndefinite}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      isIndefinite
                        ? 'bg-[#83B141] text-white border-[#83B141] shadow-xs ring-2 ring-[#83B141]/30'
                        : 'bg-neutral-50 text-neutral-700 border-[#D3D2D3] hover:bg-neutral-100'
                    } ${(!detectedCopy || Boolean(activeLoanOnCopy)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-1">
                      <InfinityIcon className="w-3.5 h-3.5" />
                      <span>Indefinido</span>
                    </div>
                    <span className={`text-[10px] font-normal ${isIndefinite ? 'text-white/90' : 'text-neutral-500'}`}>
                      Sin fecha límite
                    </span>
                  </button>
                </div>

                {/* Real-time departure datetime and return limit */}
                <div className="p-3.5 bg-[#F8F9F8] rounded-xl border border-[#D3D2D3] space-y-2 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#D3D2D3]">
                    <div className="flex items-center gap-2 text-neutral-700">
                      <Clock className="w-4 h-4 text-[#83B141] shrink-0" />
                      <span>Fecha y hora de salida de préstamo:</span>
                      <strong className="text-neutral-900 font-semibold">
                        {new Date().toLocaleDateString('es-VE', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        •{' '}
                        {new Date().toLocaleTimeString('es-VE', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </strong>
                    </div>
                    <span className="text-[10px] font-bold text-[#83B141] bg-[#83B141]/10 px-2 py-0.5 rounded border border-[#83B141]/30 self-start sm:self-auto">
                      ● Registro en Tiempo Real
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-neutral-800 font-medium">
                      {isIndefinite ? (
                        <>
                          <InfinityIcon className="w-4 h-4 text-[#83B141] shrink-0" />
                          <span className="font-bold text-neutral-900">
                            Plazo: Indefinido (Sin límite de fecha / Préstamo docente o de aula)
                          </span>
                        </>
                      ) : (
                        <>
                          <Calendar className="w-4 h-4 text-[#83B141] shrink-0" />
                          <span>Fecha límite de retorno:</span>
                          <span className="font-bold text-emerald-900">
                            {new Date(customDueDate).toLocaleDateString('es-VE', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-[11px]">Personalizar fecha:</span>
                      <input
                        type="date"
                        value={isIndefinite ? '' : customDueDate}
                        disabled={!detectedCopy || Boolean(activeLoanOnCopy) || isIndefinite}
                        onChange={(e) => handleCustomDateChange(e.target.value)}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#83B141]/20 disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 4: Observations / Notes */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  4. Observaciones de Entrega (Opcional)
                </label>
                <input
                  type="text"
                  value={checkoutNotes}
                  disabled={!detectedCopy || Boolean(activeLoanOnCopy)}
                  onChange={(e) => setCheckoutNotes(e.target.value)}
                  placeholder="Ej: Para exposición del viernes, material de aula de ciencias, lectura guiada..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                />
              </div>
            </div>

            {/* Submit Action Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 text-center sm:text-left">
                {detectedCopy && !activeLoanOnCopy && selectedStudent ? (
                  <span className="text-emerald-800 font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Listo para registrar préstamo a {selectedStudent.name} ({isIndefinite ? 'Plazo Indefinido' : `${dueDays} días`})
                  </span>
                ) : (
                  <span>Completa el código de marbete y selecciona el alumno para habilitar el registro.</span>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleResetForNextLoan}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer"
                >
                  Limpiar
                </button>
                <button
                  type="submit"
                  id="btn-register-checkout"
                  disabled={
                    !detectedCopy ||
                    Boolean(activeLoanOnCopy) ||
                    !selectedStudent ||
                    isSubmitting
                  }
                  className="flex-1 sm:flex-initial px-6 py-3 bg-[#83B141] hover:bg-[#719b35] disabled:bg-neutral-200 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Registrando...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Registrar Préstamo</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
