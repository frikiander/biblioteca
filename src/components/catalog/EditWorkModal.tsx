'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Edit3,
  BookOpen,
  Layers,
  Building2,
  Calendar,
  Globe,
  Tag,
  Hash,
  Copy as CopyIcon,
  Plus,
  Trash2,
  Printer,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  MapPin,
  Barcode,
  Image as ImageIcon,
  Save,
  Check,
  Compass,
  AlertTriangle
} from 'lucide-react';
import type { Work, Branch, Copy, CopyCondition, CopyStatus, WorkWithCopiesCount } from '../../types/database';
import {
  supabase,
  isSupabaseConfigured,
  INITIAL_BRANCHES,
  getStoredBranches,
  getStoredCopies,
  generateMarbeteCode,
  getAuthorCutterCode,
  saveWorkAndCopies,
  deleteWork
} from '../../lib/supabaseClient';
import { getDeweyInfo } from '../../lib/dewey';
import { PrintSpineLabelsModal } from '../copies/PrintSpineLabelsModal';

interface EditWorkModalProps {
  work: WorkWithCopiesCount | null;
  isOpen: boolean;
  onClose: () => void;
  onWorkUpdated: (updatedWork: Work) => void;
  onWorkDeleted?: (deletedWorkId: string) => void;
}

