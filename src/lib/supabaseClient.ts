import { createClient } from '@supabase/supabase-js';
import type { Database, Work, Branch, Copy, WorkWithCopiesCount, CopyCondition } from '../types/database';

// Initialize default environment variables or fallback
const metaEnv = (import.meta as unknown as { env: Record<string, string | undefined> }).env || {};
const SUPABASE_URL = metaEnv.VITE_SUPABASE_URL || metaEnv.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = metaEnv.VITE_SUPABASE_ANON_KEY || metaEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Initial curated store for Colegio Integral El Manglar with standard RFC-compliant UUIDs
export const INITIAL_BRANCHES: Branch[] = [
  {
    id: '00000000-0000-4000-a000-000000000001',
    name: 'Biblioteca Miguel Otero Silva - Primaria',
    type: 'internal',
    location: 'Campus Principal, Módulo de Primaria',
    description: 'Fondo bibliográfico infantil, primeros lectores y colección formativa de educación primaria.',
  },
  {
    id: '00000000-0000-4000-a000-000000000002',
    name: 'Biblioteca Miguel Otero Silva - Bachillerato',
    type: 'internal',
    location: 'Campus Principal, Edificio Central de Bachillerato',
    description: 'Colección general, humanidades, ciencias, referencia y sala de estudio para educación media y diversificada.',
  },
  {
    id: '00000000-0000-4000-a000-000000000003',
    name: 'Semilla Manglareña - Guárico',
    type: 'external_donation',
    location: 'Estado Guárico, Escuelas Rurales de Los Llanos',
    description: 'Núcleo social de dotación y biblioteca comunitaria satélite en escuelas llaneras.',
  },
  {
    id: '00000000-0000-4000-a000-000000000004',
    name: 'Semilla Manglareña - Caripe',
    type: 'external_donation',
    location: 'Caripe del Guácharo, Estado Monagas',
    description: 'Módulo de lectura y dotación escolar en comunidades de la zona montañosa de Caripe.',
  },
  {
    id: '00000000-0000-4000-a000-000000000005',
    name: 'Semilla Manglareña - Mérida',
    type: 'external_donation',
    location: 'Estado Mérida, Zona Andina',
    description: 'Biblioteca satélite rural para fomento del hábito lector en escuelas andinas.',
  },
  {
    id: '00000000-0000-4000-a000-000000000006',
    name: 'Semilla Manglareña - Delta',
    type: 'external_donation',
    location: 'Delta Amacuro, Comunidades Fluviales',
    description: 'Dotación bibliográfica y material educativo para centros escolares ribereños del Delta.',
  },
];

export function getBranchCodePrefix(branchNameOrId?: string): string {
  if (!branchNameOrId) return 'MOS-PRI';
  const lower = branchNameOrId.toLowerCase().trim();
  
  if (lower.includes('primaria') || lower.endsWith('0001') || lower === 'b_primaria') return 'MOS-PRI';
  if (lower.includes('bachillerato') || lower.endsWith('0002') || lower === 'b_bachillerato') return 'MOS-BAC';
  if (lower.includes('guárico') || lower.includes('guarico') || lower.endsWith('0003') || lower === 'b_guarico') return 'SM-GUA';
  if (lower.includes('caripe') || lower.endsWith('0004') || lower === 'b_caripe') return 'SM-CAR';
  if (lower.includes('mérida') || lower.includes('merida') || lower.endsWith('0005') || lower === 'b_merida') return 'SM-MER';
  if (lower.includes('delta') || lower.endsWith('0006') || lower === 'b_delta') return 'SM-DEL';
  
  if (lower.includes('semilla')) return 'SM-GUA';
  return 'MOS-PRI';
}

/**
 * Extrae de forma limpia el prefijo institucional para el tejuelo (ej: MOS-PRI, MOS-BAC, SM-GUA).
 * Normaliza cualquier código antiguo o formato institucional.
 */
