import React, { useState } from 'react';
import { 
  X, 
  BookOpen, 
  Layers, 
  Hash, 
  Calendar, 
  Globe, 
  Tag, 
  Building, 
  ShieldCheck, 
  User, 
  Copy, 
  Check, 
  FileCode, 
  BookMarked,
  MapPin,
  Printer,
  Download,
  Image as ImageIcon,
  FileDown
} from 'lucide-react';
import type { WorkWithCopiesCount, Copy as CopyType } from '../../types/database';
import { getDeweyInfo } from '../../lib/dewey';
import { getAuthorCutterCode, getStoredCopies } from '../../lib/supabaseClient';
import { downloadSpineLabelPNG, downloadSpineLabelSVG, downloadSpineLabelsPDF } from '../copies/SpineLabel';
import { PrintSpineLabelsModal } from '../copies/PrintSpineLabelsModal';

interface DublinCoreModalProps {
  work: WorkWithCopiesCount | null;
  onClose: () => void;
  onOpenPrintModal?: (work: WorkWithCopiesCount) => void;
}

export const DublinCoreModal: React.FC<DublinCoreModalProps> = ({ work, onClose, onOpenPrintModal }) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'dublin_raw'>('catalog');
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  if (!work) return null;

  const deweyInfo = getDeweyInfo(work.dewey_code);
  const cutterCode = getAuthorCutterCode(work.author, work.title);

  const allStoredCopies = getStoredCopies();
  const workCopies = allStoredCopies.filter(c => c.work_id === work.id);

  const getLanguageLabel = (lang?: string) => {
    switch (lang?.toLowerCase()) {
      case 'spa': return 'Español (spa)';
      case 'eng': return 'Inglés (eng)';
      case 'fre': return 'Francés (fre)';
      case 'por': return 'Portugués (por)';
      case 'wyo': return 'Warao / Lengua Indígena (wyo)';
      default: return lang || 'Español (spa)';
    }
  };

  const rawDublinCoreJSON = JSON.stringify({
    '@context': 'http://purl.org/dc/elements/1.1/',
    'dc:title': work.title,
    'dc:creator': work.author,
    'dc:identifier': work.isbn || null,
    'dc:subject': [
      `Dewey: ${work.dewey_code} (${deweyInfo.name})`,
      ...(work.subjects || [])
    ],
    'dc:publisher': work.publisher || 'Editorial de Colección',
    'dc:date': work.publication_year ? String(work.publication_year) : null,
    'dc:language': work.language || 'spa',
    'dc:description': work.description || null,
    'dc:rights': 'Patrimonio escolar / Dotación libre para educación rural - Colegio Integral El Manglar'
  }, null, 2);

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(rawDublinCoreJSON);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  const handleDownloadPDF = () => {
    downloadSpineLabelsPDF([
      {
        deweyCode: work.dewey_code,
        authorLetters: cutterCode,
        copyNumber: 1,
        prefix: 'CIM',
        title: work.title
      }
    ], {
      title: work.title,
      mode: 'sheet'
    });
  };

  const handleDownloadPNG = () => {
    downloadSpineLabelPNG({
      deweyCode: work.dewey_code,
      authorLetters: cutterCode,
      copyNumber: 1,
      prefix: 'CIM',
      title: work.title
    });
  };

  const handleDownloadSVG = () => {
    downloadSpineLabelSVG({
      deweyCode: work.dewey_code,
      authorLetters: cutterCode,
      copyNumber: 1,
      prefix: 'CIM',
      title: work.title
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        id="dublin-core-modal"
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200"
      >
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-slate-50/90 sticky top-0 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Ficha Bibliográfica Catalográfica</h2>
              <p className="text-xs text-slate-500">Biblioteca Miguel Otero Silva • Colegio Integral El Manglar</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              title="Imprimir tejuelos (25x38 mm) para los ejemplares de esta obra"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimir Tejuelos</span>
            </button>
            <button
              id="close-dublin-modal-btn"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 pt-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                activeTab === 'catalog'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <BookMarked className="w-4 h-4" />
              <span>Ficha General de la Obra</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dublin_raw')}
              className={`pb-3 text-xs sm:text-sm font-medium flex items-center gap-2 border-b-2 transition cursor-pointer ${
                activeTab === 'dublin_raw'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>Metadatos Dublin Core (ISO 15836)</span>
            </button>
          </div>

          <div className="pb-2 hidden sm:flex items-center gap-1">
            <button
              onClick={handleDownloadPNG}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-emerald-800 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
              title="Descargar imagen PNG del Tejuelo (25x38mm a 300 DPI)"
            >
              <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
              <span>PNG Tejuelo</span>
            </button>
            <button
              onClick={handleDownloadSVG}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-blue-800 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
              title="Descargar gráfico vectorial SVG del Tejuelo (25x38mm)"
            >
              <Download className="w-3.5 h-3.5 text-blue-700" />
              <span>SVG</span>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row gap-5 items-start bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
            <img
              src={work.cover_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300'}
              alt={work.title}
              className="w-24 h-36 sm:w-28 sm:h-40 object-cover rounded-xl shadow-md border border-slate-200 shrink-0 mx-auto sm:mx-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300';
              }}
            />
            <div className="space-y-2 flex-1 text-center sm:text-left">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${deweyInfo.badgeBg} ${deweyInfo.badgeText}`}>
                CDD {work.dewey_code} • {deweyInfo.name}
              </span>
              <h3 className="text-xl font-bold text-slate-900 leading-snug">{work.title}</h3>
              <p className="text-sm font-semibold text-emerald-800">Por {work.author}</p>
              <p className="text-xs text-slate-600 leading-relaxed pt-1 line-clamp-3">
                {work.description || 'Sin sinopsis bibliográfica registrada.'}
              </p>
            </div>
          </div>

          {activeTab === 'catalog' ? (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="bg-slate-100/90 px-4 py-2.5 font-bold text-slate-800 border-b border-slate-200 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                  Datos Bibliográficos de Catalogación
                </span>
                <span className="text-[11px] font-medium text-slate-500">Colección Manglar</span>
              </div>

              <div className="divide-y divide-slate-100 bg-white text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 hover:bg-slate-50/50 transition">
                  <span className="font-semibold text-slate-600 flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-emerald-700" /> Título de la Obra:
                  </span>
                  <span className="sm:col-span-2 text-slate-900 font-bold mt-0.5 sm:mt-0">{work.title}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 hover:bg-slate-50/50 transition">
                  <span className="font-semibold text-slate-600 flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-emerald-700" /> Autor / Creador:
                  </span>
                  <span className="sm:col-span-2 text-slate-900 font-medium mt-0.5 sm:mt-0">{work.author}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 hover:bg-slate-50/50 transition">
                  <span className="font-semibold text-slate-600 flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-emerald-700" /> ISBN / Identificador:
                  </span>
                  <span className="sm:col-span-2 text-slate-800 font-mono font-medium mt-0.5 sm:mt-0">
                    {work.isbn || 'No asignado / Sin registro ISBN'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 hover:bg-slate-50/50 transition">
                  <span className="font-semibold text-slate-600 flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-emerald-700" /> Clasificación Dewey (CDD):
                  </span>
                  <div className="sm:col-span-2 space-y-1 mt-0.5 sm:mt-0">
                    <p className="text-slate-900 font-semibold font-mono">
                      CDD {work.dewey_code} <span className="font-normal text-slate-600">({deweyInfo.name})</span>
                    </p>
                    {work.subjects && work.subjects.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {work.subjects.map((sub, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-medium">
                            {sub}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 hover:bg-slate-50/50 transition">
                  <span className="font-semibold text-slate-600 flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-emerald-700" /> Editorial / Publicador:
                  </span>
                  <span className="sm:col-span-2 text-slate-800 mt-0.5 sm:mt-0">{work.publisher || 'Editorial de Colección'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 hover:bg-slate-50/50 transition">
                  <span className="font-semibold text-slate-600 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700" /> Año de Publicación:
                  </span>
                  <span className="sm:col-span-2 text-slate-800 font-medium mt-0.5 sm:mt-0">{work.publication_year || 'Sin fecha especificada'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 hover:bg-slate-50/50 transition">
                  <span className="font-semibold text-slate-600 flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-emerald-700" /> Idioma:
                  </span>
                  <span className="sm:col-span-2 text-slate-800 mt-0.5 sm:mt-0">{getLanguageLabel(work.language)}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 hover:bg-slate-50/50 transition">
                  <span className="font-semibold text-slate-600 flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> Régimen y Derechos:
                  </span>
                  <span className="sm:col-span-2 text-slate-600 mt-0.5 sm:mt-0">
                    Patrimonio escolar / Dotación libre para educación rural
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-emerald-700" />
                    Mapeo Estándar Dublin Core (ISO 15836)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Estructura normalizada para interoperabilidad bibliográfica internacional.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyRaw}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-900 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedRaw ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copiar JSON-LD</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed shadow-inner">
                <pre>{rawDublinCoreJSON}</pre>
              </div>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                Distribución Física por Sede ({work.total_copies} {work.total_copies === 1 ? 'ejemplar' : 'ejemplares'})
              </h4>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Tejuelos de esta Obra</span>
              </button>
            </div>

            <div className="space-y-2">
              {work.copies_by_branch.map((b) => (
                <div 
                  key={b.branch_id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/80 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      {b.branch_name}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        b.branch_type === 'internal' 
                          ? 'bg-blue-100 text-blue-900' 
                          : 'bg-emerald-100 text-emerald-900'
                      }`}>
                        {b.branch_type === 'internal' ? 'Sede Central' : 'Dotación Rural'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Estado: {b.conditions.bueno} óptimos, {b.conditions.regular} regulares, {b.conditions.malo} desgastados
                    </p>
                  </div>
                  <span className="font-bold text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
                    {b.count} {b.count === 1 ? 'ejemplar' : 'ejemplares'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-2xs"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Tejuelos (25×38 mm)</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-3.5 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Descargar archivo PDF listo para imprimir en hoja Carta"
            >
              <FileDown className="w-4 h-4 text-emerald-700" />
              <span>Descargar PDF</span>
            </button>
            <button
              onClick={handleDownloadPNG}
              className="px-3.5 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
              <span>Descargar PNG</span>
            </button>
          </div>

          <button
            id="close-dublin-modal-footer-btn"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>

      <PrintSpineLabelsModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        selectedWork={work}
        initialCopies={workCopies.length > 0 ? workCopies : undefined}
        singleWorkTitle={work.title}
      />
    </div>
  );
};
