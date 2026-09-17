import React, { useRef } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  CreditCard, 
  Building2, 
  Sparkles, 
  Library, 
  QrCode,
  UserCheck
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import type { Patron } from '../../types/database';
import { getPatronCategory } from '../../lib/patrons';

interface PrintPatronCardsModalProps {
  patrons: Patron[];
  onClose: () => void;
}

export function PrintPatronCardsModal({ patrons, onClose }: PrintPatronCardsModalProps) {
  const previewRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = () => {
    // Standard ISO ID-1 CR80 card: 85.60 mm × 53.98 mm (horizontal)
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [85.6, 53.98],
    });

    patrons.forEach((patron, idx) => {
      if (idx > 0) doc.addPage([85.6, 53.98], 'landscape');

      const cat = getPatronCategory(patron);

      // Card Background
      doc.setFillColor(15, 23, 42); // slate-900
      doc.roundedRect(2, 2, 81.6, 49.98, 3, 3, 'F');

      // Top Accent bar
      doc.setFillColor(16, 185, 129); // emerald-500
      doc.rect(2, 2, 81.6, 3, 'F');

      // Institution Header
      doc.setTextColor(52, 211, 153); // emerald-400
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.text('COLEGIO INTEGRAL EL MANGLAR', 5, 8.5);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Biblioteca Miguel Otero Silva', 5, 12.5);

      // Divider line
      doc.setDrawColor(51, 65, 85);
      doc.setLineWidth(0.3);
      doc.line(5, 14.5, 80.6, 14.5);

      // Patron Name
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      const cleanName = patron.name.length > 26 ? patron.name.slice(0, 26) + '...' : patron.name;
      doc.text(cleanName, 5, 19.5);

      // Role / Category Badge
      doc.setTextColor(148, 163, 184); // slate-400
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.text(cat.name.toUpperCase(), 5, 23.5);

      // Grade / Department
      doc.setTextColor(203, 213, 225); // slate-300
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(patron.grade_section || 'Comunidad Manglareña', 5, 27.5);

      // ID Identifier
      doc.setTextColor(52, 211, 153);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      const idCode = patron.identifier || `MOS-ID-${patron.id.slice(0, 6)}`;
      doc.text(idCode, 5, 32.5);

      // Circulation Rules line
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Máx. ${cat.maxLoans} libros simultáneos • Plazo: ${cat.loanDays} días`, 5, 36);

      // Bottom Barcode emulation box
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(5, 38, 75.6, 11, 1, 1, 'F');

      // Draw simulated barcode lines
      doc.setFillColor(0, 0, 0);
      let xPos = 8;
      const codeStr = idCode.replace(/[^A-Z0-9]/gi, '');
      for (let i = 0; i < 48; i++) {
        const width = (i % 3 === 0 ? 0.8 : i % 2 === 0 ? 0.5 : 0.3);
        if (i % 5 !== 4) {
          doc.rect(xPos, 39.5, width, 5.5, 'F');
        }
        xPos += width + 0.6;
        if (xPos > 76) break;
      }

      // Barcode numeric text
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(6);
      doc.setFont('courier', 'bold');
      doc.text(`* ${idCode} *`, 42.8, 47.5, { align: 'center' });
    });

    doc.save(`Carnets_Biblioteca_MOS_${patrons.length}_lectores.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 bg-white border-b border-[#D3D2D3] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#83B141]/10 text-[#83B141] flex items-center justify-center border border-[#83B141]/30">
              <CreditCard className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#83B141]">
                Generación de Carnets
              </span>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900">
                Carnet de Biblioteca con Código de Barras ({patrons.length} {patrons.length === 1 ? 'Lector' : 'Lectores'})
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-700 rounded-xl hover:bg-neutral-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-[#F9FAF9] space-y-6">
          <div className="bg-white border border-[#D3D2D3] rounded-2xl p-4 text-xs text-neutral-800 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#83B141] shrink-0" />
              <span>
                Formato estándar <strong>CR80 (85.6 × 54 mm)</strong> con código de barras legible por escáneres ópticos.
              </span>
            </div>
            <button
              onClick={handleDownloadPdf}
              className="px-4 py-2 bg-[#83B141] hover:bg-[#719b35] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer shrink-0 ml-4"
            >
              <Download className="w-4 h-4" />
              Descargar PDF para Imprimir
            </button>
          </div>

          {/* Cards Preview Grid */}
          <div ref={previewRef} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {patrons.map((patron) => {
              const cat = getPatronCategory(patron);
              const idCode = patron.identifier || `MOS-ID-${patron.id.slice(0, 6)}`;

              return (
                <div
                  key={patron.id}
                  className="bg-slate-900 text-white rounded-2xl p-4 shadow-md border border-slate-800 relative overflow-hidden flex flex-col justify-between h-[210px]"
                >
                  {/* Top line accent */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#83B141] to-[#EFDA18]" />

                  {/* Header info */}
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#83B141]/20 text-[#83B141] flex items-center justify-center">
                          <Library className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[9px] font-bold text-[#83B141] uppercase tracking-widest leading-none">
                            Colegio Integral El Manglar
                          </div>
                          <div className="text-[11px] font-bold text-white leading-tight">
                            Biblioteca Miguel Otero Silva
                          </div>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold bg-[#EFDA18]/20 text-[#EFDA18] px-2 py-0.5 rounded-full border border-[#EFDA18]/30">
                        {cat.name.split(' ')[0]}
                      </span>
                    </div>

                    {/* Patron Name & Grade */}
                    <div className="mt-3">
                      <h3 className="text-sm font-bold text-white leading-tight truncate">
                        {patron.name}
                      </h3>
                      <p className="text-[11px] text-slate-300 font-medium">
                        {patron.grade_section || cat.name}
                      </p>
                    </div>
                  </div>

                  {/* Barcode & ID */}
                  <div className="bg-white rounded-xl p-2.5 flex items-center justify-between text-slate-900">
                    <div className="flex-1 overflow-hidden pr-2">
                      <div className="font-barcode text-2xl tracking-widest text-slate-900 leading-none select-none">
                        *{idCode}*
                      </div>
                      <div className="text-[9px] font-mono font-bold text-slate-600 tracking-wider">
                        {idCode}
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                      <QrCode className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-[#D3D2D3] flex items-center justify-between">
          <span className="text-xs text-neutral-500">
            Compatible con impresoras de credenciales PVC y hojas adhesivas tamaño carta.
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Cerrar
            </button>
            <button
              onClick={handleDownloadPdf}
              className="px-4 py-2 bg-[#83B141] hover:bg-[#719b35] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimir Carnets (PDF)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
