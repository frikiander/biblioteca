import React, { useState, useMemo } from 'react';
import { 
  X, 
  FileCode, 
  Copy as CopyIcon, 
  Check, 
  Download, 
  Printer, 
  Bookmark, 
  BookOpen, 
  Database,
  Layers,
  Code
} from 'lucide-react';
import type { Work } from '../../types/database';
import { 
  workToMarcRecord, 
  marcRecordToXml, 
  marcRecordToFormattedText, 
  workToCatalogCardText,
  MARC_TAG_LABELS 
} from '../../lib/marc21';

interface Marc21ModalProps {
  work: Work;
  onClose: () => void;
}

export function Marc21Modal({ work, onClose }: Marc21ModalProps) {
  const [activeTab, setActiveTab] = useState<'tags' | 'card' | 'xml' | 'json'>('tags');
  const [copied, setCopied] = useState<string | null>(null);

  const marcRecord = useMemo(() => workToMarcRecord(work), [work]);
  const marcXml = useMemo(() => marcRecordToXml(marcRecord), [marcRecord]);
  const marcText = useMemo(() => marcRecordToFormattedText(marcRecord), [marcRecord]);
  const catalogCard = useMemo(() => workToCatalogCardText(work), [work]);
  const jsonMarc = useMemo(() => JSON.stringify(marcRecord, null, 2), [marcRecord]);

  const handleCopy = (content: string, label: string) => {
    navigator.clipboard.writeText(content);
    setCopied(label);
    setTimeout(() => setCopied(null), 2500);
  };

  const handleDownloadXml = () => {
    const blob = new Blob([marcXml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MARC21_${work.dewey_code.replace(/[^0-9]/g, '')}_${work.title.slice(0, 20).replace(/\\s+/g, '_')}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintCard = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Ficha Catalográfica — ${work.title}</title>
          <style>
            body { font-family: monospace; padding: 40px; }
            pre { font-size: 14px; line-height: 1.5; border: 1px solid #000; padding: 25px; max-width: 600px; }
          </style>
        </head>
        <body>
          <pre>${catalogCard}</pre>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Estándar MARC21 & Dublin Core
                </span>
                <span className="text-xs text-slate-400">Koha Biblio Engine</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white truncate max-w-lg">
                {work.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 py-2 bg-slate-100 border-b border-slate-200 text-xs font-semibold overflow-x-auto">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('tags')}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'tags'
                  ? 'bg-emerald-800 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Etiquetas MARC21
            </button>

            <button
              onClick={() => setActiveTab('card')}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'card'
                  ? 'bg-emerald-800 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              Ficha Catalográfica ISBD
            </button>

            <button
              onClick={() => setActiveTab('xml')}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'xml'
                  ? 'bg-emerald-800 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              MARCXML (ISO 25577)
            </button>

            <button
              onClick={() => setActiveTab('json')}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'json'
                  ? 'bg-emerald-800 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              JSON-MARC
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'xml' && (
              <button
                onClick={handleDownloadXml}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                Descargar XML
              </button>
            )}

            {activeTab === 'card' && (
              <button
                onClick={handlePrintCard}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                Imprimir Ficha
              </button>
            )}
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
          {activeTab === 'tags' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 bg-white p-3 rounded-xl border border-slate-200">
                <span>
                  Estructura normalizada conforme al formato MARC 21 para registros bibliográficos de la Library of Congress.
                </span>
                <button
                  onClick={() => handleCopy(marcText, 'tags')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  {copied === 'tags' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <CopyIcon className="w-3.5 h-3.5" />}
                  {copied === 'tags' ? 'Copiado' : 'Copiar Texto'}
                </button>
              </div>

              {/* Leader & Control Fields */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Cabecera y Campos de Control (00X)
                </div>
                <div className="divide-y divide-slate-100 font-mono text-xs">
                  <div className="grid grid-cols-12 px-4 py-2 hover:bg-slate-50">
                    <span className="col-span-2 font-bold text-emerald-700">LDR (Leader)</span>
                    <span className="col-span-10 text-slate-800">{marcRecord.leader}</span>
                  </div>
                  {Object.entries(marcRecord.controlFields).map(([tag, val]) => (
                    <div key={tag} className="grid grid-cols-12 px-4 py-2 hover:bg-slate-50">
                      <span className="col-span-2 font-bold text-emerald-700">{tag}</span>
                      <span className="col-span-10 text-slate-800 break-all">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Fields */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Campos de Datos Bibliográficos (0XX - 8XX)
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {marcRecord.dataFields.map((f, idx) => (
                    <div key={idx} className="p-3.5 hover:bg-slate-50 transition grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-3 sm:col-span-2">
                        <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {f.tag}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 ml-1">
                          {f.ind1 || '_'}{f.ind2 || '_'}
                        </span>
                      </div>

                      <div className="col-span-9 sm:col-span-10 space-y-1">
                        <div className="text-[11px] font-semibold text-slate-500">
                          {MARC_TAG_LABELS[f.tag] || 'Campo MARC'}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {f.subfields.map((sf, sIdx) => (
                            <span key={sIdx} className="font-mono text-xs bg-slate-100 text-slate-900 px-2 py-1 rounded-md border border-slate-200">
                              <span className="font-bold text-teal-600">${sf.code}</span> {sf.value}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'card' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Ficha bibliográfica tradicional para cajón o gavetero catalográfico.</span>
                <button
                  onClick={() => handleCopy(catalogCard, 'card')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  {copied === 'card' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <CopyIcon className="w-3.5 h-3.5" />}
                  {copied === 'card' ? 'Copiado' : 'Copiar Ficha'}
                </button>
              </div>

              <div className="bg-white p-6 sm:p-10 rounded-2xl border-2 border-slate-300 shadow-sm max-w-2xl mx-auto font-mono text-xs leading-relaxed text-slate-900 select-all">
                <pre className="whitespace-pre-wrap font-mono">{catalogCard}</pre>
              </div>
            </div>
          )}

          {activeTab === 'xml' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Documento MARCXML estándar para intercambio con Koha, Z39.50, OAI-PMH o Library of Congress.</span>
                <button
                  onClick={() => handleCopy(marcXml, 'xml')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  {copied === 'xml' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <CopyIcon className="w-3.5 h-3.5" />}
                  {copied === 'xml' ? 'Copiado' : 'Copiar XML'}
                </button>
              </div>
              <pre className="bg-slate-900 text-emerald-400 p-4 rounded-2xl font-mono text-xs overflow-x-auto max-h-[500px] border border-slate-800">
                {marcXml}
              </pre>
            </div>
          )}

          {activeTab === 'json' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Estructura JSON-MARC para integraciones de API REST.</span>
                <button
                  onClick={() => handleCopy(jsonMarc, 'json')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  {copied === 'json' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <CopyIcon className="w-3.5 h-3.5" />}
                  {copied === 'json' ? 'Copiado' : 'Copiar JSON'}
                </button>
              </div>
              <pre className="bg-slate-900 text-teal-300 p-4 rounded-2xl font-mono text-xs overflow-x-auto max-h-[500px] border border-slate-800">
                {jsonMarc}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Clasificación Dewey: <strong>{work.dewey_code}</strong></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
