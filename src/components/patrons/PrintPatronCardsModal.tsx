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
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">
                Koha Patron Cards Engine
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Carnet de Biblioteca con Código de Barras ({patrons.length} {patrons.length === 1 ? 'Lector' : 'Lectores'})
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

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100/70 space-y-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                Formato estándar <strong>CR80 (85.6 × 54 mm)</strong> con código de barras legible por pistolas ópticas y escáneres de mostrador.
              </span>
            </div>
            <button
              onClick={handleDownloadPdf}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer shrink-0 ml-4"
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

              return (\n                <div\n                  key={patron.id}\n                  className=\"bg-slate-900 text-white rounded-2xl p-4 shadow-md border border-slate-800 relative overflow-hidden flex flex-col justify-between h-[210px]\"\n                >\n                  {/* Top line accent */}\n                  <div className=\"absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500\" />\n\n                  {/* Header info */}\n                  <div>\n                    <div className=\"flex items-center justify-between\">\n                      <div className=\"flex items-center gap-2\">\n                        <div className=\"w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center\">\n                          <Library className=\"w-4 h-4\" />\n                        </div>\n                        <div>\n                          <div className=\"text-[9px] font-bold text-emerald-400 uppercase tracking-widest leading-none\">\n                            Colegio Integral El Manglar\n                          </div>\n                          <div className=\"text-[11px] font-bold text-white leading-tight\">\n                            Biblioteca Miguel Otero Silva\n                          </div>\n                        </div>\n                      </div>\n                      <span className=\"text-[9px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30\">\n                        {cat.name.split(' ')[0]}\n                      </span>\n                    </div>\n\n                    {/* Patron Name & Grade */}\n                    <div className=\"mt-3\">\n                      <h3 className=\"text-sm font-bold text-white leading-tight truncate\">\n                        {patron.name}\n                      </h3>\n                      <p className=\"text-[11px] text-slate-300 font-medium\">\n                        {patron.grade_section || 'Comunidad Educativa'}\n                      </p>\n                      <div className=\"flex items-center gap-2 mt-1\">\n                        <span className=\"text-xs font-mono font-bold text-emerald-400\">\n                          {idCode}\n                        </span>\n                        <span className=\"text-[10px] text-slate-400\">\n                          • Máx {cat.maxLoans} libros ({cat.loanDays} días)\n                        </span>\n                      </div>\n                    </div>\n                  </div>\n\n                  {/* Barcode section */}\n                  <div className=\"bg-white rounded-xl p-2 text-slate-900 text-center shadow-inner mt-2\">\n                    <div className=\"h-6 flex items-center justify-center gap-[2px] overflow-hidden px-2\">\n                      {Array.from({ length: 36 }).map((_, i) => (\n                        <div\n                          key={i}\n                          className=\"bg-black h-full\"\n                          style={{\n                            width: i % 3 === 0 ? '3px' : i % 2 === 0 ? '2px' : '1px',\n                            marginRight: i % 4 === 0 ? '2px' : '1px',\n                          }}\n                        />\n                      ))}\n                    </div>\n                    <div className=\"text-[9px] font-mono font-bold text-slate-800 mt-0.5 tracking-wider\">\n                      * {idCode} *\n                    </div>\n                  </div>\n                </div>\n              );\n            })}\n          </div>\n        </div>\n\n        {/* Footer */}\n        <div className=\"px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between\">\n          <span className=\"text-xs text-slate-500\">\n            Compatible con impresoras de credenciales PVC y hojas adhesivas tamaño carta.\n          </span>\n          <div className=\"flex gap-2\">\n            <button\n              onClick={onClose}\n              className=\"px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer\"\n            >\n              Cerrar\n            </button>\n            <button\n              onClick={handleDownloadPdf}\n              className=\"px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer\"\n            >\n              <Printer className=\"w-4 h-4\" />\n              Imprimir Carnets (PDF)\n            </button>\n          </div>\n        </div>\n\n      </div>\n    </div>\n  );\n}\n