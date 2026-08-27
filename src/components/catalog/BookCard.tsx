import React from 'react';
import { BookOpen, MapPin, Tag, PlusCircle, CheckCircle, Info, Printer } from 'lucide-react';
import type { WorkWithCopiesCount } from '../../types/database';
import { getDeweyInfo } from '../../lib/dewey';

interface BookCardProps {
  work: WorkWithCopiesCount;
  onOpenDetails: (work: WorkWithCopiesCount) => void;
  onQuickRegisterCopy?: (work: WorkWithCopiesCount) => void;
  onAddCopy?: (work: WorkWithCopiesCount) => void;
  onPrintSpineLabels?: (work: WorkWithCopiesCount) => void;
}

export const BookCard: React.FC<BookCardProps> = ({ 
  work, 
  onOpenDetails, 
  onQuickRegisterCopy, 
  onAddCopy,
  onPrintSpineLabels 
}) => {
  const deweyInfo = getDeweyInfo(work.dewey_code);

  const centralCopies = work.copies_by_branch.find(b => b.branch_type === 'internal')?.count || 0;
  const ruralCopies = work.copies_by_branch
    .filter(b => b.branch_type === 'external_donation')
    .reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div 
      id={`book-card-${work.id}`}
      className="group bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-emerald-300 transition-all duration-300 flex flex-col overflow-hidden"
    >
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
        <span 
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${deweyInfo.badgeBg} ${deweyInfo.badgeText} tracking-tight`}
          title={`Clasificación Dewey: ${deweyInfo.name}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
          CDD {work.dewey_code}
        </span>
        <span className="text-[11px] font-mono text-slate-400 truncate max-w-[120px]" title={`ISBN: ${work.isbn || 'N/A'}`}>
          {work.isbn || 'Sin ISBN'}
        </span>
      </div>

      <div className="p-4 flex gap-4 flex-1">
        <div className="relative shrink-0">
          <img
            src={work.cover_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300'}
            alt={work.title}
            className="w-20 h-28 sm:w-24 sm:h-32 object-cover rounded-xl shadow-md border border-slate-200 group-hover:scale-[1.02] transition-transform duration-300 bg-slate-100"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300';
            }}
          />
          {work.total_copies === 0 && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs rounded-xl flex items-center justify-center p-1 text-center">
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">Agotado</span>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between flex-1 min-w-0">
          <div>
            <h3 
              className="text-base font-bold text-slate-900 leading-snug group-hover:text-emerald-900 transition-colors line-clamp-2"
              title={work.title}
            >
              {work.title}
            </h3>
            <p className="text-xs font-semibold text-emerald-800 mt-0.5 truncate">
              {work.author}
            </p>
            <p className="text-[11px] text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
              {work.description || 'Sin descripción bibliográfica registrada.'}
            </p>
          </div>

          {work.subjects && work.subjects.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {work.subjects.slice(0, 2).map((sub, i) => (
                <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md truncate max-w-[130px]">
                  {sub}
                </span>
              ))}
              {work.subjects.length > 2 && (
                <span className="text-[10px] text-slate-400">+{work.subjects.length - 2}</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-100 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span className="font-semibold text-slate-700 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
            Total: {work.total_copies} {work.total_copies === 1 ? 'ejemplar' : 'ejemplares'}
          </span>
          <span className="text-[11px] text-slate-400">
            {deweyInfo.name}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-lg bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <span className="text-[10px] font-medium text-slate-500 truncate flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Sede Central
            </span>
            <span className="text-sm font-bold text-slate-800 mt-0.5">
              {centralCopies} {centralCopies === 1 ? 'ud.' : 'uds.'}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <span className="text-[10px] font-medium text-emerald-700 truncate flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Dotación Rural
            </span>
            <span className="text-sm font-bold text-emerald-950 mt-0.5">
              {ruralCopies} {ruralCopies === 1 ? 'ud.' : 'uds.'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
        <button
          id={`view-details-${work.id}`}
          onClick={() => onOpenDetails(work)}
          title="Ver ficha catalográfica"
          className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer min-w-[65px]"
        >
          <Info className="w-3.5 h-3.5" />
          <span>Ficha</span>
        </button>

        {onPrintSpineLabels && (
          <button
            id={`print-spine-btn-${work.id}`}
            onClick={() => onPrintSpineLabels(work)}
            title="Imprimir o descargar tejuelo de lomo (25x38 mm)"
            className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Tejuelo</span>
          </button>
        )}

        {onAddCopy && (
          <button
            id={`add-copy-btn-${work.id}`}
            onClick={() => onAddCopy(work)}
            title="Registrar nuevo ejemplar físico en cualquier sede"
            className="py-1.5 px-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ Ejemplar</span>
          </button>
        )}

        {onQuickRegisterCopy && (
          <button
            id={`quick-add-copy-${work.id}`}
            onClick={() => onQuickRegisterCopy(work)}
            title="Dotar ejemplar a Semilla Manglareña"
            className="py-1.5 px-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Semilla</span>
          </button>
        )}
      </div>
    </div>
  );
};
