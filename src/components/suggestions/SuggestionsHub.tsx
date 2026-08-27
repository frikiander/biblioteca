import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, 
  PlusCircle, 
  ThumbsUp, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  BookCheck, 
  Search, 
  Filter, 
  Sparkles, 
  MessageSquare 
} from 'lucide-react';
import type { BookSuggestion, SuggestionStatus, PatronRole } from '../../types/database';
import { 
  getStoredSuggestions, 
  submitSuggestion, 
  voteSuggestion, 
  updateSuggestionStatus 
} from '../../lib/suggestions';

export function SuggestionsHub() {
  const [suggestions, setSuggestions] = useState<BookSuggestion[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [selectedSuggestionForReview, setSelectedSuggestionForReview] = useState<BookSuggestion | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState<string>('');

  // New Suggestion Form
  const [formTitle, setFormTitle] = useState<string>('');
  const [formAuthor, setFormAuthor] = useState<string>('');
  const [formPublisher, setFormPublisher] = useState<string>('');
  const [formYear, setFormYear] = useState<string>('');
  const [formReason, setFormReason] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formRole, setFormRole] = useState<PatronRole>('student');
  const [formGrade, setFormGrade] = useState<string>('');

  const refreshSuggestions = () => {
    setSuggestions(getStoredSuggestions());
  };

  useEffect(() => {
    refreshSuggestions();
  }, []);

  const handleVote = (id: string) => {
    voteSuggestion(id, 'Bibliotecario / Usuario');
    refreshSuggestions();
  };

  const handleOpenReviewModal = (sug: BookSuggestion) => {
    setSelectedSuggestionForReview(sug);
    setReviewerNotes(sug.reviewer_notes || '');
  };

  const handleUpdateStatus = (status: SuggestionStatus) => {
    if (!selectedSuggestionForReview) return;
    updateSuggestionStatus(selectedSuggestionForReview.id, status, reviewerNotes);
    setSelectedSuggestionForReview(null);
    refreshSuggestions();
  };

  const handleSubmitNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formAuthor.trim() || !formName.trim()) return;

    submitSuggestion({
      title: formTitle,
      author: formAuthor,
      publisher: formPublisher,
      publicationYear: formYear ? parseInt(formYear, 10) : undefined,
      reason: formReason,
      suggestedByName: formName,
      suggestedByRole: formRole,
      suggestedByGrade: formGrade,
    });

    setIsSubmitModalOpen(false);
    setFormTitle('');
    setFormAuthor('');
    setFormPublisher('');
    setFormYear('');
    setFormReason('');
    refreshSuggestions();
  };

  const filteredSuggestions = suggestions.filter((s) => {
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      s.title.toLowerCase().includes(q) ||
      s.author.toLowerCase().includes(q) ||
      s.suggested_by_name.toLowerCase().includes(q);

    return matchesStatus && matchesQuery;
  });

  const getStatusBadge = (status: SuggestionStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pendiente
          </span>
        );
      case 'under_review':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            En Evaluación
          </span>
        );
      case 'approved':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Aprobado para Compra
          </span>
        );
      case 'cataloged':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1">
            <BookCheck className="w-3 h-3" />
            Ya en Catálogo
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            No Aprobado
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-950/20 shrink-0">
            <Lightbulb className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Koha Purchase Suggestions
              </span>
              <span className="text-xs text-slate-500">• Buzón de Desideratas y Adquisiciones</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
              Sugerencias de Compra y Dotación Bibliográfica
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mt-1">
              Canal participativo para que docentes y alumnos propongan nuevos títulos para el fondo de la biblioteca central o donaciones rurales, con votación comunitaria y flujo de aprobación.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsSubmitModalOpen(true)}
          className="px-5 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-amber-950/20 transition cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          Proponer un Libro
        </button>
      </div>

      {/* Search & Status Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por título propuesto, autor o solicitante..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:bg-white"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-amber-500"
        >
          <option value="all">Todos los Estados</option>
          <option value="pending">Pendientes</option>
          <option value="under_review">En Evaluación</option>
          <option value="approved">Aprobados</option>
          <option value="cataloged">En Catálogo</option>
          <option value="rejected">No Aprobados</option>
        </select>
      </div>

      {/* Suggestions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSuggestions.map((sug) => (
          <div
            key={sug.id}
            className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {sug.title}
                  </h3>
                  <div className="text-xs text-slate-600 font-medium mt-0.5">
                    por {sug.author} {sug.publisher && `• Editorial ${sug.publisher}`} {sug.publication_year && `(${sug.publication_year})`}
                  </div>
                </div>

                {getStatusBadge(sug.status)}
              </div>

              {sug.reason && (
                <div className="mt-3.5 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                  <span className="font-bold text-slate-800 block mb-0.5">Motivo pedagógico:</span>
                  "{sug.reason}"
                </div>
              )}

              {sug.reviewer_notes && (
                <div className="mt-2.5 p-3 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900 leading-relaxed">
                  <span className="font-bold block mb-0.5 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                    Respuesta de la Biblioteca:
                  </span>
                  {sug.reviewer_notes}
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Propuesto por <strong>{sug.suggested_by_name}</strong> ({sug.suggested_by_grade || sug.suggested_by_role})
                </div>
                <div>
                  {new Date(sug.created_at).toLocaleDateString('es-VE')}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => handleVote(sug.id)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-amber-50 hover:text-amber-800 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Apoyar esta propuesta"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                {sug.votes} {sug.votes === 1 ? 'Voto' : 'Votos'}
              </button>

              <button
                onClick={() => handleOpenReviewModal(sug)}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Gestionar Estado
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: New Suggestion */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-600" />
                Proponer Nuevo Libro para la Biblioteca
              </h3>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitNew} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Título de la Obra *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Fiebre o Doña Bárbara"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Autor / Escritor *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Miguel Otero Silva"
                    value={formAuthor}
                    onChange={(e) => setFormAuthor(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Editorial (opcional)</label>
                  <input
                    type="text"
                    placeholder="ej. Santillana / Planeta"
                    value={formPublisher}
                    onChange={(e) => setFormPublisher(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">¿Por qué recomiendas este libro? (Motivo)</label>
                <textarea
                  rows={2}
                  placeholder="ej. Apoyo para el curso de Castellano de 4to año o lectura recreativa..."
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tu Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Prof. María Morales"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Grado / Cargo</label>
                  <input
                    type="text"
                    placeholder="ej. Docente de Literatura"
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-sm"
                >
                  Enviar Sugerencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Review Suggestion */}
      {selectedSuggestionForReview && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                Evaluar Desiderata / Propuesta
              </h3>
              <button
                onClick={() => setSelectedSuggestionForReview(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-2">
              <div className="font-bold text-sm text-slate-900">{selectedSuggestionForReview.title}</div>
              <div className="text-slate-600">Autor: {selectedSuggestionForReview.author}</div>
              <div className="text-slate-500">Solicitado por: {selectedSuggestionForReview.suggested_by_name}</div>
            </div>

            <div>
              <label className="font-bold text-xs text-slate-700 block mb-1">Notas de la Biblioteca / Justificación</label>
              <textarea
                rows={3}
                placeholder="Observaciones de presupuesto, estado de adquisición..."
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-xs"
              />
            </div>

            <div className="pt-2 grid grid-cols-2 gap-2">
              <button
                onClick={() => handleUpdateStatus('under_review')}
                className="px-3 py-2 bg-blue-50 text-blue-800 font-bold rounded-xl text-xs hover:bg-blue-100 transition"
              >
                En Evaluación
              </button>
              <button
                onClick={() => handleUpdateStatus('approved')}
                className="px-3 py-2 bg-emerald-800 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition"
              >
                Aprobar Compra
              </button>
              <button
                onClick={() => handleUpdateStatus('cataloged')}
                className="px-3 py-2 bg-purple-50 text-purple-800 font-bold rounded-xl text-xs hover:bg-purple-100 transition"
              >
                Marcar en Catálogo
              </button>
              <button
                onClick={() => handleUpdateStatus('rejected')}
                className="px-3 py-2 bg-rose-50 text-rose-800 font-bold rounded-xl text-xs hover:bg-rose-100 transition"
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