export function extractSpineLabelPrefix(internalCode?: string, branchNameOrId?: string): string {
  if (internalCode && internalCode.trim()) {
    const clean = internalCode.trim().toUpperCase();
    
    // Normalizar y reemplazar cualquier sigla residual CIM o CIEM
    const normalized = clean
      .replace(/^CIEM-PRI/i, 'MOS-PRI')
      .replace(/^CIEM-BAC/i, 'MOS-BAC')
      .replace(/^CIEM/i, 'MOS-PRI')
      .replace(/^CIM-PRI/i, 'MOS-PRI')
      .replace(/^CIM-BAC/i, 'MOS-BAC')
      .replace(/^CIM/i, 'MOS-PRI');

    const parts = normalized.split('-');
    
    // Si tiene estructura tipo MOS-PRI-860-CER-001 o MOS-BAC-860-CER-001
    if (parts.length >= 3) {
      const twoPartPrefix = `${parts[0]}-${parts[1]}`;
      if (
        ['MOS-PRI', 'MOS-BAC', 'SM-GUA', 'SM-CAR', 'SM-MER', 'SM-DEL'].includes(twoPartPrefix) ||
        parts[0] === 'MOS' ||
        parts[0] === 'SM'
      ) {
        if (isNaN(Number(parts[1]))) {
          return twoPartPrefix;
        }
        return parts[0];
      }
    }
    
    if (parts[0] && isNaN(Number(parts[0]))) {
      return parts[0];
    }
  }

  if (branchNameOrId) {
    return getBranchCodePrefix(branchNameOrId);
  }

  return 'MOS-PRI';
}

/**
 * Extrae el número correlativo de copia a partir del código de marbete.
 */
export function extractCopyNumber(internalCode?: string, fallbackIndex: number = 1): number {
  if (!internalCode) return fallbackIndex;
  const parts = internalCode.trim().split('-');
  const lastPart = parts[parts.length - 1];
  const num = parseInt(lastPart, 10);
  return isNaN(num) ? fallbackIndex : num;
}

export function getNextCopySequenceForWork(workId?: string): number {
  if (!workId) return 1;
  const copies = getStoredCopies();
  const workCopies = copies.filter((c) => c.work_id === workId);
  return workCopies.length + 1;
}

/**
 * Extrae la letra inicial del título en minúscula según las reglas internacionales de catalogación (Libris / Work mark).
 * Omite artículos iniciales en español, inglés, francés, italiano y alemán.
 */
export function getTitleWorkMark(title?: string): string {
  if (!title || !title.trim()) return '';

  const articles = new Set([
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo', 'al', 'del',
    'the', 'a', 'an',
    'le', 'la', 'les', 'l', 'un', 'une', 'des', 'du',
    'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una',
    'der', 'die', 'das', 'ein', 'eine'
  ]);

  const cleanTitle = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();

  const words = cleanTitle.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return '';

  let targetWord = words[0];
  const firstWordClean = targetWord.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (articles.has(firstWordClean) && words.length > 1) {
    targetWord = words[1];
  }

  const charOnly = targetWord.toLowerCase().replace(/[^a-z0-9]/g, '');
  return charOnly.length > 0 ? charOnly.charAt(0) : '';
}

/**
 * Extrae las 3 letras principales del autor (o título en caso de obras colectivas/anónimas).
 */
