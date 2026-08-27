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

  const filteredHolds = holds.filter((h) => {\n    const q = searchQuery.toLowerCase().trim();\n    const matchesQuery =\n      !q ||\n      h.work_title.toLowerCase().includes(q) ||\n      h.patron_name.toLowerCase().includes(q) ||\n      (h.patron_identifier && h.patron_identifier.toLowerCase().includes(q));\n\n    const matchesStatus =\n      statusFilter === 'all' ||\n      (statusFilter === 'active' && (h.status === 'waiting' || h.status === 'ready_for_pickup')) ||\n      h.status === statusFilter;\n\n    return matchesQuery && matchesStatus;\n  });\n\n  return (\n    <div className=\"space-y-6 max-w-4xl mx-auto\">\n      {/* Top Banner */}\n      <div className=\"bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4\">\n        <div>\n          <div className=\"flex items-center gap-2\">\n            <span className=\"text-[10px] uppercase font-bold tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200\">\n              Koha Holds & Queue\n            </span>\n            <span className=\"text-xs text-slate-500\">• Gestión de Cola de Espera</span>\n          </div>\n          <h3 className=\"text-lg font-bold text-slate-900 mt-1\">\n            Reservas y Apartado de Libros\n          </h3>\n          <p className=\"text-xs text-slate-500 mt-0.5\">\n            Cuando un libro se encuentra en préstamo activo, los lectores pueden apartarlo por orden de solicitud prioritaria.\n          </p>\n        </div>\n\n        <button\n          onClick={() => setIsPlaceHoldModalOpen(true)}\n          className=\"px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0\"\n        >\n          <PlusCircle className=\"w-4 h-4\" />\n          Nueva Reserva\n        </button>\n      </div>\n\n      {/* Filters */}\n      <div className=\"bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3\">\n        <div className=\"relative flex-1\">\n          <Search className=\"w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2\" />\n          <input\n            type=\"text\"\n            placeholder=\"Buscar por libro o lector en reserva...\"\n            value={searchQuery}\n            onChange={(e) => setSearchQuery(e.target.value)}\n            className=\"w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white\"\n          />\n        </div>\n\n        <select\n          value={statusFilter}\n          onChange={(e) => setStatusFilter(e.target.value)}\n          className=\"px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700\"\n        >\n          <option value=\"active\">Activas (En espera y Listas)</option>\n          <option value=\"all\">Todas las Reservas</option>\n          <option value=\"ready_for_pickup\">Listas para Retiro</option>\n          <option value=\"waiting\">En Espera</option>\n          <option value=\"fulfilled\">Completadas</option>\n          <option value=\"cancelled\">Canceladas</option>\n        </select>\n      </div>\n\n      {/* Holds List */}\n      {filteredHolds.length === 0 ? (\n        <div className=\"bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200 space-y-3\">\n          <Bookmark className=\"w-8 h-8 mx-auto text-slate-300\" />\n          <p className=\"text-sm font-semibold text-slate-600\">No hay reservas registradas en este estado.</p>\n          <button\n            onClick={() => setIsPlaceHoldModalOpen(true)}\n            className=\"px-4 py-2 bg-emerald-50 text-emerald-800 font-bold rounded-xl text-xs hover:bg-emerald-100 transition\"\n          >\n            Registrar Reserva\n          </button>\n        </div>\n      ) : (\n        <div className=\"space-y-3\">\n          {filteredHolds.map((hold) => (\n            <div\n              key={hold.id}\n              className={`p-5 rounded-3xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${\n                hold.status === 'ready_for_pickup'\n                  ? 'bg-emerald-50/80 border-emerald-300 shadow-sm'\n                  : 'bg-white border-slate-200'\n              }`}\n            >\n              <div className=\"flex items-start gap-3.5\">\n                <div className=\"w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-black text-sm shrink-0 border border-slate-200\">\n                  #{hold.priority}\n                </div>\n\n                <div>\n                  <div className=\"flex items-center gap-2\">\n                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${\n                      hold.status === 'ready_for_pickup'\n                        ? 'bg-emerald-500 text-white'\n                        : hold.status === 'waiting'\n                        ? 'bg-amber-100 text-amber-800'\n                        : hold.status === 'fulfilled'\n                        ? 'bg-purple-100 text-purple-800'\n                        : 'bg-slate-100 text-slate-600'\n                    }`}>\n                      {hold.status === 'ready_for_pickup' ? '¡Listo para Retirar!' : hold.status === 'waiting' ? 'En Cola de Espera' : hold.status.toUpperCase()}\n                    </span>\n                    <span className=\"text-[11px] text-slate-400\">\n                      Solicitado el {new Date(hold.reserved_date).toLocaleDateString('es-VE')}\n                    </span>\n                  </div>\n\n                  <h4 className=\"text-sm font-bold text-slate-900 mt-1 leading-tight\">\n                    {hold.work_title}\n                  </h4>\n                  <div className=\"text-xs text-slate-600 font-medium\">\n                    Reservado por: <strong>{hold.patron_name}</strong> ({hold.patron_grade || hold.patron_identifier})\n                  </div>\n                </div>\n              </div>\n\n              <div className=\"flex items-center gap-2 shrink-0\">\n                {hold.status === 'ready_for_pickup' && onNavigateToCheckout && (\n                  <button\n                    onClick={onNavigateToCheckout}\n                    className=\"px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition\"\n                  >\n                    <span>Prestar Ahora</span>\n                    <ArrowRight className=\"w-3.5 h-3.5\" />\n                  </button>\n                )}\n\n                {(hold.status === 'waiting' || hold.status === 'ready_for_pickup') && (\n                  <button\n                    onClick={() => handleCancelHold(hold.id)}\n                    className=\"p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition\"\n                    title=\"Cancelar reserva\"\n                  >\n                    <Trash2 className=\"w-4 h-4\" />\n                  </button>\n                )}\n              </div>\n            </div>\n          ))}\n        </div>\n      )}\n\n      {/* Modal: Place Hold */}\n      {isPlaceHoldModalOpen && (\n        <div className=\"fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4\">\n          <div className=\"bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200\">\n            <h3 className=\"font-bold text-base text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2\">\n              <Bookmark className=\"w-5 h-5 text-emerald-600\" />\n              Apartar Libro (Reserva / Hold)\n            </h3>\n\n            <form onSubmit={handleCreateHold} className=\"mt-4 space-y-3.5 text-xs\">\n              <div>\n                <label className=\"font-bold text-slate-700 block mb-1\">Título de la Obra *</label>\n                <select\n                  value={selectedWorkId}\n                  onChange={(e) => setSelectedWorkId(e.target.value)}\n                  className=\"w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl\"\n                >\n                  {works.map((w) => (\n                    <option key={w.id} value={w.id}>{w.title} — {w.author} (CDD {w.dewey_code})</option>\n                  ))}\n                </select>\n              </div>\n\n              <div>\n                <label className=\"font-bold text-slate-700 block mb-1\">Lector Solicitante *</label>\n                <select\n                  value={selectedPatronId}\n                  onChange={(e) => setSelectedPatronId(e.target.value)}\n                  className=\"w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl\"\n                >\n                  {patrons.map((p) => (\n                    <option key={p.id} value={p.id}>{p.name} ({p.grade_section || p.identifier})</option>\n                  ))}\n                </select>\n              </div>\n\n              <div>\n                <label className=\"font-bold text-slate-700 block mb-1\">Notas / Motivo de Reserva</label>\n                <textarea\n                  rows={2}\n                  placeholder=\"ej. Notificar por WhatsApp cuando el libro sea devuelto...\"\n                  value={holdNotes}\n                  onChange={(e) => setHoldNotes(e.target.value)}\n                  className=\"w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl\"\n                />\n              </div>\n\n              <div className=\"pt-4 border-t border-slate-100 flex justify-end gap-2\">\n                <button\n                  type=\"button\"\n                  onClick={() => setIsPlaceHoldModalOpen(false)}\n                  className=\"px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl\"\n                >\n                  Cancelar\n                </button>\n                <button\n                  type=\"submit\"\n                  className=\"px-5 py-2 bg-emerald-800 text-white font-bold rounded-xl\"\n                >\n                  Registrar Reserva\n                </button>\n              </div>\n            </form>\n          </div>\n        </div>\n      )}\n    </div>\n  );\n}\n