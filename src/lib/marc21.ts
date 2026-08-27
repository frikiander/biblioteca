import type { Work, MarcRecord, MarcField, MarcSubfield } from '../types/database';

export const MARC_TAG_LABELS: Record<string, string> = {
  '001': 'Número de Control',
  '005': 'Fecha y hora de última transacción',
  '008': 'Elementos de longitud fija (General)',
  '020': 'Número Internacional Normalizado para Libros (ISBN)',
  '040': 'Fuente de catalogación',
  '041': 'Código de idioma',
  '082': 'Número de Clasificación Decimal Dewey (CDD)',
  '090': 'Signatura topográfica local / Marbete',
  '100': 'Punto de acceso principal — Nombre personal (Autor)',
  '245': 'Mención de título y declaración de responsabilidad',
  '250': 'Mención de edición',
  '260': 'Publicación, distribución (Pie de imprenta tradicional)',
  '264': 'Producción, publicación, distribución, fabricación (RDA)',
  '300': 'Descripción física (Páginas, ilustraciones, dimensiones)',
  '490': 'Mención de serie',
  '500': 'Nota general',
  '520': 'Nota de resumen o sumario / Sinopsis',
  '650': 'Punto de acceso temático — Término de materia',
  '653': 'Término de indización no controlado / Palabras clave',
  '700': 'Punto de acceso adicional — Nombre personal (Coautor/Ilustrador)',
  '856': 'Localización y acceso electrónicos (URL / Portada)',
};

/**
 * Convierte un objeto Work del catálogo universal a una estructura MARC21 estándar.
 */
export function workToMarcRecord(work: Work): MarcRecord {
  const now = new Date();
  const dateFormatted = now.toISOString().replace(/[-:T]/g, '').slice(0, 14) + '.0';
  const yearStr = work.publication_year ? String(work.publication_year).padStart(4, '0') : '2024';
  const lang = work.language || 'spa';

  // 008 Field (40 positions): 00-05 Date entered, 06 Type, 07-10 Date1, 11-14 Date2, 35-37 Lang
  const dateEntered = now.toISOString().slice(2, 10).replace(/-/g, '');
  const field008 = `${dateEntered}s${yearStr}    ve |||||||||||||| ||${lang} d`;

  const dataFields: MarcField[] = [];

  // 020 - ISBN
  if (work.isbn && work.isbn.trim()) {
    dataFields.push({
      tag: '020',
      ind1: ' ',
      ind2: ' ',
      subfields: [{ code: 'a', value: work.isbn.trim().replace(/[^0-9X-]/gi, '') }],
    });
  }

  // 040 - Fuente de catalogación
  dataFields.push({
    tag: '040',
    ind1: ' ',
    ind2: ' ',
    subfields: [
      { code: 'a', value: 'VE-CIM' },
      { code: 'b', value: 'spa' },
      { code: 'c', value: 'Biblioteca Miguel Otero Silva' },
    ],
  });

  // 041 - Idioma
  dataFields.push({
    tag: '041',
    ind1: '0',
    ind2: ' ',
    subfields: [{ code: 'a', value: lang }],
  });

  // 082 - Dewey Decimal
  if (work.dewey_code) {
    dataFields.push({
      tag: '082',
      ind1: '0',
      ind2: '4',
      subfields: [
        { code: 'a', value: work.dewey_code },
        { code: '2', value: '23' }, // Edición 23 de Dewey
      ],
    });
  }

  // 100 - Autor Principal
  if (work.author && work.author.trim()) {
    const authorClean = work.author.trim();
    dataFields.push({
      tag: '100',
      ind1: '1',
      ind2: ' ',
      subfields: [
        { code: 'a', value: authorClean },
        { code: 'e', value: 'autor' },
      ],
    });
  }

  // 245 - Título
  const titleSubfields: MarcSubfield[] = [
    { code: 'a', value: work.title.trim() },
  ];
  if (work.author) {
    titleSubfields.push({ code: 'c', value: work.author.trim() });
  }
  dataFields.push({
    tag: '245',
    ind1: '1',
    ind2: '0',
    subfields: titleSubfields,
  });

  // 250 - Edición (si existe)
  if (work.edition) {
    dataFields.push({
      tag: '250',
      ind1: ' ',
      ind2: ' ',
      subfields: [{ code: 'a', value: work.edition }],
    });
  }

  // 264 / 260 - Publicación y Editorial
  const pubSubfields: MarcSubfield[] = [];
  pubSubfields.push({ code: 'a', value: 'Caracas / Venezuela' });
  if (work.publisher) {
    pubSubfields.push({ code: 'b', value: work.publisher });
  }
  if (work.publication_year) {
    pubSubfields.push({ code: 'c', value: String(work.publication_year) });
  }
  if (pubSubfields.length > 0) {
    dataFields.push({
      tag: '264',
      ind1: ' ',
      ind2: '1',
      subfields: pubSubfields,
    });
  }

  // 300 - Descripción física
  if (work.physical_description) {
    dataFields.push({
      tag: '300',
      ind1: ' ',
      ind2: ' ',
      subfields: [{ code: 'a', value: work.physical_description }],
    });
  }

  // 490 - Serie (si existe)
  if (work.series) {
    dataFields.push({
      tag: '490',
      ind1: '0',
      ind2: ' ',
      subfields: [{ code: 'a', value: work.series }],
    });
  }

  // 520 - Sinopsis o Resumen
  if (work.description && work.description.trim()) {
    dataFields.push({
      tag: '520',
      ind1: ' ',
      ind2: ' ',
      subfields: [{ code: 'a', value: work.description.trim() }],
    });
  }

  // 650 - Materias / Descriptores temáticos
  if (work.subjects && work.subjects.length > 0) {
    work.subjects.forEach((subj) => {
      if (subj && subj.trim()) {
        dataFields.push({
          tag: '650',
          ind1: ' ',
          ind2: '4', // Término de fuente no especificada / local
          subfields: [{ code: 'a', value: subj.trim() }],
        });
      }
    });
  }

  // 856 - URL / Portada digital
  if (work.cover_url && work.cover_url.trim()) {
    dataFields.push({
      tag: '856',
      ind1: '4',
      ind2: '2',
      subfields: [
        { code: 'u', value: work.cover_url },
        { code: '3', value: 'Portada digital' },
      ],
    });
  }

  return {
    leader: '00000nam a2200000 i 4500',
    controlFields: {
      '001': `MOS-${work.id.slice(0, 8)}`,
      '005': dateFormatted,
      '008': field008,
    },
    dataFields,
  };
}