export function getAuthor3Letters(author?: string, title?: string): string {
  const cleanStr = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z]/g, '');

  const isAnonymousOrCollective = (authStr?: string): boolean => {
    if (!authStr || !authStr.trim()) return true;
    const lower = authStr.toLowerCase().trim();
    const collectiveTerms = [
      'varios', 'varios autores', 'aa.vv', 'aa.vv.', 'vv.aa', 'vv.aa.', 'anonimo', 'anónimo',
      'colectivo', 'editorial', 'equipo', 'santillana', 'larousse', 'oceano', 'océano',
      'norma', 'sm', 'ninguno', 'desconocido', 'sin autor', 'diversos autores', 'autores varios',
    ];
    return collectiveTerms.some((term) => lower === term || lower.startsWith(term + ' ') || lower.startsWith(term + '/'));
  };

  if (author && !isAnonymousOrCollective(author)) {
    const particles = new Set(['de', 'la', 'del', 'los', 'las', 'van', 'von', 'da', 'di', 'y', 'd']);
    const authClean = author.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (authClean.includes(',')) {
      const surnamePart = authClean.split(',')[0].trim();
      const surnameWords = surnamePart.split(/\s+/).filter((w) => !particles.has(w.toLowerCase().replace(/[^a-z]/g, '')));
      if (surnameWords.length > 0) {
        const code = cleanStr(surnameWords[0]).slice(0, 3);
        if (code.length > 0) return code.padEnd(3, 'X');
      }
    }

    const words = authClean.trim().split(/[\s\-]+/);
    const meaningfulWords = words.filter((w) => !particles.has(w.toLowerCase().replace(/[^a-z]/g, '')));

    if (meaningfulWords.length === 1) {
      const code = cleanStr(meaningfulWords[0]).slice(0, 3);
      if (code.length > 0) return code.padEnd(3, 'X');
    } else if (meaningfulWords.length === 2) {
      const surname = meaningfulWords[1];
      const code = cleanStr(surname).slice(0, 3);
      if (code.length > 0) return code.padEnd(3, 'X');
    } else if (meaningfulWords.length === 3) {
      const primarySurname = meaningfulWords[1];
      const code = cleanStr(primarySurname).slice(0, 3);
      if (code.length > 0) return code.padEnd(3, 'X');
    } else if (meaningfulWords.length >= 4) {
      const primarySurname = meaningfulWords[2] || meaningfulWords[1];
      const code = cleanStr(primarySurname).slice(0, 3);
      if (code.length > 0) return code.padEnd(3, 'X');
    }
  }

  if (title && title.trim()) {
    const articles = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo', 'the', 'a', 'an', 'le', 'les', 'l']);
    const titleWords = title.trim().split(/\s+/);
    let targetWord = titleWords[0];
    const cleanFirst = targetWord.toLowerCase().replace(/[^a-z]/g, '');
    if (articles.has(cleanFirst) && titleWords.length > 1) {
      targetWord = titleWords[1];
    }
    const code = cleanStr(targetWord).slice(0, 3);
    if (code.length > 0) return code.padEnd(3, 'X');
  }

  return 'BIB';
}

/**
 * Código Cutter completo según la regla internacional:
 * 3 letras mayúsculas del apellido del autor + 1 letra minúscula de la primera palabra con significado real del título.
 */
export function getAuthorCutterCode(author?: string, title?: string): string {
  const authorLetters = getAuthor3Letters(author, title);
  const workMark = getTitleWorkMark(title);
  return `${authorLetters}${workMark}`;
}

/**
 * Formatea el código Cutter para su presentación en el tejuelo impreso.
 */
export function formatCutterDisplay(authorLetters?: string): string {
  if (!authorLetters) return 'XXX';
  const clean = authorLetters.trim();
  if (/^[A-Z]{3}[a-z]$/.test(clean)) {
    return `${clean.slice(0, 3)} ${clean.slice(3)}`;
  }
  if (/^[A-Z]{3}\s+[a-z]$/i.test(clean)) {
    const parts = clean.split(/\s+/);
    return `${parts[0].toUpperCase()} ${parts[1].toLowerCase()}`;
  }
  if (/^[A-Za-z]{3}$/.test(clean)) {
    return clean.toUpperCase();
  }
  return clean;
}