const SAMPLE_COVERS = [
  { label: 'Literatura Clásica', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600' },
  { label: 'Historia & Ensayo', url: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&q=80&w=600' },
  { label: 'Ciencias & Naturaleza', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=600' },
  { label: 'Infantil / Juvenil', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80&w=600' },
  { label: 'Educación & Arte', url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=600' },
];

export const EditWorkModal: React.FC<EditWorkModalProps> = ({
  work,
  isOpen,
  onClose,
  onWorkUpdated,
  onWorkDeleted,
}) => {
  const [activeTab, setActiveTab] = useState<'work' | 'copies'>('work');
  const [branches, setBranches] = useState<Branch[]>(() => getStoredBranches());

  // Form states for Work
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [deweyCode, setDeweyCode] = useState('860');
  const [publisher, setPublisher] = useState('');
  const [publicationYear, setPublicationYear] = useState<number>(new Date().getFullYear());
  const [language, setLanguage] = useState('spa');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [newSubjectInput, setNewSubjectInput] = useState('');

  // Extended MARC21 fields
  const [edition, setEdition] = useState('');
  const [physicalDescription, setPhysicalDescription] = useState('');
  const [series, setSeries] = useState('');
  const [targetAudience, setTargetAudience] = useState('');

  // Copies management
  const [copies, setCopies] = useState<Copy[]>([]);
  const [deletedCopyIds, setDeletedCopyIds] = useState<string[]>([]);

  // Print spine modal inside
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printCopyTarget, setPrintCopyTarget] = useState<Copy | undefined>(undefined);

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isConfirmingDeleteWork, setIsConfirmingDeleteWork] = useState(false);

  // Initialize data whenever work changes or modal opens
  useEffect(() => {
    if (work && isOpen) {
      setTitle(work.title || '');
      setAuthor(work.author || '');
      setIsbn(work.isbn || '');
      setDeweyCode(work.dewey_code || '860');
      setPublisher(work.publisher || '');
      setPublicationYear(work.publication_year || new Date().getFullYear());
      setLanguage(work.language || 'spa');
      setDescription(work.description || '');
      setCoverUrl(work.cover_url || SAMPLE_COVERS[0].url);
      setSubjects(work.subjects && work.subjects.length > 0 ? [...work.subjects] : ['Literatura']);
      setEdition(work.edition || '');
      setPhysicalDescription(work.physical_description || '');
      setSeries(work.series || '');
      setTargetAudience(work.target_audience || '');

      setErrorMessage(null);
      setSuccessMessage(null);
      setIsConfirmingDeleteWork(false);
      setDeletedCopyIds([]);

      // Fetch live or stored copies for this work
      loadWorkCopies(work.id);
      setBranches(getStoredBranches());
    }
  }, [work, isOpen]);

  const loadWorkCopies = async (workId: string) => {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await (supabase as any)
          .from('copies')
          .select('*, branch:branches(*)')
          .eq('work_id', workId)
          .order('created_at', { ascending: true });
        if (!error && data) {
          setCopies(data);
          return;
        }
      }
    } catch (e) {
      console.warn('Could not load copies from Supabase, using local store:', e);
    }

    const allLocal = getStoredCopies();
    const matched = allLocal.filter(
      (c) => c.work_id === workId || (c.work && c.work.id === workId)
    );
    setCopies(matched);
  };

  if (!isOpen || !work) return null;

  const deweyInfo = getDeweyInfo(deweyCode);

  // Subject tag management
  const handleAddSubject = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newSubjectInput.trim();
    if (trimmed && !subjects.includes(trimmed)) {
      setSubjects([...subjects, trimmed]);
      setNewSubjectInput('');
    }
  };

  const handleRemoveSubject = (tagToRemove: string) => {
    setSubjects(subjects.filter((t) => t !== tagToRemove));
  };

  // Copies actions
  const handleAddCopy = () => {
    const defaultBranch = branches[0] || INITIAL_BRANCHES[0];
    const nextSeq = copies.length + 1;
    const authorCutter = getAuthorCutterCode(author, title);
    const newCode = generateMarbeteCode(defaultBranch.name || defaultBranch.id, deweyCode, authorCutter, nextSeq, title);

    const newDraft: Copy = {
      id: `c_new_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      work_id: work.id,
      branch_id: defaultBranch.id,
      condition: 'bueno',
      internal_code: newCode,
      status: defaultBranch.type === 'external_donation' ? 'en_donacion' : 'disponible',
      notes: `Ejemplar #${nextSeq} incorporado al inventario`,
      created_at: new Date().toISOString(),
      work: work,
      branch: defaultBranch,
    };

    setCopies([...copies, newDraft]);
  };

  const handleUpdateCopyField = (copyId: string, field: keyof Copy, value: any) => {
    setCopies(
      copies.map((c, idx) => {
        if (c.id !== copyId) return c;

        // If branch changed, recalculate the internal code prefix dynamically
        if (field === 'branch_id') {
          const newBranch = branches.find((b) => b.id === value) || branches[0];
          const cutter = getAuthorCutterCode(author, title);
          const updatedCode = generateMarbeteCode(newBranch.name || newBranch.id, deweyCode, cutter, idx + 1, title);
          return {
            ...c,
            branch_id: value,
            branch: newBranch,
            internal_code: updatedCode,
            status: newBranch.type === 'external_donation' ? 'en_donacion' : (c.status === 'en_donacion' ? 'disponible' : c.status),
          };
        }

        return {
          ...c,
          [field]: value,
        };
      })
    );
  };

  const handleRegenerateCopyCode = (copyId: string, index: number) => {
    setCopies(
      copies.map((c, idx) => {
        if (c.id !== copyId) return c;
        const branch = branches.find((b) => b.id === c.branch_id) || branches[0];
        const cutter = getAuthorCutterCode(author, title);
        const code = generateMarbeteCode(branch?.name || branch?.id, deweyCode, cutter, index + 1, title);
        return {
          ...c,
          internal_code: code,
        };
      })
    );
  };

  const handleDeleteCopy = (copyId: string) => {
    if (!copyId.startsWith('c_new_')) {
      setDeletedCopyIds((prev) => [...prev, copyId]);
    }
    setCopies(copies.filter((c) => c.id !== copyId));
  };

  // Submit all edits
  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!title.trim()) {
      setErrorMessage('El título de la obra no puede quedar en blanco.');
      setActiveTab('work');
      return;
    }
    if (!author.trim()) {
      setErrorMessage('El autor o creador es obligatorio.');
      setActiveTab('work');
      return;
    }
    if (!deweyCode.trim()) {
      setErrorMessage('La clasificación Dewey (CDD) es obligatoria.');
      setActiveTab('work');
      return;
    }

    // Validate copies
    const codes = new Set<string>();
    for (let i = 0; i < copies.length; i++) {
      const c = copies[i];
      const trimmedCode = (c.internal_code || '').trim();
      if (!trimmedCode) {
        setErrorMessage(`El ejemplar #${i + 1} no tiene marbete/código asignado.`);
        setActiveTab('copies');
        return;
      }
      if (codes.has(trimmedCode)) {
        setErrorMessage(`El código de marbete "${trimmedCode}" está duplicado en los ejemplares.`);
        setActiveTab('copies');
        return;
      }
      codes.add(trimmedCode);
    }

    setIsSubmitting(true);

    try {
      const updatedWorkPayload: Work = {
        ...work,
        title: title.trim(),
        author: author.trim(),
        isbn: isbn.trim() || 'Sin ISBN',
        dewey_code: deweyCode.trim(),
        publisher: publisher.trim() || 'Editorial Colegio Integral El Manglar',
        publication_year: Number(publicationYear) || new Date().getFullYear(),
        language: language || 'spa',
        description: description.trim() || 'Ficha catalogada bajo normas internacionales.',
        cover_url: coverUrl.trim() || SAMPLE_COVERS[0].url,
        subjects: subjects.length > 0 ? subjects : ['General'],
        edition: edition.trim() || undefined,
        physical_description: physicalDescription.trim() || undefined,
        series: series.trim() || undefined,
        target_audience: targetAudience.trim() || undefined,
      };

      await saveWorkAndCopies(updatedWorkPayload, copies, deletedCopyIds);

      setSuccessMessage('¡Inventario y ejemplares actualizados con éxito!');
      setTimeout(() => {
        onWorkUpdated(updatedWorkPayload);
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar los cambios en el inventario.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete entire work
  const handleDeleteWholeWork = async () => {
    if (!window.confirm(`¿Estás seguro de eliminar completamente la obra "${work.title}" y todos sus ejemplares del inventario? Esta acción no se puede deshacer.`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteWork(work.id);
      if (onWorkDeleted) {
        onWorkDeleted(work.id);
      } else {
        onWorkUpdated(work);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al eliminar la obra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="edit-work-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="edit-work-modal-container"
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden"
      >
        {/* Header con Badge y Portada Thumbnail */}
        <div className="p-5 border-b border-neutral-200 bg-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-14 rounded bg-neutral-100 overflow-hidden border border-neutral-200 shrink-0 shadow-2xs">
              <img
                src={coverUrl || SAMPLE_COVERS[0].url}
                alt={title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = SAMPLE_COVERS[0].url;
                }}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#f2f7ec] text-[#3b5e14] border border-[#83B141]/30">
                  Edición de Inventario
                </span>
                <span className="text-neutral-400 text-xs">•</span>
                <span className="text-xs font-mono font-bold text-neutral-600">CDD {deweyCode}</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 truncate leading-snug">
                {title || 'Editar Obra y Ejemplares'}
              </h2>
              <p className="text-xs text-neutral-500 truncate">
                {author || 'Autor'} • {copies.length} {copies.length === 1 ? 'ejemplar registrado' : 'ejemplares registrados'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 p-2 rounded-xl hover:bg-neutral-100 transition cursor-pointer shrink-0"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-5 border-b border-neutral-200 bg-neutral-50/80 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('work')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'work'
                ? 'border-[#83B141] text-[#3b5e14]'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Datos de la Obra (Catálogo)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('copies')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'copies'
                ? 'border-[#83B141] text-[#3b5e14]'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <CopyIcon className="w-4 h-4" />
            <span>Ejemplares Específicos</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 text-neutral-800">
              {copies.length}
            </span>
          </button>
        </div>

        {/* Notificaciones de Error / Éxito */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-600 hover:text-rose-900 font-bold p-1"
            >
              ✕
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mx-5 mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* Scrollable Body Content */}
        <form onSubmit={handleSaveAll} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
          {activeTab === 'work' && (
            <div className="space-y-6">
              {/* Sección 1: Datos Fundamentales */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#83B141]" />
                  Información Bibliográfica Principal
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Título */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">
                      Título de la Obra <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      placeholder="e.g. Casas Muertas"
                      className="w-full px-3 py-2 bg-[#F8F9F8] border border-neutral-300 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#83B141]/30 focus:border-[#83B141] transition"
                    />
                  </div>

                  {/* Autor */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">
                      Autor / Creador <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      required
                      placeholder="e.g. Miguel Otero Silva"
                      className="w-full px-3 py-2 bg-[#F8F9F8] border border-neutral-300 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#83B141]/30 focus:border-[#83B141] transition"
                    />
                  </div>

                  {/* Clasificación CDD (Dewey) */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700 flex items-center justify-between">
                      <span>Clasificación Dewey (CDD) <span className="text-rose-500">*</span></span>
                      <span className="text-[10px] text-neutral-500 truncate max-w-[150px]">
                        {deweyInfo.name}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={deweyCode}
                      onChange={(e) => setDeweyCode(e.target.value)}
                      required
                      placeholder="e.g. 863 o 860"
                      className="w-full px-3 py-2 bg-[#F8F9F8] border border-neutral-300 rounded-xl text-xs sm:text-sm font-mono font-bold text-neutral-900 focus:ring-2 focus:ring-[#83B141]/30 focus:border-[#83B141] transition"
                    />
                  </div>

                  {/* ISBN */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">
                      ISBN / Código Normalizado
                    </label>
                    <input
                      type="text"
                      value={isbn}
                      onChange={(e) => setIsbn(e.target.value)}
                      placeholder="e.g. 978-980-01-0000-0"
                      className="w-full px-3 py-2 bg-[#F8F9F8] border border-neutral-300 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-[#83B141]/30 focus:border-[#83B141] transition"
                    />
                  </div>

                  {/* Editorial */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">
                      Editorial / Publicador
                    </label>
                    <input
                      type="text"
                      value={publisher}
                      onChange={(e) => setPublisher(e.target.value)}
                      placeholder="e.g. Editorial Losada / Editorial Manglar"
                      className="w-full px-3 py-2 bg-[#F8F9F8] border border-neutral-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#83B141]/30 focus:border-[#83B141] transition"
                    />
                  </div>

                  {/* Año de Publicación */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">
                      Año de Publicación
                    </label>
                    <input
                      type="number"
                      value={publicationYear}
                      onChange={(e) => setPublicationYear(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#F8F9F8] border border-neutral-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#83B141]/30 focus:border-[#83B141] transition"
                    />
                  </div>

                  {/* Idioma */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">
                      Idioma
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F8F9F8] border border-neutral-300 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#83B141]/30 focus:border-[#83B141] transition cursor-pointer"
                    >
                      <option value="spa">Español (spa)</option>
                      <option value="eng">Inglés (eng)</option>
                      <option value="fre">Francés (fre)</option>
                      <option value="por">Portugués (por)</option>
                      <option value="wyo">Warao / Lengua Indígena (wyo)</option>
                      <option value="lat">Latín (lat)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Portada y Previsualización */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#83B141]" />
                  Portada y Apariencia
                </h3>

                <div className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-xl border border-neutral-200 bg-[#F8F9F8]">
                  <div className="w-20 h-28 rounded-lg overflow-hidden bg-white border border-neutral-300 shrink-0 shadow-xs">
                    <img
                      src={coverUrl || SAMPLE_COVERS[0].url}
                      alt="Previsualización"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = SAMPLE_COVERS[0].url;
                      }}
                    />
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-neutral-700">
                        URL de la Imagen de Portada
                      </label>
                      <input
                        type="url"
                        value={coverUrl}
                        onChange={(e) => setCoverUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#83B141]/30 focus:border-[#83B141] transition"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-neutral-500 font-medium">Sugerencias rápidas:</span>
                      {SAMPLE_COVERS.map((cov, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCoverUrl(cov.url)}
                          className="text-[10.5px] px-2 py-0.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 transition cursor-pointer"
                        >
                          {cov.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sinopsis / Descripción */}
              <div className="space-y-1 pt-2">
                <label className="text-xs font-semibold text-neutral-700">
                  Sinopsis / Resumen Dublin Core
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción de la obra, argumento o contexto curricular..."
                  className="w-full p-3 bg-[#F8F9F8] border border-neutral-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#83B141]/30 focus:border-[#83B141] transition resize-none leading-relaxed"
                />
              </div>

              {/* Materias y Etiquetas */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-neutral-700">
                  Descriptores de Materia / Temas Curriculares
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-neutral-300 bg-[#F8F9F8]">
                  {subjects.map((sub, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-neutral-300 text-xs font-medium text-neutral-800 shadow-2xs"
                    >
                      {sub}
                      <button
                        type="button"
                        onClick={() => handleRemoveSubject(sub)}
                        className="text-neutral-400 hover:text-rose-600 ml-1 p-0.5"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newSubjectInput}
                      onChange={(e) => setNewSubjectInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSubject();
                        }
                      }}
                      placeholder="Añadir materia (+ Enter)..."
                      className="px-2 py-1 text-xs bg-transparent border-none focus:outline-none placeholder-neutral-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddSubject()}
                      className="px-2 py-0.5 text-[11px] font-bold bg-[#83B141] hover:bg-[#719b35] text-white rounded-md transition cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Datos Catalográficos Avanzados (Opcionales) */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-[#83B141]" />
                  Metadatos Catalográficos Avanzados (MARC21)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">Edición</label>
                    <input
                      type="text"
                      value={edition}
                      onChange={(e) => setEdition(e.target.value)}
                      placeholder="e.g. 1ra ed. corregida"
                      className="w-full px-3 py-2 bg-[#F8F9F8] border border-neutral-300 rounded-xl text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">Descripción Física</label>
                    <input
                      type="text"
                      value={physicalDescription}
                      onChange={(e) => setPhysicalDescription(e.target.value)}
                      placeholder="e.g. 210 p. : il. ; 20 cm."
                      className="w-full px-3 py-2 bg-[#F8F9F8] border border-neutral-300 rounded-xl text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">Colección / Serie</label>
                    <input
                      type="text"
                      value={series}
                      onChange={(e) => setSeries(e.target.value)}
                      placeholder="e.g. Biblioteca Popular Venezolana"
                      className="w-full px-3 py-2 bg-[#F8F9F8] border border-neutral-300 rounded-xl text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">Público Objetivo / Nivel</label>
                    <input
                      type="text"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      placeholder="e.g. Primaria alta / Bachillerato"
                      className="w-full px-3 py-2 bg-[#F8F9F8] border border-neutral-300 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'copies' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8F9F8] p-4 rounded-xl border border-neutral-200">
                <div>
                  <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CopyIcon className="w-4 h-4 text-[#83B141]" />
                    Gestión de Ejemplares Físicos
                  </h3>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Configura cada copia física: código marbete, sede de pertenencia, estado de conservación y disponibilidad.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddCopy}
                  className="px-3 py-2 bg-[#83B141] hover:bg-[#719b35] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                >
                  <Plus className="w-4 h-4" strokeWidth={2} />
                  <span>+ Añadir Ejemplar</span>
                </button>
              </div>

              {copies.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-500 mx-auto flex items-center justify-center">
                    <CopyIcon className="w-5 h-5 text-neutral-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-800">No hay ejemplares registrados</h4>
                    <p className="text-[11px] text-neutral-500 max-w-xs mx-auto mt-0.5">
                      Esta obra no posee copias físicas en ninguna sede. Pulsa el botón de arriba para registrar el primer ejemplar.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCopy}
                    className="px-3 py-1.5 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 rounded-lg text-xs font-semibold cursor-pointer transition"
                  >
                    + Crear primer ejemplar
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {copies.map((copy, index) => {
                    const isNewDraft = copy.id.startsWith('c_new_');
                    const branch = branches.find((b) => b.id === copy.branch_id);

                    return (
                      <div
                        key={copy.id}
                        className={`p-4 rounded-xl border transition-all space-y-3 ${
                          isNewDraft
                            ? 'bg-[#fbfdfa] border-[#83B141]/50 shadow-2xs'
                            : 'bg-white border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-100">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center">
                              {index + 1}
                            </span>
                            <span className="text-xs font-bold text-neutral-800">
                              Ejemplar #{index + 1}
                            </span>
                            {isNewDraft && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#EFDA18]/40 text-neutral-900">
                                Nuevo
                              </span>
                            )}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              branch?.type === 'internal'
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}>
                              {branch?.name || 'Sede'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => {
                                setPrintCopyTarget(copy);
                                setIsPrintModalOpen(true);
                              }}
                              className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition cursor-pointer"
                              title="Imprimir tejuelo para este ejemplar"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteCopy(copy.id)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Eliminar o dar de baja este ejemplar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Campos editables del ejemplar */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          {/* Sede / Ubicación */}
                          <div className="space-y-1 sm:col-span-2">
                            <label className="text-[11px] font-semibold text-neutral-600">
                              Sede / Ubicación de Asignación
                            </label>
                            <select
                              value={copy.branch_id}
                              onChange={(e) => handleUpdateCopyField(copy.id, 'branch_id', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-[#F8F9F8] border border-neutral-300 rounded-lg font-medium text-neutral-800 focus:ring-1 focus:ring-[#83B141] transition cursor-pointer"
                            >
                              {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name} ({b.type === 'internal' ? 'Campus Central' : 'Dotación Rural'})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Código Marbete */}
                          <div className="space-y-1 sm:col-span-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-semibold text-neutral-600">
                                Código de Marbete / Signatura
                              </label>
                              <button
                                type="button"
                                onClick={() => handleRegenerateCopyCode(copy.id, index)}
                                className="text-[10px] text-[#3b5e14] hover:underline flex items-center gap-0.5 cursor-pointer"
                                title="Recalcular marbete con fórmula estándar"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Recalcular</span>
                              </button>
                            </div>
                            <input
                              type="text"
                              value={copy.internal_code}
                              onChange={(e) => handleUpdateCopyField(copy.id, 'internal_code', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-[#F8F9F8] border border-neutral-300 rounded-lg font-mono font-bold text-neutral-900 focus:ring-1 focus:ring-[#83B141] transition"
                            />
                          </div>

                          {/* Estado de Conservación */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-neutral-600">
                              Conservación Física
                            </label>
                            <select
                              value={copy.condition}
                              onChange={(e) => handleUpdateCopyField(copy.id, 'condition', e.target.value as CopyCondition)}
                              className="w-full px-2.5 py-1.5 bg-[#F8F9F8] border border-neutral-300 rounded-lg font-semibold text-neutral-800 focus:ring-1 focus:ring-[#83B141] transition cursor-pointer"
                            >
                              <option value="bueno">🟢 Óptimo / Bueno</option>
                              <option value="regular">🟡 Regular / Desgaste Menor</option>
                              <option value="malo">🔴 Deteriorado / Requiere Reparación</option>
                            </select>
                          </div>

                          {/* Estado de Circulación */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-neutral-600">
                              Disponibilidad / Estatus
                            </label>
                            <select
                              value={copy.status || 'disponible'}
                              onChange={(e) => handleUpdateCopyField(copy.id, 'status', e.target.value as CopyStatus)}
                              className="w-full px-2.5 py-1.5 bg-[#F8F9F8] border border-neutral-300 rounded-lg font-medium text-neutral-800 focus:ring-1 focus:ring-[#83B141] transition cursor-pointer"
                            >
                              <option value="disponible">Disponible</option>
                              <option value="prestado">Prestado</option>
                              <option value="en_donacion">En Dotación Rural</option>
                              <option value="en_traslado">En Traslado</option>
                              <option value="en_reparacion">En Reparación</option>
                              <option value="baja">Dado de Baja</option>
                            </select>
                          </div>

                          {/* Código de Barras (Opcional) */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-neutral-600">
                              Código de Barras (Opcional)
                            </label>
                            <input
                              type="text"
                              value={copy.barcode || ''}
                              onChange={(e) => handleUpdateCopyField(copy.id, 'barcode', e.target.value)}
                              placeholder="e.g. 759000123"
                              className="w-full px-2.5 py-1.5 bg-[#F8F9F8] border border-neutral-300 rounded-lg font-mono text-neutral-800"
                            />
                          </div>

                          {/* Notas / Observaciones */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-neutral-600">
                              Observaciones
                            </label>
                            <input
                              type="text"
                              value={copy.notes || ''}
                              onChange={(e) => handleUpdateCopyField(copy.id, 'notes', e.target.value)}
                              placeholder="Ej: Donación 2024, firma de autor..."
                              className="w-full px-2.5 py-1.5 bg-[#F8F9F8] border border-neutral-300 rounded-lg text-neutral-800"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </form>

        {/* Footer con Acciones Principales */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div>
            {!isConfirmingDeleteWork ? (
              <button
                type="button"
                onClick={() => setIsConfirmingDeleteWork(true)}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar obra completa del inventario</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 animate-in fade-in">
                <span className="text-xs font-bold text-rose-700">¿Confirmar eliminación total?</span>
                <button
                  type="button"
                  onClick={handleDeleteWholeWork}
                  disabled={isSubmitting}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  Sí, eliminar
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDeleteWork(false)}
                  className="px-2 py-1 rounded-lg bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-700 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#83B141] hover:bg-[#719b35] text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando Cambios...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de impresión de tejuelo si se solicitó */}
      {isPrintModalOpen && (
        <PrintSpineLabelsModal
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false);
            setPrintCopyTarget(undefined);
          }}
          selectedWork={work}
          initialCopies={printCopyTarget ? [printCopyTarget] : copies}
          singleWorkTitle={work.title}
        />
      )}
    </div>
  );
};
