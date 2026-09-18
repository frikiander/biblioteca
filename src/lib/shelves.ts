import type { VirtualShelf, VirtualShelfItem, Work } from '../types/database';
import { getStoredWorks, supabase, isSupabaseConfigured } from './supabaseClient';

export const INITIAL_SHELVES: VirtualShelf[] = [];

export function getStoredShelves(): VirtualShelf[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem('manglar_virtual_shelves');
  if (!saved) {
    localStorage.setItem('manglar_virtual_shelves', JSON.stringify([]));
    return [];
  }
  try {
    const parsed: VirtualShelf[] = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
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

export async function deleteShelf(shelfId: string): Promise<boolean> {
  const shelves = getStoredShelves();
  const updated = shelves.filter((s) => s.id !== shelfId);
  saveShelves(updated);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(shelfId);
  if (isUuid && isSupabaseConfigured && supabase) {
    try {
      await (supabase as any).from('virtual_shelf_items').delete().eq('shelf_id', shelfId);
      await (supabase as any).from('virtual_shelves').delete().eq('id', shelfId);
    } catch (err) {
      console.warn('Error eliminando estante en Supabase:', err);
    }
  }

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
