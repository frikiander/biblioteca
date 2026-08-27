import React, { useState, useEffect } from 'react';
import { Building, MapPin, Layers, BookCheck, ArrowRight, HeartHandshake, ShieldCheck, Filter, Printer, Download, Image as ImageIcon, FileDown } from 'lucide-react';
import { 
  supabase, 
  isSupabaseConfigured, 
  INITIAL_BRANCHES, 
  INITIAL_COPIES, 
  INITIAL_WORKS, 
  getStoredBranches, 
  getStoredCopies, 
  getAuthorCutterCode,
  extractSpineLabelPrefix,
  extractCopyNumber
} from '../../lib/supabaseClient';
import { PrintSpineLabelsModal } from '../copies/PrintSpineLabelsModal';
import { downloadSpineLabelPNG, downloadSpineLabelsPDF } from '../copies/SpineLabel';

export const BranchInventory: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>(() => {
    return getStoredBranches();
  });

  const [filterCategory, setFilterCategory] = useState<'all' | 'internal' | 'external_donation'>('all');

  const [copies, setCopies] = useState<Copy[]>(() => {
    return getStoredCopies();
  });

  const [works, setWorks] = useState<Work[]>(() => {
    const saved = localStorage.getItem('manglar_works');
    return saved ? JSON.parse(saved) : INITIAL_WORKS;
  });

  const [selectedBranchId, setSelectedBranchId] = useState<string>(branches[0]?.id || '00000000-0000-4000-a000-000000000001');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Live Supabase Sync
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase.from('branches').select('*').order('name').then(({ data }) => {
        if (data && data.length > 0) {
          setBranches(data);
          setSelectedBranchId((prev) => {
            const exists = data.some((b) => b.id === prev);
            return exists ? prev : data[0].id;
          });
        }
      });
      supabase.from('copies').select('*, work:works(*), branch:branches(*)').then(({ data }) => {
        if (data) setCopies(data as Copy[]);
      });
      supabase.from('works').select('*').then(({ data }) => {
        if (data) setWorks(data as Work[]);
      });
    }
  }, []);

  const selectedBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];
  const branchCopies = copies.filter((c) => c.branch_id === selectedBranch?.id);

  const displayedBranches = branches.filter((b) => {
    if (filterCategory === 'internal') return b.type === 'internal';
    if (filterCategory === 'external_donation') return b.type === 'external_donation';
    return true;
  });

  return (
    <div id="branch-inventory-section" className="space-y-6">
      {/* Category Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Sedes de Asignación e Inventario Descentralizado</h2>
          <p className="text-xs text-slate-500">6 sedes activas entre bibliotecas del campus y núcleos de dotación rural.</p>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
              filterCategory === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({branches.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('internal')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
              filterCategory === 'internal'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            Sedes Centrales (Primaria / Bachillerato)
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('external_donation')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
              filterCategory === 'external_donation'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Semilla Manglareña (4 Núcleos)
          </button>
        </div>
      </div>

      {/* Branches Selector Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedBranches.map((branch) => {
          const count = copies.filter((c) => c.branch_id === branch.id).length;
          const isSelected = branch.id === selectedBranch?.id;

          return (
            <div
              key={branch.id}
              onClick={() => setSelectedBranchId(branch.id)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? branch.type === 'internal'
                    ? 'bg-blue-50/80 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-emerald-50/80 border-emerald-600 shadow-md ring-2 ring-emerald-600/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      branch.type === 'internal'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {branch.type === 'internal' ? 'Sede Central' : 'Dotación Rural'}
                  </span>
                  <span className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    {count} {count === 1 ? 'ejemplar' : 'ejemplares'}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base mt-2.5 leading-snug">{branch.name}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{branch.location || 'Sin ubicación específica'}</span>
                </p>
                <p className="text-[11px] text-slate-600 mt-2 line-clamp-2">
                  {branch.description}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold">
                <span className={branch.type === 'internal' ? 'text-blue-700' : 'text-emerald-700'}>
                  {isSelected ? 'Sede Seleccionada' : 'Ver inventario'}
                </span>
                <ArrowRight className={`w-4 h-4 transition ${isSelected ? 'translate-x-1' : ''}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Branch Detail Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base">Inventario Físico: {selectedBranch?.name}</h3>
              {selectedBranch?.type === 'external_donation' && (\n                <span className=\"inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full\">\n                  <HeartHandshake className=\"w-3 h-3\" /> Programa Descentralizado\n                </span>\n              )}\n            </div>\n            <p className=\"text-xs text-slate-500 mt-0.5\">\n              Listado de ejemplares asignados y clasificados con marbetes de control interno.\n            </p>\n          </div>\n\n          <div className=\"flex items-center gap-2 self-start sm:self-auto\">\n            <button\n              onClick={() => setIsPrintModalOpen(true)}\n              disabled={branchCopies.length === 0}\n              className=\"text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs flex items-center gap-1.5 transition cursor-pointer\"\n              title=\"Generar e imprimir tejuelos para los ejemplares de esta sede (25x38 mm)\"\n            >\n              <Printer className=\"w-3.5 h-3.5\" />\n              <span>Imprimir Tejuelos (25×38mm)</span>\n            </button>\n            <span className=\"text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs\">\n              Total en Sede: {branchCopies.length} libros\n            </span>\n          </div>\n        </div>\n\n        {branchCopies.length === 0 ? (\n          <div className=\"p-8 text-center text-slate-400 text-xs\">\n            No hay ejemplares registrados actualmente en esta sede.\n          </div>\n        ) : (\n          <div className=\"overflow-x-auto\">\n            <table className=\"w-full text-left text-xs\">\n              <thead className=\"bg-slate-100/80 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200\">\n                <tr>\n                  <th className=\"p-3.5\">Código / Marbete</th>\n                  <th className=\"p-3.5\">Obra & Autor</th>\n                  <th className=\"p-3.5\">CDD / Dewey</th>\n                  <th className=\"p-3.5\">Estado Físico</th>\n                  <th className=\"p-3.5\">Ubicación / Notas</th>\n                  <th className=\"p-3.5 text-right\">Tejuelo (25×38)</th>\n                </tr>\n              </thead>\n              <tbody className=\"divide-y divide-slate-100\">\n                {branchCopies.map((copy, index) => {\n                  const work = works.find((w) => w.id === copy.work_id) || copy.work;\n                  const dewey = work?.dewey_code || '800';\n                  const authorCutter = getAuthorCutterCode(work?.author, work?.title);\n                  const copyNum = extractCopyNumber(copy.internal_code, index + 1);\n                  const prefix = extractSpineLabelPrefix(copy.internal_code, selectedBranch?.name || selectedBranch?.id);\n\n                  return (\n                    <tr key={copy.id} className=\"hover:bg-slate-50/80 transition\">\n                      <td className=\"p-3.5 font-mono font-bold text-slate-900\">\n                        <span className=\"bg-slate-100 text-slate-800 px-2 py-1 rounded-md border border-slate-200\">\n                          {copy.internal_code}\n                        </span>\n                      </td>\n                      <td className=\"p-3.5\">\n                        <span className=\"font-bold text-slate-800 block text-xs\">{work?.title || 'Obra no vinculada'}</span>\n                        <span className=\"text-slate-500 text-[11px]\">{work?.author || 'Autor desconocido'}</span>\n                      </td>\n                      <td className=\"p-3.5 font-mono text-slate-600\">\n                        {work?.dewey_code || 'N/A'}\n                      </td>\n                      <td className=\"p-3.5\">\n                        <span\n                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${\n                            copy.condition === 'bueno'\n                              ? 'bg-emerald-100 text-emerald-800'\n                              : copy.condition === 'regular'\n                              ? 'bg-amber-100 text-amber-800'\n                              : 'bg-rose-100 text-rose-800'\n                          }`}\n                        >\n                          {copy.condition}\n                        </span>\n                      </td>\n                      <td className=\"p-3.5 text-slate-500 max-w-xs truncate\">\n                        {copy.notes || 'Asignado a inventario'}\n                      </td>\n                      <td className=\"p-3.5 text-right\">\n                        <div className=\"inline-flex items-center gap-1 justify-end\">\n                          <button\n                            type=\"button\"\n                            onClick={() => downloadSpineLabelsPDF([\n                              {\n                                deweyCode: dewey,\n                                authorLetters: authorCutter,\n                                copyNumber: copyNum,\n                                prefix: prefix,\n                                title: work?.title\n                              }\n                            ], {\n                              title: work?.title,\n                              mode: 'sheet'\n                            })}\n                            className=\"px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition cursor-pointer shadow-2xs\"\n                            title=\"Descargar archivo PDF para imprimir este tejuelo\"\n                          >\n                            <FileDown className=\"w-3 h-3 text-emerald-300\" />\n                            <span>PDF</span>\n                          </button>\n                          <button\n                            type=\"button\"\n                            onClick={() => downloadSpineLabelPNG({\n                              deweyCode: dewey,\n                              authorLetters: authorCutter,\n                              copyNumber: copyNum,\n                              prefix: prefix,\n                              title: work?.title\n                            })}\n                            className=\"px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition cursor-pointer shadow-2xs\"\n                            title=\"Descargar imagen PNG (25x38 mm)\"\n                          >\n                            <ImageIcon className=\"w-3 h-3 text-emerald-700\" />\n                            <span>PNG</span>\n                          </button>\n                        </div>\n                      </td>\n                    </tr>\n                  );\n                })}\n              </tbody>\n            </table>\n          </div>\n        )}\n      </div>\n\n      {/* Modal de Impresión de Tejuelos */}\n      <PrintSpineLabelsModal\n        isOpen={isPrintModalOpen}\n        onClose={() => setIsPrintModalOpen(false)}\n        initialCopies={branchCopies}\n        singleWorkTitle={`Sede: ${branches.find(b => b.id === selectedBranchId)?.name || 'Inventario'}`}\n      />\n    </div>\n  );\n};\n