export function generateMarbeteCode(
  branchNameOrId?: string,
  deweyCode?: string,
  authorOrCutter?: string,
  copySequence?: number | string,
  title?: string
): string {
  const prefix = getBranchCodePrefix(branchNameOrId);
  const deweyPrefix = deweyCode ? deweyCode.split('.')[0].replace(/[^0-9]/g, '') || '800' : '800';

  let cutter = 'OTEc';
  if (authorOrCutter && /^[A-Za-z]{3}[a-z]?$/.test(authorOrCutter.trim())) {
    const raw = authorOrCutter.trim();
    if (raw.length === 4) {
      cutter = raw.slice(0, 3).toUpperCase() + raw.charAt(3).toLowerCase();
    } else if (raw.length === 3) {
      const workMark = title ? getTitleWorkMark(title) : '';
      cutter = raw.toUpperCase() + workMark;
    }
  } else {
    cutter = getAuthorCutterCode(authorOrCutter, title);
  }

  let seq = '001';
  if (copySequence !== undefined && copySequence !== null && String(copySequence).trim() !== '') {
    const num = parseInt(String(copySequence), 10);
    if (!isNaN(num)) {
      seq = String(num).padStart(3, '0');
    } else {
      seq = String(copySequence).padStart(3, '0');
    }
  }

  return `${prefix}-${deweyPrefix}-${cutter}-${seq}`;
}

// Clean any legacy mock data on startup so inventory starts completely empty
if (typeof window !== 'undefined') {
  if (!localStorage.getItem('manglar_inventory_cleared_v5')) {
    localStorage.setItem('manglar_works', JSON.stringify([]));
    localStorage.setItem('manglar_copies', JSON.stringify([]));
    localStorage.setItem('manglar_branches', JSON.stringify(INITIAL_BRANCHES));
    localStorage.setItem('manglar_inventory_cleared_v5', 'true');
  }
}

export function clearAllPlatformData(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('manglar_works', JSON.stringify([]));
    localStorage.setItem('manglar_copies', JSON.stringify([]));
    localStorage.setItem('manglar_branches', JSON.stringify(INITIAL_BRANCHES));
    localStorage.setItem('manglar_inventory_cleared_v5', 'true');
  }
}

export function getStoredWorks(): Work[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem('manglar_works');
  if (!saved) {
    localStorage.setItem('manglar_works', JSON.stringify([]));
    return [];
  }
  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

export function getStoredBranches(): Branch[] {
  if (typeof window === 'undefined') return INITIAL_BRANCHES;
  const saved = localStorage.getItem('manglar_branches');
  if (!saved) {
    localStorage.setItem('manglar_branches', JSON.stringify(INITIAL_BRANCHES));
    return INITIAL_BRANCHES;
  }
  try {
    const parsed: Branch[] = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem('manglar_branches', JSON.stringify(INITIAL_BRANCHES));
      return INITIAL_BRANCHES;
    }
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const hasValidIds = parsed.every((b) => uuidRegex.test(b.id));
    if (!hasValidIds) {
      localStorage.setItem('manglar_branches', JSON.stringify(INITIAL_BRANCHES));
      return INITIAL_BRANCHES;
    }
    return parsed;
  } catch {
    return INITIAL_BRANCHES;
  }
}

export function getStoredCopies(): Copy[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem('manglar_copies');
  if (!saved) {
    localStorage.setItem('manglar_copies', JSON.stringify([]));
    return [];
  }
  try {
    const list: Copy[] = JSON.parse(saved);
    if (!Array.isArray(list)) return [];

    let modified = false;
    const cleaned = list.map((c) => {
      let code = c.internal_code;
      if (code && (code.includes('CIM') || code.includes('CIEM'))) {
        modified = true;
        code = code
          .replace(/^CIEM-PRI/i, 'MOS-PRI')
          .replace(/^CIEM-BAC/i, 'MOS-BAC')
          .replace(/^CIEM/i, 'MOS-PRI')
          .replace(/^CIM-PRI/i, 'MOS-PRI')
          .replace(/^CIM-BAC/i, 'MOS-BAC')
          .replace(/^CIM/i, 'MOS-PRI');
      }

      // Upgrade 3-letter Cutter (e.g. MOS-BAC-860-OTE-001 -> MOS-BAC-860-OTEc-001) if work title is present
      if (code && c.work?.title) {
        const match3 = code.match(/^([A-Z]{2,4}-[A-Z0-9]{3,4}-\d{3})-([A-Z]{3})-(\d{3})$/);
        if (match3) {
          const wm = getTitleWorkMark(c.work.title);
          if (wm) {
            code = `${match3[1]}-${match3[2]}${wm}-${match3[3]}`;
            modified = true;
          }
        }
      }

      if (code !== c.internal_code) {
        return { ...c, internal_code: code };
      }
      return c;
    });

    if (modified) {
      localStorage.setItem('manglar_copies', JSON.stringify(cleaned));
    }

    return cleaned;
  } catch {
    return [];
  }
}