/**
 * Genera el documento MARCXML normalizado de interoperabilidad (ISO 25577).
 */
export function marcRecordToXml(marc: MarcRecord): string {
  const lines: string[] = [];
  lines.push('<?xml version=\"1.0\" encoding=\"UTF-8\"?>');
  lines.push('<record xmlns=\"http://www.loc.gov/MARC21/slim\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.loc.gov/MARC21/slim http://www.loc.gov/standards/marcxml/schema/MARC21slim.xsd\">');
  lines.push(`  <leader>${escapeXml(marc.leader)}</leader>`);

  // Control Fields
  Object.entries(marc.controlFields).forEach(([tag, val]) => {
    lines.push(`  <controlfield tag=\"${tag}\">${escapeXml(val)}</controlfield>`);
  });

  // Data Fields
  marc.dataFields.forEach((f) => {
    const ind1 = f.ind1?.trim() || ' ';
    const ind2 = f.ind2?.trim() || ' ';
    lines.push(`  <datafield tag=\"${f.tag}\" ind1=\"${ind1}\" ind2=\"${ind2}\">`);
    f.subfields.forEach((sf) => {
      lines.push(`    <subfield code=\"${sf.code}\">${escapeXml(sf.value)}</subfield>`);
    });
    lines.push('  </datafield>');
  });

  lines.push('</record>');
  return lines.join('\\n');
}

/**
 * Genera la representación textual tradicional Koha / LC para visualización amigable de catalogadores.
 */
export function marcRecordToFormattedText(marc: MarcRecord): string {
  const lines: string[] = [];
  lines.push(`LDR  ${marc.leader}`);
  Object.entries(marc.controlFields).forEach(([tag, val]) => {
    lines.push(`${tag}  ${val}`);
  });
  marc.dataFields.forEach((f) => {
    const ind1 = f.ind1 || '_';
    const ind2 = f.ind2 || '_';
    const subfieldsStr = f.subfields.map((sf) => `$${sf.code} ${sf.value}`).join(' ');
    lines.push(`${f.tag} ${ind1}${ind2} ${subfieldsStr}`);
  });
  return lines.join('\\n');
}

/**
 * Genera una ficha catalográfica clásica normalizada estilo ISBD / RCAA2.
 */
export function workToCatalogCardText(work: Work): string {
  const dewey = work.dewey_code || '800';
  const author = work.author || 'Sin autor';
  const title = work.title || 'Sin título';
  const pub = work.publisher ? `${work.publisher}, ` : '';
  const year = work.publication_year ? `${work.publication_year}.` : '';
  const desc = work.description ? `\\n   Resumen: ${work.description}\\n` : '';
  const subjects = work.subjects && work.subjects.length > 0 
    ? work.subjects.map((s, i) => `${i + 1}. ${s}.`).join(' ') 
    : '1. Literatura.';

  return `
┌─────────────────────────────────────────────────────────────┐
│ ${dewey.padEnd(10)}                                              │
│                                                             │
│   ${author.toUpperCase()}                                   │
│       ${title} / por ${author}. --                          │
│   Caracas : ${pub}${year}                                   │
│   ${work.physical_description || 'v. : il. ; 22 cm.'}       │
│                                                             │
│   ${desc}                                                   │
│   ${subjects} I. Título.                                    │
│                                                             │
│   ISBN: ${work.isbn || 'N/A'}                               │
│   Biblioteca Miguel Otero Silva — Colegio El Manglar        │
└─────────────────────────────────────────────────────────────┘
  `.trim();
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'\"]/g, (c) => {
    switch (c) {\n      case '<': return '&lt;';\n      case '>': return '&gt;';\n      case '&': return '&amp;';\n      case '\\'': return '&apos;';\n      case '\"': return '&quot;';\n      default: return c;\n    }\n  });\n}\n