export const SUPABASE_SQL_SCHEMA = `-- =========================================================================
-- PLATAFORMA DE GESTIÓN BIBLIOTECARIA "BIBLIOTECA MIGUEL OTERO SILVA"
-- COLEGIO INTEGRAL EL MANGLAR - NÚCLEO MULTISEDE Y DONACIONES RURALES
-- PostgreSQL + Supabase DDL & Row Level Security (RLS)
-- =========================================================================

-- 1. Habilitar extensión para UUIDs criptográficos
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Limpieza de tablas previas (en caso de reinicio de entorno)
-- DROP TABLE IF EXISTS public.loans CASCADE;
-- DROP TABLE IF EXISTS public.students CASCADE;
-- DROP TABLE IF EXISTS public.copies CASCADE;
-- DROP TABLE IF EXISTS public.works CASCADE;
-- DROP TABLE IF EXISTS public.branches CASCADE;

-- -------------------------------------------------------------------------
-- TABLA: branches (Sedes centrales y escuelas rurales de dotación)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('internal', 'external_donation')),
    location TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.branches IS 'Sedes del Colegio Integral El Manglar y destinos de donación rural (e.g. Semilla Manglareña).';
COMMENT ON COLUMN public.branches.type IS 'Clasificación de sede: internal (biblioteca central) o external_donation (escuelas rurales).';

-- -------------------------------------------------------------------------
-- TABLA: works (Catálogo universal de obras bajo estándar Dublin Core simplificado)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.works (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT,
    dewey_code VARCHAR(32) NOT NULL,
    cover_url TEXT,
    publisher TEXT,
    publication_year INTEGER CHECK (publication_year > 1000 AND publication_year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1),
    subjects TEXT[] DEFAULT '{}',
    description TEXT,
    language VARCHAR(10) DEFAULT 'spa',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.works IS 'Registro bibliográfico maestro con metadatos Dublin Core y clasificación Dewey Decimal.';
COMMENT ON COLUMN public.works.dewey_code IS 'Notación de Clasificación Decimal Dewey (CDD/DDC), e.g. 863 para narrativa hispanoamericana.';

-- -------------------------------------------------------------------------
-- TABLA: copies (Ejemplares físicos inventariados)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.copies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    condition TEXT NOT NULL CHECK (condition IN ('bueno', 'regular', 'malo')),
    internal_code TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'disponible' CHECK (status IN ('disponible', 'prestado', 'en_donacion', 'baja', 'en_traslado')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.copies IS 'Unidades físicas tangibles ubicadas en una sede o transferidas a dotación.';
COMMENT ON COLUMN public.copies.internal_code IS 'Código de barras / marbete interno único del ejemplar (e.g. MOS-PRI-863-001 / SM-GUA-863-001).';

-- -------------------------------------------------------------------------
-- TABLA: students (Estudiantes, docentes y personal para préstamos)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    grade_section TEXT,
    identifier TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'staff')),
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.students IS 'Directorio de lectores: estudiantes, docentes y personal institucional.';

-- -------------------------------------------------------------------------
-- TABLA: loans (Módulo de Préstamos y Devoluciones Circulantes)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    copy_id UUID NOT NULL REFERENCES public.copies(id) ON DELETE CASCADE,
    copy_internal_code TEXT NOT NULL,
    work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
    work_title TEXT NOT NULL,
    work_author TEXT NOT NULL,
    work_cover_url TEXT,
    work_dewey_code VARCHAR(32),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    branch_name TEXT NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    student_name TEXT NOT NULL,
    student_grade TEXT,
    student_identifier TEXT,
    loan_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    due_date TIMESTAMPTZ,
    is_indefinite BOOLEAN NOT NULL DEFAULT false,
    return_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned', 'overdue')),
    checkout_notes TEXT,
    return_notes TEXT,
    return_condition TEXT CHECK (return_condition IN ('bueno', 'regular', 'malo')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.loans IS 'Registro de préstamos activos, devueltos y vencidos del fondo bibliográfico.';

-- -------------------------------------------------------------------------
-- ÍNDICES DE RENDIMIENTO PARA BÚSQUEDA Y RELACIONES
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_works_isbn ON public.works(isbn);
CREATE INDEX IF NOT EXISTS idx_works_dewey ON public.works(dewey_code);
CREATE INDEX IF NOT EXISTS idx_works_title ON public.works USING gin(to_tsvector('spanish', title));
CREATE INDEX IF NOT EXISTS idx_works_author ON public.works USING gin(to_tsvector('spanish', author));

CREATE INDEX IF NOT EXISTS idx_copies_work_id ON public.copies(work_id);
CREATE INDEX IF NOT EXISTS idx_copies_branch_id ON public.copies(branch_id);
CREATE INDEX IF NOT EXISTS idx_copies_condition ON public.copies(condition);
CREATE INDEX IF NOT EXISTS idx_copies_internal_code ON public.copies(internal_code);

CREATE INDEX IF NOT EXISTS idx_students_identifier ON public.students(identifier);
CREATE INDEX IF NOT EXISTS idx_loans_copy_id ON public.loans(copy_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_student_id ON public.loans(student_id);

-- -------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) - POLÍTICAS DE SEGURIDAD
-- -------------------------------------------------------------------------

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso completo para cliente público y autenticado
CREATE POLICY "Permitir acceso a sedes" ON public.branches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acceso a obras" ON public.works FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acceso a ejemplares" ON public.copies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acceso a estudiantes" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acceso a prestamos" ON public.loans FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- SEDES INSTITUCIONALES (6 Sedes oficiales de Colegio El Manglar con UUIDs RFC-4122)
-- -------------------------------------------------------------------------
INSERT INTO public.branches (id, name, type, location, description)
VALUES 
    ('00000000-0000-4000-a000-000000000001', 'Biblioteca Miguel Otero Silva - Primaria', 'internal', 'Campus Colegio Integral El Manglar - Edificio Primaria', 'Biblioteca central y rincón de lectura para educación primaria y preescolar'),
    ('00000000-0000-4000-a000-000000000002', 'Biblioteca Miguel Otero Silva - Bachillerato', 'internal', 'Campus Colegio Integral El Manglar - Edificio Bachillerato', 'Biblioteca central y sala de investigación de educación media general y diversificada'),
    ('00000000-0000-4000-a000-000000000003', 'Semilla Manglareña - Guárico', 'external_donation', 'Estado Guárico - Módulo Rural', 'Dotación descentralizada de fomento lector para escuelas y comunidades rurales de Guárico'),
    ('00000000-0000-4000-a000-000000000004', 'Semilla Manglareña - Caripe', 'external_donation', 'Municipio Caripe, Estado Monagas', 'Dotación de lectura comunitaria y escolar en la región de Caripe del Guácharo'),
    ('00000000-0000-4000-a000-000000000005', 'Semilla Manglareña - Mérida', 'external_donation', 'Estado Mérida - Aldeas Andinas', 'Dotación de literatura infantil y juvenil para escuelas rurales andinas'),
    ('00000000-0000-4000-a000-000000000006', 'Semilla Manglareña - Delta', 'external_donation', 'Delta Amacuro - Comunidades Fluviales', 'Dotación bibliográfica especializada para comunidades fluviales e indígenas')
ON CONFLICT (name) DO UPDATE SET type = EXCLUDED.type;
`;

