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
    } catch (err: unknown) {\n      const msg = err instanceof Error ? err.message : 'Error inesperado al registrar ejemplar';\n      setActionResult({\n        success: false,\n        error: msg,\n      });\n    } finally {\n      setIsSubmitting(false);\n    }\n  };\n\n  return (\n    <div id=\"register-copy-section\" className=\"bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden\">\n      {/* Header */}\n      <div className=\"p-6 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white\">\n        <div className=\"flex items-center gap-3\">\n          <div className=\"p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30\">\n            <Building2 className=\"w-6 h-6\" />\n          </div>\n          <div>\n            <h2 className=\"text-lg font-bold\">Registro & Asignación de Ejemplar Físico</h2>\n            <p className=\"text-xs text-emerald-200\">\n              Algoritmo de Marbetes: <span className=\"font-mono font-bold text-white\">[PREFIJO]-[DEWEY]-[CUTTER]-[SECUENCIA]</span>\n            </p>\n          </div>\n        </div>\n      </div>\n\n      <form onSubmit={handleSubmit} className=\"p-6 space-y-6\">\n        {/* Work Selector */}\n        <div className=\"space-y-2\">\n          <div className=\"flex items-center justify-between\">\n            <label className=\"block text-xs font-bold text-slate-700 uppercase tracking-wider\">\n              1. Seleccionar Obra Bibliográfica <span className=\"text-rose-500\">*</span>\n            </label>\n            <button\n              type=\"button\"\n              onClick={() => setIsRegisterWorkModalOpen(true)}\n              className=\"text-xs text-emerald-800 hover:text-emerald-950 font-bold inline-flex items-center gap-1 cursor-pointer\"\n            >\n              <BookPlus className=\"w-3.5 h-3.5\" />\n              <span>+ Catalogar Nueva Obra</span>\n            </button>\n          </div>\n\n          {works.length === 0 ? (\n            <div className=\"p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3\">\n              <div className=\"text-xs\">\n                <span className=\"font-bold\">No hay obras registradas en el catálogo.</span>\n                <p className=\"text-amber-800 mt-0.5\">Primero debes catalogar una obra bibliográfica para poder asignarle ejemplares individuales.</p>\n              </div>\n              <button\n                type=\"button\"\n                onClick={() => setIsRegisterWorkModalOpen(true)}\n                className=\"px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold shrink-0 transition flex items-center gap-1.5 cursor-pointer shadow-xs\"\n              >\n                <BookPlus className=\"w-3.5 h-3.5\" />\n                Catalogar Obra Ahora\n              </button>\n            </div>\n          ) : (\n            <select\n              id=\"work-id-select\"\n              value={selectedWorkId}\n              onChange={(e) => handleWorkChange(e.target.value)}\n              required\n              className=\"w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition font-medium\"\n            >\n              {works.map((w) => (\n                <option key={w.id} value={w.id}>\n                  {w.title} — {w.author} (Dewey: {w.dewey_code})\n                </option>\n              ))}\n            </select>\n          )}\n\n          {selectedWork && works.length > 0 && (\n            <div className=\"p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs text-slate-600 mt-2\">\n              <div className=\"flex items-center gap-3\">\n                <BookOpen className=\"w-4 h-4 text-emerald-700 shrink-0\" />\n                <div>\n                  <span className=\"font-semibold text-slate-800\">{selectedWork.title}</span> por {selectedWork.author}\n                </div>\n              </div>\n              <div className=\"flex items-center gap-2\">\n                <span className=\"px-2.5 py-1 rounded-md bg-blue-100 text-blue-900 font-mono font-bold text-xs\">\n                  Dewey: {deweyNum}\n                </span>\n                <span className=\"px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 font-mono font-bold text-xs\">\n                  Cutter: {cutterCode}\n                </span>\n              </div>\n            </div>\n          )}\n        </div>\n\n        {/* Assigned Branch Selector */}\n        <div className=\"space-y-2\">\n          <label className=\"block text-xs font-bold text-slate-700 uppercase tracking-wider\">\n            2. Sede de Asignación <span className=\"text-rose-500\">*</span>\n          </label>\n          <select\n            id=\"branch-id-select\"\n            value={selectedBranchId}\n            onChange={(e) => handleBranchChange(e.target.value)}\n            required\n            className=\"w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition\"\n          >\n            <optgroup label=\"Sedes Centrales (Campus Principal)\">\n              {branches.filter(b => b.type === 'internal').map((b) => (\n                <option key={b.id} value={b.id}>\n                  {b.name} — Prefijo [{getBranchCodePrefix(b.name)}]\n                </option>\n              ))}\n            </optgroup>\n            <optgroup label=\"Semilla Manglareña (Dotaciones Rurales)\">\n              {branches.filter(b => b.type === 'external_donation').map((b) => (\n                <option key={b.id} value={b.id}>\n                  {b.name} — Prefijo [{getBranchCodePrefix(b.name)}]\n                </option>\n              ))}\n            </optgroup>\n          </select>\n\n          {selectedBranch && (\n            <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${\n              selectedBranch.type === 'internal'\n                ? 'bg-blue-50/80 border-blue-200 text-blue-950'\n                : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'\n            }`}>\n              <div className=\"flex items-center gap-2.5\">\n                <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${\n                  selectedBranch.type === 'internal' ? 'bg-blue-600' : 'bg-emerald-600'\n                }`}></span>\n                <div>\n                  <span className=\"font-bold text-sm\">{selectedBranch.name}</span>\n                  <p className=\"text-[11px] text-slate-600 flex items-center gap-1 mt-0.5\">\n                    <MapPin className=\"w-3 h-3 text-slate-400\" />\n                    {selectedBranch.location || 'Ubicación registrada'}\n                  </p>\n                </div>\n              </div>\n              <span className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs ${\n                selectedBranch.type === 'internal'\n                  ? 'bg-blue-200/80 text-blue-900'\n                  : 'bg-emerald-200/80 text-emerald-900'\n              }`}>\n                Prefijo: {prefix}-\n              </span>\n            </div>\n          )}\n        </div>\n\n        {/* Dynamic Formula Components: Cutter Code & Copy Sequence */}\n        <div className=\"grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 rounded-2xl bg-slate-50 border border-slate-200\">\n          {/* Cutter de Autor / Título */}\n          <div className=\"space-y-1.5\">\n            <div className=\"flex items-center justify-between\">\n              <label className=\"block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5\">\n                <UserCheck className=\"w-3.5 h-3.5 text-emerald-700\" />\n                3. Código Cutter (Autor / Título) <span className=\"text-rose-500\">*</span>\n              </label>\n              <button\n                type=\"button\"\n                onClick={handleRecalculateCutter}\n                className=\"text-[11px] text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1 hover:underline cursor-pointer\"\n              >\n                <RefreshCw className=\"w-3 h-3\" />\n                Recalcular Cutter\n              </button>\n            </div>\n            <input\n              id=\"cutter-code-input\"\n              type=\"text\"\n              maxLength={4}\n              value={cutterCode}\n              onChange={(e) => setCutterCode(e.target.value.slice(0, 4))}\n              placeholder=\"Ej: OTEc\"\n              required\n              className=\"w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition\"\n            />\n            <p className=\"text-[11px] text-slate-500\">\n              3 letras del autor en mayúscula + 1 inicial del título en minúscula (ej: <strong>OTEc</strong> para <em>Casas muertas</em>, <strong>OTEo</strong> para <em>Oficina #1</em>, <strong>SAIp</strong> para <em>El principito</em>).\n            </p>\n          </div>\n\n          {/* Secuencia Única de Copia */}\n          <div className=\"space-y-1.5\">\n            <label className=\"block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5\">\n              <Layers className=\"w-3.5 h-3.5 text-emerald-700\" />\n              4. Secuencia de Copia (Ejemplar #) <span className=\"text-rose-500\">*</span>\n            </label>\n            <div className=\"flex items-center gap-2\">\n              <input\n                id=\"copy-sequence-input\"\n                type=\"number\"\n                min=\"1\"\n                max=\"999\"\n                value={copySequence}\n                onChange={(e) => setCopySequence(Math.max(1, parseInt(e.target.value) || 1))}\n                required\n                className=\"w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition\"\n              />\n              <span className=\"px-3 py-2 bg-emerald-100 text-emerald-900 rounded-xl font-mono font-bold text-xs shrink-0\">\n                {formattedSequence}\n              </span>\n            </div>\n            <p className=\"text-[11px] text-slate-500\">\n              Identifica que es la <strong>copia {copySequence}</strong> de este libro ({formattedSequence}).\n            </p>\n          </div>\n        </div>\n\n        {/* Visual Formula Breakdown Banner */}\n        <div className=\"p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border border-slate-700 shadow-sm space-y-3\">\n          <div className=\"flex items-center justify-between\">\n            <span className=\"text-[11px] uppercase tracking-wider font-bold text-emerald-400 flex items-center gap-1.5\">\n              <Barcode className=\"w-4 h-4\" />\n              Marbete Concatenado Resultante\n            </span>\n            <span className=\"text-[10px] text-slate-400\">\n              Fórmula Oficial Bibliotecológica\n            </span>\n          </div>\n\n          {/* Visual token blocks */}\n          <div className=\"grid grid-cols-2 sm:grid-cols-4 gap-2 text-center\">\n            <div className=\"p-2.5 rounded-xl bg-slate-800/90 border border-emerald-500/30\">\n              <span className=\"text-[10px] text-emerald-300 font-medium block\">1. Prefijo Sede</span>\n              <span className=\"font-mono font-bold text-sm sm:text-base text-emerald-400\">{prefix}</span>\n            </div>\n            <div className=\"p-2.5 rounded-xl bg-slate-800/90 border border-blue-500/30\">\n              <span className=\"text-[10px] text-blue-300 font-medium block\">2. Dewey (CDD)</span>\n              <span className=\"font-mono font-bold text-sm sm:text-base text-blue-400\">{deweyNum}</span>\n            </div>\n            <div className=\"p-2.5 rounded-xl bg-slate-800/90 border border-amber-500/30\">\n              <span className=\"text-[10px] text-amber-300 font-medium block\">3. Cutter (Autor)</span>\n              <span className=\"font-mono font-bold text-sm sm:text-base text-amber-400\">{cutterCode || 'OTE'}</span>\n            </div>\n            <div className=\"p-2.5 rounded-xl bg-slate-800/90 border border-purple-500/30\">\n              <span className=\"text-[10px] text-purple-300 font-medium block\">4. Copia #</span>\n              <span className=\"font-mono font-bold text-sm sm:text-base text-purple-400\">{formattedSequence}</span>\n            </div>\n          </div>\n\n          {/* Resulting full code & Physical Spine Label Preview */}\n          <div className=\"p-4 bg-black/40 rounded-xl border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4\">\n            <div className=\"space-y-1 text-center sm:text-left\">\n              <span className=\"text-xs text-slate-300 block\">Código Marbete Oficial:</span>\n              <span className=\"font-mono text-base sm:text-lg font-extrabold text-emerald-300 tracking-wide block\">\n                {internalCode}\n              </span>\n              <span className=\"text-[11px] text-slate-400 block\">\n                Tejuelo de lomo: 25 × 38 mm con guía de corte para guillotina\n              </span>\n            </div>\n\n            {/* Live SpineLabel Render */}\n            <div className=\"flex flex-col items-center gap-1 shrink-0 bg-slate-800/80 p-2.5 rounded-xl border border-slate-600\">\n              <span className=\"text-[9px] uppercase font-bold text-slate-300 tracking-wider flex items-center gap-1\">\n                <Tag className=\"w-2.5 h-2.5 text-emerald-400\" />\n                Vista Previa Tejuelo (1:1)\n              </span>\n              <SpineLabel\n                deweyCode={selectedWork?.dewey_code || deweyNum}\n                authorLetters={cutterCode || 'OTE'}\n                copyNumber={`Ej. ${copySequence}`}\n                prefix={prefix}\n                showCutGuide={true}\n                className=\"shadow-sm\"\n              />\n              <div className=\"flex items-center gap-1 mt-1\">\n                <button\n                  type=\"button\"\n                  onClick={() => downloadSpineLabelsPDF([\n                    {\n                      deweyCode: selectedWork?.dewey_code || deweyNum,\n                      authorLetters: cutterCode || 'OTE',\n                      copyNumber: copySequence,\n                      prefix: prefix,\n                      title: selectedWork?.title\n                    }\n                  ], {\n                    title: selectedWork?.title,\n                    mode: 'sheet'\n                  })}\n                  className=\"px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-white text-[9px] font-bold flex items-center gap-1 cursor-pointer transition\"\n                  title=\"Descargar archivo PDF listo para imprimir en hoja Carta\"\n                >\n                  <FileDown className=\"w-2.5 h-2.5 text-emerald-300\" />\n                  <span>PDF</span>\n                </button>\n                <button\n                  type=\"button\"\n                  onClick={() => downloadSpineLabelPNG({\n                    deweyCode: selectedWork?.dewey_code || deweyNum,\n                    authorLetters: cutterCode || 'OTE',\n                    copyNumber: copySequence,\n                    prefix: prefix,\n                    title: selectedWork?.title\n                  })}\n                  className=\"px-2 py-0.5 rounded bg-emerald-700/80 hover:bg-emerald-600 text-white text-[9px] font-bold flex items-center gap-1 cursor-pointer transition\"\n                  title=\"Descargar imagen PNG de este tejuelo\"\n                >\n                  <ImageIcon className=\"w-2.5 h-2.5\" />\n                  <span>PNG</span>\n                </button>\n                <button\n                  type=\"button\"\n                  onClick={() => downloadSpineLabelSVG({\n                    deweyCode: selectedWork?.dewey_code || deweyNum,\n                    authorLetters: cutterCode || 'OTE',\n                    copyNumber: copySequence,\n                    prefix: prefix,\n                    title: selectedWork?.title\n                  })}\n                  className=\"px-2 py-0.5 rounded bg-blue-700/80 hover:bg-blue-600 text-white text-[9px] font-bold flex items-center gap-1 cursor-pointer transition\"\n                  title=\"Descargar gráfico vectorial SVG\"\n                >\n                  <Download className=\"w-2.5 h-2.5\" />\n                  <span>SVG</span>\n                </button>\n              </div>\n            </div>\n          </div>\n        </div>\n\n        {/* Condition & Notes */}\n        <div className=\"grid grid-cols-1 sm:grid-cols-2 gap-5\">\n          {/* Physical Condition */}\n          <div className=\"space-y-2\">\n            <label className=\"block text-xs font-bold text-slate-700 uppercase tracking-wider\">\n              5. Estado Físico del Ejemplar <span className=\"text-rose-500\">*</span>\n            </label>\n            <div className=\"grid grid-cols-3 gap-2\">\n              {(['bueno', 'regular', 'malo'] as CopyCondition[]).map((cond) => (\n                <button\n                  key={cond}\n                  type=\"button\"\n                  onClick={() => setCondition(cond)}\n                  className={`py-2.5 px-2 rounded-xl text-xs font-bold capitalize transition border flex flex-col items-center gap-1 cursor-pointer ${\n                    condition === cond\n                      ? cond === 'bueno'\n                        ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'\n                        : cond === 'regular'\n                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'\n                        : 'bg-rose-600 text-white border-rose-600 shadow-xs'\n                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'\n                  }`}\n                >\n                  <span>{cond}</span>\n                  <span className=\"text-[10px] font-normal opacity-80\">\n                    {cond === 'bueno' ? 'Óptimo' : cond === 'regular' ? 'Uso leve' : 'Desgaste'}\n                  </span>\n                </button>\n              ))}\n            </div>\n          </div>\n\n          {/* Notes */}\n          <div className=\"space-y-2\">\n            <label className=\"block text-xs font-bold text-slate-700 uppercase tracking-wider\">\n              6. Observaciones de la Asignación (Opcional)\n            </label>\n            <input\n              id=\"copy-notes-input\"\n              type=\"text\"\n              value={notes}\n              onChange={(e) => setNotes(e.target.value)}\n              placeholder=\"Ej: Sala de lectura general, donación escolar...\"\n              className=\"w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition\"\n            />\n          </div>\n        </div>\n\n        {/* Action result banner */}\n        {actionResult && (\n          <div\n            id=\"action-result-banner\"\n            className={`p-4 rounded-xl border flex items-start gap-3 text-xs sm:text-sm animate-fade-in ${\n              actionResult.success\n                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'\n                : 'bg-rose-50 border-rose-200 text-rose-900'\n            }`}\n          >\n            {actionResult.success ? (\n              <CheckCircle2 className=\"w-5 h-5 text-emerald-600 shrink-0 mt-0.5\" />\n            ) : (\n              <AlertCircle className=\"w-5 h-5 text-rose-600 shrink-0 mt-0.5\" />\n            )}\n            <div className=\"flex-1\">\n              <p className=\"font-semibold\">{actionResult.message || actionResult.error}</p>\n              {actionResult.data && (\n                <div className=\"mt-2 pt-2 border-t border-emerald-200/60 font-mono text-[11px] text-emerald-800 flex flex-wrap gap-3\">\n                  <span>Marbete: <strong>{actionResult.data.internal_code}</strong></span>\n                  <span>Copia: <strong>#{copySequence - 1}</strong></span>\n                  <span>Sede: <strong>{selectedBranch.name}</strong></span>\n                </div>\n              )}\n            </div>\n          </div>\n        )}\n\n        {/* Submit button */}\n        <div className=\"pt-2 flex items-center justify-between border-t border-slate-100\">\n          <div className=\"text-xs text-slate-500 flex items-center gap-1.5\">\n            <Sparkles className=\"w-3.5 h-3.5 text-emerald-700\" />\n            <span>Asignación directa a catálogo</span>\n          </div>\n\n          <button\n            id=\"submit-register-copy-btn\"\n            type=\"submit\"\n            disabled={isSubmitting}\n            className=\"px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer\"\n          >\n            {isSubmitting ? (\n              <>\n                <span className=\"w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin\"></span>\n                Registrando ejemplar...\n              </>\n            ) : (\n              <>\n                Asignar Marbete {internalCode}\n                <ArrowRight className=\"w-4 h-4\" />\n              </>\n            )}\n          </button>\n        </div>\n      </form>\n\n      {/* Register Work Modal for quick on-the-fly cataloging */}\n      {isRegisterWorkModalOpen && (\n        <RegisterWorkModal\n          isOpen={isRegisterWorkModalOpen}\n          onClose={() => setIsRegisterWorkModalOpen(false)}\n          onWorkCreated={(newWork) => {\n            const updatedWorks = getStoredWorks();\n            setWorks(updatedWorks);\n            setSelectedWorkId(newWork.id);\n            setCutterCode(getAuthorCutterCode(newWork.author, newWork.title));\n            setCopySequence(getNextCopySequenceForWork(newWork.id));\n            setIsRegisterWorkModalOpen(false);\n          }}\n        />\n      )}\n    </div>\n  );\n};\n