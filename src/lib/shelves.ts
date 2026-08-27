import type { VirtualShelf, VirtualShelfItem, Work } from '../types/database';
import { getStoredWorks } from './supabaseClient';

export const INITIAL_SHELVES: VirtualShelf[] = [
  {
    id: 'shelf_01',
    name: 'Plan Lector 2026 — Colegio El Manglar',
    description: 'Lecturas curriculares obligatorias y sugeridas para estudiantes de Primaria y Bachillerato.',
    category: 'plan_lector',
    is_public: true,
    color: 'emerald',
    icon: 'BookOpen',
    created_at: '2026-01-10T08:00:00Z',
    items: [],
  },
  {
    id: 'shelf_02',
    name: 'Fondo Especial: Miguel Otero Silva y Literatura Venezolana',
    description: 'Obras cumbre del insigne escritor venezolano epónimo de nuestra biblioteca y autores contemporáneos.',
    category: 'tematica',
    is_public: true,
    color: 'amber',
    icon: 'Feather',
    created_at: '2026-01-10T08:00:00Z',
    items: [],
  },
  {
    id: 'shelf_03',
    name: 'Ecología, Manglares y Biodiversidad del Oriente',
    description: 'Libros de referencia sobre medio ambiente, ecosistemas de manglar y conservación natural.',
    category: 'tematica',
    is_public: true,
    color: 'teal',
    icon: 'Trees',
    created_at: '2026-01-15T08:00:00Z',
    items: [],
  },
  {
    id: 'shelf_04',
    name: 'Primeros Lectores & Álbum Ilustrado',
    description: 'Cuentos y novelas gráficas para fomentar el amor por los libros en preescolar y 1er-3er grado.',
    category: 'recomendados',
    is_public: true,
    color: 'purple',
    icon: 'Sparkles',
    created_at: '2026-01-20T08:00:00Z',
    items: [],
  },
];

export function getStoredShelves(): VirtualShelf[] {
  if (typeof window === 'undefined') return INITIAL_SHELVES;
  const saved = localStorage.getItem('manglar_virtual_shelves');
  if (!saved) {
    localStorage.setItem('manglar_virtual_shelves', JSON.stringify(INITIAL_SHELVES));
    return INITIAL_SHELVES;
  }
  try {
    const parsed: VirtualShelf[] = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_SHELVES;
  } catch {
    return INITIAL_SHELVES;
  }
}

export function saveShelves(shelves: VirtualShelf[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('manglar_virtual_shelves', JSON.stringify(shelves));
  }
}

export function createShelf(params: {
  name: string;
  description: string;
  category: VirtualShelf['category'];
  isPublic?: boolean;
  color?: string;
  icon?: string;
}): VirtualShelf {
  const shelves = getStoredShelves();
  const newShelf: VirtualShelf = {
    id: `shelf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: params.name.trim(),
    description: params.description.trim(),
    category: params.category,
    is_public: params.isPublic ?? true,
    color: params.color || 'emerald',
    icon: params.icon || 'BookOpen',
    created_at: new Date().toISOString(),
    items: [],
  };

  const updated = [newShelf, ...shelves];
  saveShelves(updated);
  return newShelf;
}

export function deleteShelf(shelfId: string): boolean {
  const shelves = getStoredShelves();
  const updated = shelves.filter((s) => s.id !== shelfId);
  saveShelves(updated);
  return true;
}

export function addBookToShelf(shelfId: string, workId: string, notes?: string): boolean {
  const shelves = getStoredShelves();
  const works = getStoredWorks();
  const targetWork = works.find((w) => w.id === workId);
  if (!targetWork) return false;

  const updated = shelves.map((shelf) => {
    if (shelf.id === shelfId) {
      const items = shelf.items || [];
      if (items.some((i) => i.work_id === workId)) {
        return shelf; // already in shelf
      }
      const newItem: VirtualShelfItem = {
        id: `sitem_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        shelf_id: shelfId,
        work_id: workId,
        work: targetWork,
        added_at: new Date().toISOString(),
        notes: notes?.trim(),
      };
      return {
        ...shelf,
        items: [newItem, ...items],
        items_count: items.length + 1,
      };
    }
    return shelf;
  });

  saveShelves(updated);
  return true;
}

export function removeBookFromShelf(shelfId: string, workId: string): boolean {
  const shelves = getStoredShelves();
  const updated = shelves.map((shelf) => {
    if (shelf.id === shelfId) {
      const items = (shelf.items || []).filter((i) => i.work_id !== workId);
      return {
        ...shelf,
        items,
        items_count: items.length,
      };
    }
    return shelf;
  });
  saveShelves(updated);
  return true;
}

export function getShelfWithPopulatedWorks(shelf: VirtualShelf): VirtualShelf {
  const works = getStoredWorks();
  const populatedItems = (shelf.items || []).map((item) => {
    const w = works.find((work) => work.id === item.work_id) || item.work;
    return {
      ...item,
      work: w,
    };
  });

  return {
    ...shelf,
    items: populatedItems,
    items_count: populatedItems.length,
  };
}
