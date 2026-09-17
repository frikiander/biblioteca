import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bookmark, 
  PlusCircle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Search, 
  UserCheck, 
  BookOpen, 
  Sparkles, 
  ArrowRight,
  Trash2,
  User,
  AlertCircle,
  Calendar
} from 'lucide-react';
import type { HoldReservation, Work, Patron, Loan } from '../../types/database';
import { 
  getStoredHolds, 
  placeHold, 
  cancelHold, 
  fulfillHold 
} from '../../lib/holds';
import { getStoredWorks } from '../../lib/supabaseClient';
import { getStoredPatrons } from '../../lib/patrons';
import { getStoredLoans } from '../../lib/loans';

interface HoldsTabProps {
  onNavigateToCheckout?: () => void;
}

export function HoldsTab({ onNavigateToCheckout }: HoldsTabProps) {
  const [holds, setHolds] = useState<HoldReservation[]>([]);
  const [allLoans, setAllLoans] = useState<Loan[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [isPlaceHoldModalOpen, setIsPlaceHoldModalOpen] = useState<boolean>(false);

  // New Hold Form
  const [selectedWorkId, setSelectedWorkId] = useState<string>('');
  const [selectedPatronId, setSelectedPatronId] = useState<string>('');
  const [holdNotes, setHoldNotes] = useState<string>('');

  const works = getStoredWorks();
  const patrons = getStoredPatrons();

  const refreshHolds = () => {
    setHolds(getStoredHolds());
    setAllLoans(getStoredLoans());
  };

  useEffect(() => {
    refreshHolds();
    if (works.length > 0) setSelectedWorkId(works[0].id);
    if (patrons.length > 0) setSelectedPatronId(patrons[0].id);
  }, []);

  // Formatters
  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return 'No especificada';
    const d = new Date(dateStr);
    const dateFormatted = d.toLocaleDateString('es-VE', {
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

  // Active loans for the work selected in the modal
  const activeLoansForSelectedWork = useMemo(() => {
    if (!selectedWorkId) return [];
    return allLoans.filter(
      (l) => l.work_id === selectedWorkId && (l.status === 'active' || l.status === 'overdue')
    );
  }, [selectedWorkId, allLoans]);

  const handleCreateHold = (e: React.FormEvent) => {
    e.preventDefault();
    const targetWork = works.find((w) => w.id === selectedWorkId);
    const targetPatron = patrons.find((p) => p.id === selectedPatronId);
    if (!targetWork || !targetPatron) return;

    const res = placeHold({
      work: targetWork,
      patron: targetPatron,
      notes: holdNotes,
    });

    if (res.success) {
      refreshHolds();
      setIsPlaceHoldModalOpen(false);
      setHoldNotes('');
    } else {
      alert(res.error);
    }
  };

  const handleCancelHold = (holdId: string) => {
    if (confirm('¿Cancelar esta reserva en cola?')) {
      cancelHold(holdId);
      refreshHolds();
    }
  };

  const filteredHolds = holds.filter((h) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      h.work_title.toLowerCase().includes(q) ||
      h.patron_name.toLowerCase().includes(q) ||
      (h.patron_identifier && h.patron_identifier.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && (h.status === 'waiting' || h.status === 'ready_for_pickup')) ||
      h.status === statusFilter;

    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-[#D3D2D3] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#83B141] bg-[#83B141]/10 px-2.5 py-0.5 rounded-full border border-[#83B141]/30">
              Reservas & Solicitudes
            </span>
            <span className="text-xs text-neutral-500">• Gestión de Cola de Espera</span>
          </div>
          <h3 className="text-lg font-bold text-neutral-900 mt-1">
            Reservas y Apartado de Libros
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Cuando un libro se encuentra en préstamo activo, los lectores pueden apartarlo por orden de solicitud prioritaria conociendo la fecha y hora de salida y retorno.
          </p>
        </div>

        <button
          onClick={() => {
            refreshHolds();
            setIsPlaceHoldModalOpen(true);
          }}
          className="px-4 py-2.5 bg-[#83B141] hover:bg-[#719b35] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4" strokeWidth={1.75} />
          Nueva Reserva
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-3 border border-[#D3D2D3] shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por libro o lector en reserva..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#F8F9F8] border border-[#D3D2D3] rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#83B141] focus:bg-white"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2 bg-[#F8F9F8] border border-[#D3D2D3] rounded-xl text-xs font-semibold text-neutral-700"
        >
          <option value="active">Activas (En espera y Listas)</option>
          <option value="all">Todas las Reservas</option>
          <option value="ready_for_pickup">Listas para Retiro</option>
          <option value="waiting">En Espera</option>
          <option value="fulfilled">Completadas</option>
          <option value="cancelled">Canceladas</option>
        </select>
      </div>

      {/* Holds List */}
      {filteredHolds.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center text-neutral-400 border border-[#D3D2D3] space-y-3">
          <Bookmark className="w-8 h-8 mx-auto text-neutral-300" />
          <p className="text-sm font-semibold text-neutral-600">No hay reservas registradas en este estado.</p>
          <button
            onClick={() => {
              refreshHolds();
              setIsPlaceHoldModalOpen(true);
            }}
            className="px-4 py-2 bg-[#83B141]/10 text-[#83B141] font-bold rounded-xl text-xs hover:bg-[#83B141]/20 transition"
          >
            Registrar Reserva
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHolds.map((hold) => {
            // Check if there are active loans for this reserved work
            const activeLoanForHold = allLoans.find(
              (l) => l.work_id === hold.work_id && (l.status === 'active' || l.status === 'overdue')
            );

            return (
              <div
                key={hold.id}
                className={`p-5 rounded-3xl border transition flex flex-col gap-3.5 ${
                  hold.status === 'ready_for_pickup'
                    ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                    : 'bg-white border-[#D3D2D3]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#F8F9F8] text-neutral-700 flex items-center justify-center font-black text-sm shrink-0 border border-[#D3D2D3]">
                      #{hold.priority}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          hold.status === 'ready_for_pickup'
                            ? 'bg-[#83B141] text-white'
                            : hold.status === 'waiting'
                            ? 'bg-amber-100 text-amber-800'
                            : hold.status === 'fulfilled'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}>
                          {hold.status === 'ready_for_pickup' ? '¡Listo para Retirar!' : hold.status === 'waiting' ? 'En Cola de Espera' : hold.status.toUpperCase()}
                        </span>
                        <span className="text-[11px] text-neutral-500">
                          Solicitado el {new Date(hold.reserved_date).toLocaleDateString('es-VE')}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-neutral-900 mt-1 leading-tight">
                        {hold.work_title}
                      </h4>
                      <div className="text-xs text-neutral-600 font-medium mt-0.5">
                        Reservado por: <strong className="text-neutral-900">{hold.patron_name}</strong> ({hold.patron_grade || hold.patron_identifier})
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {hold.status === 'ready_for_pickup' && onNavigateToCheckout && (
                      <button
                        onClick={onNavigateToCheckout}
                        className="px-3.5 py-1.5 bg-[#83B141] hover:bg-[#719b35] text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition cursor-pointer"
                      >
                        <span>Prestar Ahora</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {(hold.status === 'waiting' || hold.status === 'ready_for_pickup') && (
                      <button
                        onClick={() => handleCancelHold(hold.id)}
                        className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Cancelar reserva"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Departure Datetime and Expected Return Details */}
                {activeLoanForHold && (
                  <div className="p-3 bg-[#F8F9F8] rounded-2xl border border-[#D3D2D3] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-[#83B141] shrink-0" />
                      <span className="text-neutral-700">
                        En préstamo con <strong className="text-neutral-900">{activeLoanForHold.student_name}</strong>
                      </span>
                      <span className="font-mono text-[10px] bg-white border border-[#D3D2D3] px-1.5 py-0.5 rounded text-neutral-700 font-bold">
                        {activeLoanForHold.copy_internal_code}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-600">
                      <span>
                        Fecha/Hora de salida: <strong className="text-neutral-900">{formatDateTime(activeLoanForHold.loan_date)}</strong>
                      </span>
                      <span className="hidden sm:inline text-neutral-300">•</span>
                      <span>
                        Retorno previsto: <strong className="text-neutral-900">{activeLoanForHold.due_date ? formatDateOnly(activeLoanForHold.due_date) : 'Indefinido'}</strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Place Hold */}
      {isPlaceHoldModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#D3D2D3] animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-bold text-base text-neutral-900 pb-3 border-b border-[#D3D2D3] flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-[#83B141]" />
              Apartar Libro (Reserva / Hold)
            </h3>

            <form onSubmit={handleCreateHold} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="font-bold text-neutral-700 block mb-1">Título de la Obra a Apartar *</label>
                <select
                  value={selectedWorkId}
                  onChange={(e) => setSelectedWorkId(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9F8] border border-[#D3D2D3] rounded-xl text-xs font-semibold text-neutral-800"
                >
                  {works.map((w) => (
                    <option key={w.id} value={w.id}>{w.title} — {w.author} (CDD {w.dewey_code})</option>
                  ))}
                </select>
              </div>

              {/* LIVE ACTIVE LOANS PREVIEW WITH DEPARTURE DATETIME & RETURN DATE */}
              {activeLoansForSelectedWork.length > 0 ? (
                <div className="p-3.5 bg-[#F8F9F8] rounded-2xl border border-[#D3D2D3] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[10px] text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#83B141]" />
                      Estado de Salida del Préstamo en Curso
                    </span>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                      {activeLoansForSelectedWork.length} {activeLoansForSelectedWork.length === 1 ? 'ejemplar prestado' : 'ejemplares prestados'}
                    </span>
                  </div>

                  {activeLoansForSelectedWork.map((loan) => (
                    <div key={loan.id} className="p-2.5 bg-white rounded-xl border border-[#D3D2D3] text-[11px] space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-neutral-900 flex items-center gap-1">
                          <User className="w-3 h-3 text-[#83B141]" />
                          {loan.student_name} ({loan.student_grade || 'Lector'})
                        </span>
                        <span className="font-mono font-bold text-[10px] text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200">
                          {loan.copy_internal_code}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-neutral-600 pt-1 border-t border-neutral-100">
                        <div>
                          <span className="text-neutral-400 block font-medium">Fecha y hora de salida:</span>
                          <strong className="text-neutral-900">{formatDateTime(loan.loan_date)}</strong>
                        </div>
                        <div>
                          <span className="text-neutral-400 block font-medium">Fecha límite de retorno:</span>
                          <strong className="text-neutral-900">{loan.due_date ? formatDateOnly(loan.due_date) : 'Plazo Indefinido'}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#83B141] shrink-0" />
                  <span>Esta obra tiene ejemplares disponibles en inventario para préstamo directo sin espera.</span>
                </div>
              )}

              <div>
                <label className="font-bold text-neutral-700 block mb-1">Lector Solicitante *</label>
                <select
                  value={selectedPatronId}
                  onChange={(e) => setSelectedPatronId(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9F8] border border-[#D3D2D3] rounded-xl text-xs font-semibold text-neutral-800"
                >
                  {patrons.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.grade_section || p.identifier})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-neutral-700 block mb-1">Notas / Motivo de Reserva</label>
                <textarea
                  rows={2}
                  placeholder="ej. Notificar por WhatsApp cuando el libro sea devuelto..."
                  value={holdNotes}
                  onChange={(e) => setHoldNotes(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9F8] border border-[#D3D2D3] rounded-xl text-xs text-neutral-800"
                />
              </div>

              <div className="pt-4 border-t border-[#D3D2D3] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlaceHoldModalOpen(false)}
                  className="px-4 py-2 bg-[#F8F9F8] text-neutral-700 font-bold rounded-xl border border-[#D3D2D3] hover:bg-neutral-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#83B141] hover:bg-[#719b35] text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Registrar Reserva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