export const NEXTJS_FOLDER_STRUCTURE = `biblioteca-miguel-otero-silva/
├── .env.local                    # Variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
├── .env.example
├── middleware.ts                 # Middleware para sesión y refresco de tokens de Supabase SSR
├── next.config.mjs
├── package.json                  # Con @supabase/supabase-js y @supabase/ssr
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── app/                          # Next.js 14/15 App Router
│   ├── layout.tsx                # Root layout con Navbar (Colegio Integral El Manglar) y Footer
│   ├── page.tsx                  # Página de Inicio / Resumen de Inventario y Dotaciones
│   ├── catalog/
│   │   ├── page.tsx              # Server Component con SEO que renderiza <BookCatalog />
│   │   └── loading.tsx           # Skeleton loader para la cuadrícula
│   ├── copies/
│   │   ├── register/
│   │   │   ├── page.tsx          # Formulario de registro de ejemplar para "Semilla Manglareña"
│   │   │   └── actions.ts        # Server Action: registerCopyAction()
│   │   └── inventory/
│   │       └── page.tsx          # Vista comparativa Central vs. Escuelas Rurales
│   ├── branches/
│   │   └── page.tsx              # Directorio de sedes internas y externas (donaciones)
│   └── api/
│       └── revalidate/
│           └── route.ts          # Revalidación bajo demanda de catálogo (ISR)
├── components/
│   ├── catalog/
│   │   ├── BookCatalog.tsx       # Componente Cliente solicitado (filtro Dewey, ISBN, Stock)
│   │   ├── BookCard.tsx          # Tarjeta de obra con desglose de ejemplares por sede
│   │   └── DublinCoreModal.tsx   # Modal con ficha bibliográfica internacional
│   ├── copies/
│   │   ├── RegisterCopyForm.tsx  # Formulario interactivo con feedback y validaciones
│   │   └── BarcodeBadge.tsx      # Identificador visual de código interno
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   └── ui/
│       ├── badge.tsx
│       ├── button.tsx
│       └── input.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # createBrowserClient (Client Components)
│   │   ├── server.ts             # createServerClient con cookies() (Server Components & Actions)
│   │   └── middleware.ts         # Helper de sesión para middleware de Next.js
│   ├── dewey.ts                  # Diccionario y utilidades del Sistema Dewey Decimal
│   └── utils.ts                  # Helpers de formato, clases y generación de marbetes
└── types/
    └── database.ts               # Tipos de TypeScript generados o definidos para Supabase
`;

