'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  BookPlus, 
  Sparkles, 
  Layers, 
  Building2, 
  Barcode, 
  CheckCircle2, 
  AlertCircle, 
  Image as ImageIcon,
  Tag,
  Calendar,
  Compass,
  FileText,
  BookmarkCheck,
  Hash,
  Plus,
  Trash2,
  Copy as CopyIcon,
  RotateCcw,
  Check,
  School,
  MapPin,
  Search,
  Loader2,
  ArrowRight,
  Edit3,
  Globe,
  BookOpen,
  ExternalLink
} from 'lucide-react';
import type { Work, Branch, Copy, CopyCondition } from '../../types/database';
import { 
  supabase, 
  isSupabaseConfigured, 
  INITIAL_BRANCHES, 
  INITIAL_WORKS, 
  INITIAL_COPIES, 
  getStoredBranches, 
  getBranchCodePrefix, 
  generateMarbeteCode,
  getStoredCopies 
} from '../../lib/supabaseClient';
import { DEWEY_GROUPS, getDeweyInfo } from '../../lib/dewey';
import { 
  fetchBookDataCascade, 
  BookData, 
  GoogleBooksRateLimitError, 
  GoogleBooksServiceUnavailableError,
  isGoogleBooksApiKeyConfigured 
} from '../../lib/googleBooks';

interface RegisterWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkCreated: (newWork: Work, newCopiesCount: number) => void;
}

export interface InitialCopyDraft {
  id: string; // Unique local draft ID
  branch_id: string;
  condition: CopyCondition;
  internal_code: string;
  notes: string;
}

