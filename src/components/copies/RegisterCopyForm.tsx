import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Barcode, 
  ArrowRight, 
  BookOpen, 
  RefreshCw,
  MapPin,
  Layers,
  Hash,
  Compass,
  UserCheck,
  Tag,
  Printer,
  Download,
  Image as ImageIcon,
  FileDown,
  BookPlus
} from 'lucide-react';
import type { Work, CopyCondition, Copy, ActionResponse, Branch } from '../../types/database';
import { SpineLabel, downloadSpineLabelPNG, downloadSpineLabelSVG, downloadSpineLabelsPDF } from './SpineLabel';
import { RegisterWorkModal } from '../works/RegisterWorkModal';
import { 
  supabase, 
  isSupabaseConfigured, 
  INITIAL_WORKS, 
  getStoredBranches, 
  getStoredWorks,
  getBranchCodePrefix, 
  generateMarbeteCode,
  getAuthorCutterCode,
  getNextCopySequenceForWork,
  getStoredCopies 
} from '../../lib/supabaseClient';

interface RegisterCopyFormProps {
  initialWork?: Work | null;
  onCopyRegistered?: (newCopy: Copy) => void;
}

export const RegisterCopyForm: React.FC<RegisterCopyFormProps> = ({ 
  initialWork, 
  onCopyRegistered 
}) => {
  const [works, setWorks] = useState<Work[]>(() => {
    return getStoredWorks();
  });

  const [branches, setBranches] = useState<Branch[]>(() => {
    return getStoredBranches();
  });

  const [isRegisterWorkModalOpen, setIsRegisterWorkModalOpen] = useState<boolean>(false);
  const [selectedWorkId, setSelectedWorkId] = useState<string>(initialWork?.id || works[0]?.id || '');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branches[0]?.id || '00000000-0000-4000-a000-000000000001');
  const [condition, setCondition] = useState<CopyCondition>('bueno');

  // Load live works and branches from Supabase
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase
        .from('works')
        .select('*')
        .order('title')
        .then(({ data }) => {
          if (data && data.length > 0) {
            setWorks(data);
            if (!selectedWorkId) {
              setSelectedWorkId(data[0].id);
            }
          }
        });

      supabase
        .from('branches')
        .select('*')
        .order('name')
        .then(({ data }) => {
          if (data && data.length > 0) {
            setBranches(data);
            setSelectedBranchId((prev) => {
              const exists = data.some((b) => b.id === prev);
              return exists ? prev : data[0].id;
            });
          }
        });
    }
  }, []);

  // Update selectedWorkId if initialWork prop changes
  useEffect(() => {
    if (initialWork?.id) {
      setSelectedWorkId(initialWork.id);
    }
  }, [initialWork]);

  // Update selectedWorkId if works changes and selectedWorkId is empty
  useEffect(() => {
    if (!selectedWorkId && works.length > 0) {
      setSelectedWorkId(works[0].id);
    }
  }, [works, selectedWorkId]);

  const selectedWork = works.find((w) => w.id === selectedWorkId) || initialWork || works[0];
  const selectedBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];

  // Variables for marbete formula: [PREFIJO]-[DEWEY]-[CUTTER]-[SECUENCIA]
  const [cutterCode, setCutterCode] = useState<string>(() => {
    return getAuthorCutterCode(selectedWork?.author, selectedWork?.title);
  });
  const [copySequence, setCopySequence] = useState<number>(() => {
    return getNextCopySequenceForWork(selectedWork?.id);
  });

  // Calculate prefix and dewey
  const prefix = getBranchCodePrefix(selectedBranch?.name || selectedBranch?.id);
  const deweyNum = selectedWork?.dewey_code ? (selectedWork.dewey_code.split('.')[0].replace(/[^0-9]/g, '') || '800') : '800';
  const formattedSequence = String(copySequence).padStart(3, '0');

  // Combined code
  const [internalCode, setInternalCode] = useState<string>(() => {
    return generateMarbeteCode(
      selectedBranch?.name || selectedBranch?.id,
      selectedWork?.dewey_code,
      cutterCode,
      copySequence,
      selectedWork?.title
    );
  });

  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionResult, setActionResult] = useState<ActionResponse<Copy> | null>(null);

  // Sync internalCode whenever formula variables change
  useEffect(() => {
    const code = generateMarbeteCode(
      selectedBranch?.name || selectedBranch?.id,
      selectedWork?.dewey_code,
      cutterCode,
      copySequence,
      selectedWork?.title
    );
    setInternalCode(code);
  }, [selectedBranchId, selectedWorkId, cutterCode, copySequence, selectedBranch, selectedWork]);

  const handleBranchChange = (newBranchId: string) => {
    setSelectedBranchId(newBranchId);
  };

  const handleWorkChange = (newWorkId: string) => {
    setSelectedWorkId(newWorkId);
    const work = works.find((w) => w.id === newWorkId);
    if (work) {
      setCutterCode(getAuthorCutterCode(work.author, work.title));
    }
    const nextSeq = getNextCopySequenceForWork(newWorkId);
    setCopySequence(nextSeq);
  };

  const handleRecalculateCutter = () => {
    if (selectedWork) {
      setCutterCode(getAuthorCutterCode(selectedWork.author, selectedWork.title));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionResult(null);

    const generatedCode = internalCode.trim() || generateMarbeteCode(
      selectedBranch.name || selectedBranch.id, 
      selectedWork?.dewey_code,
      cutterCode,
      copySequence,
      selectedWork?.title
    );

    try {
      if (isSupabaseConfigured && supabase) {
        // 1. Ensure branch exists in Supabase
        const { data: branchData } = await (supabase as any)
          .from('branches')
          .select('id, name')
          .eq('name', selectedBranch.name)
          .maybeSingle();

        let targetBranchDbId = branchData?.id;

        if (!targetBranchDbId) {
          const { data: newBranch, error: createError } = await (supabase as any)
            .from('branches')
            .insert({
              name: selectedBranch.name,
              type: selectedBranch.type,
              location: selectedBranch.location || '',
              description: selectedBranch.description || '',
            })
            .select()
            .single();

          if (createError) throw createError;
          targetBranchDbId = newBranch.id;
        }

        // 2. Insert copy
        const { data: newCopy, error: copyError } = await (supabase as any)
          .from('copies')
          .insert({
            work_id: selectedWorkId,
            branch_id: targetBranchDbId,
            condition: condition,
            internal_code: generatedCode,
            status: selectedBranch.type === 'external_donation' ? 'en_donacion' : 'disponible',
            notes: notes.trim() || `Ejemplar #${copySequence} (Cutter: ${cutterCode}) asignado a ${selectedBranch.name}`,
          })
          .select('*, work:works(*), branch:branches(*)')
          .single();

        if (copyError) {
          throw new Error(copyError.message);
        }

        const res: ActionResponse<Copy> = {
          success: true,
          data: newCopy,
          message: `Ejemplar #${copySequence} (${generatedCode}) registrado exitosamente en "${selectedBranch.name}".`,
        };
        setActionResult(res);
        if (onCopyRegistered && newCopy) onCopyRegistered(newCopy);
      } else {
        // Local simulation with persistent storage
        const copies: Copy[] = getStoredCopies();

        // Check if internal_code exists
        if (copies.some((c) => c.internal_code === generatedCode)) {
          throw new Error(`El código marbete ${generatedCode} ya existe en el inventario.`);
        }

        const newCopy: Copy = {
          id: 'c_' + Date.now(),
          work_id: selectedWorkId,
          branch_id: selectedBranch.id,
          condition: condition,
          internal_code: generatedCode,
          status: selectedBranch.type === 'external_donation' ? 'en_donacion' : 'disponible',
          notes: notes.trim() || `Ejemplar #${copySequence} (Cutter: ${cutterCode}) asignado a ${selectedBranch.name}`,
          created_at: new Date().toISOString(),
          work: selectedWork,
          branch: selectedBranch,
        };

        const updatedCopies = [newCopy, ...copies];
        localStorage.setItem('manglar_copies', JSON.stringify(updatedCopies));

        const res: ActionResponse<Copy> = {
          success: true,
          data: newCopy,
          message: `Ejemplar #${copySequence} (${generatedCode}) registrado exitosamente en "${selectedBranch.name}".`,
        };
        setActionResult(res);
        if (onCopyRegistered) onCopyRegistered(newCopy);
      }

      // Increment sequence for next copy
      setCopySequence(prev => prev + 1);
      setNotes('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al registrar ejemplar';
      setActionResult({
        success: false,
        error: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="register-copy-section" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-white border-b border-[#D3D2D3] flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-[#f2f7ec] text-[#83B141] border border-[#83B141]/30">
            <Building2 className="w-6 h-6" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Registro & Asignación de Ejemplar Físico</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Fórmula de Signatura: <span className="font-mono font-bold text-neutral-800">[PREFIJO]-[DEWEY]-[CUTTER]-[SECUENCIA]</span>
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Work Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              1. Seleccionar Obra Bibliográfica <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setIsRegisterWorkModalOpen(true)}
              className="text-xs text-emerald-800 hover:text-emerald-950 font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <BookPlus className="w-3.5 h-3.5" />
              <span>+ Catalogar Nueva Obra</span>
            </button>
          </div>

          {works.length === 0 ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-xs">
                <span className="font-bold">No hay obras registradas en el catálogo.</span>
                <p className="text-amber-800 mt-0.5">Primero debes catalogar una obra bibliográfica para poder asignarle ejemplares individuales.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisterWorkModalOpen(true)}
                className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold shrink-0 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <BookPlus className="w-3.5 h-3.5" />
                Catalogar Obra Ahora
              </button>
            </div>
          ) : (
            <select
              id="work-id-select"
              value={selectedWorkId}
              onChange={(e) => handleWorkChange(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition font-medium"
            >
              {works.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title} — {w.author} (Dewey: {w.dewey_code})
                </option>
              ))}
            </select>
          )}

          {selectedWork && works.length > 0 && (
            <div className="p-3 rounded-xl bg-[#F8F9F8] border border-[#D3D2D3] flex items-center justify-between text-xs text-neutral-600 mt-2">
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-[#83B141] shrink-0" strokeWidth={1.75} />
                <div>
                  <span className="font-semibold text-neutral-900">{selectedWork.title}</span> por {selectedWork.author}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-[#EFDA18]/25 text-neutral-900 font-mono font-bold text-xs border border-[#EFDA18]/40">
                  Dewey: {deweyNum}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-[#f2f7ec] text-[#2c4210] font-mono font-bold text-xs border border-[#83B141]/30">
                  Cutter: {cutterCode}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Assigned Branch Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            2. Sede de Asignación <span className="text-rose-500">*</span>
          </label>
          <select
            id="branch-id-select"
            value={selectedBranchId}
            onChange={(e) => handleBranchChange(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
          >
            <optgroup label="Sedes Centrales (Campus Principal)">
              {branches.filter(b => b.type === 'internal').map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} — Prefijo [{getBranchCodePrefix(b.name)}]
                </option>
              ))}
            </optgroup>
            <optgroup label="Semilla Manglareña (Dotaciones Rurales)">
              {branches.filter(b => b.type === 'external_donation').map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} — Prefijo [{getBranchCodePrefix(b.name)}]
                </option>
              ))}
            </optgroup>
          </select>

          {selectedBranch && (
            <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
              selectedBranch.type === 'internal'
                ? 'bg-[#f2f7ec]/60 border-[#83B141]/30 text-neutral-900'
                : 'bg-amber-50/70 border-amber-200 text-amber-950'
            }`}>
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  selectedBranch.type === 'internal' ? 'bg-[#83B141]' : 'bg-amber-500'
                }`}></span>
                <div>
                  <span className="font-bold text-sm">{selectedBranch.name}</span>
                  <p className="text-[11px] text-neutral-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-neutral-400" />
                    {selectedBranch.location || 'Ubicación registrada'}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg font-mono font-bold text-xs bg-white border border-[#D3D2D3] text-neutral-800">
                Prefijo: {prefix}-
              </span>
            </div>
          )}
        </div>

        {/* Dynamic Formula Components: Cutter Code & Copy Sequence */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          {/* Cutter de Autor / Título */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                3. Código Cutter (Autor / Título) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleRecalculateCutter}
                className="text-[11px] text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Recalcular Cutter
              </button>
            </div>
            <input
              id="cutter-code-input"
              type="text"
              maxLength={4}
              value={cutterCode}
              onChange={(e) => setCutterCode(e.target.value.slice(0, 4))}
              placeholder="Ej: OTEc"
              required
              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
            />
            <p className="text-[11px] text-slate-500">
              3 letras del autor en mayúscula + 1 inicial del título en minúscula (ej: <strong>OTEc</strong> para <em>Casas muertas</em>, <strong>OTEo</strong> para <em>Oficina #1</em>, <strong>SAIp</strong> para <em>El principito</em>).
            </p>
          </div>

          {/* Secuencia Única de Copia */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-700" />
              4. Secuencia de Copia (Ejemplar #) <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                id="copy-sequence-input"
                type="number"
                min="1"
                max="999"
                value={copySequence}
                onChange={(e) => setCopySequence(Math.max(1, parseInt(e.target.value) || 1))}
                required
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
              />
              <span className="px-3 py-2 bg-emerald-100 text-emerald-900 rounded-xl font-mono font-bold text-xs shrink-0">
                {formattedSequence}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Identifica que es la <strong>copia {copySequence}</strong> de este libro ({formattedSequence}).
            </p>
          </div>
        </div>

        {/* Visual Formula Breakdown Banner */}
        <div className="p-5 rounded-2xl bg-[#F8F9F8] text-neutral-900 border border-[#D3D2D3] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-bold text-[#83B141] flex items-center gap-1.5">
              <Barcode className="w-4 h-4" />
              Marbete Concatenado Resultante
            </span>
            <span className="text-[10px] font-semibold text-neutral-400">
              Fórmula Oficial Bibliotecológica
            </span>
          </div>

          {/* Visual token blocks */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="p-2.5 rounded-xl bg-white border border-[#D3D2D3] shadow-2xs">
              <span className="text-[10px] text-neutral-500 font-medium block">1. Prefijo Sede</span>
              <span className="font-mono font-bold text-sm sm:text-base text-neutral-900">{prefix}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-[#D3D2D3] shadow-2xs">
              <span className="text-[10px] text-neutral-500 font-medium block">2. Dewey (CDD)</span>
              <span className="font-mono font-bold text-sm sm:text-base text-[#83B141]">{deweyNum}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-[#D3D2D3] shadow-2xs">
              <span className="text-[10px] text-neutral-500 font-medium block">3. Cutter (Autor)</span>
              <span className="font-mono font-bold text-sm sm:text-base text-amber-600">{cutterCode || 'OTE'}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-[#D3D2D3] shadow-2xs">
              <span className="text-[10px] text-neutral-500 font-medium block">4. Copia #</span>
              <span className="font-mono font-bold text-sm sm:text-base text-neutral-900">{formattedSequence}</span>
            </div>
          </div>

          {/* Resulting full code & Physical Spine Label Preview */}
          <div className="p-4 bg-white rounded-xl border border-[#D3D2D3] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs text-neutral-500 block font-medium">Código Marbete Oficial:</span>
              <span className="font-mono text-base sm:text-lg font-extrabold text-[#83B141] tracking-wide block">
                {internalCode}
              </span>
              <span className="text-[11px] text-neutral-400 block">
                Tejuelo de lomo: 25 × 38 mm con guía de corte para guillotina
              </span>
            </div>

            {/* Live SpineLabel Render */}
            <div className="flex flex-col items-center gap-1.5 shrink-0 bg-[#F8F9F8] p-3 rounded-xl border border-[#D3D2D3]">
              <span className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider flex items-center gap-1">
                <Tag className="w-2.5 h-2.5 text-[#83B141]" />
                Vista Previa Tejuelo (1:1)
              </span>
              <SpineLabel
                deweyCode={selectedWork?.dewey_code || deweyNum}
                authorLetters={cutterCode || 'OTE'}
                copyNumber={`Ej. ${copySequence}`}
                prefix={prefix}
                showCutGuide={true}
                className="shadow-sm"
              />
              <div className="flex items-center gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => downloadSpineLabelsPDF([
                    {
                      deweyCode: selectedWork?.dewey_code || deweyNum,
                      authorLetters: cutterCode || 'OTE',
                      copyNumber: copySequence,
                      prefix: prefix,
                      title: selectedWork?.title
                    }
                  ], {
                    title: selectedWork?.title,
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
                    deweyCode: selectedWork?.dewey_code || deweyNum,
                    authorLetters: cutterCode || 'OTE',
                    copyNumber: copySequence,
                    prefix: prefix,
                    title: selectedWork?.title
                  })}
                  className="px-2 py-0.5 rounded bg-[#83B141] hover:bg-[#719b35] text-white text-[9px] font-bold flex items-center gap-1 cursor-pointer transition"
                  title="Descargar imagen PNG de este tejuelo"
                >
                  <ImageIcon className="w-2.5 h-2.5" />
                  <span>PNG</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadSpineLabelSVG({
                    deweyCode: selectedWork?.dewey_code || deweyNum,
                    authorLetters: cutterCode || 'OTE',
                    copyNumber: copySequence,
                    prefix: prefix,
                    title: selectedWork?.title
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
        </div>

        {/* Condition & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Physical Condition */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              5. Estado Físico del Ejemplar <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['bueno', 'regular', 'malo'] as CopyCondition[]).map((cond) => (
                <button
                  key={cond}
                  type="button"
                  onClick={() => setCondition(cond)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold capitalize transition border flex flex-col items-center gap-1 cursor-pointer ${
                    condition === cond
                      ? cond === 'bueno'
                        ? 'bg-[#83B141] text-white border-[#83B141] shadow-xs'
                        : cond === 'regular'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{cond}</span>
                  <span className="text-[10px] font-normal opacity-80">
                    {cond === 'bueno' ? 'Óptimo' : cond === 'regular' ? 'Uso leve' : 'Desgaste'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              6. Observaciones de la Asignación (Opcional)
            </label>
            <input
              id="copy-notes-input"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Sala de lectura general, donación escolar..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
            />
          </div>
        </div>

        {/* Action result banner */}
        {actionResult && (
          <div
            id="action-result-banner"
            className={`p-4 rounded-xl border flex items-start gap-3 text-xs sm:text-sm animate-fade-in ${
              actionResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {actionResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-semibold">{actionResult.message || actionResult.error}</p>
              {actionResult.data && (
                <div className="mt-2 pt-2 border-t border-emerald-200/60 font-mono text-[11px] text-emerald-800 flex flex-wrap gap-3">
                  <span>Marbete: <strong>{actionResult.data.internal_code}</strong></span>
                  <span>Copia: <strong>#{copySequence - 1}</strong></span>
                  <span>Sede: <strong>{selectedBranch.name}</strong></span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submit button */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            <span>Asignación directa a catálogo</span>
          </div>

          <button
            id="submit-register-copy-btn"
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-[#83B141] hover:bg-[#719b35] text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Registrando ejemplar...
              </>
            ) : (
              <>
                Asignar Marbete {internalCode}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Register Work Modal for quick on-the-fly cataloging */}
      {isRegisterWorkModalOpen && (
        <RegisterWorkModal
          isOpen={isRegisterWorkModalOpen}
          onClose={() => setIsRegisterWorkModalOpen(false)}
          onWorkCreated={(newWork) => {
            const updatedWorks = getStoredWorks();
            setWorks(updatedWorks);
            setSelectedWorkId(newWork.id);
            setCutterCode(getAuthorCutterCode(newWork.author, newWork.title));
            setCopySequence(getNextCopySequenceForWork(newWork.id));
            setIsRegisterWorkModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
