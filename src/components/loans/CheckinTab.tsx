import React, { useState, useEffect, useRef } from 'react';
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
  Sparkles,
  ArrowRight
} from 'lucide-react';
import type { Loan, CopyCondition } from '../../types/database';
import { findActiveLoanByCopyCode, returnLoan, findCopyByCode } from '../../lib/loans';

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
  const [marbeteInput, setMarbeteInput] = useState(initialCode);
  const [activeLoan, setActiveLoan] = useState<Loan | null>(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [returnCondition, setReturnCondition] = useState<CopyCondition>('bueno');
  const [hasSearched, setHasSearched] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successReturn, setSuccessReturn] = useState<Loan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearchActiveLoan = (codeToSearch: string) => {
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
      // Check if copy exists at all
      const existingCopy = findCopyByCode(clean);
      if (existingCopy) {
        setErrorBanner(`El ejemplar con marbete "${existingCopy.internal_code}" ("${existingCopy.work?.title}") NO tiene un préstamo activo en este momento. Ya está disponible en estantería.`);
      } else {
        setErrorBanner(`No se encontró ningún ejemplar registrado con el marbete "${clean.toUpperCase()}".`);
      }
    }
  };

  useEffect(() => {
    if (initialCode) {
      setMarbeteInput(initialCode);
      handleSearchActiveLoan(initialCode);
    }
  }, [initialCode]);

  // Handle enter in the main search input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchActiveLoan(marbeteInput);
    }
  };

  const handleConfirmReturn = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeLoan) return;

    setIsSubmitting(true);
    setErrorBanner(null);

    const result = returnLoan({
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
    if (onLoanReturned) {
      onLoanReturned(result.loan);
    }
  };

  const handleResetForNextReturn = () => {
    setMarbeteInput('');
    setActiveLoan(null);
    setReturnNotes('');
    setReturnCondition('bueno');
    setHasSearched(false);
    setErrorBanner(null);
    setSuccessReturn(null);
    setTimeout(() => inputRef.current?.focus(), 50);
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
              <h3 className="text-xl font-bold text-slate-900">
                ¡Libro Devuelto e Incorporado a Estantería!
              </h3>
            </div>
          </div>

          <div className="p-5 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-slate-900 text-sm">{successReturn.work_title}</span>
              <span className="font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                {successReturn.copy_internal_code}
              </span>
            </div>
            <p className="text-slate-600">
              Entregado por: <span className="font-bold text-slate-800">{successReturn.student_name}</span> ({successReturn.student_grade || 'Alumno'})
            </p>
            {successReturn.return_notes && (
              <p className="text-slate-700 italic bg-white/80 p-2 rounded-lg border border-emerald-100">
                Observación: "{successReturn.return_notes}"
              </p>
            )}
            <p className="text-emerald-800 font-semibold pt-1">
              ✨ El ejemplar ya se encuentra marcado como "Disponible" para el siguiente alumno.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetForNextReturn}
              className="w-full sm:w-auto px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold text-sm transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Devolver Otro Libro
            </button>
          </div>
        </div>
      )}

      {/* Main Check-in Form */}
      {!successReturn && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                Módulo de Circulación • Retorno de Material
              </span>
              <h2 className="text-xl font-bold text-white mt-0.5">
                Devolver Libro (Check-in Rápido)
              </h2>
            </div>
            <div className="text-xs text-slate-300 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl self-start sm:self-auto">
              1 solo campo de texto • Presiona Enter para procesar
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
            {/* The single ultra-fast text field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="checkin-marbete-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Código de Marbete en el Lomo del Libro Devuelto <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-500 font-medium">
                  Lee el lomo y presiona <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[10px]">Enter</kbd>
                </span>
              </div>

              <div className="relative flex items-center">
                <input
                  ref={inputRef}
                  id="checkin-marbete-input"
                  type="text"
                  required
                  autoFocus
                  value={marbeteInput}
                  onChange={(e) => {
                    setMarbeteInput(e.target.value);
                    if (e.target.value.trim().length >= 3) {
                      handleSearchActiveLoan(e.target.value);
                    } else {
                      setActiveLoan(null);
                      setHasSearched(false);
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Teclea el marbete (ej. MOS-863-OTE-1) y presiona Enter..."
                  className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-lg font-mono font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10 transition uppercase tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => handleSearchActiveLoan(marbeteInput)}
                  className="absolute right-2.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Search className="w-3.5 h-3.5" />
                  Buscar Préstamo
                </button>
              </div>
            </div>

            {/* Active Loan Details Detected */}
            {activeLoan && (
              <form onSubmit={handleConfirmReturn} className="space-y-6 pt-4 border-t border-slate-100 animate-in fade-in duration-200">
                {/* Loan card details */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Préstamo Activo Localizado
                      </span>
                      <h4 className="text-base font-bold text-slate-900">{activeLoan.work_title}</h4>
                      <p className="text-xs text-slate-600 font-medium">{activeLoan.work_author}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-white border border-slate-300 text-slate-800 px-2.5 py-1 rounded-lg shadow-2xs">
                        {activeLoan.copy_internal_code}
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                          isOverdue
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : isIndefinite
                            ? 'bg-teal-100 text-teal-800 border border-teal-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {isOverdue ? '⚠️ Atrasado' : isIndefinite ? '♾️ Plazo Indefinido' : '✅ En Plazo'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Alumno que lo tenía</span>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">{activeLoan.student_name}</p>
                      <p className="text-slate-500 text-[11px]">{activeLoan.student_grade || 'Estudiante'}</p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Fecha de Salida</span>
                      <p className="font-bold text-slate-900 mt-0.5">
                        {new Date(activeLoan.loan_date).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-slate-500 text-[11px]">Días en circulación: {loanDaysElapsed} días</p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Fecha Límite Prevista</span>
                      <p className={`font-bold mt-0.5 ${isOverdue ? 'text-rose-700' : isIndefinite ? 'text-teal-900' : 'text-slate-900'}`}>
                        {isIndefinite
                          ? 'Plazo Indefinido (Sin límite)'
                          : activeLoan.due_date
                          ? new Date(activeLoan.due_date).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })
                          : 'Plazo Indefinido'}
                      </p>
                      <p className="text-slate-500 text-[11px]">Sede: {activeLoan.branch_name}</p>
                    </div>
                  </div>
                </div>

                {/* OBSERVATIONS FIELD (Required in user prompt) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="return-notes-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                      Observaciones de la Devolución (Opcional)
                    </label>
                    <span className="text-[11px] text-slate-400">Comentario para el historial del libro</span>
                  </div>

                  <input
                    id="return-notes-input"
                    type="text"
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    placeholder="Ej: Entregado en perfecto estado, páginas limpias, cuidado excelente..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition font-medium"
                  />
                </div>

                {/* Physical Condition Selector upon return */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Estado Físico del Ejemplar al Retornar
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'bueno', label: 'Bueno (Impecable / Cuidado)' },
                      { value: 'regular', label: 'Regular (Desgaste menor)' },
                      { value: 'malo', label: 'Malo (Requiere encuadernación)' },
                    ].map((cond) => (
                      <button
                        key={cond.value}
                        type="button"
                        onClick={() => setReturnCondition(cond.value as CopyCondition)}
                        className={`p-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          returnCondition === cond.value
                            ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {cond.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleResetForNextReturn}
                    className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-6 py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm rounded-xl transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
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
