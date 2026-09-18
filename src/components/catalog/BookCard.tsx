import React from 'react';
import { 
  BookOpen, 
  Plus, 
  Info, 
  Printer, 
  FileCode,
  Sparkles,
  Pencil
} from 'lucide-react';
import type { WorkWithCopiesCount } from '../../types/database';
import { getDeweyInfo } from '../../lib/dewey';

interface BookCardProps {
  work: WorkWithCopiesCount;
  onOpenDetails: (work: WorkWithCopiesCount) => void;
  onEdit?: (work: WorkWithCopiesCount) => void;
  onOpenMarc21?: (work: WorkWithCopiesCount) => void;
  onQuickRegisterCopy?: (work: WorkWithCopiesCount) => void;
  onAddCopy?: (work: WorkWithCopiesCount) => void;
  onPrintSpineLabels?: (work: WorkWithCopiesCount) => void;
}

export const BookCard: React.FC<BookCardProps> = ({ 
  work, 
  onOpenDetails, 
  onEdit,
  onOpenMarc21,
  onQuickRegisterCopy, 
  onAddCopy,
  onPrintSpineLabels 
}) => {
  const deweyInfo = getDeweyInfo(work.dewey_code);

  const totalCount = work.total_copies ?? (work.copies_by_branch || []).reduce((acc, curr) => acc + curr.count, 0);
  const internalSum = (work.copies_by_branch || [])
    .filter((b) => b.branch_type === 'internal')
    .reduce((acc, curr) => acc + curr.count, 0);
  const ruralSum = (work.copies_by_branch || [])
    .filter((b) => b.branch_type === 'external_donation')
    .reduce((acc, curr) => acc + curr.count, 0);

  const centralCopies = (internalSum + ruralSum === 0 && totalCount > 0) ? totalCount : internalSum;
  const ruralCopies = ruralSum;

  return (
    <div 
      id={`book-card-${work.id}`}
      className="group bg-white rounded-xl border border-[#D3D2D3] hover:border-[#83B141] shadow-2xs hover:shadow-sm transition-all duration-250 flex flex-col justify-between overflow-hidden"
    >
      {/* Top Metadata Header */}
      <div className="px-4 py-2 bg-[#F8F9F8] border-b border-[#D3D2D3]/60 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold tracking-tight bg-white border border-[#D3D2D3] text-neutral-800"
            title={`Clasificación Dewey: ${deweyInfo.name}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#83B141]"></span>
            CDD {work.dewey_code}
          </span>
          <span className="text-[10px] text-neutral-400 font-medium truncate max-w-[100px]" title={deweyInfo.name}>
            {deweyInfo.name.replace(/^[0-9]+\s*/, '')}
          </span>
        </div>

        <span className="text-[10px] font-mono text-neutral-400 truncate" title={`ISBN: ${work.isbn || 'N/A'}`}>
          {work.isbn || 'Sin ISBN'}
        </span>
      </div>

      {/* Main Body: Realistic Book Cover & Curated Details */}
      <div className="p-4 flex gap-4 flex-1">
        {/* Realistic Museum Book Volume with Spine Relief */}
        <div className="relative shrink-0 select-none">
          <div className="relative w-24 sm:w-28 h-36 sm:h-40 rounded-sm shadow-md overflow-hidden bg-neutral-100 border border-neutral-200 group-hover:scale-[1.02] transition-transform duration-300">
            {/* Spine Depth Shadow on the Left Edge */}
            <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/40 via-black/15 to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 left-2.5 w-[0.5px] bg-white/20 z-10 pointer-events-none" />
            {/* Paper Edge on the Right */}
            <div className="absolute inset-y-0 right-0 w-[1.5px] bg-[#e0dcd3] z-10 pointer-events-none" />

            <img
              src={work.cover_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300'}
              alt={work.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300';
              }}
            />

            {totalCount === 0 && (
              <div className="absolute inset-0 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-1 text-center z-20">
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Sin Copias</span>
              </div>
            )}
          </div>
        </div>

        {/* Metadata & Synopsis */}
        <div className="flex flex-col justify-between flex-1 min-w-0">
          <div className="space-y-1">
            <h3 
              className="text-sm sm:text-base font-bold text-neutral-900 leading-snug group-hover:text-[#83B141] transition-colors line-clamp-2"
              title={work.title}
            >
              {work.title}
            </h3>

            <p className="text-xs font-semibold text-neutral-700 truncate">
              {work.author}
            </p>

            <p className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed pt-0.5">
              {work.description || 'Ficha catalogada bajo estándares internacionales Dublin Core y Dewey.'}
            </p>
          </div>

          {/* Subject Tags */}
          {work.subjects && work.subjects.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {work.subjects.slice(0, 2).map((sub, i) => (
                <span key={i} className="text-[10px] bg-[#F8F9F8] text-neutral-600 border border-[#D3D2D3]/70 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                  {sub}
                </span>
              ))}
              {work.subjects.length > 2 && (
                <span className="text-[10px] text-neutral-400 font-mono">+{work.subjects.length - 2}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Museum Collection Inventory Allocation */}
      <div className="px-4 py-2.5 bg-[#F8F9F8] border-t border-[#D3D2D3]/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-neutral-700">
            <span className="w-2 h-2 rounded-full bg-[#83B141]" />
            <span className="text-[11px] font-medium">Campus: <strong>{centralCopies}</strong></span>
          </div>
          <span className="text-neutral-300">•</span>
          <div className="flex items-center gap-1 text-neutral-700">
            <span className="w-2 h-2 rounded-full bg-[#EFDA18]" />
            <span className="text-[11px] font-medium">Rural: <strong>{ruralCopies}</strong></span>
          </div>
        </div>

        <span className="text-[11px] font-bold text-neutral-900">
          {totalCount} {totalCount === 1 ? 'ejemplar' : 'ejemplares'}
        </span>
      </div>

      {/* Action Footer for Librarians and Readers */}
      <div className="p-2 bg-white border-t border-[#D3D2D3]/60 flex items-center gap-1.5">
        <button
          id={`view-details-${work.id}`}
          onClick={() => onOpenDetails(work)}
          title="Ver ficha Dublin Core"
          className="flex-1 py-1.5 px-2 bg-[#F8F9F8] hover:bg-neutral-100 text-neutral-700 border border-[#D3D2D3] rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
        >
          <Info className="w-3.5 h-3.5 text-neutral-500" strokeWidth={1.5} />
          <span>Ficha</span>
        </button>

        {onEdit && (
          <button
            id={`edit-work-${work.id}`}
            onClick={() => onEdit(work)}
            title="Editar obra y ejemplares específicos"
            className="py-1.5 px-2.5 bg-white hover:bg-[#f2f7ec] text-neutral-800 hover:text-[#3b5e14] border border-[#D3D2D3] hover:border-[#83B141]/50 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
          >
            <Pencil className="w-3.5 h-3.5 text-[#83B141]" strokeWidth={1.75} />
            <span>Editar</span>
          </button>
        )}

        {onOpenMarc21 && (
          <button
            onClick={() => onOpenMarc21(work)}
            title="Inspeccionar etiquetas MARC21 (Estándar Internacional)"
            className="py-1.5 px-2.5 bg-neutral-900 hover:bg-neutral-800 text-[#83B141] rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
          >
            <FileCode className="w-3.5 h-3.5 text-[#83B141]" strokeWidth={1.75} />
            <span>MARC21</span>
          </button>
        )}

        {(onQuickRegisterCopy || onAddCopy) && (
          <button
            onClick={() => {
              if (onQuickRegisterCopy) onQuickRegisterCopy(work);
              else if (onAddCopy) onAddCopy(work);
            }}
            title="Generar e imprimir nuevo ejemplar físico con marbete"
            className="py-1.5 px-2 bg-[#f2f7ec] hover:bg-[#83B141]/20 text-[#2c4210] border border-[#83B141]/40 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#83B141]" strokeWidth={2} />
            <span>Ejemplar</span>
          </button>
        )}

        {onPrintSpineLabels && (
          <button
            onClick={() => onPrintSpineLabels(work)}
            title="Imprimir tejuelo catalográfico con código Cutter y Dewey"
            className="p-1.5 bg-[#F8F9F8] hover:bg-neutral-100 text-neutral-700 border border-[#D3D2D3] rounded-lg transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-neutral-600" strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  );
};
