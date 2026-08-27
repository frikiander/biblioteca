import React, { useState, useEffect } from 'react';
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
  Trash2
} from 'lucide-react';
import type { HoldReservation, Work, Patron } from '../../types/database';
import { 
  getStoredHolds, 
  placeHold, 
  cancelHold, 
  fulfillHold 
} from '../../lib/holds';
import { getStoredWorks } from '../../lib/supabaseClient';
import { getStoredPatrons } from '../../lib/patrons';

interface HoldsTabProps {
  onNavigateToCheckout?: () => void;
}

export function HoldsTab({ onNavigateToCheckout }: HoldsTabProps) {
  const [holds, setHolds] = useState<HoldReservation[]>([]);
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
  };

  useEffect(() => {
    refreshHolds();
    if (works.length > 0) setSelectedWorkId(works[0].id);
    if (patrons.length > 0) setSelectedPatronId(patrons[0].id);
  }, []);

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
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Koha Holds & Queue
            </span>
            <span className="text-xs text-slate-500">• Gestión de Cola de Espera</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-1">
            Reservas y Apartado de Libros
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Cuando un libro se encuentra en préstamo activo, los lectores pueden apartarlo por orden de solicitud prioritaria.
          </p>
        </div>

        <button
          onClick={() => setIsPlaceHoldModalOpen(true)}
          className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          Nueva Reserva
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por libro o lector en reserva..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
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
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200 space-y-3">
          <Bookmark className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-sm font-semibold text-slate-600">No hay reservas registradas en este estado.</p>
          <button
            onClick={() => setIsPlaceHoldModalOpen(true)}
            className="px-4 py-2 bg-emerald-50 text-emerald-800 font-bold rounded-xl text-xs hover:bg-emerald-100 transition"
          >
            Registrar Reserva
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHolds.map((hold) => (
            <div
              key={hold.id}
              className={`p-5 rounded-3xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                hold.status === 'ready_for_pickup'
                  ? 'bg-emerald-50/80 border-emerald-300 shadow-sm'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-black text-sm shrink-0 border border-slate-200">
                  #{hold.priority}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      hold.status === 'ready_for_pickup'
                        ? 'bg-emerald-500 text-white'
                        : hold.status === 'waiting'
                        ? 'bg-amber-100 text-amber-800'
                        : hold.status === 'fulfilled'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {hold.status === 'ready_for_pickup' ? '¡Listo para Retirar!' : hold.status === 'waiting' ? 'En Cola de Espera' : hold.status.toUpperCase()}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Solicitado el {new Date(hold.reserved_date).toLocaleDateString('es-VE')}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 mt-1 leading-tight">
                    {hold.work_title}
                  </h4>
                  <div className="text-xs text-slate-600 font-medium">
                    Reservado por: <strong>{hold.patron_name}</strong> ({hold.patron_grade || hold.patron_identifier})
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {hold.status === 'ready_for_pickup' && onNavigateToCheckout && (
                  <button
                    onClick={onNavigateToCheckout}
                    className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition"
                  >
                    <span>Prestar Ahora</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {(hold.status === 'waiting' || hold.status === 'ready_for_pickup') && (
                  <button
                    onClick={() => handleCancelHold(hold.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Cancelar reserva"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Place Hold */}
      {isPlaceHoldModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-bold text-base text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-emerald-600" />
              Apartar Libro (Reserva / Hold)
            </h3>

            <form onSubmit={handleCreateHold} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Título de la Obra *</label>
                <select
                  value={selectedWorkId}
                  onChange={(e) => setSelectedWorkId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {works.map((w) => (
                    <option key={w.id} value={w.id}>{w.title} — {w.author} (CDD {w.dewey_code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Lector Solicitante *</label>
                <select
                  value={selectedPatronId}
                  onChange={(e) => setSelectedPatronId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {patrons.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.grade_section || p.identifier})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notas / Motivo de Reserva</label>
                <textarea
                  rows={2}
                  placeholder="ej. Notificar por WhatsApp cuando el libro sea devuelto..."
                  value={holdNotes}
                  onChange={(e) => setHoldNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlaceHoldModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 text-white font-bold rounded-xl"
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