export const SERVER_ACTION_CODE = `/**
 * @file app/copies/register/actions.ts
 * Server Action para registrar un nuevo ejemplar (copy) en Supabase,
 * asignándolo específicamente a la sede de donación rural "Semilla Manglareña".
 */
'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { Copy, CopyCondition, ActionResponse } from '@/types/database';

export interface RegisterCopyInput {
  workId: string;
  condition: CopyCondition;
  internalCode?: string; // Opcional: si no se provee, se auto-genera formato SM-YYYY-XXXX
  notes?: string;
}

const TARGET_BRANCH_NAME = 'Semilla Manglareña';

/**
 * Registra un nuevo ejemplar físico en el inventario descentralizado
 * asignándolo a la sede "Semilla Manglareña".
 */
export async function registerCopyAction(
  input: RegisterCopyInput
): Promise<ActionResponse<Copy>> {
  try {
    // 1. Validar entradas requeridas
    if (!input.workId || input.workId.trim() === '') {
      return {
        success: false,
        error: 'El identificador de la obra (work_id) es obligatorio.',
      };
    }

    const validConditions: CopyCondition[] = ['bueno', 'regular', 'malo'];
    if (!validConditions.includes(input.condition)) {
      return {
        success: false,
        error: 'La condición debe ser: bueno, regular o malo.',
      };
    }

    // 2. Instanciar cliente de Supabase para Server Actions (Next.js App Router)
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Puede fallar si se llama desde Server Component en streaming
            }
          },
        },
      }
    );

    // 3. Verificar que la obra exista en el catálogo universal
    const { data: work, error: workError } = await supabase
      .from('works')
      .select('id, title, author')
      .eq('id', input.workId)
      .single();

    if (workError || !work) {
      return {
        success: false,
        error: \`No se encontró la obra en el catálogo: \${workError?.message || 'ID inválido'}\`,
      };
    }

    // 4. Obtener el ID de la sede "Semilla Manglareña" (o crearla de respaldo)
    let { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('id, name, type')
      .eq('name', TARGET_BRANCH_NAME)
      .maybeSingle();

    if (branchError) {
      return {
        success: false,
        error: \`Error al consultar la sede de destino: \${branchError.message}\`,
      };
    }

    // Si la sede no existiera aún en base de datos, la aprovisionamos
    if (!branch) {
      const { data: newBranch, error: createBranchError } = await supabase
        .from('branches')
        .insert({
          name: TARGET_BRANCH_NAME,
          type: 'external_donation',
          location: 'Escuela Rural Sector La Sabana',
          description: 'Sede satélite de dotación rural del Colegio Integral El Manglar',
        })
        .select()
        .single();

      if (createBranchError || !newBranch) {
        return {
          success: false,
          error: \`No se pudo registrar la sede 'Semilla Manglareña': \${createBranchError?.message}\`,
        };
      }
      branch = newBranch;
    }

    // 5. Generar código interno único si no fue suministrado
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const internalCode =
      input.internalCode?.trim() || \`SM-\${year}-\${randomSuffix}\`;

    // 6. Insertar el nuevo ejemplar físico
    const { data: newCopy, error: insertError } = await supabase
      .from('copies')
      .insert({
        work_id: work.id,
        branch_id: branch.id,
        condition: input.condition,
        internal_code: internalCode,
        status: 'en_donacion', // Asignado a dotación descentralizada
        notes: input.notes?.trim() || \`Ejemplar dotado a \${TARGET_BRANCH_NAME}\`,
      })
      .select(\`
        *,
        work:works(*),
        branch:branches(*)
      \`)
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return {
          success: false,
          error: \`El código interno "\${internalCode}" ya se encuentra registrado. Usa un marbete diferente.\`,
        };
      }
      return {
        success: false,
        error: \`Error al registrar ejemplar en base de datos: \${insertError.message}\`,
      };
    }

    // 7. Revalidar rutas en Next.js para actualizar la UI en caché
    revalidatePath('/catalog');
    revalidatePath('/copies/inventory');

    return {
      success: true,
      data: newCopy,
      message: \`Ejemplar registrado con éxito (\${internalCode}) para "\${work.title}" en la sede "\${TARGET_BRANCH_NAME}".\`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error interno inesperado';
    return {
      success: false,
      error: \`Excepción en el servidor: \${errorMsg}\`,
    };
  }
}
`;

