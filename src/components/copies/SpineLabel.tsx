import React from 'react';
import { jsPDF } from 'jspdf';

export interface SpineLabelProps {
  /** Código de clasificación decimal Dewey (ej: "863.64", "863") */
  deweyCode?: string;
  dewey?: string;
  /** Tres letras del código Cutter del autor o título (ej: "OTE", "USL", "PAR") */
  authorLetters: string;
  /** Número o identificador del ejemplar (ej: "Ej. 1", 1, "c. 1") */
  copyNumber: string | number;
  /** Prefijo o sigla institucional opcional (ej: "CIM", "MOS") */
  prefix?: string;
  /** Clases CSS adicionales */
  className?: string;
  /** Activar o desactivar las líneas de guía para corte manual (por defecto: true) */
  showCutGuide?: boolean;
}

export interface SpineLabelData {
  deweyCode: string;
  authorLetters: string;
  copyNumber: string | number;
  prefix?: string;
  title?: string;
}

/**
 * Dibuja un tejuelo en un documento jsPDF con medidas exactas en milímetros (25 x 38 mm).
 */
function drawSpineLabelOnPDF(
  doc: jsPDF,
  label: SpineLabelData,
  x: number,
  y: number,
  w: number,
  h: number,
  showGuide: boolean = true
) {
  const deweyDisplay = (label.deweyCode || '000').trim();
  const cutterDisplay = (label.authorLetters || 'XXX').trim().toUpperCase();
  const copyDisplay = typeof label.copyNumber === 'number'
    ? `Ej. ${label.copyNumber}`
    : String(label.copyNumber).trim().startsWith('Ej.') || String(label.copyNumber).trim().startsWith('c.')
      ? String(label.copyNumber).trim()
      : `Ej. ${label.copyNumber}`;
  const prefix = label.prefix?.trim().toUpperCase();

  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, w, h, 'F');

  if (showGuide) {
    doc.setDrawColor(140, 140, 140);
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([1, 0.8], 0);
    doc.rect(x + 0.1, y + 0.1, w - 0.2, h - 0.2, 'S');
    doc.setLineDashPattern([], 0);
  }

  const centerX = x + w / 2;
  let currentY = y + 4;

  if (prefix) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(80, 80, 80);
    doc.text(prefix, centerX, currentY, { align: 'center' });

    currentY += 1.5;
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.2);
    doc.line(x + 2.5, currentY, x + w - 2.5, currentY);
    currentY += 4.5;
  } else {
    currentY += 4.8;
  }

  doc.setFont('courier', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  doc.text(deweyDisplay, centerX, currentY, { align: 'center' });

  currentY += 1.8;
  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.2);
  doc.line(centerX - 4, currentY, centerX + 4, currentY);
  currentY += 5.2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(cutterDisplay, centerX, currentY, { align: 'center' });

  const bottomDividerY = y + h - 6.5;
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.2);
  doc.line(x + 2.5, bottomDividerY, x + w - 2.5, bottomDividerY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(40, 40, 40);
  doc.text(copyDisplay.toUpperCase(), centerX, y + h - 2.4, { align: 'center' });
}

export function downloadSpineLabelsPDF(
  labels: SpineLabelData[],
  options?: { filename?: string; mode?: 'sheet' | 'single'; title?: string }
) {
  if (!labels || labels.length === 0) return;

  const mode = options?.mode || 'sheet';
  const cleanTitle = (options?.title || labels[0]?.title || 'tejuelos')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 30);
  const filename = options?.filename || `tejuelos_${cleanTitle}.pdf`;

  if (mode === 'single' && labels.length === 1) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [25, 38]
    });
    drawSpineLabelOnPDF(doc, labels[0], 0, 0, 25, 38, true);
    doc.save(filename);
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const labelW = 25;
  const labelH = 38;
  const gapX = 3.5;
  const gapY = 3.5;
  const marginLeft = 10;
  const marginTop = 12;

  const colsPerPage = 7;
  const rowsPerPage = 6;
  const labelsPerPage = colsPerPage * rowsPerPage;

  labels.forEach((label, index) => {
    if (index > 0 && index % labelsPerPage === 0) {
      doc.addPage('letter', 'portrait');
    }

    const pageIndex = index % labelsPerPage;
    const col = pageIndex % colsPerPage;
    const row = Math.floor(pageIndex / colsPerPage);

    const x = marginLeft + col * (labelW + gapX);
    const y = marginTop + row * (labelH + gapY);

    drawSpineLabelOnPDF(doc, label, x, y, labelW, labelH, true);
  });

  doc.save(filename);
}

export function downloadSpineLabelPNG(options: {
  deweyCode: string;
  authorLetters: string;
  copyNumber: string | number;
  prefix?: string;
  title?: string;
}) {
  const { deweyCode, authorLetters, copyNumber, prefix, title } = options;
  const deweyDisplay = (deweyCode || '000').trim();
  const cutterDisplay = (authorLetters || 'XXX').trim().toUpperCase();
  const copyDisplay = typeof copyNumber === 'number' 
    ? `Ej. ${copyNumber}` 
    : String(copyNumber).trim().startsWith('Ej.') || String(copyNumber).trim().startsWith('c.')
      ? String(copyNumber).trim()
      : `Ej. ${copyNumber}`;

  const width = 295;
  const height = 449;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#666666';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(4, 4, width - 8, height - 8);
  ctx.setLineDash([]);

  let topY = 24;
  if (prefix) {
    ctx.fillStyle = '#444444';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(prefix.toUpperCase(), width / 2, 45);
    
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, 60);
    ctx.lineTo(width - 30, 60);
    ctx.stroke();
    topY = 70;
  }

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 36px "Courier New", monospace, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(deweyDisplay, width / 2, topY + (prefix ? 95 : 120));

  ctx.strokeStyle = '#AAAAAA';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 40, topY + (prefix ? 130 : 155));
  ctx.lineTo(width / 2 + 40, topY + (prefix ? 130 : 155));
  ctx.stroke();

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 44px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(cutterDisplay, width / 2, topY + (prefix ? 200 : 225));

  ctx.strokeStyle = '#CCCCCC';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(30, height - 70);
  ctx.lineTo(width - 30, height - 70);
  ctx.stroke();

  ctx.fillStyle = '#222222';
  ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(copyDisplay.toUpperCase(), width / 2, height - 30);

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  const cleanTitle = (title || 'tejuelo').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 25);
  link.download = `tejuelo_${cleanTitle}_${deweyDisplay}_${cutterDisplay}.png`;
  link.href = dataUrl;
  link.click();
}

