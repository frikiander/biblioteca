import React, { useState } from 'react';
import { 
  Terminal, 
  FolderTree, 
  Server, 
  Code2, 
  Copy, 
  Check, 
  Database, 
  ShieldCheck,
  FileCode,
  Layers
} from 'lucide-react';
import { SUPABASE_SQL_SCHEMA, NEXTJS_FOLDER_STRUCTURE, SERVER_ACTION_CODE, REGISTER_WORK_ACTION_CODE } from '../../lib/sqlScripts';

export const ArchitectureHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sql' | 'nextjs_structure' | 'server_action_work' | 'server_action' | 'client_component'>('sql');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const clientComponentSampleCode = `/**
 * @file components/catalog/BookCatalog.tsx
 * Componente Cliente de Next.js (App Router) para consultar el catálogo universal de obras
 * y visualizar la distribución física de ejemplares con Tailwind CSS.
 */
'use client';

import React, { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { Database, Work, Copy, Branch } from '@/types/database';

export function BookCatalog() {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Instanciar cliente de Supabase para Client Components
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function loadWorks() {
      try {
        setLoading(true);
        const { data, error: dbError } = await supabase
          .from('works')
          .select(\`
            *,
            copies:copies (
              id,
              condition,
              internal_code,
              branch:branches ( id, name, type )
            )
          \`)
          .order('title', { ascending: true });

        if (dbError) throw dbError;
        setWorks(data || []);
      } catch (err: any) {
        setError(err.message || 'Error al obtener las obras');
      } finally {
        setLoading(false);
      }
    }

    loadWorks();
  }, [supabase]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
        Error al cargar catálogo: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Catálogo Universal de Obras</h2>
        <span className="text-xs font-semibold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full">
          {works.length} Obras Disponibles
        </span>
      </div>

      {/* Grid Responsivo Tailwind CSS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {works.map((work) => (
          <div 
            key={work.id} 
            className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col"
          >
            <div className="p-4 flex gap-4">
              <img
                src={work.cover_url || '/placeholder-book.png'}
                alt={work.title}
                className="w-20 h-28 object-cover rounded-lg border border-slate-200 bg-slate-50 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                  CDD {work.dewey_code}
                </span>
                <h3 className="font-bold text-slate-900 text-sm mt-1 line-clamp-2">{work.title}</h3>
                <p className="text-xs text-slate-600 font-medium">{work.author}</p>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">{work.isbn || 'Sin ISBN'}</p>
              </div>
            </div>

            <div className="mt-auto p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Estado general:</span>
              <span className="font-semibold text-emerald-700">Disponible</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
`;

  return (
    <div id="architecture-hub-container" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 bg-slate-50/90 overflow-x-auto text-xs sm:text-sm font-semibold">
        <button
          onClick={() => setActiveTab('sql')}
          className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'sql'
              ? 'border-emerald-700 text-emerald-950 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4 text-emerald-700" />
          SQL Schema & RLS (Supabase)
        </button>

        <button
          onClick={() => setActiveTab('nextjs_structure')}
          className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'nextjs_structure'
              ? 'border-emerald-700 text-emerald-950 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FolderTree className="w-4 h-4 text-blue-600" />
          Estructura Next.js (App Router)
        </button>

        <button
          onClick={() => setActiveTab('server_action_work')}
          className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'server_action_work'
              ? 'border-emerald-700 text-emerald-950 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCode className="w-4 h-4 text-emerald-600" />
          Server Action (registerWork.ts)
        </button>

        <button
          onClick={() => setActiveTab('server_action')}
          className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'server_action'
              ? 'border-emerald-700 text-emerald-950 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Server className="w-4 h-4 text-purple-600" />
          Server Action (registerCopy.ts)
        </button>

        <button
          onClick={() => setActiveTab('client_component')}
          className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'client_component'
              ? 'border-emerald-700 text-emerald-950 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Code2 className="w-4 h-4 text-amber-600" />
          Componente Cliente (BookCatalog.tsx)
        </button>
      </div>

      {/* Code Display Area */}
      <div className="p-6 space-y-4">
        {/* SQL Tab */}
        {activeTab === 'sql' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  PostgreSQL DDL + Row Level Security (RLS) + Seed Data
                </h3>
                <p className="text-xs text-slate-500">
                  Tablas: <code className="text-emerald-800 font-mono">works</code>, <code className="text-emerald-800 font-mono">branches</code>, <code className="text-emerald-800 font-mono">copies</code> con claves foráneas, validación de tipos y políticas de seguridad.
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(SUPABASE_SQL_SCHEMA, 'sql')}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition flex items-center gap-1.5 self-start cursor-pointer"
              >
                {copiedKey === 'sql' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey === 'sql' ? '¡Copiado!' : 'Copiar SQL Completo'}
              </button>
            </div>

            <pre className="p-4 bg-slate-950 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-[500px] leading-relaxed">
              <code>{SUPABASE_SQL_SCHEMA}</code>
            </pre>
          </div>
        )}

        {/* Folder Structure Tab */}
        {activeTab === 'nextjs_structure' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-blue-600" />
                  Arquitectura Modular Sugerida para Next.js 14/15 App Router
                </h3>
                <p className="text-xs text-slate-500">
                  Organización por rutas, Server Components, Server Actions (@supabase/ssr) y Componentes Clientes.
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(NEXTJS_FOLDER_STRUCTURE, 'structure')}
                className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold hover:bg-blue-100 transition flex items-center gap-1.5 self-start cursor-pointer"
              >
                {copiedKey === 'structure' ? <Check className="w-3.5 h-3.5 text-blue-700" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey === 'structure' ? '¡Copiado!' : 'Copiar Estructura'}
              </button>
            </div>

            <pre className="p-4 bg-slate-900 text-blue-100 rounded-xl text-xs font-mono overflow-x-auto max-h-[500px] leading-relaxed">
              <code>{NEXTJS_FOLDER_STRUCTURE}</code>
            </pre>
          </div>
        )}

        {/* Server Action Catalog Work Tab */}
        {activeTab === 'server_action_work' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-emerald-600" />
                  Server Action: <code className="text-emerald-800 font-mono">registerWorkAction()</code>
                </h3>
                <p className="text-xs text-slate-500">
                  Catalogación universal de obras en tabla <code className="text-emerald-800 font-mono">works</code> bajo Dublin Core y Dewey con aprovisionamiento opcional de ejemplares.
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(REGISTER_WORK_ACTION_CODE, 'server_action_work')}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition flex items-center gap-1.5 self-start cursor-pointer"
              >
                {copiedKey === 'server_action_work' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey === 'server_action_work' ? '¡Copiado!' : 'Copiar Server Action'}
              </button>
            </div>

            <pre className="p-4 bg-slate-950 text-emerald-100 rounded-xl text-xs font-mono overflow-x-auto max-h-[500px] leading-relaxed">
              <code>{REGISTER_WORK_ACTION_CODE}</code>
            </pre>
          </div>
        )}

        {/* Server Action Tab */}
        {activeTab === 'server_action' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Server className="w-4 h-4 text-purple-600" />
                  Server Action: <code className="text-purple-800 font-mono">registerCopyAction()</code>
                </h3>
                <p className="text-xs text-slate-500">
                  Asignación garantizada a la sede rural <strong>"Semilla Manglareña"</strong> con validación de obra, generación de marbete y revalidación de caché.
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(SERVER_ACTION_CODE, 'server_action')}
                className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 text-xs font-semibold hover:bg-purple-100 transition flex items-center gap-1.5 self-start cursor-pointer"
              >
                {copiedKey === 'server_action' ? <Check className="w-3.5 h-3.5 text-purple-700" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey === 'server_action' ? '¡Copiado!' : 'Copiar Server Action'}
              </button>
            </div>

            <pre className="p-4 bg-slate-950 text-purple-100 rounded-xl text-xs font-mono overflow-x-auto max-h-[500px] leading-relaxed">
              <code>{SERVER_ACTION_CODE}</code>
            </pre>
          </div>
        )}

        {/* Client Component Tab */}
        {activeTab === 'client_component' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-amber-600" />
                  Componente Cliente: <code className="text-amber-800 font-mono">BookCatalog.tsx</code>
                </h3>
                <p className="text-xs text-slate-500">
                  Fetch tipado con <code className="text-amber-800 font-mono">@supabase/supabase-js</code> y renderizado en cuadrícula Tailwind CSS responsiva.
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(clientComponentSampleCode, 'client_component')}
                className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition flex items-center gap-1.5 self-start cursor-pointer"
              >
                {copiedKey === 'client_component' ? <Check className="w-3.5 h-3.5 text-amber-700" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey === 'client_component' ? '¡Copiado!' : 'Copiar Componente'}
              </button>
            </div>

            <pre className="p-4 bg-slate-950 text-amber-100 rounded-xl text-xs font-mono overflow-x-auto max-h-[500px] leading-relaxed">
              <code>{clientComponentSampleCode}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