const SAMPLE_COVERS = [
  { label: 'Literatura Clásica', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600' },
  { label: 'Historia & Ensayo', url: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&q=80&w=600' },
  { label: 'Ciencias & Naturaleza', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=600' },
  { label: 'Infantil / Juvenil', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80&w=600' },
  { label: 'Educación & Arte', url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=600' },
];

const QUICK_TEST_ISBNS = [
  { label: 'Cien Años de Soledad', isbn: '9788437604947' },
  { label: 'Don Quijote', isbn: '9788424115104' },
  { label: 'El Principito', isbn: '9780156013987' },
  { label: 'Doña Bárbara', isbn: '9788437608242' },
  { label: 'Rayuela', isbn: '9788437604572' },
];

export const RegisterWorkModal: React.FC<RegisterWorkModalProps> = ({
  isOpen,
  onClose,
  onWorkCreated,
}) => {
  // Modal Step: 'isbn_lookup' (initial entry) | 'form' (autofilled or manual entry)
  const [currentStep, setCurrentStep] = useState<'isbn_lookup' | 'form'>('isbn_lookup');

  // ISBN search query state
  const [searchIsbnInput, setSearchIsbnInput] = useState('');
  const [isSearchingGoogle, setIsSearchingGoogle] = useState(false);
  const [searchLookupError, setSearchLookupError] = useState<string | null>(null);
  const [dataOrigin, setDataOrigin] = useState<'cascade' | 'google_books' | 'open_library' | 'manual'>('manual');
  const [cddCategory, setCddCategory] = useState<string>('');

  // Form State for Work (Dublin Core + CDD)
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [deweyCode, setDeweyCode] = useState('860');
  const [publisher, setPublisher] = useState('');
  const [publicationYear, setPublicationYear] = useState<number>(new Date().getFullYear());
  const [language, setLanguage] = useState('spa');
  const [description, setDescription] = useState('');
  const [subjectTag, setSubjectTag] = useState('');
  const [subjects, setSubjects] = useState<string[]>(['Literatura Venezolana', 'Biblioteca Escolar']);
  const [coverUrl, setCoverUrl] = useState(SAMPLE_COVERS[0].url);

  // Available Branches
  const [branches, setBranches] = useState<Branch[]>(() => {
    return getStoredBranches();
  });

  // Initial Copies Provisioning (Individual Configuration)
  const [createInitialCopies, setCreateInitialCopies] = useState<boolean>(true);

  // Helper to generate smart internal codes based on branch, dewey, author cutter and sequence
  const generateSuggestedCode = (branchId: string, customDewey: string, indexOffset: number = 1) => {
    const branch = branches.find((b) => b.id === branchId || b.name === branchId) || branches[0];
    return generateMarbeteCode(branch?.name || branch?.id, customDewey, author, indexOffset, title);
  };

  const [initialCopies, setInitialCopies] = useState<InitialCopyDraft[]>([
    {
      id: 'draft_1',
      branch_id: INITIAL_BRANCHES[0]?.id || '00000000-0000-4000-a000-000000000001',
      condition: 'bueno',
      internal_code: generateMarbeteCode(INITIAL_BRANCHES[0]?.name || 'Primaria', '860', 'OTE', 1, 'Casas Muertas'),
      notes: 'Ejemplar #1 - Biblioteca Miguel Otero Silva (Primaria)',
    },
    {
      id: 'draft_2',
      branch_id: INITIAL_BRANCHES[1]?.id || '00000000-0000-4000-a000-000000000002',
      condition: 'bueno',
      internal_code: generateMarbeteCode(INITIAL_BRANCHES[1]?.name || 'Bachillerato', '860', 'OTE', 2, 'Casas Muertas'),
      notes: 'Ejemplar #2 - Biblioteca Miguel Otero Silva (Bachillerato)',
    },
  ]);

  // Loading & Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('isbn_lookup');
      setSearchIsbnInput('');
      setSearchLookupError(null);
      setFormError(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  // Load branches from Supabase if configured
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase
        .from('branches')
        .select('*')
        .order('name')
        .then(({ data }) => {
          if (data && data.length > 0) {
            setBranches(data);
            setInitialCopies((prev) =>
              prev.map((c, idx) => {
                const matchedBranch = data[idx % data.length];
                return {
                  ...c,
                  branch_id: matchedBranch.id,
                };
              })
            );
          }
        });
    }
  }, []);

  if (!isOpen) return null;

  const currentDewey = getDeweyInfo(deweyCode);

  // Apply autofilled metadata from Google Books + Open Library Cascade
  const applyAutofilledMetadata = (meta: BookData) => {
    setTitle(meta.title);
    setAuthor(meta.creator || (meta.authors && meta.authors.join(', ')) || 'Autor Desconocido');
    setIsbn(meta.isbn);
    setPublisher(meta.publisher);
    setPublicationYear(typeof meta.publishYear === 'number' ? meta.publishYear : parseInt(String(meta.publishYear), 10) || new Date().getFullYear());
    setDescription(meta.description);
    setSubjects(meta.subjects && meta.subjects.length > 0 ? meta.subjects : ['Literatura General']);
    setCoverUrl(meta.coverUrl || SAMPLE_COVERS[0].url);
    setLanguage(meta.language || 'spa');
    setCddCategory(meta.cddCategory || '');
    const assignedDewey = meta.suggestedDeweyCode || '860';
    setDeweyCode(assignedDewey);
    setDataOrigin(meta.source || 'cascade');

    // Update suggested marbetes for the copies with the new Dewey code and author/title
    setInitialCopies((prev) =>
      prev.map((c, idx) => {
        const branch = branches.find((b) => b.id === c.branch_id);
        return {
          ...c,
          internal_code: generateMarbeteCode(branch?.name || branch?.id, assignedDewey, meta.creator, idx + 1, meta.title),
        };
      })
    );

    setCurrentStep('form');
  };

  // Cascade API Search handler (Google Books + Open Library concurrent)
  const handlePerformGoogleSearch = async (isbnToSearch?: string) => {
    const rawTarget = isbnToSearch || searchIsbnInput;
    const clean = rawTarget.replace(/[^0-9X]/gi, '').trim();

    if (!clean) {
      setSearchLookupError('Por favor ingresa un código ISBN (10 o 13 dígitos).');
      return;
    }

    if (clean.length !== 10 && clean.length !== 13) {
      setSearchLookupError('El ISBN debe contener 10 o 13 dígitos (ej: 9788437604947).');
      return;
    }

    setIsSearchingGoogle(true);
    setSearchLookupError(null);

    try {
      const bookData = await fetchBookDataCascade(clean);

      if (!bookData) {
        setSearchLookupError(
          `No se encontró información para el ISBN "${rawTarget}" en los catálogos en línea (Google Books ni Open Library). Puedes verificar el código o continuar con la carga manual.`
        );
        return;
      }

      applyAutofilledMetadata(bookData);
    } catch (err: unknown) {
      if (err instanceof GoogleBooksRateLimitError) {
        setSearchLookupError(
          '⚠️ Límite de solicitudes alcanzado en Google Books API (HTTP 429). Por favor espera un momento antes de consultar nuevamente o procede con la carga manual.'
        );
      } else if (err instanceof GoogleBooksServiceUnavailableError) {
        setSearchLookupError(
          '⚠️ El servidor de Google Books API reportó sobrecarga o indisponibilidad temporal (HTTP 503). Puedes reintentar en unos momentos o proceder directamente con la carga manual.'
        );
      } else {
        const msg = err instanceof Error ? err.message : 'Error al consultar los servicios bibliográficos.';
        setSearchLookupError(msg);
      }
    } finally {
      setIsSearchingGoogle(false);
    }
  };

  // Skip to manual entry
  const handleProceedToManual = () => {
    setDataOrigin('manual');
    setIsbn(searchIsbnInput.trim());
    setCurrentStep('form');
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setInitialCopies((prev) =>
      prev.map((c, idx) => {
        const branch = branches.find((b) => b.id === c.branch_id);
        return {
          ...c,
          internal_code: generateMarbeteCode(branch?.name || branch?.id, deweyCode, author, idx + 1, newTitle),
        };
      })
    );
  };

  const handleAuthorChange = (newAuthor: string) => {
    setAuthor(newAuthor);
    setInitialCopies((prev) =>
      prev.map((c, idx) => {
        const branch = branches.find((b) => b.id === c.branch_id);
        return {
          ...c,
          internal_code: generateMarbeteCode(branch?.name || branch?.id, deweyCode, newAuthor, idx + 1, title),
        };
      })
    );
  };

  const handleDeweyCodeChange = (newCode: string) => {
    setDeweyCode(newCode);
    // Update marbete codes for draft copies dynamically
    setInitialCopies((prev) =>
      prev.map((c, idx) => {
        const branch = branches.find((b) => b.id === c.branch_id);
        return {
          ...c,
          internal_code: generateMarbeteCode(branch?.name || branch?.id, newCode, author, idx + 1, title),
        };
      })
    );
  };

  const handleAddSubject = () => {
    const trimmed = subjectTag.trim();
    if (trimmed && !subjects.includes(trimmed)) {
      setSubjects([...subjects, trimmed]);
      setSubjectTag('');
    }
  };

  const handleRemoveSubject = (tag: string) => {
    setSubjects(subjects.filter((s) => s !== tag));
  };

  // --- Copy Management Handlers ---

  const handleAddCopy = (targetBranchId?: string) => {
    const targetBranch = targetBranchId
      ? branches.find((b) => b.id === targetBranchId) || branches[0]
      : branches[0];

    const newDraftId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newCode = generateSuggestedCode(targetBranch.id, deweyCode, initialCopies.length + 1);

    const isExternal = targetBranch.type === 'external_donation';
    const defaultNotes = isExternal
      ? `Ejemplar #${initialCopies.length + 1} - Dotación social para ${targetBranch.name}`
      : `Ejemplar #${initialCopies.length + 1} - Colección General`;

    setInitialCopies([
      ...initialCopies,
      {
        id: newDraftId,
        branch_id: targetBranch.id,
        condition: 'bueno',
        internal_code: newCode,
        notes: defaultNotes,
      },
    ]);
  };

  const handleDuplicateCopy = (copyToClone: InitialCopyDraft) => {
    const newDraftId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const branch = branches.find((b) => b.id === copyToClone.branch_id) || branches[0];
    const newSeq = initialCopies.length + 1;
    const newCode = generateMarbeteCode(branch.name || branch.id, deweyCode, author, newSeq, title);

    setInitialCopies([
      ...initialCopies,
      {
        ...copyToClone,
        id: newDraftId,
        internal_code: newCode,
        notes: `${copyToClone.notes} (Copia #${newSeq})`,
      },
    ]);
  };

  const handleRemoveCopy = (draftId: string) => {
    setInitialCopies(initialCopies.filter((c) => c.id !== draftId));
  };

  const handleUpdateCopy = (draftId: string, field: keyof InitialCopyDraft, value: string) => {
    setInitialCopies(
      initialCopies.map((copy, idx) => {
        if (copy.id !== draftId) return copy;

        if (field === 'branch_id') {
          const branch = branches.find((b) => b.id === value);
          const updatedCode = generateMarbeteCode(branch?.name || branch?.id || value, deweyCode, author, idx + 1, title);
          return {
            ...copy,
            branch_id: value,
            internal_code: updatedCode,
          };
        }

        return {
          ...copy,
          [field]: value,
        };
      })
    );
  };

  const handleRegenerateCode = (draftId: string) => {
    setInitialCopies(
      initialCopies.map((copy, idx) => {
        if (copy.id !== draftId) return copy;
        const branch = branches.find((b) => b.id === copy.branch_id) || branches[0];
        return {
          ...copy,
          internal_code: generateMarbeteCode(branch.name || branch.id, deweyCode, author, idx + 1, title),
        };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    // Validate Basic Work Info
    if (!title.trim()) {
      setFormError('El título de la obra es obligatorio.');
      return;
    }
    if (!author.trim()) {
      setFormError('El autor o creador de la obra es obligatorio.');
      return;
    }
    if (!deweyCode.trim()) {
      setFormError('La clasificación Decimal Dewey (CDD) es obligatoria.');
      return;
    }

    // Validate Individual Copies if enabled
    if (createInitialCopies && initialCopies.length > 0) {
      const codeSet = new Set<string>();
      for (let i = 0; i < initialCopies.length; i++) {
        const c = initialCopies[i];
        const trimmedCode = c.internal_code.trim();
        if (!trimmedCode) {
          setFormError(`El ejemplar #${i + 1} no tiene un código marbete asignado.`);
          return;
        }
        if (codeSet.has(trimmedCode)) {
          setFormError(`El código marbete "${trimmedCode}" está duplicado en la lista de ejemplares.`);
          return;
        }
        codeSet.add(trimmedCode);
      }
    }

    setIsSubmitting(true);

    try {
      const newWorkId = 'w_' + Date.now();
      const cleanedIsbn = isbn.trim() || 'Sin ISBN';

      const workPayload: Work = {
        id: newWorkId,
        title: title.trim(),
        author: author.trim(),
        isbn: cleanedIsbn,
        dewey_code: deweyCode.trim(),
        cover_url: coverUrl.trim() || SAMPLE_COVERS[0].url,
        publisher: publisher.trim() || 'Editorial Colegio Integral El Manglar',
        publication_year: Number(publicationYear) || new Date().getFullYear(),
        subjects: subjects.length > 0 ? subjects : ['General'],
        description: description.trim() || 'Ficha catalogada bajo el estándar Dublin Core simplificado y CDD.',
        language: language || 'spa',
        created_at: new Date().toISOString(),
      };

      let generatedCopiesCount = 0;

      if (isSupabaseConfigured && supabase) {
        // 1. Insert Work in Supabase
        const { data: insertedWork, error: workInsertError } = await (supabase as any)
          .from('works')
          .insert({
            title: workPayload.title,
            author: workPayload.author,
            isbn: workPayload.isbn,
            dewey_code: workPayload.dewey_code,
            cover_url: workPayload.cover_url,
            publisher: workPayload.publisher,
            publication_year: workPayload.publication_year,
            subjects: workPayload.subjects,
            description: workPayload.description,
            language: workPayload.language,
          })
          .select()
          .single();

        if (workInsertError) {
          throw new Error(`Error en Supabase al registrar obra: ${workInsertError.message}`);
        }

        const realWorkId = insertedWork.id;
        workPayload.id = realWorkId;

        // 2. Insert individual copies if configured
        if (createInitialCopies && initialCopies.length > 0) {
          const copiesToInsert = initialCopies.map((draft) => {
            const branch = branches.find((b) => b.id === draft.branch_id || b.name === draft.branch_id) || branches[0];
            const isExternal = branch?.type === 'external_donation';
            return {
              work_id: realWorkId,
              branch_id: branch?.id || draft.branch_id,
              condition: draft.condition,
              internal_code: draft.internal_code.trim(),
              status: isExternal ? 'en_donacion' : 'disponible',
              notes: draft.notes.trim() || `Ejemplar registrado durante catalogación universal. Sede: ${branch?.name || 'Central'}.`,
            };
          });

          const { error: copiesError } = await (supabase as any)
            .from('copies')
            .insert(copiesToInsert);

          if (copiesError) {
            console.error('Error insertando ejemplares en Supabase:', copiesError);
            throw new Error(`Obra creada pero ocurrió un error al registrar los ejemplares: ${copiesError.message}`);
          } else {
            generatedCopiesCount = copiesToInsert.length;
          }
        }
      } else {
        // Local persistence fallback
        const savedWorks = localStorage.getItem('manglar_works');
        const currentWorks: Work[] = savedWorks ? JSON.parse(savedWorks) : INITIAL_WORKS;
        const updatedWorks = [workPayload, ...currentWorks];
        localStorage.setItem('manglar_works', JSON.stringify(updatedWorks));

        if (createInitialCopies && initialCopies.length > 0) {
          const savedCopies = localStorage.getItem('manglar_copies');
          const currentCopies: Copy[] = savedCopies ? JSON.parse(savedCopies) : INITIAL_COPIES;

          const newCopies: Copy[] = initialCopies.map((draft, idx) => {
            const branch = branches.find((b) => b.id === draft.branch_id) || branches[0];
            const isExternal = branch.type === 'external_donation';
            return {
              id: `c_${Date.now()}_${idx + 1}`,
              work_id: workPayload.id,
              branch_id: draft.branch_id,
              condition: draft.condition,
              internal_code: draft.internal_code.trim(),
              status: isExternal ? 'en_donacion' : 'disponible',
              notes: draft.notes.trim() || `Ejemplar catalogado individualmente. Ubicación: ${branch.name}.`,
              created_at: new Date().toISOString(),
              work: workPayload,
              branch: branch,
            };
          });

          localStorage.setItem('manglar_copies', JSON.stringify([...newCopies, ...currentCopies]));
          generatedCopiesCount = newCopies.length;
        }
      }

      setSuccessMessage(
        `¡Obra "${workPayload.title}" catalogada exitosamente con ${generatedCopiesCount} ${
          generatedCopiesCount === 1 ? 'ejemplar individual' : 'ejemplares individuales'
        }!`
      );

      setTimeout(() => {
        onWorkCreated(workPayload, generatedCopiesCount);
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al guardar la obra.';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metric summaries for the individual copies
  const centralDraftCount = initialCopies.filter((c) => {
    const b = branches.find((br) => br.id === c.branch_id);
    return b?.type === 'internal';
  }).length;

  const donationDraftCount = initialCopies.filter((c) => {
    const b = branches.find((br) => br.id === c.branch_id);
    return b?.type === 'external_donation';
  }).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        id="register-work-modal"
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-4 sm:my-6"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center shadow-inner">
              <BookPlus className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  Colegio Integral El Manglar
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  {currentStep === 'isbn_lookup' ? 'Paso 1: Consulta ISBN' : 'Paso 2: Ficha y Ejemplares'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                {currentStep === 'isbn_lookup'
                  ? 'Ingreso de Nueva Obra — Búsqueda por ISBN'
                  : 'Catalogar Nueva Obra y Ejemplares Físicos'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: ISBN LOOKUP STEP */}
        {currentStep === 'isbn_lookup' && (
          <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 mx-auto flex items-center justify-center shadow-sm">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Ingresa el ISBN del libro
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                Consultaremos concurrentemente <strong>Google Books API</strong> y <strong>Open Library</strong> para extraer título, autor, editorial, sinopsis y clasificación Dewey (CDD).
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                {isGoogleBooksApiKeyConfigured ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200 shadow-xs">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    Google Books + Open Library Conectados
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200">
                    <Globe className="w-3 h-3 text-slate-500" />
                    Búsqueda Dual Pública (Google Books + Open Library)
                  </span>
                )}
              </div>
            </div>

            {/* Error Message */}
            {searchLookupError && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-2 flex-1">
                  <p className="font-semibold">{searchLookupError}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleProceedToManual}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg font-bold text-xs transition cursor-pointer shadow-2xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Proceder con Carga Manual ahora
                    </button>
                    {searchIsbnInput.trim() && (
                      <a
                        href={`https://www.todostuslibros.com/busquedas?keyword=${encodeURIComponent(searchIsbnInput.trim())}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-amber-300 rounded-lg font-medium text-xs transition"
                      >
                        <span>Buscar en TodosTusLibros</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Search Input Box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handlePerformGoogleSearch();
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Código ISBN (10 o 13 dígitos)
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400">
                    <Barcode className="w-5 h-5" />
                  </div>
                  <input
                    id="search-isbn-input"
                    type="text"
                    autoFocus
                    value={searchIsbnInput}
                    onChange={(e) => setSearchIsbnInput(e.target.value)}
                    placeholder="Ej: 9788437604947 o 978-980-01-0189-6"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-base font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  id="search-google-books-btn"
                  type="submit"
                  disabled={isSearchingGoogle || !searchIsbnInput.trim()}
                  className="w-full sm:flex-1 py-3.5 px-5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white rounded-2xl font-bold text-sm shadow-md shadow-emerald-950/20 transition flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  {isSearchingGoogle ? (\n                    <>\n                      <Loader2 className=\"w-5 h-5 animate-spin text-emerald-300\" />\n                      <span>Consultando catálogos en cascada...</span>\n                    </>\n                  ) : (\n                    <>\n                      <Globe className=\"w-4 h-4 text-emerald-300\" />\n                      <span>Buscar en Cascada (Google + Open Library)</span>\n                      <ArrowRight className=\"w-4 h-4\" />\n                    </>\n                  )}\n                </button>\n\n                <button\n                  type=\"button\"\n                  onClick={handleProceedToManual}\n                  disabled={isSearchingGoogle}\n                  className=\"w-full sm:w-auto py-3.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer border border-slate-200\"\n                >\n                  <Edit3 className=\"w-4 h-4 text-slate-500\" />\n                  <span>Carga Manual (Sin ISBN)</span>\n                </button>\n              </div>\n            </form>\n\n            {/* Quick Test ISBN Presets */}\n            <div className=\"pt-4 border-t border-slate-100 space-y-2\">\n              <span className=\"text-[11px] font-bold uppercase tracking-wider text-slate-400 block text-center sm:text-left\">\n                Ejemplos rápidos para prueba:\n              </span>\n              <div className=\"flex flex-wrap gap-2 justify-center sm:justify-start\">\n                {QUICK_TEST_ISBNS.map((item) => (\n                  <button\n                    key={item.isbn}\n                    type=\"button\"\n                    onClick={() => {\n                      setSearchIsbnInput(item.isbn);\n                      handlePerformGoogleSearch(item.isbn);\n                    }}\n                    className=\"px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-200 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-700 transition flex items-center gap-1.5 cursor-pointer\"\n                  >\n                    <BookOpen className=\"w-3 h-3 text-slate-400\" />\n                    <span>{item.label}</span>\n                    <span className=\"font-mono text-[10px] text-slate-400\">({item.isbn.slice(-4)})</span>\n                  </button>\n                ))}\n              </div>\n            </div>\n          </div>\n        )}\n\n        {/* STEP 2: FULL METADATA & INDIVIDUAL COPIES FORM */}\n        {currentStep === 'form' && (\n          <form onSubmit={handleSubmit} className=\"flex-1 overflow-y-auto p-5 sm:p-6 space-y-6\">\n            {/* Origin Banner */}\n            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${\n              dataOrigin === 'cascade' || dataOrigin === 'google_books' || dataOrigin === 'open_library'\n                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'\n                : 'bg-slate-50 border-slate-200 text-slate-700'\n            }`}>\n              <div className=\"flex items-center gap-2.5\">\n                {dataOrigin === 'cascade' || dataOrigin === 'google_books' || dataOrigin === 'open_library' ? (\n                  <Sparkles className=\"w-5 h-5 text-emerald-600 shrink-0\" />\n                ) : (\n                  <Edit3 className=\"w-5 h-5 text-slate-500 shrink-0\" />\n                )}\n                <div>\n                  <span className=\"font-bold block\">\n                    {dataOrigin === 'cascade'\n                      ? '✨ Datos combinados en cascada (Google Books + Open Library CDD)'\n                      : dataOrigin === 'google_books'\n                      ? '✨ Datos autocompletados desde Google Books API'\n                      : dataOrigin === 'open_library'\n                      ? '✨ Datos autocompletados desde Open Library'\n                      : '📝 Modo de Carga Manual'}\n                  </span>\n                  <span className=\"text-[11px] opacity-80\">\n                    {cddCategory\n                      ? `Clasificación CDD detectada en Open Library: \"${cddCategory}\". Puedes ajustar cualquier campo abajo.`\n                      : 'Puedes ajustar cualquier campo y configurar las copias físicas individuales abajo.'}\n                  </span>\n                </div>\n              </div>\n\n              <button\n                type=\"button\"\n                onClick={() => setCurrentStep('isbn_lookup')}\n                className=\"px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 font-bold text-[11px] text-slate-800 transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-2xs\"\n              >\n                <Search className=\"w-3.5 h-3.5 text-slate-500\" />\n                <span>Buscar otro ISBN</span>\n              </button>\n            </div>\n\n            {formError && (\n              <div className=\"p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5\">\n                <AlertCircle className=\"w-4 h-4 text-rose-600 shrink-0 mt-0.5\" />\n                <div>\n                  <span className=\"font-bold\">Error en la catalogación:</span> {formError}\n                </div>\n              </div>\n            )}\n\n            {successMessage && (\n              <div className=\"p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5 animate-in zoom-in-95\">\n                <CheckCircle2 className=\"w-5 h-5 text-emerald-600 shrink-0\" />\n                <span className=\"font-bold\">{successMessage}</span>\n              </div>\n            )}\n\n            {/* Section 1: Basic Bibliographic Identity */}\n            <div className=\"space-y-4\">\n              <div className=\"flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2\">\n                <FileText className=\"w-4 h-4 text-emerald-700\" />\n                1. Identificación Bibliográfica Principal\n              </div>\n\n              <div className=\"grid grid-cols-1 sm:grid-cols-2 gap-4\">\n                {/* Title */}\n                <div className=\"sm:col-span-2 space-y-1.5\">\n                  <label className=\"block text-xs font-bold text-slate-700\">\n                    Título de la Obra <span className=\"text-rose-500\">*</span>\n                  </label>\n                  <input\n                    id=\"work-title-input\"\n                    type=\"text\"\n                    required\n                    value={title}\n                    onChange={(e) => handleTitleChange(e.target.value)}\n                    placeholder=\"Ej: Casas Muertas, Doña Bárbara, Biología General...\"\n                    className=\"w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition\"\n                  />\n                </div>\n\n                {/* Author / Creator */}\n                <div className=\"space-y-1.5\">\n                  <label className=\"block text-xs font-bold text-slate-700\">\n                    Autor o Creador <span className=\"text-rose-500\">*</span>\n                  </label>\n                  <input\n                    id=\"work-author-input\"\n                    type=\"text\"\n                    required\n                    value={author}\n                    onChange={(e) => handleAuthorChange(e.target.value)}\n                    placeholder=\"Ej: Miguel Otero Silva, Teresa de la Parra...\"\n                    className=\"w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition\"\n                  />\n                </div>\n\n                {/* ISBN with quick Google Search trigger */}\n                <div className=\"space-y-1.5\">\n                  <label className=\"block text-xs font-bold text-slate-700\">\n                    ISBN / Código de Identificación\n                  </label>\n                  <div className=\"flex gap-2\">\n                    <input\n                      id=\"work-isbn-input\"\n                      type=\"text\"\n                      value={isbn}\n                      onChange={(e) => setIsbn(e.target.value)}\n                      placeholder=\"978-84-376-0494-7\"\n                      className=\"flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition\"\n                    />\n                    <button\n                      type=\"button\"\n                      onClick={() => handlePerformGoogleSearch(isbn)}\n                      disabled={isSearchingGoogle || !isbn.trim()}\n                      title=\"Reconsultar Google Books con este ISBN\"\n                      className=\"px-3 py-2.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-900 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50\"\n                    >\n                      {isSearchingGoogle ? (\n                        <Loader2 className=\"w-4 h-4 animate-spin text-emerald-700\" />\n                      ) : (\n                        <Search className=\"w-4 h-4 text-emerald-700\" />\n                      )}\n                      <span className=\"hidden sm:inline\">Consultar API</span>\n                    </button>\n                  </div>\n                </div>\n              </div>\n            </div>\n\n            {/* Section 2: Dewey Decimal Classification (CDD) */}\n            <div className=\"space-y-4 pt-2\">\n              <div className=\"flex items-center justify-between border-b border-slate-100 pb-2\">\n                <div className=\"flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider\">\n                  <Compass className=\"w-4 h-4 text-emerald-700\" />\n                  2. Clasificación Decimal Dewey (CDD)\n                </div>\n                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${currentDewey.badgeBg} ${currentDewey.badgeText}`}>\n                  CDD {deweyCode} • {currentDewey.name}\n                </span>\n              </div>\n\n              <div className=\"space-y-2\">\n                <label className=\"block text-xs font-bold text-slate-700\">\n                  Categoría y División Dewey (000 - 990) <span className=\"text-rose-500\">*</span>\n                </label>\n                <select\n                  id=\"dewey-class-selector\"\n                  value={deweyCode}\n                  onChange={(e) => handleDeweyCodeChange(e.target.value)}\n                  className=\"w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition\"\n                >\n                  {DEWEY_GROUPS.map((group) => (\n                    <optgroup key={group.code} label={`${group.name}`}>\n                      {group.divisions.map((div) => (\n                        <option key={div.code} value={div.code}>\n                          {div.name}\n                        </option>\n                      ))}\n                    </optgroup>\n                  ))}\n                </select>\n\n                <div className=\"p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 mt-1.5\">\n                  <p className=\"flex-1\">\n                    <span className=\"font-semibold text-slate-700\">Guía de sección:</span> {currentDewey.description}\n                  </p>\n                  <a\n                    id=\"worldcat-dewey-lookup-btn\"\n                    href={`https://www.worldcat.org/search?q=ti:${encodeURIComponent(title.trim())}`}\n                    target=\"_blank\"\n                    rel=\"noopener noreferrer\"\n                    title={title.trim() ? `Buscar \"${title}\" en el catálogo público de WorldCat` : 'Buscar en WorldCat'}\n                    className=\"inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-emerald-700 transition-colors shrink-0 group cursor-pointer\"\n                  >\n                    <Search className=\"w-3 h-3 text-slate-400 group-hover:text-emerald-700 transition-colors\" />\n                    <span>Consultar en WorldCat</span>\n                    <ExternalLink className=\"w-2.5 h-2.5 text-slate-400 group-hover:text-emerald-700 transition-colors\" />\n                  </a>\n                </div>\n              </div>\n            </div>\n\n            {/* Section 3: Publishing & Catalog Metadata */}\n            <div className=\"space-y-4 pt-2\">\n              <div className=\"flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2\">\n                <BookmarkCheck className=\"w-4 h-4 text-emerald-700\" />\n                3. Metadatos de Publicación y Descriptores\n              </div>\n\n              <div className=\"grid grid-cols-1 sm:grid-cols-3 gap-4\">\n                {/* Publisher */}\n                <div className=\"sm:col-span-1 space-y-1.5\">\n                  <label className=\"block text-xs font-bold text-slate-700\">\n                    Editorial\n                  </label>\n                  <input\n                    id=\"work-publisher-input\"\n                    type=\"text\"\n                    value={publisher}\n                    onChange={(e) => setPublisher(e.target.value)}\n                    placeholder=\"Biblioteca Ayacucho, Losada...\"\n                    className=\"w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition\"\n                  />\n                </div>\n\n                {/* Year */}\n                <div className=\"sm:col-span-1 space-y-1.5\">\n                  <label className=\"block text-xs font-bold text-slate-700\">\n                    Año de Publicación\n                  </label>\n                  <input\n                    id=\"work-year-input\"\n                    type=\"number\"\n                    min=\"1500\"\n                    max={new Date().getFullYear() + 1}\n                    value={publicationYear}\n                    onChange={(e) => setPublicationYear(Number(e.target.value))}\n                    className=\"w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition\"\n                  />\n                </div>\n\n                {/* Language */}\n                <div className=\"sm:col-span-1 space-y-1.5\">\n                  <label className=\"block text-xs font-bold text-slate-700\">\n                    Idioma\n                  </label>\n                  <select\n                    id=\"work-language-input\"\n                    value={language}\n                    onChange={(e) => setLanguage(e.target.value)}\n                    className=\"w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition\"\n                  >\n                    <option value=\"spa\">Español (spa)</option>\n                    <option value=\"eng\">Inglés (eng)</option>\n                    <option value=\"fre\">Francés (fre)</option>\n                    <option value=\"por\">Portugués (por)</option>\n                    <option value=\"wyo\">Warao / Lengua Indígena</option>\n                  </select>\n                </div>\n              </div>\n\n              {/* Subject Keywords */}\n              <div className=\"space-y-2\">\n                <label className=\"block text-xs font-bold text-slate-700\">\n                  Materias y Palabras Clave\n                </label>\n                <div className=\"flex gap-2\">\n                  <input\n                    id=\"work-subject-tag-input\"\n                    type=\"text\"\n                    value={subjectTag}\n                    onChange={(e) => setSubjectTag(e.target.value)}\n                    onKeyDown={(e) => {\n                      if (e.key === 'Enter') {\n                        e.preventDefault();\n                        handleAddSubject();\n                      }\n                    }}\n                    placeholder=\"Escribe una materia y presiona Enter o Añadir...\"\n                    className=\"flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition\"\n                  />\n                  <button\n                    type=\"button\"\n                    onClick={handleAddSubject}\n                    className=\"px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer\"\n                  >\n                    + Agregar\n                  </button>\n                </div>\n\n                {/* Tag Chips */}\n                <div className=\"flex flex-wrap gap-1.5 pt-1\">\n                  {subjects.map((tag) => (\n                    <span\n                      key={tag}\n                      className=\"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-medium\"\n                    >\n                      <Tag className=\"w-3 h-3 text-emerald-600\" />\n                      {tag}\n                      <button\n                        type=\"button\"\n                        onClick={() => handleRemoveSubject(tag)}\n                        className=\"hover:text-rose-600 ml-0.5 cursor-pointer\"\n                      >\n                        &times;\n                      </button>\n                    </span>\n                  ))}\n                </div>\n              </div>\n\n              {/* Description / Summary */}\n              <div className=\"space-y-1.5\">\n                <label className=\"block text-xs font-bold text-slate-700\">\n                  Sinopsis / Resumen Bibliográfico\n                </label>\n                <textarea\n                  id=\"work-description-input\"\n                  rows={3}\n                  value={description}\n                  onChange={(e) => setDescription(e.target.value)}\n                  placeholder=\"Breve reseña literaria o resumen del contenido de la obra...\"\n                  className=\"w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition resize-none\"\n                />\n              </div>\n\n              {/* Book Cover Image selector */}\n              <div className=\"space-y-2\">\n                <label className=\"block text-xs font-bold text-slate-700\">\n                  Portada de la Obra (URL o Galería Predefinida)\n                </label>\n                <div className=\"flex items-center gap-3\">\n                  <img\n                    src={coverUrl || SAMPLE_COVERS[0].url}\n                    alt=\"Vista previa\"\n                    className=\"w-14 h-20 object-cover rounded-lg border border-slate-200 bg-slate-100 shrink-0 shadow-xs\"\n                    onError={(e) => {\n                      (e.target as HTMLImageElement).src = SAMPLE_COVERS[0].url;\n                    }}\n                  />\n                  <div className=\"flex-1 space-y-2\">\n                    <input\n                      type=\"url\"\n                      value={coverUrl}\n                      onChange={(e) => setCoverUrl(e.target.value)}\n                      placeholder=\"https://...\"\n                      className=\"w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition\"\n                    />\n                    {/* Preset quick cover selectors */}\n                    <div className=\"flex items-center gap-1.5 overflow-x-auto text-[11px]\">\n                      <span className=\"text-slate-400 shrink-0\">Preajustes:</span>\n                      {SAMPLE_COVERS.map((sc, i) => (\n                        <button\n                          key={i}\n                          type=\"button\"\n                          onClick={() => setCoverUrl(sc.url)}\n                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition shrink-0 cursor-pointer ${\n                            coverUrl === sc.url\n                              ? 'bg-emerald-800 text-white'\n                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'\n                          }`}\n                        >\n                          {sc.label}\n                        </button>\n                      ))}\n                    </div>\n                  </div>\n                </div>\n              </div>\n            </div>\n\n            {/* Section 4: Physical Copies Generation - INDIVIDUAL CONFIGURATION PER COPY */}\n            <div className=\"space-y-4 pt-3 p-4 sm:p-5 rounded-3xl bg-slate-50 border border-slate-200\">\n              <div className=\"flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3\">\n                <div className=\"flex items-center gap-2\">\n                  <div className=\"w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center\">\n                    <Barcode className=\"w-4 h-4\" />\n                  </div>\n                  <div>\n                    <h4 className=\"text-xs sm:text-sm font-bold text-slate-900\">\n                      4. Generación Individual de Ejemplares Físicos\n                    </h4>\n                    <p className=\"text-[11px] text-slate-500\">\n                      Configura de forma independiente el código marbete, sede y estado físico para cada ejemplar.\n                    </p>\n                  </div>\n                </div>\n\n                <div className=\"flex items-center gap-3\">\n                  <label className=\"flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs\">\n                    <input\n                      type=\"checkbox\"\n                      checked={createInitialCopies}\n                      onChange={(e) => setCreateInitialCopies(e.target.checked)}\n                      className=\"rounded text-emerald-700 focus:ring-emerald-600 w-4 h-4 cursor-pointer\"\n                    />\n                    <span className=\"text-xs font-bold text-slate-800\">Registrar ejemplares ahora</span>\n                  </label>\n                </div>\n              </div>\n\n              {createInitialCopies && (\n                <div className=\"space-y-4\">\n                  {/* Metrics Pill & Add Controls */}\n                  <div className=\"flex flex-col sm:flex-row sm:items-center justify-between gap-2.5\">\n                    <div className=\"flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600\">\n                      <span className=\"px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-bold text-slate-800\">\n                        Total: {initialCopies.length} {initialCopies.length === 1 ? 'ejemplar' : 'ejemplares'}\n                      </span>\n                      <span className=\"px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold\">\n                        Sede Central: {centralDraftCount}\n                      </span>\n                      <span className=\"px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold\">\n                        Donación / Semilla: {donationDraftCount}\n                      </span>\n                    </div>\n\n                    {/* Add Copy Action Buttons */}\n                    <div className=\"flex items-center gap-2\">\n                      <button\n                        type=\"button\"\n                        onClick={() => handleAddCopy(branches[0]?.id)}\n                        className=\"px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs\"\n                      >\n                        <Plus className=\"w-3.5 h-3.5 text-emerald-400\" />\n                        + Ejemplar Central\n                      </button>\n                      {branches.find((b) => b.type === 'external_donation') && (\n                        <button\n                          type=\"button\"\n                          onClick={() => {\n                            const extBranch = branches.find((b) => b.type === 'external_donation');\n                            if (extBranch) handleAddCopy(extBranch.id);\n                          }}\n                          className=\"px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs\"\n                        >\n                          <Plus className=\"w-3.5 h-3.5\" />\n                          + Ejemplar Semilla\n                        </button>\n                      )} \n                    </div>\n                  </div>\n\n                  {/* Copies List: Individual Cards */}\n                  {initialCopies.length === 0 ? (\n                    <div className=\"p-6 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-500 text-xs\">\n                      No has agregado ejemplares iniciales para esta obra. Haz clic en <strong>+ Ejemplar Central</strong> o <strong>+ Ejemplar Semilla</strong> para añadir uno.\n                    </div>\n                  ) : (\n                    <div className=\"space-y-3\">\n                      {initialCopies.map((copy, index) => {\n                        const selectedBranch = branches.find((b) => b.id === copy.branch_id) || branches[0];\n                        const isDonation = selectedBranch?.type === 'external_donation';\n\n                        return (\n                          <div\n                            key={copy.id}\n                            className=\"bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3.5 hover:border-slate-300 transition\"\n                          >\n                            {/* Copy Header / Action bar */}\n                            <div className=\"flex items-center justify-between border-b border-slate-100 pb-2.5\">\n                              <div className=\"flex items-center gap-2\">\n                                <span className=\"w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center\">\n                                  {index + 1}\n                                </span>\n                                <span className=\"text-xs font-bold text-slate-800\">\n                                  Ejemplar #{index + 1}\n                                </span>\n                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${\n                                  isDonation ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-emerald-100 text-emerald-900 border border-emerald-200'\n                                }`}>\n                                  {isDonation ? 'Dotación Rural' : 'Sede Central'}\n                                </span>\n                              </div>\n\n                              <div className=\"flex items-center gap-1\">\n                                <button\n                                  type=\"button\"\n                                  onClick={() => handleDuplicateCopy(copy)}\n                                  title=\"Duplicar configuración de este ejemplar\"\n                                  className=\"p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer text-xs flex items-center gap-1\"\n                                >\n                                  <CopyIcon className=\"w-3.5 h-3.5\" />\n                                  <span className=\"hidden sm:inline text-[11px]\">Duplicar</span>\n                                </button>\n                                <button\n                                  type=\"button\"\n                                  onClick={() => handleRemoveCopy(copy.id)}\n                                  title=\"Eliminar este ejemplar\"\n                                  className=\"p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer\"\n                                >\n                                  <Trash2 className=\"w-3.5 h-3.5\" />\n                                </button>\n                              </div>\n                            </div>\n\n                            {/* Copy Fields Grid */}\n                            <div className=\"grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs\">\n                              {/* Branch Selector */}\n                              <div className=\"sm:col-span-4 space-y-1\">\n                                <label className=\"block font-bold text-slate-700 flex items-center gap-1\">\n                                  <Building2 className=\"w-3 h-3 text-slate-400\" />\n                                  Sede de Asignación\n                                </label>\n                                <select\n                                  value={copy.branch_id}\n                                  onChange={(e) => handleUpdateCopy(copy.id, 'branch_id', e.target.value)}\n                                  className=\"w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700\"\n                                >\n                                  <optgroup label=\"Sedes Centrales (Campus Principal)\">\n                                    {branches.filter(b => b.type === 'internal').map((b) => (\n                                      <option key={b.id} value={b.id}>\n                                        {b.name} [{getBranchCodePrefix(b.name)}-]\n                                      </option>\n                                    ))}\n                                  </optgroup>\n                                  <optgroup label=\"Semilla Manglareña (Dotaciones Rurales)\">\n                                    {branches.filter(b => b.type === 'external_donation').map((b) => (\n                                      <option key={b.id} value={b.id}>\n                                        {b.name} [{getBranchCodePrefix(b.name)}-]\n                                      </option>\n                                    ))}\n                                  </optgroup>\n                                </select>\n                              </div>\n\n                              {/* Individual Physical Condition (Individual buttons per copy) */}\n                              <div className=\"sm:col-span-4 space-y-1\">\n                                <label className=\"block font-bold text-slate-700\">\n                                  Estado Físico Individual\n                                </label>\n                                <div className=\"grid grid-cols-3 gap-1.5\">\n                                  {(\n                                    [\n                                      { key: 'bueno', label: 'Bueno', color: 'emerald' },\n                                      { key: 'regular', label: 'Regular', color: 'amber' },\n                                      { key: 'malo', label: 'Malo', color: 'rose' },\n                                    ] as const\n                                  ).map((cond) => {\n                                    const isSelected = copy.condition === cond.key;\n                                    return (\n                                      <button\n                                        key={cond.key}\n                                        type=\"button\"\n                                        onClick={() => handleUpdateCopy(copy.id, 'condition', cond.key)}\n                                        className={`py-1.5 px-2 rounded-xl font-bold text-[11px] capitalize transition border cursor-pointer ${\n                                          isSelected\n                                            ? cond.key === 'bueno'\n                                              ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'\n                                              : cond.key === 'regular'\n                                              ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'\n                                              : 'bg-rose-700 text-white border-rose-700 shadow-2xs'\n                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'\n                                        }`}\n                                      >\n                                        {cond.label}\n                                      </button>\n                                    );\n                                  })}\n                                </div>\n                              </div>\n\n                              {/* Individual Marbete Code Input with Regenerate Action */}\n                              <div className=\"sm:col-span-4 space-y-1\">\n                                <div className=\"flex items-center justify-between\">\n                                  <label className=\"block font-bold text-slate-700 flex items-center gap-1\">\n                                    <Barcode className=\"w-3 h-3 text-slate-400\" />\n                                    Código Marbete / Código\n                                  </label>\n                                  <button\n                                    type=\"button\"\n                                    onClick={() => handleRegenerateCode(copy.id)}\n                                    className=\"text-[10px] text-emerald-800 hover:text-emerald-950 font-semibold cursor-pointer\"\n                                  >\n                                    Regenerar\n                                  </button>\n                                </div>\n                                <input\n                                  type=\"text\"\n                                  value={copy.internal_code}\n                                  onChange={(e) => handleUpdateCopy(copy.id, 'internal_code', e.target.value)}\n                                  placeholder=\"MOS-PRI-863-XXXX\"\n                                  className=\"w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition\"\n                                />\n                              </div>\n\n                              {/* Individual Shelf / Location Notes */}\n                              <div className=\"sm:col-span-12 space-y-1\">\n                                <label className=\"block font-medium text-slate-600 text-[11px]\">\n                                  Ubicación en Estantería / Observaciones del Ejemplar\n                                </label>\n                                <input\n                                  type=\"text\"\n                                  value={copy.notes}\n                                  onChange={(e) => handleUpdateCopy(copy.id, 'notes', e.target.value)}\n                                  placeholder=\"Ej: Estante A-2, Donación Familia Mendoza, Sala de lectura...\"\n                                  className=\"w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition\"\n                                />\n                              </div>\n                            </div>\n                          </div>\n                        );\n                      })}\n                    </div>\n                  )}\n                </div>\n              )}\n            </div>\n          </form>\n        )}\n\n        {/* Modal Footer Actions (only shown in 'form' step) */}\n        {currentStep === 'form' && (\n          <div className=\"p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0\">\n            <div className=\"text-xs text-slate-500 text-center sm:text-left\">\n              {createInitialCopies ? (\n                <span>\n                  Se registrará la obra junto con <strong>{initialCopies.length} ejemplares físicos individuales</strong>.\n                </span>\n              ) : (\n                <span>Se registrará únicamente la ficha de la obra en el Catálogo Universal.</span>\n              )}\n            </div>\n\n            <div className=\"flex items-center gap-2 w-full sm:w-auto justify-end\">\n              <button\n                type=\"button\"\n                onClick={() => setCurrentStep('isbn_lookup')}\n                disabled={isSubmitting}\n                className=\"px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer\"\n              >\n                Atrás\n              </button>\n\n              <button\n                onClick={handleSubmit}\n                disabled={isSubmitting}\n                className=\"px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-950/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 flex-1 sm:flex-initial\"\n              >\n                {isSubmitting ? (\n                  <>\n                    <span className=\"w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin\"></span>\n                    Guardando en Catálogo...\n                  </>\n                ) : (\n                  <>\n                    <BookPlus className=\"w-4 h-4\" />\n                    Registrar Obra y Ejemplares\n                  </>\n                )}\n              </button>\n            </div>\n          </div>\n        )}\n      </div>\n    </div>\n  );\n};\n