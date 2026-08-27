import React, { useState, useEffect } from 'react';
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
  Infinity as InfinityIcon
} from 'lucide-react';
import type { Copy, Student, Loan } from '../../types/database';
import { findCopyByCode, findActiveLoanByCopyCode, registerLoan, normalizeMarbeteCode } from '../../lib/loans';
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
      const existingLoan = findActiveLoanByCopyCode(foundCopy.internal_code);
      setActiveLoanOnCopy(existingLoan);
    } else {
      setDetectedCopy(null);
      setActiveLoanOnCopy(null);
    }

    setIsSearching(false);
  };

  // Trigger search on typing (debounced) or Enter
  useEffect(() => {
    if (marbeteInput.trim().length >= 3) {
      const timer = setTimeout(() => {
        handleValidateMarbete(marbeteInput);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setDetectedCopy(null);
      setActiveLoanOnCopy(null);
      setHasSearched(false);
    }
  }, [marbeteInput]);

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
    setDetectedCopy(null);
    setActiveLoanOnCopy(null);
    setHasSearched(false);
    setSelectedStudent(null);
    setCheckoutNotes('');
    setErrorBanner(null);
    setSuccessLoan(null);
    setIsIndefinite(false);
    handleDueDaysChange(7);
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
                <div className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-[10px]">
                  {successLoan.student_name.charAt(0)}
                </div>
                <span className="font-bold text-slate-900 text-sm">{successLoan.student_name}</span>
              </div>
              <p className="text-slate-600">{successLoan.student_grade || 'Alumno Colegio El Manglar'}</p>
              <div className="flex items-center gap-1.5 text-slate-700 font-semibold pt-1">
                {successLoan.is_indefinite || !successLoan.due_date ? (
                  <>
                    <InfinityIcon className="w-4 h-4 text-teal-700" />
                    <span className="text-teal-900 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      Plazo Indefinido (Sin fecha límite)
                    </span>
                  </>
                ) : (
                  <>
                    <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Devolución esperada: {new Date(successLoan.due_date).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetForNextLoan}
              className="w-full sm:w-auto px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold text-sm transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
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
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                  <BookMarked className="w-3.5 h-3.5" />
                  Módulo de Circulación • Salida de Material
                </span>
                <h2 className="text-xl font-bold text-white mt-0.5">
                  Prestar Libro Físico (Checkout)
                </h2>
              </div>
              <div className="text-xs text-slate-300 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl self-start sm:self-auto">
                Sin códigos QR • Búsqueda instantánea por marbete
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
              {/* STEP 1: Marbete Code Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="marbete-code-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    1. Código de Marbete Impreso en el Lomo <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Ejemplos: <code className="font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">MOS-863-OTE-1</code> o <code className="font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">MOS-PRI-860-OTE-001</code>
                  </span>
                </div>

                <div className="relative flex items-center">
                  <input
                    id="marbete-code-input"
                    type="text"
                    required
                    autoFocus
                    value={marbeteInput}
                    onChange={(e) => setMarbeteInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleValidateMarbete(marbeteInput);
                      }
                    }}
                    placeholder="Teclea el marbete del libro aquí (ej: MOS-863-OTE-1)..."
                    className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-base font-mono font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10 transition uppercase tracking-wider"
                  />
                  {marbeteInput && (
                    <button
                      type="button"
                      onClick={() => handleValidateMarbete(marbeteInput)}
                      className="absolute right-2 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
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
                        Verifica que el marbete coincida con el inventario o registra el ejemplar en la pestaña "Registrar Ejemplar Físico".
                      </p>
                    </div>
                  </div>
                )}

                {/* Copy Already Loaned Alert */}
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
                          <span className="text-[11px] text-slate-500">
                            Desde el {new Date(activeLoanOnCopy.loan_date).toLocaleDateString('es-VE')}
                          </span>
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

                {/* Copy Found and Available Preview */}
                {detectedCopy && !activeLoanOnCopy && (
                  <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-300 flex flex-col sm:flex-row items-start gap-4 animate-in fade-in duration-200">
                    <div className="w-16 h-22 rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs shrink-0 flex items-center justify-center">
                      {detectedCopy.work?.cover_url ? (
                        <img
                          src={detectedCopy.work.cover_url}
                          alt={detectedCopy.work.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <BookOpen className="w-6 h-6 text-emerald-700" />
                      )}
                    </div>

                    <div className="flex-1 space-y-1 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 bg-emerald-700 text-white font-bold rounded-md text-[10px]">
                          DISPONIBLE PARA PRÉSTAMO
                        </span>
                        <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {detectedCopy.internal_code}
                        </span>
                        <span className="capitalize px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium">
                          Estado: {detectedCopy.condition}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 pt-0.5">
                        {detectedCopy.work?.title || 'Obra sin título'}
                      </h4>
                      <p className="text-slate-600 font-medium">
                        {detectedCopy.work?.author || 'Autor desconocido'}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {detectedCopy.branch?.name || 'Sede Principal'}
                        </span>
                        {deweyInfo && (
                          <span className="text-emerald-800 font-semibold">
                            Dewey: {deweyInfo.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center text-emerald-700 self-center">
                      <CheckCircle2 className="w-6 h-6" />
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
                    Valida primero el código de marbete arriba para habilitar la selección del alumno.
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
                          ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      } ${(!detectedCopy || Boolean(activeLoanOnCopy)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span>{preset.label}</span>
                      <span className={`text-[10px] font-normal ${!isIndefinite && dueDays === preset.days ? 'text-emerald-100' : 'text-slate-400'}`}>
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
                        ? 'bg-teal-800 text-white border-teal-800 shadow-xs ring-2 ring-teal-600/30'
                        : 'bg-teal-50/60 text-teal-900 border-teal-200 hover:bg-teal-100/70'
                    } ${(!detectedCopy || Boolean(activeLoanOnCopy)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-1">
                      <InfinityIcon className="w-3.5 h-3.5" />
                      <span>Indefinido</span>
                    </div>
                    <span className={`text-[10px] font-normal ${isIndefinite ? 'text-teal-100' : 'text-teal-700'}`}>
                      Sin fecha límite
                    </span>
                  </button>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    {isIndefinite ? (
                      <>
                        <InfinityIcon className="w-4 h-4 text-teal-700 shrink-0" />
                        <span className="font-bold text-teal-900">
                          Plazo: Indefinido (Sin límite de fecha / Préstamo docente o de aula)
                        </span>
                      </>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
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
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 disabled:bg-slate-100 disabled:text-slate-400"
                    />
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
                  className="flex-1 sm:flex-initial px-6 py-3 bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
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
