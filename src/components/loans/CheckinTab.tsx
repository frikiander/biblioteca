import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  CheckCircle2, 
  RotateCcw, 
  Search, 
  AlertCircle, 
  User, 
  Calendar, 
  BookOpen, 
  Tag, 
  Clock, 
  MessageSquare,
  ArrowRight,
  Barcode,
  Layers,
  X,
  Building2,
  BookmarkCheck
} from 'lucide-react';
import type { Loan, CopyCondition } from '../../types/database';
import { findActiveLoanByCopyCode, returnLoan, findCopyByCode, getStoredLoans } from '../../lib/loans';

interface CheckinTabProps {
  initialCode?: string;
  onLoanReturned?: (loan: Loan) => void;
  onNavigateToCheckout?: () => void;
}

export const CheckinTab: React.FC<CheckinTabProps> = ({
  initialCode = '',
  onLoanReturned,
  onNavigateToCheckout,
}) => {
  // Navigation / search mode: 'search' (by book/patron/title) or 'scanner' (direct marbete entry)
  const [searchMode, setSearchMode] = useState<'search' | 'scanner'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [marbeteInput, setMarbeteInput] = useState(initialCode);
  const [activeLoan, setActiveLoan] = useState<Loan | null>(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [returnCondition, setReturnCondition] = useState<CopyCondition>('bueno');
  const [hasSearched, setHasSearched] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successReturn, setSuccessReturn] = useState<Loan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allLoans, setAllLoans] = useState<Loan[]>([]);

  const scannerInputRef = useRef<HTMLInputElement>(null);

  // Load all loans on mount
  const refreshLoansList = () => {
    setAllLoans(getStoredLoans());
  };

  useEffect(() => {
    refreshLoansList();
  }, []);

  // Filter only loans that are currently active or overdue
  const currentActiveLoans = useMemo(() => {
    return allLoans.filter((l) => l.status === 'active' || l.status === 'overdue');
  }, [allLoans]);

  // Filtered active loans based on search query (by book title, author, student name, or marbete)
  const filteredActiveLoans = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return currentActiveLoans;
    return currentActiveLoans.filter((loan) => {
      const matchTitle = loan.work_title.toLowerCase().includes(q);
      const matchAuthor = loan.work_author.toLowerCase().includes(q);
      const matchStudent = loan.student_name.toLowerCase().includes(q);
      const matchMarbete = loan.copy_internal_code.toLowerCase().includes(q);
      const matchDewey = loan.work_dewey_code ? loan.work_dewey_code.includes(q) : false;
      return matchTitle || matchAuthor || matchStudent || matchMarbete || matchDewey;
    });
  }, [currentActiveLoans, searchQuery]);

  // Handle direct code validation (scanner mode or prefilled initialCode)
  const handleValidateMarbete = (codeToSearch: string) => {
    const clean = codeToSearch.trim();
    if (!clean) {
      setActiveLoan(null);
      setHasSearched(false);
      setErrorBanner(null);
      return;
    }

    setErrorBanner(null);
    setHasSearched(true);

    const foundLoan = findActiveLoanByCopyCode(clean);

    if (foundLoan) {
      setActiveLoan(foundLoan);
      setErrorBanner(null);
    } else {
      setActiveLoan(null);
      // Check if copy exists in database
      const existingCopy = findCopyByCode(clean);
      if (existingCopy) {
        setErrorBanner(`El ejemplar con marbete "${existingCopy.internal_code}" ("${existingCopy.work?.title}") NO tiene un préstamo activo en este momento. Ya se encuentra disponible en inventario.`);
      } else {
        setErrorBanner(`No se encontró ningún ejemplar registrado con el marbete "${clean.toUpperCase()}".`);
      }
    }
  };

  useEffect(() => {
    if (initialCode) {
      setMarbeteInput(initialCode);
      setSearchMode('scanner');
      handleValidateMarbete(initialCode);
    }
  }, [initialCode]);

  // Select an active loan from the visual picker
  const handleSelectLoan = (loan: Loan) => {
    setActiveLoan(loan);
    setMarbeteInput(loan.copy_internal_code);
    setErrorBanner(null);
  };

  const handleClearSelectedLoan = () => {
    setActiveLoan(null);
    setMarbeteInput('');
    setErrorBanner(null);
  };

  // Handle Enter in scanner mode
  const handleKeyDownScanner = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleValidateMarbete(marbeteInput);
    }
  };

  const handleConfirmReturn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeLoan) return;

    setIsSubmitting(true);
    setErrorBanner(null);

    const result = await returnLoan({
      copyCode: activeLoan.copy_internal_code,
      returnNotes: returnNotes.trim() || 'Devuelto sin observaciones',
      returnCondition,
    });

    setIsSubmitting(false);

    if (!result.success || !result.loan) {
      setErrorBanner(result.error || 'Error al procesar la devolución.');
      return;
    }

    setSuccessReturn(result.loan);
    setActiveLoan(null);
    refreshLoansList();
    if (onLoanReturned) {
      onLoanReturned(result.loan);
    }
  };

  const handleResetForNextReturn = () => {
    setMarbeteInput('');
    setSearchQuery('');
    setActiveLoan(null);
    setReturnNotes('');
    setReturnCondition('bueno');
    setHasSearched(false);
    setErrorBanner(null);
    setSuccessReturn(null);
    refreshLoansList();
    if (searchMode === 'scanner') {
      setTimeout(() => scannerInputRef.current?.focus(), 50);
    }
  };

  // Helper formatters
  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return 'No especificada';
    const d = new Date(dateStr);
    const dateFormatted = d.toLocaleDateString('es-VE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timeFormatted = d.toLocaleTimeString('es-VE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${dateFormatted} a las ${timeFormatted}`;
  };

  const formatDateOnly = (dateStr?: string | null) => {
    if (!dateStr) return 'No especificada';
    return new Date(dateStr).toLocaleDateString('es-VE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Calculate loan duration and days
  const loanDaysElapsed = activeLoan
    ? Math.max(1, Math.ceil((Date.now() - new Date(activeLoan.loan_date).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isIndefinite = activeLoan?.is_indefinite || !activeLoan?.due_date;

  const isOverdue = activeLoan && !isIndefinite && activeLoan.due_date
    ? new Date(activeLoan.due_date).getTime() < Date.now()
    : false;

  return (
    <div className="space-y-6">
      {/* Success Notification */}
      {successReturn && (
        <div className="p-6 sm:p-8 bg-white rounded-3xl border border-emerald-200 shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3.5 text-emerald-800">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Devolución Procesada
              </span>
              <h3 className="text-xl font-bold text-neutral-900">
                ¡Libro Devuelto e Incorporado a Estantería!
              </h3>
            </div>
          </div>

          <div className="p-5 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-neutral-900 text-sm">{successReturn.work_title}</span>
              <span className="font-mono font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                Marbete: {successReturn.copy_internal_code}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-neutral-700 pt-1">
              <div>
                <p className="text-neutral-500 text-[11px]">Lector que entregó:</p>
                <p className="font-bold text-neutral-900">{successReturn.student_name} ({successReturn.student_grade || 'Alumno'})</p>
              </div>
              <div>
                <p className="text-neutral-500 text-[11px]">Fecha y hora de salida:</p>
                <p className="font-bold text-neutral-900">{formatDateTime(successReturn.loan_date)}</p>
              </div>
              <div>
                <p className="text-neutral-500 text-[11px]">Fecha y hora de retorno:</p>
                <p className="font-bold text-neutral-900">{formatDateTime(successReturn.return_date || new Date().toISOString())}</p>
              </div>
              <div>
                <p className="text-neutral-500 text-[11px]">Estado del ejemplar:</p>
                <p className="font-bold text-neutral-900 capitalize">{successReturn.return_condition || 'Bueno'}</p>
              </div>
            </div>

            {successReturn.return_notes && (
              <p className="text-neutral-700 italic bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                Observación: "{successReturn.return_notes}"
              </p>
            )}

            <p className="text-emerald-800 font-semibold pt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>El ejemplar ya se encuentra marcado como "Disponible" en el inventario para nuevos préstamos.</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetForNextReturn}
              className="w-full sm:w-auto px-6 py-3 bg-[#83B141] hover:bg-[#719b35] text-white rounded-xl font-bold text-sm transition shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Devolver Otro Libro
            </button>
          </div>
        </div>
      )}

      {/* Main Check-in Form */}
      {!successReturn && (
        <div className="bg-white rounded-3xl border border-[#D3D2D3] shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-[#D3D2D3] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-[#83B141] uppercase tracking-widest flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
                Módulo de Circulación • Retorno de Material
              </span>
              <h2 className="text-xl font-bold text-neutral-900 mt-0.5">
                Devolver Libro (Check-in)
              </h2>
            </div>
            <div className="text-xs text-neutral-600 bg-[#F8F9F8] border border-[#D3D2D3] px-3.5 py-1.5 rounded-xl self-start sm:self-auto font-medium">
              Búsqueda por libro, autor o lector • Verificación física de marbete
            </div>
          </div>

          {/* Error Banner */}
          {errorBanner && (
            <div className="m-6 mb-0 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="flex-1">{errorBanner}</p>
            </div>
          )}

          <div className="p-6 space-y-6">
            {/* Step 1: Mode selector and selection */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider">
                  1. Localizar Libro o Préstamo para Devolución <span className="text-rose-500">*</span>
                </label>

                {/* Search Mode Toggle */}
                <div className="flex items-center gap-1 bg-[#F8F9F8] p-1 rounded-xl border border-[#D3D2D3] self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchMode('search');
                      setErrorBanner(null);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      searchMode === 'search'
                        ? 'bg-[#83B141] text-white shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Buscar por Libro / Lector</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSearchMode('scanner');
                      setErrorBanner(null);
                      setTimeout(() => scannerInputRef.current?.focus(), 50);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      searchMode === 'scanner'
                        ? 'bg-[#83B141] text-white shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <Barcode className="w-3.5 h-3.5" />
                    <span>Escanear Marbete</span>
                  </button>
                </div>
              </div>

              {/* MODE A: INTERACTIVE SEARCH OR DIRECT PICKER */}
              {searchMode === 'search' && (
                <div className="space-y-4">
                  {!activeLoan ? (
                    <div className="space-y-3">
                      {/* Search bar */}
                      <div className="relative flex items-center">
                        <Search className="w-4 h-4 text-neutral-400 absolute left-4 pointer-events-none" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Buscar por título del libro, autor, nombre de alumno o marbete..."
                          className="w-full pl-11 pr-4 py-3 bg-[#F8F9F8] border-2 border-[#D3D2D3] rounded-2xl text-sm font-medium text-neutral-900 placeholder-neutral-400 focus:bg-white focus:outline-none focus:border-[#83B141] focus:ring-4 focus:ring-[#83B141]/10 transition"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 p-1 text-neutral-400 hover:text-neutral-700 rounded-full"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Header of the loans list */}
                      <div className="flex items-center justify-between text-xs px-1">
                        <span className="font-bold text-neutral-700 flex items-center gap-1.5">
                          <BookmarkCheck className="w-3.5 h-3.5 text-[#83B141]" />
                          {searchQuery
                            ? `Resultados coincidentes (${filteredActiveLoans.length})`
                            : `Préstamos Activos en Curso (${currentActiveLoans.length})`}
                        </span>
                        <span className="text-neutral-500 text-[11px]">
                          Haz clic en el libro que están entregando para verificarlo
                        </span>
                      </div>

                      {/* Active loans list / grid */}
                      {filteredActiveLoans.length === 0 ? (
                        <div className="p-8 text-center bg-[#F8F9F8] border border-dashed border-[#D3D2D3] rounded-2xl text-xs text-neutral-500 space-y-1">
                          <BookOpen className="w-8 h-8 mx-auto text-neutral-300" />
                          <p className="font-semibold text-neutral-700">
                            {searchQuery
                              ? `No hay préstamos activos que coincidan con "${searchQuery}"`
                              : 'No hay libros prestados en este momento.'}
                          </p>
                          <p className="text-[11px] text-neutral-400">
                            {searchQuery
                              ? 'Intenta con otra palabra clave o utiliza la pestaña "Escanear Marbete".'
                              : 'Todos los ejemplares del inventario están disponibles en sala.'}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                          {filteredActiveLoans.map((loan) => {
                            const isOverdueLoan = !loan.is_indefinite && loan.due_date && new Date(loan.due_date).getTime() < Date.now();

                            return (
                              <div
                                key={loan.id}
                                onClick={() => handleSelectLoan(loan)}
                                className="p-3.5 rounded-2xl bg-white border border-[#D3D2D3] hover:border-[#83B141] hover:shadow-xs transition cursor-pointer flex flex-col justify-between gap-3 group"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-14 rounded-lg bg-[#F8F9F8] border border-[#D3D2D3] overflow-hidden shrink-0 flex items-center justify-center">
                                    {loan.work_cover_url ? (
                                      <img src={loan.work_cover_url} alt={loan.work_title} className="w-full h-full object-cover" />
                                    ) : (
                                      <BookOpen className="w-5 h-5 text-[#83B141]" />
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {loan.work_dewey_code && (
                                        <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-[#EFDA18] text-neutral-900 border border-[#EFDA18]/40">
                                          CDD {loan.work_dewey_code}
                                        </span>
                                      )}
                                      <span
                                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                          isOverdueLoan
                                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                            : loan.is_indefinite
                                            ? 'bg-neutral-100 text-neutral-800'
                                            : 'bg-[#83B141]/15 text-[#83B141] border border-[#83B141]/30'
                                        }`}
                                      >
                                        {isOverdueLoan ? '⚠️ Atrasado' : loan.is_indefinite ? '♾️ Indefinido' : '✓ En Plazo'}
                                      </span>
                                    </div>

                                    <h4 className="font-bold text-xs text-neutral-900 truncate mt-1 group-hover:text-[#83B141] transition">
                                      {loan.work_title}
                                    </h4>
                                    <p className="text-[11px] text-neutral-500 truncate">{loan.work_author}</p>

                                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-neutral-700">
                                      <User className="w-3 h-3 text-[#83B141] shrink-0" />
                                      <span className="font-semibold truncate">{loan.student_name}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Marbete & Dates footer in card */}
                                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                                  <div>
                                    <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">
                                      Marbete
                                    </span>
                                    <span className="font-mono font-bold text-neutral-900">
                                      {loan.copy_internal_code}
                                    </span>
                                  </div>

                                  <div className="text-right">
                                    <span className="text-[9px] text-neutral-400 block">Salida</span>
                                    <span className="font-medium text-neutral-700">
                                      {formatDateOnly(loan.loan_date)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Selected Loan Header with option to change */
                    <div className="p-4 bg-white border border-[#D3D2D3] rounded-2xl shadow-2xs flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-16 rounded-xl bg-[#F8F9F8] border border-[#D3D2D3] overflow-hidden shrink-0 flex items-center justify-center">
                          {activeLoan.work_cover_url ? (
                            <img src={activeLoan.work_cover_url} alt={activeLoan.work_title} className="w-full h-full object-cover" />
                          ) : (
                            <BookOpen className="w-6 h-6 text-[#83B141]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold text-[#83B141] uppercase tracking-wider">
                              Libro en Proceso de Devolución
                            </span>
                            {activeLoan.work_dewey_code && (
                              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-[#EFDA18] text-neutral-900 border border-[#EFDA18]/40">
                                CDD {activeLoan.work_dewey_code}
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-base text-neutral-900 truncate mt-0.5">
                            {activeLoan.work_title}
                          </h3>
                          <p className="text-xs text-neutral-600 truncate">{activeLoan.work_author}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleClearSelectedLoan}
                        className="px-3 py-1.5 bg-[#F8F9F8] hover:bg-neutral-100 text-neutral-700 border border-[#D3D2D3] rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cambiar libro</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* MODE B: DIRECT MARBETE SCANNER INPUT */}
              {searchMode === 'scanner' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-neutral-500 font-medium">
                      Escanea con la pistola lectora o teclea el marbete y presiona <kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-300 rounded font-mono text-[10px]">Enter</kbd>
                    </span>
                  </div>

                  <div className="relative flex items-center">
                    <input
                      ref={scannerInputRef}
                      id="checkin-marbete-input"
                      type="text"
                      value={marbeteInput}
                      onChange={(e) => {
                        setMarbeteInput(e.target.value);
                        if (e.target.value.trim().length >= 3) {
                          handleValidateMarbete(e.target.value);
                        } else {
                          setActiveLoan(null);
                          setHasSearched(false);
                        }
                      }}
                      onKeyDown={handleKeyDownScanner}
                      placeholder="Teclea o escanea el marbete (ej. MOS-863-OTE-1)..."
                      className="w-full px-4 py-3 bg-[#F8F9F8] border-2 border-[#D3D2D3] rounded-2xl text-base font-mono font-bold text-neutral-900 placeholder-neutral-400 focus:bg-white focus:outline-none focus:border-[#83B141] focus:ring-4 focus:ring-[#83B141]/10 transition uppercase tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => handleValidateMarbete(marbeteInput)}
                      className="absolute right-2 px-3 py-1.5 bg-[#83B141] hover:bg-[#719b35] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Search className="w-3.5 h-3.5" />
                      Buscar Préstamo
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* PROMINENT MARBETE VERIFICATION & RETURN FORM */}
            {activeLoan && (
              <form onSubmit={handleConfirmReturn} className="space-y-6 pt-4 border-t border-[#D3D2D3] animate-in fade-in duration-200">
                {/* Visual Marbete Verification Banner */}
                <div className="p-4.5 rounded-2xl bg-[#F8F9F8] border-2 border-[#83B141] shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#D3D2D3]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-[#83B141]" />
                      <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                        Paso de Verificación de Marbete Físico
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-[#83B141] bg-[#83B141]/10 px-2 py-0.5 rounded-full border border-[#83B141]/30">
                      ✓ Ejemplar Identificado para Recepción
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                        Código de Marbete Impreso en el Lomo del Libro Devuelto:
                      </span>
                      <div className="inline-flex items-center gap-2 bg-white border-2 border-neutral-900 px-4 py-2 rounded-xl shadow-2xs">
                        <Barcode className="w-5 h-5 text-neutral-700" />
                        <span className="font-mono text-lg font-black text-neutral-900 tracking-wider select-all">
                          {activeLoan.copy_internal_code}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-neutral-600 bg-white p-3 rounded-xl border border-[#D3D2D3] sm:max-w-xs">
                      <p className="font-semibold text-neutral-800">Verificación física en mano:</p>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        Confirma que el marbete en el lomo del libro físico que estás recibiendo sea exactamente <span className="font-mono font-bold text-neutral-900">{activeLoan.copy_internal_code}</span>.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Detailed Loan Information: Lector, Departure Date & Time, Due Date */}
                <div className="p-4.5 rounded-2xl bg-white border border-[#D3D2D3] space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                    <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#83B141]" />
                      Detalles del Préstamo Activo y Trazabilidad
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        isOverdue
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : isIndefinite
                          ? 'bg-neutral-100 text-neutral-800 border border-neutral-300'
                          : 'bg-[#83B141]/15 text-[#83B141] border border-[#83B141]/30'
                      }`}
                    >
                      {isOverdue ? '⚠️ Préstamo Atrasado' : isIndefinite ? '♾️ Plazo Indefinido' : '✅ En Plazo Normal'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {/* Student Info */}
                    <div className="p-3 bg-[#F8F9F8] rounded-xl border border-[#D3D2D3]">
                      <span className="text-neutral-500 font-semibold block text-[10px] uppercase">Lector que lo entrega</span>
                      <p className="font-bold text-neutral-900 text-sm mt-0.5">{activeLoan.student_name}</p>
                      <p className="text-neutral-500 text-[11px]">{activeLoan.student_grade || 'Estudiante Colegio El Manglar'}</p>
                    </div>

                    {/* Departure Date and TIME */}
                    <div className="p-3 bg-[#F8F9F8] rounded-xl border border-[#D3D2D3]">
                      <span className="text-neutral-500 font-semibold block text-[10px] uppercase">Fecha y Hora de Salida</span>
                      <p className="font-bold text-neutral-900 mt-0.5">
                        {formatDateTime(activeLoan.loan_date)}
                      </p>
                      <p className="text-neutral-500 text-[11px] mt-0.5">
                        Tiempo transcurrido: <strong className="text-neutral-800">{loanDaysElapsed} {loanDaysElapsed === 1 ? 'día' : 'días'}</strong>
                      </p>
                    </div>

                    {/* Return Due Date */}
                    <div className="p-3 bg-[#F8F9F8] rounded-xl border border-[#D3D2D3]">
                      <span className="text-neutral-500 font-semibold block text-[10px] uppercase">Fecha Límite Prevista</span>
                      <p className={`font-bold mt-0.5 ${isOverdue ? 'text-rose-700' : 'text-neutral-900'}`}>
                        {isIndefinite
                          ? 'Plazo Indefinido (Sin límite)'
                          : activeLoan.due_date
                          ? formatDateOnly(activeLoan.due_date)
                          : 'Plazo Indefinido'}
                      </p>
                      <p className="text-neutral-500 text-[11px] mt-0.5">Sede: {activeLoan.branch_name || 'Sede Principal'}</p>
                    </div>
                  </div>
                </div>

                {/* Condition Selector upon Return */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider">
                    Estado Físico del Ejemplar al Retornar
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'bueno', label: 'Bueno (Impecable / Cuidado)' },
                      { value: 'regular', label: 'Regular (Desgaste menor)' },
                      { value: 'malo', label: 'Malo (Requiere reparación)' },
                    ].map((cond) => (
                      <button
                        key={cond.value}
                        type="button"
                        onClick={() => setReturnCondition(cond.value as CopyCondition)}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          returnCondition === cond.value
                            ? 'bg-[#83B141] text-white border-[#83B141] shadow-xs'
                            : 'bg-[#F8F9F8] text-neutral-700 border-[#D3D2D3] hover:bg-neutral-100'
                        }`}
                      >
                        {cond.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Return Observations */}
                <div className="space-y-2">
                  <label htmlFor="return-notes-input" className="block text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#83B141]" />
                    Observaciones de la Devolución (Opcional)
                  </label>
                  <input
                    id="return-notes-input"
                    type="text"
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    placeholder="Ej: Entregado en perfecto estado, páginas limpias, cuidado excelente..."
                    className="w-full px-4 py-3 bg-[#F8F9F8] border border-[#D3D2D3] rounded-xl text-xs sm:text-sm text-neutral-900 placeholder-neutral-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#83B141]/20 focus:border-[#83B141] transition font-medium"
                  />
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleResetForNextReturn}
                    className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-neutral-500 hover:text-neutral-800 transition cursor-pointer"
                  >
                    Cancelar / Elegir otro libro
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-6 py-3.5 bg-[#83B141] hover:bg-[#719b35] text-white font-bold text-sm rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Confirmar Devolución del Libro</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
