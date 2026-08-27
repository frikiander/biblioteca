import React, { useState, useMemo } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  BookOpen, 
  User, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Tag, 
  MessageSquare, 
  Users, 
  RotateCcw, 
  ArrowRight,
  BookMarked,
  Sparkles,
  ChevronRight,
  Eye
} from 'lucide-react';
import type { Loan } from '../../types/database';
import { getStoredLoans, getCopyTraceability, CopyTraceability } from '../../lib/loans';

interface LoanHistoryTraceabilityProps {
  onSelectCheckinCode?: (code: string) => void;
  refreshTrigger?: number;
}

export const LoanHistoryTraceability: React.FC<LoanHistoryTraceabilityProps> = ({
  onSelectCheckinCode,
  refreshTrigger = 0,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'returned' | 'overdue'>('all');
  const [selectedTraceabilityCopy, setSelectedTraceabilityCopy] = useState<string | null>(null);

  const loans = useMemo(() => {
    return getStoredLoans();
  }, [refreshTrigger]);

  // Compute metrics
  const totalLoans = loans.length;
  const activeLoans = loans.filter((l) => l.status === 'active' || l.status === 'overdue');
  const returnedLoans = loans.filter((l) => l.status === 'returned');
  const overdueLoans = loans.filter((l) => l.status === 'overdue');
  const uniqueStudents = new Set(loans.map((l) => l.student_name.toLowerCase().trim())).size;

  // Filtered loans list
  const filteredLoans = loans.filter((loan) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      loan.work_title.toLowerCase().includes(term) ||
      loan.work_author.toLowerCase().includes(term) ||
      loan.student_name.toLowerCase().includes(term) ||
      loan.copy_internal_code.toLowerCase().includes(term) ||
      (loan.return_notes && loan.return_notes.toLowerCase().includes(term));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && loan.status === 'active') ||
      (statusFilter === 'returned' && loan.status === 'returned') ||
      (statusFilter === 'overdue' && loan.status === 'overdue');

    return matchesSearch && matchesStatus;
  });

  const inspectedTraceability = useMemo<CopyTraceability | null>(() => {
    if (!selectedTraceabilityCopy) return null;
    return getCopyTraceability(selectedTraceabilityCopy);
  }, [selectedTraceabilityCopy, loans]);

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Préstamos Activos</span>
            <BookMarked className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{activeLoans.length}</p>
          <p className="text-[11px] text-slate-400">Libros actualmente en circulación</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Libros Devueltos</span>
            <CheckCircle2 className="w-4 h-4 text-teal-700" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{returnedLoans.length}</p>
          <p className="text-[11px] text-slate-400">Ciclos de lectura completados</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Atrasados</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-600">{overdueLoans.length}</p>
          <p className="text-[11px] text-slate-400">Superaron la fecha prevista</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Lectores & Manos</span>
            <Users className="w-4 h-4 text-blue-700" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{uniqueStudents}</p>
          <p className="text-[11px] text-slate-400">Alumnos y docentes que han leído</p>
        </div>
      </div>

      {/* Modal / Card of Specific Copy Traceability ("Por cuántas manos ha pasado un libro") */}
      {inspectedTraceability && (
        <div className="p-6 bg-white rounded-3xl border-2 border-emerald-600 shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                  Ficha de Trazabilidad Histórica
                </span>
                <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-300 text-slate-800">
                  {inspectedTraceability.copyCode}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">{inspectedTraceability.workTitle}</h3>
              <p className="text-xs text-slate-600 font-medium">{inspectedTraceability.workAuthor} • Sede: {inspectedTraceability.branchName}</p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTraceabilityCopy(null)}
              className="self-start sm:self-auto px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Cerrar Ficha
            </button>
          </div>

          {/* Traceability Summary Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-xs">
            <div>
              <span className="text-slate-500 font-semibold uppercase text-[10px] block">Lectores Distintos</span>
              <p className="text-xl font-bold text-emerald-950 mt-0.5">
                {inspectedTraceability.uniqueHandsCount} {inspectedTraceability.uniqueHandsCount === 1 ? 'mano' : 'manos distintas'}
              </p>
              <p className="text-slate-600 text-[11px]">Alumnos que han tenido este ejemplar</p>
            </div>

            <div>
              <span className="text-slate-500 font-semibold uppercase text-[10px] block">Total de Préstamos</span>
              <p className="text-xl font-bold text-slate-900 mt-0.5">
                {inspectedTraceability.totalLoansCount} {inspectedTraceability.totalLoansCount === 1 ? 'vez prestado' : 'veces prestado'}
              </p>
              <p className="text-slate-600 text-[11px]">Rotación total en la biblioteca</p>
            </div>

            <div>
              <span className="text-slate-500 font-semibold uppercase text-[10px] block">Estado Actual</span>
              <span
                className={`inline-block mt-1 font-bold px-2.5 py-1 rounded-lg text-xs ${
                  inspectedTraceability.activeLoan
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}
              >
                {inspectedTraceability.activeLoan ? 'En Préstamo Activo' : 'Disponible en Estantería'}
              </span>
            </div>
          </div>

          {/* Timeline of every loan the book went through */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-700" />
              <span>Cronología de Lectores y Observaciones Registradas</span>
            </h4>

            {inspectedTraceability.history.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded-xl border border-slate-200">
                Este ejemplar no registra préstamos anteriores todavía.
              </p>
            ) : (
              <div className="space-y-2.5">
                {inspectedTraceability.history.map((h, idx) => (
                  <div
                    key={h.id}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </div>
                        <span className="font-bold text-slate-900 text-sm">{h.student_name}</span>
                        <span className="text-slate-500 text-[11px]">({h.student_grade || 'Estudiante'})</span>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full self-start sm:self-auto ${
                          h.status === 'returned'
                            ? 'bg-teal-100 text-teal-800'
                            : h.status === 'overdue'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {h.status === 'returned' ? 'Devuelto' : h.status === 'overdue' ? 'Atrasado' : 'Préstamo Activo'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                      <div>
                        <span className="font-semibold text-slate-700">Salida:</span>{' '}
                        {new Date(h.loan_date).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Retorno:</span>{' '}
                        {h.return_date
                          ? new Date(h.return_date).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })
                          : (h.is_indefinite || !h.due_date)
                          ? 'Plazo Indefinido (Sin límite)'
                          : `Previsto para ${new Date(h.due_date).toLocaleDateString('es-VE')}`}
                      </div>
                    </div>

                    {h.return_notes && (
                      <div className="p-2 bg-white rounded-lg border border-slate-200/80 text-[11px] text-slate-700 flex items-start gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                        <p>
                          <span className="font-bold">Observación al devolver:</span> "{h.return_notes}"
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Loan History Table & Filters */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden space-y-4 p-6">
        {/* Search & Filter Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por alumno, título del libro, código de marbete u observaciones..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: `Todos (${totalLoans})` },
              { id: 'active', label: `Activos (${activeLoans.length})` },
              { id: 'returned', label: `Devueltos (${returnedLoans.length})` },
              { id: 'overdue', label: `Atrasados (${overdueLoans.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* History List / Table */}
        {filteredLoans.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <History className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-700">No hay registros de préstamos</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'all'
                ? 'No se encontraron préstamos que coincidan con los filtros aplicados.'
                : 'Aún no se han registrado préstamos en la plataforma. Utiliza la pestaña "Prestar Libro" para iniciar el primer préstamo.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLoans.map((loan) => {
              const isIndefinite = loan.is_indefinite || !loan.due_date;
              const isOverdue = loan.status === 'overdue' || (!isIndefinite && loan.status === 'active' && loan.due_date && new Date(loan.due_date).getTime() < Date.now());
              return (
                <div
                  key={loan.id}
                  className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition hover:bg-slate-50/70 p-2 rounded-2xl"
                >
                  <div className="flex items-start gap-3.5">
                    {/* Cover or Icon */}
                    <div className="w-12 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {loan.work_cover_url ? (
                        <img
                          src={loan.work_cover_url}
                          alt={loan.work_title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <BookOpen className="w-5 h-5 text-slate-400" />
                      )}
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-[11px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                          {loan.copy_internal_code}
                        </span>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            loan.status === 'returned'
                              ? 'bg-teal-100 text-teal-800'
                              : isOverdue
                              ? 'bg-rose-100 text-rose-800 font-bold'
                              : isIndefinite
                              ? 'bg-teal-100 text-teal-800 font-bold'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {loan.status === 'returned'
                            ? 'Devuelto'
                            : isOverdue
                            ? 'Atrasado'
                            : isIndefinite
                            ? '♾️ Indefinido'
                            : 'En Préstamo'}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-slate-900">{loan.work_title}</h4>
                      <p className="text-slate-600">{loan.work_author}</p>

                      <div className="flex items-center gap-1.5 pt-0.5 text-slate-700">
                        <User className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="font-bold">{loan.student_name}</span>
                        <span className="text-slate-400">• {loan.student_grade || 'Alumno'}</span>
                      </div>

                      {loan.return_notes && (
                        <div className="text-[11px] text-slate-600 bg-slate-100/80 px-2 py-1 rounded-md mt-1 inline-block">
                          <span className="font-semibold text-slate-700">Observación:</span> "{loan.return_notes}"
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap lg:flex-col lg:items-end justify-between gap-2 text-xs border-t lg:border-t-0 pt-2 lg:pt-0">
                    <div className="text-slate-500 text-[11px] space-y-0.5 text-left lg:text-right">
                      <p>Prestado: <span className="font-medium text-slate-700">{new Date(loan.loan_date).toLocaleDateString('es-VE')}</span></p>
                      <p>
                        {loan.return_date ? (
                          <>Devuelto: <span className="font-medium text-emerald-800">{new Date(loan.return_date).toLocaleDateString('es-VE')}</span></>
                        ) : isIndefinite ? (
                          <>Límite: <span className="font-bold text-teal-800">Plazo Indefinido</span></>
                        ) : loan.due_date ? (
                          <>Límite: <span className={`font-bold ${isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>{new Date(loan.due_date).toLocaleDateString('es-VE')}</span></>
                        ) : (
                          <>Límite: <span className="font-bold text-teal-800">Plazo Indefinido</span></>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTraceabilityCopy(loan.copy_internal_code)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Ver Trazabilidad</span>
                      </button>

                      {loan.status !== 'returned' && onSelectCheckinCode && (
                        <button
                          type="button"
                          onClick={() => onSelectCheckinCode(loan.copy_internal_code)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Devolver</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