export const INITIAL_WORKS: Work[] = [];
export const INITIAL_COPIES: Copy[] = [];

// Helper to fetch live branches from Supabase with fallback
export async function fetchLiveBranches(): Promise<Branch[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('branches').select('*').order('name');
      if (!error && data && data.length > 0) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('manglar_branches', JSON.stringify(data));
        }
        return data;
      }
    } catch {
      // Fall back to stored branches
    }
  }
  return getStoredBranches();
}

// Helper to simulate local store operations and calculate inventory breakdown
export function getWorksWithInventory(
  works: Work[],
  branches: Branch[],
  copies: Copy[]
): WorkWithCopiesCount[] {
  const currentBranches = branches && branches.length > 0 ? branches : INITIAL_BRANCHES;

  return works.map((work) => {
    // Buscar todas las copias asociadas a esta obra
    const workCopies = (copies || []).filter((c) => {
      if (!c) return false;
      if (c.work_id && String(c.work_id).trim() === String(work.id).trim()) return true;
      if (c.work && c.work.id && String(c.work.id).trim() === String(work.id).trim()) return true;
      if (c.work && c.work.title && c.work.title.trim().toLowerCase() === work.title.trim().toLowerCase()) return true;
      return false;
    });

    let assignedCount = 0;

    const copiesByBranch = currentBranches.map((branch) => {
      const branchCopies = workCopies.filter((c) => {
        // Coincidencia exacta de ID
        if (c.branch_id && String(c.branch_id).trim() === String(branch.id).trim()) return true;
        if (c.branch && c.branch.id && String(c.branch.id).trim() === String(branch.id).trim()) return true;
        
        // Coincidencia por nombre de sede
        if (c.branch && c.branch.name && c.branch.name.trim().toLowerCase() === branch.name.trim().toLowerCase()) return true;

        // Coincidencia por prefijo del marbete
        if (c.internal_code) {
          const code = c.internal_code.toUpperCase();
          const bName = branch.name.toLowerCase();
          if ((bName.includes('primaria') || branch.id.endsWith('0001')) && code.startsWith('MOS-PRI')) return true;
          if ((bName.includes('bachillerato') || branch.id.endsWith('0002')) && code.startsWith('MOS-BAC')) return true;
          if (bName.includes('guárico') && code.startsWith('SM-GUA')) return true;
          if (bName.includes('caripe') && code.startsWith('SM-CAR')) return true;
          if (bName.includes('mérida') && code.startsWith('SM-MER')) return true;
          if (bName.includes('delta') && code.startsWith('SM-DEL')) return true;
        }

        return false;
      });

      assignedCount += branchCopies.length;

      return {
        branch_id: branch.id,
        branch_name: branch.name,
        branch_type: branch.type,
        count: branchCopies.length,
        conditions: {
          bueno: branchCopies.filter((c) => c.condition === 'bueno').length,
          regular: branchCopies.filter((c) => c.condition === 'regular').length,
          malo: branchCopies.filter((c) => c.condition === 'malo').length,
        },
      };
    });

    // Si existen copias que no coincidieron con ninguna sede específica, asignarlas a la Sede Central (Primaria/Bachillerato)
    if (workCopies.length > assignedCount) {
      const unassigned = workCopies.length - assignedCount;
      const primaryBranch = copiesByBranch.find((b) => b.branch_type === 'internal') || copiesByBranch[0];
      if (primaryBranch) {
        primaryBranch.count += unassigned;
        primaryBranch.conditions.bueno += unassigned;
      }
    }

    return {
      ...work,
      total_copies: workCopies.length,
      copies_by_branch: copiesByBranch,
    };
  });
}
