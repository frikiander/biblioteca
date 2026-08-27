'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  PlusCircle, 
  Building2, 
  Barcode, 
  Tag, 
  CheckCircle2, 
  AlertCircle,
  BookOpen,
  RefreshCw,
  Info,
  Compass,
  Layers,
  UserCheck,
  Download,
  Image as ImageIcon,
  FileDown
} from 'lucide-react';
import type { Work, Branch, Copy, CopyCondition } from '../../types/database';
import { 
  supabase, 
  isSupabaseConfigured, 
  INITIAL_BRANCHES, 
  getStoredBranches, 
  getBranchCodePrefix, 
  generateMarbeteCode,
  getAuthorCutterCode,
  getNextCopySequenceForWork,
  getStoredCopies 
} from '../../lib/supabaseClient';
import { SpineLabel, downloadSpineLabelPNG, downloadSpineLabelSVG, downloadSpineLabelsPDF } from './SpineLabel';

interface QuickAddCopyModalProps {
  work: Work | null;
  isOpen: boolean;
  onClose: () => void;
  onCopyAdded: (newCopy: Copy) => void;
}

export const QuickAddCopyModal: React.FC<QuickAddCopyModalProps> = ({
  work,
  isOpen,
  onClose,
  onCopyAdded,
}) => {
  const [branches, setBranches] = useState<Branch[]>(() => {
    return getStoredBranches();
  });

  const [selectedBranchId, setSelectedBranchId] = useState<string>(branches[0]?.id || '00000000-0000-4000-a000-000000000001');
  const [condition, setCondition] = useState<CopyCondition>('bueno');

  // Load live branches on mount
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase
        .from('branches')
        .select('*')
        .order('name')
        .then(({ data }) => {
          if (data && data.length > 0) {
            setBranches(data);
            setSelectedBranchId((prev) => {
              const stillExists = data.some((b) => b.id === prev);
              return stillExists ? prev : data[0].id;
            });
          }
        });
    }
  }, [isOpen]);

  const targetBranch = branches.find(b => b.id === selectedBranchId || b.name === selectedBranchId) || branches[0];
  const prefix = getBranchCodePrefix(targetBranch?.name || targetBranch?.id);
  const deweyNum = work?.dewey_code ? (work.dewey_code.split('.')[0].replace(/[^0-9]/g, '') || '800') : '800';

  // 4-variable state: Prefix, Dewey, Cutter, Sequence
  const [cutterCode, setCutterCode] = useState<string>(() => {
    return work ? getAuthorCutterCode(work.author, work.title) : 'OTE';
  });
  const [copySequence, setCopySequence] = useState<number>(() => {
    return work ? getNextCopySequenceForWork(work.id) : 1;
  });

  const formattedSequence = String(copySequence).padStart(3, '0');

  const [internalCode, setInternalCode] = useState<string>(() => {
    return generateMarbeteCode(
      targetBranch?.name || targetBranch?.id,
      work?.dewey_code,
      cutterCode,
      copySequence,
      work?.title
    );
  });

  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Sync copy sequence and cutter when modal opens with a work
  useEffect(() => {
    if (work && isOpen) {
      const nextSeq = getNextCopySequenceForWork(work.id);
      setCopySequence(nextSeq);
      setCutterCode(getAuthorCutterCode(work.author, work.title));
    }
  }, [work, isOpen]);

  // Sync marbete code whenever formula variables change
  useEffect(() => {
    if (!work) return;
    const code = generateMarbeteCode(
      targetBranch?.name || targetBranch?.id,
      work.dewey_code,
      cutterCode,
      copySequence,
      work.title
    );
    setInternalCode(code);
  }, [selectedBranchId, work, cutterCode, copySequence, targetBranch]);

  if (!isOpen || !work) return null;

  const handleBranchChange = (newBranchId: string) => {
    setSelectedBranchId(newBranchId);
  };

  const handleRecalculateCutter = () => {
    if (work) {
      setCutterCode(getAuthorCutterCode(work.author, work.title));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const finalCode = internalCode.trim() || generateMarbeteCode(
      targetBranch.name || targetBranch.id, 
      work.dewey_code,
      cutterCode,
      copySequence,
      work.title
    );

    const resolvedBranchId = targetBranch?.id || selectedBranchId;

    try {
      if (isSupabaseConfigured && supabase) {
        const { data: newCopy, error: insertError } = await (supabase as any)
          .from('copies')
          .insert({
            work_id: work.id,
            branch_id: resolvedBranchId,
            condition: condition,
            internal_code: finalCode,
            status: targetBranch.type === 'external_donation' ? 'en_donacion' : 'disponible',
            notes: notes.trim() || `Ejemplar #${copySequence} (Cutter: ${cutterCode}) asignado a ${targetBranch.name}`,
          })
          .select('*, work:works(*), branch:branches(*)')
          .single();

        if (insertError) {
          throw new Error(insertError.message);
        }

        setSuccess(`Ejemplar #${copySequence} (${finalCode}) registrado exitosamente.`);
        setTimeout(() => {
          onCopyAdded(newCopy);
          onClose();
        }, 800);
      } else {
        // Local simulation
        const copies: Copy[] = getStoredCopies();

        if (copies.some((c) => c.internal_code === finalCode)) {
          throw new Error(`El código marbete ${finalCode} ya existe en el inventario.`);
        }

        const newCopy: Copy = {
          id: 'c_' + Date.now(),
          work_id: work.id,
          branch_id: selectedBranchId,
          condition: condition,
          internal_code: finalCode,
          status: targetBranch.type === 'external_donation' ? 'en_donacion' : 'disponible',
          notes: notes.trim() || `Ejemplar #${copySequence} (Cutter: ${cutterCode}) asignado a ${targetBranch.name}`,
          created_at: new Date().toISOString(),
          work: work,
          branch: targetBranch,
        };

        const updatedCopies = [newCopy, ...copies];
        localStorage.setItem('manglar_copies', JSON.stringify(updatedCopies));

        setSuccess(`Ejemplar #${copySequence} (${finalCode}) registrado exitosamente.`);
        setTimeout(() => {
          onCopyAdded(newCopy);
          onClose();
        }, 800);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar ejemplar';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        id="quick-add-copy-modal"
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden my-6"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                Inventario Físico Multisede
              </span>
              <h3 className="text-base font-bold text-white">Registrar Nuevo Ejemplar</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Book Context Pill */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center gap-3">
          <img
            src={work.cover_url}
            alt={work.title}
            className="w-10 h-14 object-cover rounded-lg border border-slate-200 bg-white shrink-0"
          />
          <div className="min-w-0">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono">
              CDD {work.dewey_code} (Clase: {deweyNum})
            </span>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5">{work.title}</h4>
            <p className="text-[11px] text-slate-500 truncate">{work.author}</p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold">{success}</span>
            </div>
          )}

          {/* Sede Destination Selector */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">
              1. Sede o Destino del Ejemplar <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
            >
              <optgroup label="Sedes Centrales (Campus Principal)">
                {branches.filter(b => b.type === 'internal').map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} [{getBranchCodePrefix(b.name)}]
                  </option>
                ))}
              </optgroup>
              <optgroup label="Semilla Manglareña (Dotaciones Rurales)">
                {branches.filter(b => b.type === 'external_donation').map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} [{getBranchCodePrefix(b.name)}]
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Cutter & Sequence Row */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            {/* Cutter */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-emerald-700" />
                  2. Cutter (Autor)
                </label>
                <button
                  type="button"
                  onClick={handleRecalculateCutter}
                  className="text-[10px] text-emerald-800 font-bold hover:underline cursor-pointer"
                >
                  Recalcular
                </button>
              </div>
              <input
                type="text"
                maxLength={3}
                value={cutterCode}
                onChange={(e) => setCutterCode(e.target.value.toUpperCase().slice(0, 3))}
                placeholder="OTE"
                required
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs font-bold text-slate-900 uppercase"
              />
            </div>

            {/* Sequence */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Layers className="w-3 h-3 text-emerald-700" />
                3. Copia (Secuencia)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={copySequence}
                  onChange={(e) => setCopySequence(Math.max(1, parseInt(e.target.value) || 1))}
                  required
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs font-bold text-slate-900"
                />
                <span className="px-2 py-1.5 bg-emerald-100 text-emerald-900 rounded-lg font-mono font-bold text-[10px] shrink-0">
                  {formattedSequence}
                </span>
              </div>
            </div>
          </div>

          {/* Marbete Token Preview & Tejuelo 25x38mm */}
          <div className="p-3 bg-slate-900 text-white rounded-xl border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-2 flex-1 w-full sm:w-auto">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Fórmula: [Sede]-[Dewey]-[Cutter]-[Copia]</span>
                <span className="text-emerald-400 font-bold">Copia #{copySequence}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-extrabold text-emerald-300 tracking-wide">
                  {internalCode}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
                    {deweyNum}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                    {cutterCode}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                    {prefix}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Spine Label */}
            <div className="shrink-0 bg-slate-800 p-1.5 rounded-lg border border-slate-600 flex flex-col items-center">
              <span className="text-[8px] uppercase font-bold text-slate-400 mb-1">Tejuelo 25×38mm</span>
              <SpineLabel
                deweyCode={deweyNum}
                authorLetters={cutterCode}
                copyNumber={`Ej. ${copySequence}`}
                prefix={prefix}
                showCutGuide={true}
              />
              <div className="flex items-center gap-1 mt-1.5">
                <button
                  type="button"
                  onClick={() => downloadSpineLabelsPDF([
                    {
                      deweyCode: deweyNum,
                      authorLetters: cutterCode,
                      copyNumber: copySequence,
                      prefix: prefix,
                      title: work?.title
                    }
                  ], {
                    title: work?.title,
                    mode: 'sheet'
                  })}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-white text-[9px] font-bold flex items-center gap-1 cursor-pointer transition"
                  title="Descargar archivo PDF listo para imprimir en hoja Carta"
                >
                  <FileDown className="w-2.5 h-2.5 text-emerald-300" />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadSpineLabelPNG({
                    deweyCode: deweyNum,
                    authorLetters: cutterCode,
                    copyNumber: copySequence,
                    prefix: prefix,
                    title: work?.title
                  })}
                  className="px-2 py-0.5 rounded bg-emerald-700/80 hover:bg-emerald-600 text-white text-[9px] font-bold flex items-center gap-1 cursor-pointer transition"
                  title="Descargar imagen PNG de este tejuelo"
                >
                  <ImageIcon className="w-2.5 h-2.5" />
                  <span>PNG</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadSpineLabelSVG({
                    deweyCode: deweyNum,
                    authorLetters: cutterCode,
                    copyNumber: copySequence,
                    prefix: prefix,
                    title: work?.title
                  })}
                  className="px-2 py-0.5 rounded bg-blue-700/80 hover:bg-blue-600 text-white text-[9px] font-bold flex items-center gap-1 cursor-pointer transition"
                  title="Descargar gráfico vectorial SVG"
                >
                  <Download className="w-2.5 h-2.5" />
                  <span>SVG</span>
                </button>
              </div>
            </div>
          </div>

          {/* Physical Condition */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">
              4. Estado de Conservación Física <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['bueno', 'regular', 'malo'] as CopyCondition[]).map((cond) => (
                <button
                  key={cond}
                  type="button"
                  onClick={() => setCondition(cond)}
                  className={`py-2 px-3 rounded-xl font-bold capitalize transition border cursor-pointer ${
                    condition === cond
                      ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cond}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">
              5. Observaciones
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Sala de lectura general..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              {isSubmitting ? 'Guardando...' : `Registrar ${internalCode}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
