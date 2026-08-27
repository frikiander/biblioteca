import React, { useState, useEffect } from 'react';
import { 
  Bookmark, 
  PlusCircle, 
  BookOpen, 
  Trash2, 
  Sparkles, 
  Layers, 
  Search, 
  Share2, 
  ExternalLink, 
  Feather, 
  Trees,
  Check,
  Globe
} from 'lucide-react';
import type { VirtualShelf, Work } from '../../types/database';
import { 
  getStoredShelves, 
  createShelf, 
  deleteShelf, 
  addBookToShelf, 
  removeBookFromShelf, 
  getShelfWithPopulatedWorks 
} from '../../lib/shelves';
import { getStoredWorks } from '../../lib/supabaseClient';

export function VirtualShelvesHub() {
  const [shelves, setShelves] = useState<VirtualShelf[]>([]);
  const [selectedShelf, setSelectedShelf] = useState<VirtualShelf | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [isNewShelfModalOpen, setIsNewShelfModalOpen] = useState<boolean>(false);
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState<boolean>(false);
  const [bookSearchQuery, setBookSearchQuery] = useState<string>('');

  // New Shelf Form
  const [formName, setFormName] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formCategory, setFormCategory] = useState<VirtualShelf['category']>('plan_lector');
  const [formColor, setFormColor] = useState<string>('emerald');

  const refreshShelves = () => {
    const list = getStoredShelves();
    setShelves(list);
    if (selectedShelf) {
      const updatedSelected = list.find((s) => s.id === selectedShelf.id);
      if (updatedSelected) {
        setSelectedShelf(getShelfWithPopulatedWorks(updatedSelected));
      } else if (list.length > 0) {
        setSelectedShelf(getShelfWithPopulatedWorks(list[0]));
      }
    } else if (list.length > 0) {
      setSelectedShelf(getShelfWithPopulatedWorks(list[0]));
    }
  };

  useEffect(() => {
    setWorks(getStoredWorks());
    refreshShelves();
  }, []);

  const handleCreateShelf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const newShelf = createShelf({
      name: formName,
      description: formDescription,
      category: formCategory,
      color: formColor,
      isPublic: true,
    });

    setIsNewShelfModalOpen(false);
    setFormName('');
    setFormDescription('');
    refreshShelves();
    setSelectedShelf(getShelfWithPopulatedWorks(newShelf));
  };

  const handleDeleteShelf = (shelfId: string, name: string) => {
    if (confirm(`¿Eliminar la lista bibliográfica "${name}"?`)) {
      deleteShelf(shelfId);
      refreshShelves();
    }
  };

  const handleAddBook = (workId: string) => {
    if (!selectedShelf) return;
    addBookToShelf(selectedShelf.id, workId);
    refreshShelves();
    setIsAddBookModalOpen(false);
  };

  const handleRemoveBook = (workId: string) => {
    if (!selectedShelf) return;
    removeBookFromShelf(selectedShelf.id, workId);
    refreshShelves();
  };

  const filteredSearchWorks = works.filter((w) => {
    const q = bookSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return w.title.toLowerCase().includes(q) || w.author.toLowerCase().includes(q) || w.dewey_code.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-700 text-white flex items-center justify-center shadow-md shadow-teal-950/20 shrink-0">
            <Bookmark className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                Koha Virtual Shelves
              </span>
              <span className="text-xs text-slate-500">• Listas Curadas & Plan Lector</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
              Estantes Virtuales y Colecciones Destacadas
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mt-1">
              Organiza fondos temáticos, guías de lectura por grado ("Plan Lector 2026") y bibliografía especializada para proyectar en el portal público de la biblioteca.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsNewShelfModalOpen(true)}
          className="px-5 py-3 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-emerald-950/20 transition cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          Nuevo Estante Virtual
        </button>
      </div>

      {/* Main Grid: Left Shelves List, Right Selected Shelf Items */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Shelf Tabs / Cards */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">
            Colecciones Disponibles ({shelves.length})
          </div>

          <div className="space-y-2.5">
            {shelves.map((shelf) => {
              const isSelected = selectedShelf?.id === shelf.id;
              const count = shelf.items?.length || 0;

              return (
                <div
                  key={shelf.id}
                  onClick={() => setSelectedShelf(getShelfWithPopulatedWorks(shelf))}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-800 shadow-md ring-2 ring-emerald-500/50'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                        isSelected ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-100 text-slate-700'
                      }`}>
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold leading-tight line-clamp-1">
                          {shelf.name}
                        </h4>
                        <span className={`text-[10px] uppercase font-semibold ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {shelf.category.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {count} {count === 1 ? 'libro' : 'libros'}
                    </span>
                  </div>

                  <p className={`text-xs mt-2 line-clamp-2 leading-relaxed ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    {shelf.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Shelf Content */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          {selectedShelf ? (
            <>
              {/* Selected Shelf Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {selectedShelf.category.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-emerald-600" />
                      Visible en OPAC Público
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                    {selectedShelf.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    {selectedShelf.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsAddBookModalOpen(true)}
                    className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Añadir Obras
                  </button>

                  <button
                    onClick={() => handleDeleteShelf(selectedShelf.id, selectedShelf.name)}
                    className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition cursor-pointer"
                    title="Eliminar este estante"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Shelf Works Grid */}
              {(!selectedShelf.items || selectedShelf.items.length === 0) ? (
                <div className="py-12 text-center text-slate-400 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600">
                    Este estante virtual aún no tiene libros vinculados.
                  </p>
                  <button
                    onClick={() => setIsAddBookModalOpen(true)}
                    className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl transition cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Seleccionar libros del catálogo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedShelf.items.map((item) => {
                    const work = item.work;
                    if (!work) return null;

                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:shadow-sm transition flex gap-3.5 items-start justify-between"
                      >
                        <div className="flex gap-3 min-w-0">
                          {work.cover_url ? (
                            <img
                              src={work.cover_url}
                              alt={work.title}
                              className="w-12 h-16 object-cover rounded-lg shadow-xs shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-16 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                              <BookOpen className="w-5 h-5" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                              CDD {work.dewey_code}
                            </span>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight mt-1 line-clamp-2">
                              {work.title}
                            </h4>
                            <p className="text-[11px] text-slate-600 truncate mt-0.5">
                              {work.author}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveBook(work.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer shrink-0"
                          title="Remover de esta lista"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="py-16 text-center text-slate-400">
              Selecciona una colección a la izquierda para ver su contenido.
            </div>
          )}
        </div>
      </div>

      {/* Modal: New Virtual Shelf */}
      {isNewShelfModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-emerald-600" />
                Crear Estante Virtual
              </h3>
              <button
                onClick={() => setIsNewShelfModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateShelf} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre de la Colección *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Plan Lector 1er Año 2026"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Categoría</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                >
                  <option value="plan_lector">Plan Lector Curricular</option>
                  <option value="recomendados">Recomendados del Mes</option>
                  <option value="tematica">Fondo Temático Especial</option>
                  <option value="efemerides">Efemérides y Eventos</option>
                  <option value="comunidad">Lecturas Comunitarias</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Descripción / Objetivos</label>
                <textarea
                  rows={3}
                  placeholder="Breve reseña sobre qué contiene este estante y a qué grados va dirigido..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewShelfModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm"
                >
                  Crear Estante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Book to Shelf */}
      {isAddBookModalOpen && selectedShelf && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] p-6 shadow-2xl border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-emerald-600" />
                  Añadir Libros a "{selectedShelf.name}"
                </h3>
                <p className="text-xs text-slate-500">Selecciona los títulos del catálogo para agregarlos a la lista.</p>
              </div>
              <button
                onClick={() => setIsAddBookModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Search Input */}
            <div className="mt-4 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por título, autor o Dewey..."
                value={bookSearchQuery}
                onChange={(e) => setBookSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            {/* Works List */}
            <div className="mt-4 flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredSearchWorks.map((work) => {
                const isAlreadyInShelf = selectedShelf.items?.some((i) => i.work_id === work.id);

                return (
                  <div
                    key={work.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] text-emerald-700 font-bold">
                        CDD {work.dewey_code} • {work.author}
                      </div>
                      <div className="font-bold text-slate-900 truncate">
                        {work.title}
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddBook(work.id)}
                      disabled={isAlreadyInShelf}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer shrink-0 ${
                        isAlreadyInShelf
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-emerald-800 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {isAlreadyInShelf ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Agregado
                        </>
                      ) : (
                        <>
                          <PlusCircle className="w-3.5 h-3.5" />
                          Agregar
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsAddBookModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