export function downloadSpineLabelSVG(options: {
  deweyCode: string;
  authorLetters: string;
  copyNumber: string | number;
  prefix?: string;
  title?: string;
}) {
  const { deweyCode, authorLetters, copyNumber, prefix, title } = options;
  const deweyDisplay = (deweyCode || '000').trim();
  const cutterDisplay = (authorLetters || 'XXX').trim().toUpperCase();
  const copyDisplay = typeof copyNumber === 'number' 
    ? `Ej. ${copyNumber}` 
    : String(copyNumber).trim().startsWith('Ej.') || String(copyNumber).trim().startsWith('c.')
      ? String(copyNumber).trim()
      : `Ej. ${copyNumber}`;

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="25mm" height="38mm" viewBox="0 0 25 38">
  <rect width="25" height="38" fill="#ffffff" />
  <rect x="0.5" y="0.5" width="24" height="37" fill="none" stroke="#666666" stroke-width="0.3" stroke-dasharray="1,0.7" />
  ${prefix ? `
  <text x="12.5" y="4" font-family="sans-serif" font-size="2.2" font-weight="bold" fill="#444444" text-anchor="middle">${prefix}</text>
  <line x1="3" y1="5.2" x2="22" y2="5.2" stroke="#cccccc" stroke-width="0.2" />
  ` : ''}
  <text x="12.5" y="${prefix ? '14' : '15'}" font-family="monospace" font-size="3.4" font-weight="bold" fill="#000000" text-anchor="middle">${deweyDisplay}</text>
  <line x1="8.5" y1="${prefix ? '17' : '18.5'}" x2="16.5" y2="${prefix ? '17' : '18.5'}" stroke="#999999" stroke-width="0.2" />
  <text x="12.5" y="${prefix ? '24' : '25.5'}" font-family="sans-serif" font-size="4.2" font-weight="bold" fill="#000000" text-anchor="middle">${cutterDisplay}</text>
  <line x1="3" y1="31.5" x2="22" y2="31.5" stroke="#cccccc" stroke-width="0.2" />
  <text x="12.5" y="35.2" font-family="sans-serif" font-size="2.6" font-weight="bold" fill="#222222" text-anchor="middle">${copyDisplay.toUpperCase()}</text>
</svg>`;

  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const cleanTitle = (title || 'tejuelo').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 25);
  link.download = `tejuelo_${cleanTitle}_${deweyDisplay}_${cutterDisplay}.svg`;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const SpineLabel: React.FC<SpineLabelProps> = ({
  deweyCode,
  dewey,
  authorLetters,
  copyNumber,
  prefix,
  className = '',
  showCutGuide = true,
}) => {
  const deweyDisplay = (deweyCode || dewey || '000').trim();
  const cutterDisplay = (authorLetters || 'XXX').trim().toUpperCase();
  
  const copyDisplay = typeof copyNumber === 'number' 
    ? `Ej. ${copyNumber}` 
    : String(copyNumber).trim().startsWith('Ej.') || String(copyNumber).trim().startsWith('c.')
      ? String(copyNumber).trim()
      : `Ej. ${copyNumber}`;

  return (
    <div
      className={`
        w-[25mm] h-[38mm] min-w-[25mm] max-w-[25mm] min-h-[38mm] max-h-[38mm]
        box-border bg-white text-black font-sans select-none
        flex flex-col items-center justify-between
        p-[1.5mm] text-center
        ${showCutGuide ? 'border border-dashed border-gray-400 print:border-black print:border-dashed' : 'border-transparent'}
        print:w-[25mm] print:h-[38mm] print:min-w-[25mm] print:min-h-[38mm]
        print:bg-white print:text-black print:break-inside-avoid
        ${className}
      `}
      style={{
        width: '25mm',
        height: '38mm',
      }}
    >
      {prefix && (
        <span className="text-[7.5px] font-semibold text-gray-600 print:text-black leading-none tracking-wider uppercase border-b border-gray-300 print:border-black w-full pb-[0.5mm]">
          {prefix}
        </span>
      )}

      <div className="flex-1 flex flex-col items-center justify-center w-full gap-[1mm] py-[0.5mm]">
        <span 
          className="font-bold text-[11px] leading-tight tracking-tight text-black break-all font-mono"
          title={`Clasificación Dewey: ${deweyDisplay}`}
        >
          {deweyDisplay}
        </span>

        <div className="w-4 h-[0.5px] bg-gray-300 print:bg-black/40" />

        <span 
          className="font-bold text-[12px] leading-none tracking-widest text-black uppercase"
          title={`Código Cutter: ${cutterDisplay}`}
        >
          {cutterDisplay}
        </span>
      </div>

      <div className="w-full pt-[0.5mm] border-t border-gray-300 print:border-black">
        <span className="font-bold text-[8.5px] leading-none tracking-normal text-gray-800 print:text-black uppercase block">
          {copyDisplay}
        </span>
      </div>
    </div>
  );
};

export default SpineLabel;