export const REGISTER_WORK_ACTION_CODE = `/**
 * @file app/catalog/new/actions.ts
 * Server Action para catalogar una nueva obra en el Catálogo Universal (tabla 'works')
 * bajo el estándar Dublin Core simplificado y el Sistema Decimal Dewey (CDD).
 */
'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { Work, CopyCondition, ActionResponse } from '@/types/database';

export interface InitialCopyItemInput {
  branchId: string;
  condition: CopyCondition;
  internalCode: string;
  notes?: string;
}

export interface RegisterWorkInput {
  title: string;
  author: string;
  isbn?: string;
  deweyCode: string;
  coverUrl?: string;
  publisher?: string;
  publicationYear?: number;
  subjects?: string[];
  description?: string;
  language?: string;
  initialCopies?: InitialCopyItemInput[];
}

export async function registerWorkAction(
  input: RegisterWorkInput
): Promise<ActionResponse<Work>> {
  try {
    if (!input.title || input.title.trim() === '') {
      return { success: false, error: 'El título de la obra (dc:title) es obligatorio.' };
    }
    if (!input.author || input.author.trim() === '') {
      return { success: false, error: 'El autor/creador (dc:creator) es obligatorio.' };
    }
    if (!input.deweyCode || input.deweyCode.trim() === '') {
      return { success: false, error: 'La clasificación Dewey (CDD) es obligatoria.' };
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const { data: newWork, error: insertError } = await supabase
      .from('works')
      .insert({
        title: input.title.trim(),
        author: input.author.trim(),
        isbn: input.isbn?.trim() || null,
        dewey_code: input.deweyCode.trim(),
        cover_url: input.coverUrl?.trim() || null,
        publisher: input.publisher?.trim() || 'Colegio Integral El Manglar',
        publication_year: input.publicationYear || new Date().getFullYear(),
        subjects: input.subjects && input.subjects.length > 0 ? input.subjects : ['General'],
        description: input.description?.trim() || null,
        language: input.language || 'spa',
      })
      .select()
      .single();

    if (insertError) {
      return {
        success: false,
        error: \`Error al catalogar obra: \${insertError.message}\`,
      };
    }

    // Registro individual de cada ejemplar físico
    if (input.initialCopies && input.initialCopies.length > 0) {
      const copiesPayload = input.initialCopies.map((copy) => ({
        work_id: newWork.id,
        branch_id: copy.branchId,
        condition: copy.condition || 'bueno',
        internal_code: copy.internalCode.trim(),
        status: 'disponible',
        notes: copy.notes?.trim() || 'Ejemplar individual registrado durante catalogación universal',
      }));

      await supabase.from('copies').insert(copiesPayload);
    }

    revalidatePath('/catalog');
    revalidatePath('/branches');

    return {
      success: true,
      data: newWork,
      message: \`Obra "\${newWork.title}" catalogada exitosamente con \${input.initialCopies?.length || 0} ejemplares configurados individualmente.\`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error inesperado';
    return { success: false, error: \`Excepción en el servidor: \${errorMsg}\` };
  }
}
`;
