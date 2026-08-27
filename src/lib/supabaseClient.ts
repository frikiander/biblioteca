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

// Initial curated store for Colegio Integral El Manglar
export const INITIAL_BRANCHES: Branch[] = [
  {
    id: 'b_primaria',
    name: 'Biblioteca Miguel Otero Silva - Primaria',
    type: 'internal',
    location: 'Campus Principal, Módulo de Primaria',
    description: 'Fondo bibliográfico infantil, primeros lectores y colección formativa de educación primaria.',
  },
  {
    id: 'b_bachillerato',
    name: 'Biblioteca Miguel Otero Silva - Bachillerato',
    type: 'internal',
    location: 'Campus Principal, Edificio Central de Bachillerato',
    description: 'Colección general, humanidades, ciencias, referencia y sala de estudio para educación media y diversificada.',
  },
  {
    id: 'b_guarico',
    name: 'Semilla Manglareña - Guárico',
    type: 'external_donation',
    location: 'Estado Guárico, Escuelas Rurales de Los Llanos',
    description: 'Núcleo social de dotación y biblioteca comunitaria satélite en escuelas llaneras.',
  },
  {
    id: 'b_caripe',
    name: 'Semilla Manglareña - Caripe',
    type: 'external_donation',
    location: 'Caripe del Guácharo, Estado Monagas',
    description: 'Módulo de lectura y dotación escolar en comunidades de la zona montañosa de Caripe.',
  },
  {
    id: 'b_merida',
    name: 'Semilla Manglareña - Mérida',
    type: 'external_donation',
    location: 'Estado Mérida, Zona Andina',
    description: 'Biblioteca satélite rural para fomento del hábito lector en escuelas andinas.',
  },
  {
    id: 'b_delta',
    name: 'Semilla Manglareña - Delta',
    type: 'external_donation',
    location: 'Delta Amacuro, Comunidades Fluviales',
    description: 'Dotación bibliográfica y material educativo para centros escolares ribereños del Delta.',
  },
];

export function getBranchCodePrefix(branchNameOrId?: string): string {
  if (!branchNameOrId) return 'MOS-BAC';
  const lower = branchNameOrId.toLowerCase().trim();
  
  // Specific match for 6 branches
  if (lower.includes('primaria') || lower === 'b_primaria') return 'MOS-PRI';
  if (lower.includes('bachillerato') || lower === 'b_bachillerato') return 'MOS-BAC';
  if (lower.includes('guárico') || lower.includes('guarico') || lower === 'b_guarico') return 'SM-GUA';
  if (lower.includes('caripe') || lower === 'b_caripe') return 'SM-CAR';
  if (lower.includes('mérida') || lower.includes('merida') || lower === 'b_merida') return 'SM-MER';
  if (lower.includes('delta') || lower === 'b_delta') return 'SM-DEL';
  
  // Fallbacks
  if (lower.includes('semilla')) return 'SM-GUA';
  return 'MOS-BAC';
}

export function getNextCopySequenceForWork(workId?: string): number {
  if (!workId) return 1;
  const copies = getStoredCopies();
  const workCopies = copies.filter((c) => c.work_id === workId);
  return workCopies.length + 1;
}

export function getAuthorCutterCode(author?: string, title?: string): string {
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
      'varios',
      'varios autores',
      'aa.vv',
      'aa.vv.',
      'vv.aa',
      'vv.aa.',
      'anonimo',
      'anónimo',
      'colectivo',
      'editorial',
      'equipo',
      'santillana',
      'larousse',
      'oceano',
      'océano',
      'norma',
      'sm',
      'ninguno',
      'desconocido',
      'sin autor',
      'diversos autores',
      'autores varios',
    ];
    return collectiveTerms.some((term) => lower === term || lower.startsWith(term + ' ') || lower.startsWith(term + '/'));
  };

  // 1. Author-based Cutter (3 letters from primary surname)
  if (author && !isAnonymousOrCollective(author)) {
    const particles = new Set(['de', 'la', 'del', 'los', 'las', 'van', 'von', 'da', 'di', 'y', 'd']);

    // Check if name is formatted "Surname, Name"
    if (author.includes(',')) {
      const surnamePart = author.split(',')[0].trim();
      const surnameWords = surnamePart.split(/\s+/).filter((w) => !particles.has(w.toLowerCase()));
      if (surnameWords.length > 0) {
        const code = cleanStr(surnameWords[0]).slice(0, 3);
        if (code.length > 0) return code.padEnd(3, 'X');
      }
    }

    const words = author.trim().split(/\s+/);
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

  // 2. Golden Rule: Entry by Title, omit initial articles
  if (title && title.trim()) {
    const articles = new Set([
      'el',
      'la',
      'los',
      'las',
      'un',
      'una',
      'unos',
      'unas',
      'lo',
      'the',
      'a',
      'an',
      'le',
      'les',
      'l',
      'der',
      'die',
      'das',
    ]);

    const titleWords = title.trim().split(/\s+/);
    let targetWord = titleWords[0];

    const cleanFirstWord = targetWord.toLowerCase().replace(/[^a-z]/g, '');
    if (articles.has(cleanFirstWord) && titleWords.length > 1) {
      targetWord = titleWords[1];
    }

    const code = cleanStr(targetWord).slice(0, 3);
    if (code.length > 0) return code.padEnd(3, 'X');
  }

  return 'BIB';
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

  let cutter = 'OTE';
  if (authorOrCutter && authorOrCutter.trim().length === 3 && /^[A-Za-z]{3}$/.test(authorOrCutter.trim())) {
    cutter = authorOrCutter.trim().toUpperCase();
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

if (typeof window !== 'undefined') {
  if (!localStorage.getItem('manglar_inventory_cleared_v4')) {
    localStorage.setItem('manglar_works', JSON.stringify([]));
    localStorage.setItem('manglar_copies', JSON.stringify([]));
    localStorage.setItem('manglar_inventory_cleared_v4', 'true');
  }
}

export function clearAllPlatformData(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('manglar_works', JSON.stringify([]));
    localStorage.setItem('manglar_copies', JSON.stringify([]));
    localStorage.setItem('manglar_inventory_cleared_v4', 'true');
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
    const hasAllSix = INITIAL_BRANCHES.every((ib) => parsed.some((pb) => pb.id === ib.id || pb.name === ib.name));
    if (!hasAllSix || parsed.length < 6) {
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
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

export const INITIAL_WORKS: Work[] = [];
export const INITIAL_COPIES: Copy[] = [];

export function getWorksWithInventory(
  works: Work[],
  branches: Branch[],
  copies: Copy[]
): WorkWithCopiesCount[] {
  return works.map((work) => {
    const workCopies = copies.filter((c) => c.work_id === work.id);
    const copiesByBranch = branches.map((branch) => {
      const branchCopies = workCopies.filter((c) => c.branch_id === branch.id);
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

    return {
      ...work,
      total_copies: workCopies.length,
      copies_by_branch: copiesByBranch,
    };
  });
}
