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
export function extractCopyNumber(internalCode?: string, fallbackIndex: number = 1): number {\n  if (!internalCode) return fallbackIndex;\n  const parts = internalCode.trim().split('-');\n  const lastPart = parts[parts.length - 1];\n  const num = parseInt(lastPart, 10);\n  return isNaN(num) ? fallbackIndex : num;\n}\n\nexport function getNextCopySequenceForWork(workId?: string): number {\n  if (!workId) return 1;\n  const copies = getStoredCopies();\n  const workCopies = copies.filter((c) => c.work_id === workId);\n  return workCopies.length + 1;\n}\n\n/**\n * Extrae la letra inicial del título en minúscula según las reglas internacionales de catalogación (Libris / Work mark).\n * Omite artículos iniciales en español, inglés, francés, italiano y alemán.\n */\nexport function getTitleWorkMark(title?: string): string {\n  if (!title || !title.trim()) return '';\n\n  const articles = new Set([\n    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo', 'al', 'del',\n    'the', 'a', 'an',\n    'le', 'la', 'les', 'l', 'un', 'une', 'des', 'du',\n    'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una',\n    'der', 'die', 'das', 'ein', 'eine'\n  ]);\n\n  const cleanTitle = title\n    .normalize('NFD')\n    .replace(/[\\u0300-\\u036f]/g, '')\n    .replace(/[^a-zA-Z0-9\\s]/g, ' ')\n    .trim();\n\n  const words = cleanTitle.split(/\\s+/).filter((w) => w.length > 0);\n  if (words.length === 0) return '';\n\n  let targetWord = words[0];\n  const firstWordClean = targetWord.toLowerCase().replace(/[^a-z0-9]/g, '');\n\n  if (articles.has(firstWordClean) && words.length > 1) {\n    targetWord = words[1];\n  }\n\n  const charOnly = targetWord.toLowerCase().replace(/[^a-z0-9]/g, '');\n  return charOnly.length > 0 ? charOnly.charAt(0) : '';\n}\n\n/**\n * Extrae las 3 letras principales del autor (o título en caso de obras colectivas/anónimas).\n */\nexport function getAuthor3Letters(author?: string, title?: string): string {\n  const cleanStr = (s: string) =>\n    s\n      .normalize('NFD')\n      .replace(/[\\u0300-\\u036f]/g, '')\n      .toUpperCase()\n      .replace(/[^A-Z]/g, '');\n\n  const isAnonymousOrCollective = (authStr?: string): boolean => {\n    if (!authStr || !authStr.trim()) return true;\n    const lower = authStr.toLowerCase().trim();\n    const collectiveTerms = [\n      'varios', 'varios autores', 'aa.vv', 'aa.vv.', 'vv.aa', 'vv.aa.', 'anonimo', 'anónimo',\n      'colectivo', 'editorial', 'equipo', 'santillana', 'larousse', 'oceano', 'océano',\n      'norma', 'sm', 'ninguno', 'desconocido', 'sin autor', 'diversos autores', 'autores varios',\n    ];\n    return collectiveTerms.some((term) => lower === term || lower.startsWith(term + ' ') || lower.startsWith(term + '/'));\n  };\n\n  if (author && !isAnonymousOrCollective(author)) {\n    const particles = new Set(['de', 'la', 'del', 'los', 'las', 'van', 'von', 'da', 'di', 'y', 'd']);\n    const authClean = author.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');\n\n    if (authClean.includes(',')) {\n      const surnamePart = authClean.split(',')[0].trim();\n      const surnameWords = surnamePart.split(/\\s+/).filter((w) => !particles.has(w.toLowerCase().replace(/[^a-z]/g, '')));\n      if (surnameWords.length > 0) {\n        const code = cleanStr(surnameWords[0]).slice(0, 3);\n        if (code.length > 0) return code.padEnd(3, 'X');\n      }\n    }\n\n    const words = authClean.trim().split(/[\\s\\-]+/);\n    const meaningfulWords = words.filter((w) => !particles.has(w.toLowerCase().replace(/[^a-z]/g, '')));\n\n    if (meaningfulWords.length === 1) {\n      const code = cleanStr(meaningfulWords[0]).slice(0, 3);\n      if (code.length > 0) return code.padEnd(3, 'X');\n    } else if (meaningfulWords.length === 2) {\n      const surname = meaningfulWords[1];\n      const code = cleanStr(surname).slice(0, 3);\n      if (code.length > 0) return code.padEnd(3, 'X');\n    } else if (meaningfulWords.length === 3) {\n      const primarySurname = meaningfulWords[1];\n      const code = cleanStr(primarySurname).slice(0, 3);\n      if (code.length > 0) return code.padEnd(3, 'X');\n    } else if (meaningfulWords.length >= 4) {\n      const primarySurname = meaningfulWords[2] || meaningfulWords[1];\n      const code = cleanStr(primarySurname).slice(0, 3);\n      if (code.length > 0) return code.padEnd(3, 'X');\n    }\n  }\n\n  if (title && title.trim()) {\n    const articles = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo', 'the', 'a', 'an', 'le', 'les', 'l']);\n    const titleWords = title.trim().split(/\\s+/);\n    let targetWord = titleWords[0];\n    const cleanFirst = targetWord.toLowerCase().replace(/[^a-z]/g, '');\n    if (articles.has(cleanFirst) && titleWords.length > 1) {\n      targetWord = titleWords[1];\n    }\n    const code = cleanStr(targetWord).slice(0, 3);\n    if (code.length > 0) return code.padEnd(3, 'X');\n  }\n\n  return 'BIB';\n}\n\n/**\n * Código Cutter completo según la regla internacional:\n * 3 letras mayúsculas del apellido del autor + 1 letra minúscula de la primera palabra con significado real del título.\n */\nexport function getAuthorCutterCode(author?: string, title?: string): string {\n  const authorLetters = getAuthor3Letters(author, title);\n  const workMark = getTitleWorkMark(title);\n  return `${authorLetters}${workMark}`;\n}\n\n/**\n * Formatea el código Cutter para su presentación en el tejuelo impreso.\n */\nexport function formatCutterDisplay(authorLetters?: string): string {\n  if (!authorLetters) return 'XXX';\n  const clean = authorLetters.trim();\n  if (/^[A-Z]{3}[a-z]$/.test(clean)) {\n    return `${clean.slice(0, 3)} ${clean.slice(3)}`;\n  }\n  if (/^[A-Z]{3}\\s+[a-z]$/i.test(clean)) {\n    const parts = clean.split(/\\s+/);\n    return `${parts[0].toUpperCase()} ${parts[1].toLowerCase()}`;\n  }\n  if (/^[A-Za-z]{3}$/.test(clean)) {\n    return clean.toUpperCase();\n  }\n  return clean;\n}\n\nexport function generateMarbeteCode(\n  branchNameOrId?: string,\n  deweyCode?: string,\n  authorOrCutter?: string,\n  copySequence?: number | string,\n  title?: string\n): string {\n  const prefix = getBranchCodePrefix(branchNameOrId);\n  const deweyPrefix = deweyCode ? deweyCode.split('.')[0].replace(/[^0-9]/g, '') || '800' : '800';\n\n  let cutter = 'OTEc';\n  if (authorOrCutter && /^[A-Za-z]{3}[a-z]?$/.test(authorOrCutter.trim())) {\n    const raw = authorOrCutter.trim();\n    if (raw.length === 4) {\n      cutter = raw.slice(0, 3).toUpperCase() + raw.charAt(3).toLowerCase();\n    } else if (raw.length === 3) {\n      const workMark = title ? getTitleWorkMark(title) : '';\n      cutter = raw.toUpperCase() + workMark;\n    }\n  } else {\n    cutter = getAuthorCutterCode(authorOrCutter, title);\n  }\n\n  let seq = '001';\n  if (copySequence !== undefined && copySequence !== null && String(copySequence).trim() !== '') {\n    const num = parseInt(String(copySequence), 10);\n    if (!isNaN(num)) {\n      seq = String(num).padStart(3, '0');\n    } else {\n      seq = String(copySequence).padStart(3, '0');\n    }\n  }\n\n  return `${prefix}-${deweyPrefix}-${cutter}-${seq}`;\n}\n\n// Clean any legacy mock data on startup so inventory starts completely empty\nif (typeof window !== 'undefined') {\n  if (!localStorage.getItem('manglar_inventory_cleared_v5')) {\n    localStorage.setItem('manglar_works', JSON.stringify([]));\n    localStorage.setItem('manglar_copies', JSON.stringify([]));\n    localStorage.setItem('manglar_branches', JSON.stringify(INITIAL_BRANCHES));\n    localStorage.setItem('manglar_inventory_cleared_v5', 'true');\n  }\n}\n\nexport function clearAllPlatformData(): void {\n  if (typeof window !== 'undefined') {\n    localStorage.setItem('manglar_works', JSON.stringify([]));\n    localStorage.setItem('manglar_copies', JSON.stringify([]));\n    localStorage.setItem('manglar_branches', JSON.stringify(INITIAL_BRANCHES));\n    localStorage.setItem('manglar_inventory_cleared_v5', 'true');\n  }\n}\n\nexport function getStoredWorks(): Work[] {\n  if (typeof window === 'undefined') return [];\n  const saved = localStorage.getItem('manglar_works');\n  if (!saved) {\n    localStorage.setItem('manglar_works', JSON.stringify([]));\n    return [];\n  }\n  try {\n    return JSON.parse(saved);\n  } catch {\n    return [];\n  }\n}\n\nexport function getStoredBranches(): Branch[] {\n  if (typeof window === 'undefined') return INITIAL_BRANCHES;\n  const saved = localStorage.getItem('manglar_branches');\n  if (!saved) {\n    localStorage.setItem('manglar_branches', JSON.stringify(INITIAL_BRANCHES));\n    return INITIAL_BRANCHES;\n  }\n  try {\n    const parsed: Branch[] = JSON.parse(saved);\n    if (!Array.isArray(parsed) || parsed.length === 0) {\n      localStorage.setItem('manglar_branches', JSON.stringify(INITIAL_BRANCHES));\n      return INITIAL_BRANCHES;\n    }\n    // Validate UUID format\n    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;\n    const hasValidIds = parsed.every((b) => uuidRegex.test(b.id));\n    if (!hasValidIds) {\n      localStorage.setItem('manglar_branches', JSON.stringify(INITIAL_BRANCHES));\n      return INITIAL_BRANCHES;\n    }\n    return parsed;\n  } catch {\n    return INITIAL_BRANCHES;\n  }\n}\n\nexport function getStoredCopies(): Copy[] {\n  if (typeof window === 'undefined') return [];\n  const saved = localStorage.getItem('manglar_copies');\n  if (!saved) {\n    localStorage.setItem('manglar_copies', JSON.stringify([]));\n    return [];\n  }\n  try {\n    const list: Copy[] = JSON.parse(saved);\n    if (!Array.isArray(list)) return [];\n\n    let modified = false;\n    const cleaned = list.map((c) => {\n      let code = c.internal_code;\n      if (code && (code.includes('CIM') || code.includes('CIEM'))) {\n        modified = true;\n        code = code\n          .replace(/^CIEM-PRI/i, 'MOS-PRI')\n          .replace(/^CIEM-BAC/i, 'MOS-BAC')\n          .replace(/^CIEM/i, 'MOS-PRI')\n          .replace(/^CIM-PRI/i, 'MOS-PRI')\n          .replace(/^CIM-BAC/i, 'MOS-BAC')\n          .replace(/^CIM/i, 'MOS-PRI');\n      }\n\n      // Upgrade 3-letter Cutter (e.g. MOS-BAC-860-OTE-001 -> MOS-BAC-860-OTEc-001) if work title is present\n      if (code && c.work?.title) {\n        const match3 = code.match(/^([A-Z]{2,4}-[A-Z0-9]{3,4}-\\d{3})-([A-Z]{3})-(\\d{3})$/);\n        if (match3) {\n          const wm = getTitleWorkMark(c.work.title);\n          if (wm) {\n            code = `${match3[1]}-${match3[2]}${wm}-${match3[3]}`;\n            modified = true;\n          }\n        }\n      }\n\n      if (code !== c.internal_code) {\n        return { ...c, internal_code: code };\n      }\n      return c;\n    });\n\n    if (modified) {\n      localStorage.setItem('manglar_copies', JSON.stringify(cleaned));\n    }\n\n    return cleaned;\n  } catch {\n    return [];\n  }\n}\n\nexport const INITIAL_WORKS: Work[] = [];\nexport const INITIAL_COPIES: Copy[] = [];\n\n// Helper to fetch live branches from Supabase with fallback\nexport async function fetchLiveBranches(): Promise<Branch[]> {\n  if (isSupabaseConfigured && supabase) {\n    try {\n      const { data, error } = await supabase.from('branches').select('*').order('name');\n      if (!error && data && data.length > 0) {\n        if (typeof window !== 'undefined') {\n          localStorage.setItem('manglar_branches', JSON.stringify(data));\n        }\n        return data;\n      }\n    } catch {\n      // Fall back to stored branches\n    }\n  }\n  return getStoredBranches();\n}\n\n// Helper to simulate local store operations and calculate inventory breakdown\nexport function getWorksWithInventory(\n  works: Work[],\n  branches: Branch[],\n  copies: Copy[]\n): WorkWithCopiesCount[] {\n  const currentBranches = branches && branches.length > 0 ? branches : INITIAL_BRANCHES;\n\n  return works.map((work) => {\n    // Buscar todas las copias asociadas a esta obra\n    const workCopies = (copies || []).filter((c) => {\n      if (!c) return false;\n      if (c.work_id && String(c.work_id).trim() === String(work.id).trim()) return true;\n      if (c.work && c.work.id && String(c.work.id).trim() === String(work.id).trim()) return true;\n      if (c.work && c.work.title && c.work.title.trim().toLowerCase() === work.title.trim().toLowerCase()) return true;\n      return false;\n    });\n\n    let assignedCount = 0;\n\n    const copiesByBranch = currentBranches.map((branch) => {\n      const branchCopies = workCopies.filter((c) => {\n        // Coincidencia exacta de ID\n        if (c.branch_id && String(c.branch_id).trim() === String(branch.id).trim()) return true;\n        if (c.branch && c.branch.id && String(c.branch.id).trim() === String(branch.id).trim()) return true;\n        \n        // Coincidencia por nombre de sede\n        if (c.branch && c.branch.name && c.branch.name.trim().toLowerCase() === branch.name.trim().toLowerCase()) return true;\n\n        // Coincidencia por prefijo del marbete\n        if (c.internal_code) {\n          const code = c.internal_code.toUpperCase();\n          const bName = branch.name.toLowerCase();\n          if ((bName.includes('primaria') || branch.id.endsWith('0001')) && code.startsWith('MOS-PRI')) return true;\n          if ((bName.includes('bachillerato') || branch.id.endsWith('0002')) && code.startsWith('MOS-BAC')) return true;\n          if (bName.includes('guárico') && code.startsWith('SM-GUA')) return true;\n          if (bName.includes('caripe') && code.startsWith('SM-CAR')) return true;\n          if (bName.includes('mérida') && code.startsWith('SM-MER')) return true;\n          if (bName.includes('delta') && code.startsWith('SM-DEL')) return true;\n        }\n\n        return false;\n      });\n\n      assignedCount += branchCopies.length;\n\n      return {\n        branch_id: branch.id,\n        branch_name: branch.name,\n        branch_type: branch.type,\n        count: branchCopies.length,\n        conditions: {\n          bueno: branchCopies.filter((c) => c.condition === 'bueno').length,\n          regular: branchCopies.filter((c) => c.condition === 'regular').length,\n          malo: branchCopies.filter((c) => c.condition === 'malo').length,\n        },\n      };\n    });\n\n    // Si existen copias que no coincidieron con ninguna sede específica, asignarlas a la Sede Central (Primaria/Bachillerato)\n    if (workCopies.length > assignedCount) {\n      const unassigned = workCopies.length - assignedCount;\n      const primaryBranch = copiesByBranch.find((b) => b.branch_type === 'internal') || copiesByBranch[0];\n      if (primaryBranch) {\n        primaryBranch.count += unassigned;\n        primaryBranch.conditions.bueno += unassigned;\n      }\n    }\n\n    return {\n      ...work,\n      total_copies: workCopies.length,\n      copies_by_branch: copiesByBranch,\n    };\n  });\n}\n