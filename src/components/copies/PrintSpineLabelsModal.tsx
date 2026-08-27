import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  X, 
  Tag, 
  FileText, 
  Check, 
  Download, 
  Image as ImageIcon, 
  Sparkles,
  BookOpen,
  FileDown,
  Layers,
  Info,
  Copy as CopyIcon
} from 'lucide-react';
import { 
  SpineLabel, 
  downloadSpineLabelPNG, 
  downloadSpineLabelSVG, 
  downloadSpineLabelsPDF,
  SpineLabelData
} from './SpineLabel';
import type { Copy, Work, WorkWithCopiesCount } from '../../types/database';
import { 
  getAuthorCutterCode, 
  getStoredWorks, 
  getStoredCopies, 
  extractSpineLabelPrefix, 
  extractCopyNumber,
  isSupabaseConfigured,
  supabase,
  INITIAL_BRANCHES
} from '../../lib/supabaseClient';
import { getDeweyInfo } from '../../lib/dewey';

interface PrintSpineLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWork?: Work | WorkWithCopiesCount | null;
  initialCopies?: Copy[];
  singleWorkTitle?: string;
}

export const PrintSpineLabelsModal: React.FC<PrintSpineLabelsModalProps> = ({
  isOpen,
  onClose,
  selectedWork,
  initialCopies,
  singleWorkTitle
}) => {
  const [works] = useState<Work[]>(() => getStoredWorks());
  const [copies, setCopies] = useState<Copy[]>([]);
  const [selectedCopyIds, setSelectedCopyIds] = useState<string[]>([]);
  const [repeatCount, setRepeatCount] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'sheet' | 'preview'>('sheet');

  // Determinar la obra seleccionada
  const targetWork: Work | WorkWithCopiesCount | null = selectedWork || (() => {
    if (initialCopies && initialCopies.length > 0) {
      const wId = initialCopies[0].work_id;
      return works.find(w => w.id === wId) || initialCopies[0].work || null;
    }
    return null;
  })();

  const isSpecificWork = Boolean(targetWork || singleWorkTitle || (initialCopies && initialCopies.length > 0));

  // Sincronizar copias cuando se abre el modal o cambia la selección
  useEffect(() => {
    if (!isOpen) return;

    const allStoredCopies = getStoredCopies();

    const loadWorkCopies = async () => {
      if (targetWork) {
        // Filtrar los ejemplares de esta obra específica en el store local
        let workCopies = allStoredCopies.filter(c => c.work_id === targetWork.id);

        // Si no hay copias locales y Supabase está configurado, consultar Supabase
        if (workCopies.length === 0 && isSupabaseConfigured && supabase) {
          try {
            const { data } = await supabase.from('copies').select('*').eq('work_id', targetWork.id);
            if (data && data.length > 0) {
              workCopies = data;
            }
          } catch {
            // Continuar con fallback
          }
        }
        
        if (workCopies.length > 0) {
          setCopies(workCopies);
          setSelectedCopyIds(workCopies.map(c => c.id));
        } else {
          // Si la obra no tiene ejemplares registrados aún, generamos 1 ejemplar de muestra con prefijo institucional correcto
          const deweyPrefix = targetWork.dewey_code.split('.')[0] || '800';
          const cutter = getAuthorCutterCode(targetWork.author, targetWork.title);
          const virtualCopy: Copy = {
            id: `virtual-copy-${targetWork.id}-1`,
            work_id: targetWork.id,
            branch_id: INITIAL_BRANCHES[0]?.id || '00000000-0000-4000-a000-000000000001',
            internal_code: `MOS-PRI-${deweyPrefix}-${cutter}-001`,
            condition: 'bueno',
            notes: 'Ejemplar 1 (Muestra)',
            created_at: new Date().toISOString(),
            work: targetWork
          };
          setCopies([virtualCopy]);
          setSelectedCopyIds([virtualCopy.id]);
        }
      } else if (initialCopies && initialCopies.length > 0) {
        setCopies(initialCopies);
        setSelectedCopyIds(initialCopies.map(c => c.id));
      } else {
        // Si se abrió desde el botón global sin ningún libro seleccionado
        setCopies(allStoredCopies);
        setSelectedCopyIds(allStoredCopies.map(c => c.id));
      }
    };

    loadWorkCopies();
  }, [isOpen, targetWork, initialCopies]);

  if (!isOpen) return null;

  const currentWorkTitle = targetWork?.title || singleWorkTitle || (copies.length > 0 ? copies[0].work?.title : 'Catálogo General');
  const deweyInfo = targetWork ? getDeweyInfo(targetWork.dewey_code) : null;
  const authorCutter = targetWork ? getAuthorCutterCode(targetWork.author, targetWork.title) : 'XXX';

  const handleToggleSelectAll = () => {
    if (selectedCopyIds.length === copies.length) {
      setSelectedCopyIds([]);
    } else {
      setSelectedCopyIds(copies.map(c => c.id));
    }
  };

  const handleToggleCopy = (id: string) => {
    setSelectedCopyIds(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const selectedCopies = copies.filter(c => selectedCopyIds.includes(c.id));

  // Preparar lista de datos para PDF / Descargas (con soporte de repetición si el usuario quiere múltiples etiquetas de este libro)
  const getPreparedLabelsData = (): SpineLabelData[] => {
    if (selectedCopies.length === 0) return [];
    
    const baseLabels: SpineLabelData[] = selectedCopies.map((copy, idx) => {
      const work = targetWork || works.find(w => w.id === copy.work_id) || copy.work;
      const dewey = work?.dewey_code || '800';
      const cutter = getAuthorCutterCode(work?.author, work?.title);
      const copyNum = extractCopyNumber(copy.internal_code, idx + 1);
      const prefix = extractSpineLabelPrefix(copy.internal_code, copy.branch_id);

      return {
        deweyCode: dewey,
        authorLetters: cutter,
        copyNumber: copyNum,
        prefix: prefix,
        title: work?.title || currentWorkTitle
      };
    });

    if (repeatCount <= 1) {
      return baseLabels;
    }

    // Multiplicar etiquetas si el usuario seleccionó repetir
    const multiplied: SpineLabelData[] = [];
    for (let r = 0; r < repeatCount; r++) {
      baseLabels.forEach(lbl => multiplied.push({ ...lbl }));
    }
    return multiplied;
  };

  // Descargar PDF usando jsPDF (100% exacto y compatible con cualquier navegador/impresora)
  const handleDownloadPDF = (mode: 'sheet' | 'single' = 'sheet') => {
    const labelsData = getPreparedLabelsData();
    if (labelsData.length === 0) return;

    downloadSpineLabelsPDF(labelsData, {
      mode: mode,
      title: currentWorkTitle
    });
  };

  // Impresión nativa del navegador
  const handleNativePrint = () => {
    // Si estamos en un iframe o queremos imprimir limpiamente, generamos la orden de impresión
    window.print();
  };

  // Descargar PNG o SVG de los tejuelos seleccionados
  const handleDownloadImages = (format: 'png' | 'svg') => {
    const labelsData = getPreparedLabelsData();
    if (labelsData.length === 0) return;

    labelsData.forEach((label, idx) => {
      setTimeout(() => {
        if (format === 'png') {
          downloadSpineLabelPNG({
            deweyCode: label.deweyCode,
            authorLetters: label.authorLetters,
            copyNumber: label.copyNumber,
            prefix: label.prefix,
            title: label.title
          });
        } else {
          downloadSpineLabelSVG({
            deweyCode: label.deweyCode,
            authorLetters: label.authorLetters,
            copyNumber: label.copyNumber,
            prefix: label.prefix,
            title: label.title
          });
        }
      }, idx * 120);
    });
  };

  const labelsToRender = getPreparedLabelsData();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs print:p-0 print:bg-white print:static print:inset-auto">
      <div 
        id="print-spine-labels-modal"
        className="bg-white rounded-2xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden print:border-none print:shadow-none print:max-w-none print:max-h-none print:w-full print:rounded-none"
      >
        {/* Modal Header - Hidden when printing */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {isSpecificWork ? `Tejuelos: ${currentWorkTitle}` : 'Impresión y Descarga de Tejuelos (Lomos)'}
                </h2>
                {targetWork && (
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900">
                    CDD {targetWork.dewey_code} • {authorCutter}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {targetWork ? `Por ${targetWork.author} • ` : ''}Medida exacta de corte: 25 × 38 mm • Calibrado para Hoja Carta
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Primary Action: Download PDF */}
            <button
              id="download-spine-pdf-btn"
              onClick={() => handleDownloadPDF('sheet')}
              disabled={selectedCopies.length === 0}
              className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/20 transition cursor-pointer"
              title="Descargar archivo PDF con los tejuelos (25x38 mm) listos para imprimir"
            >
              <FileDown className="w-4 h-4 text-emerald-200" />
              <span>Descargar PDF</span>
            </button>

            {/* Native Print */}
            <button
              id="native-print-btn"
              onClick={handleNativePrint}
              disabled={selectedCopies.length === 0}
              className="hidden sm:flex px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold items-center gap-1.5 shadow-2xs transition cursor-pointer"
              title="Imprimir directamente desde el navegador"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Imprimir</span>
            </button>

            {/* Quick Image Downloads */}
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={() => handleDownloadImages('png')}
                disabled={selectedCopies.length === 0}
                className="px-2.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-40 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                title="Descargar como imagen PNG (300 DPI)"
              >
                <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
                <span>PNG</span>
              </button>
              <button
                onClick={() => handleDownloadImages('svg')}
                disabled={selectedCopies.length === 0}
                className="px-2.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-40 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                title="Descargar como vector SVG"
              >
                <Download className="w-3.5 h-3.5 text-blue-700" />
                <span>SVG</span>
              </button>
            </div>

            <button
              id="close-spine-modal-btn"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Controls Bar - Options */}
        <div className="p-3 sm:px-6 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleToggleSelectAll}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              {selectedCopyIds.length === copies.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
            </button>

            <span className="text-slate-600 font-medium">
              {selectedCopies.length} de {copies.length} ejemplares seleccionados
            </span>

            {/* Repeat Label multiplier for single work */}
            {isSpecificWork && (
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[11px] font-medium">Copias de etiqueta:</span>
                <select
                  value={repeatCount}
                  onChange={(e) => setRepeatCount(Number(e.target.value))}
                  className="bg-slate-50 text-slate-800 font-bold rounded px-1.5 py-0.5 border border-slate-200 text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-700"
                >
                  <option value={1}>1 copia</option>
                  <option value={2}>2 copias</option>
                  <option value={3}>3 copias</option>
                  <option value={4}>4 copias</option>
                  <option value={6}>6 copias</option>
                  <option value={10}>10 copias</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-600 bg-white px-3 py-1 rounded-lg border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Formato: <strong>25 × 38 mm</strong> • <strong>{labelsToRender.length}</strong> {labelsToRender.length === 1 ? 'tejuelo listo' : 'tejuelos listos'}
          </div>
        </div>

        {/* Printable Sheet View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/50 print:bg-white print:p-0 print:overflow-visible">
          {/* Virtual Letter Page Sheet Preview */}
          <div className="mx-auto bg-white p-6 sm:p-8 shadow-md border border-slate-300 rounded-lg max-w-[216mm] min-h-[279mm] print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none">
            {selectedCopies.length === 0 ? (
              <div className="py-20 text-center text-slate-400 text-sm print:hidden space-y-2">
                <Tag className="w-8 h-8 mx-auto text-slate-300" />
                <p>No hay tejuelos seleccionados. Haz clic en las etiquetas para seleccionarlas.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Visual Header on the print sheet */}
                <div className="border-b border-slate-200 pb-2 mb-4 flex items-center justify-between text-[11px] text-slate-500 print:text-black">
                  <span>Biblioteca Miguel Otero Silva — Colegio Integral El Manglar</span>
                  <span>{currentWorkTitle} ({labelsToRender.length} tejuelos)</span>
                </div>

                <div className="flex flex-wrap gap-2 items-start content-start justify-start print:gap-1.5">
                  {labelsToRender.map((label, index) => (
                    <div 
                      key={`${label.deweyCode}-${label.authorLetters}-${label.copyNumber}-${index}`} 
                      className="cursor-pointer group relative print:cursor-default"
                      title={`Tejuelo: ${label.title} • Dewey: ${label.deweyCode} • Cutter: ${label.authorLetters}`}
                    >
                      <SpineLabel
                        deweyCode={label.deweyCode}
                        authorLetters={label.authorLetters}
                        copyNumber={label.copyNumber}
                        prefix={label.prefix}
                        showCutGuide={true}
                        className="transition-transform group-hover:scale-102 group-hover:shadow-md print:group-hover:scale-100"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Info className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>
              El archivo <strong>PDF</strong> está calibrado a escala exacta 100% (25×38 mm por tejuelo) con líneas punteadas para recortar fácilmente.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownloadPDF('sheet')}
              disabled={selectedCopies.length === 0}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-emerald-200" />
              <span>Descargar PDF ({labelsToRender.length})</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-semibold transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintSpineLabelsModal;
