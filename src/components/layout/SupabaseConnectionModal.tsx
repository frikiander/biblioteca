import React, { useState } from 'react';
import { 
  Database, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Radio, 
  UploadCloud, 
  Trash2, 
  Key, 
  Globe, 
  RefreshCw,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { 
  SUPABASE_URL, 
  SUPABASE_ANON_KEY, 
  isSupabaseConfigured, 
  testSupabaseConnection, 
  setSupabaseCredentials, 
  clearSupabaseCredentials,
  syncLocalDataToSupabase
} from '../../lib/supabaseClient';

interface SupabaseConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConnectionModal: React.FC<SupabaseConnectionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [urlInput, setUrlInput] = useState(SUPABASE_URL || '');
  const [keyInput, setKeyInput] = useState(SUPABASE_ANON_KEY || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Error inesperado al probar conexión.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || !keyInput.trim()) {
      alert('Debes ingresar tanto la URL del proyecto como la Anon Key de Supabase.');
      return;
    }

    if (!urlInput.startsWith('https://')) {
      alert('La URL de Supabase debe comenzar con https://');
      return;
    }

    setSupabaseCredentials(urlInput.trim(), keyInput.trim());
  };

  const handleDisconnect = () => {
    if (window.confirm('¿Deseas desconectar Supabase y operar únicamente con almacenamiento local?')) {
      clearSupabaseCredentials();
    }
  };

  const handleSyncToSupabase = async () => {
    if (!isSupabaseConfigured) {
      alert('Debes conectar Supabase primero para poder sincronizar.');
      return;
    }
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await syncLocalDataToSupabase();
      setSyncResult(res.message);
    } catch (err: any) {
      setSyncResult(`Error: ${err.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearLocalStorage = () => {
    if (window.confirm('¿Deseas limpiar todos los datos locales en el navegador? Esto no afectará a Supabase si está conectado.')) {
      localStorage.setItem('manglar_works', JSON.stringify([]));
      localStorage.setItem('manglar_copies', JSON.stringify([]));
      localStorage.setItem('manglar_patrons_v2', JSON.stringify([]));
      localStorage.setItem('manglar_loans', JSON.stringify([]));
      localStorage.setItem('manglar_virtual_shelves', JSON.stringify([]));
      localStorage.setItem('manglar_suggestions', JSON.stringify([]));
      localStorage.setItem('manglar_preservation_items', JSON.stringify([]));
      window.location.reload();
    }
  };

  return (
    <div
      id="supabase-connection-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="supabase-connection-modal-container"
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-neutral-200 overflow-hidden flex flex-col my-6"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-neutral-200 bg-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/80">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-neutral-900 leading-tight">
                Conexión con Supabase
              </h3>
              <p className="text-xs text-neutral-500">
                Sincronización directa con base de datos PostgreSQL en la nube
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Status Card */}
          <div className={`p-4 rounded-2xl border ${
            isSupabaseConfigured 
              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
              : 'bg-amber-50/70 border-amber-200 text-amber-950'
          }`}>
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {isSupabaseConfigured ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                )}
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {isSupabaseConfigured ? 'Supabase Configurado' : 'Operando en Modo Local (Offline)'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isSupabaseConfigured ? 'bg-emerald-200/60 text-emerald-800' : 'bg-amber-200/70 text-amber-800'
                  }`}>
                    {isSupabaseConfigured ? 'Nube Activa' : 'LocalStorage'}
                  </span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  {isSupabaseConfigured
                    ? 'La plataforma está conectada a tu proyecto Supabase. Los registros y eliminaciones se ejecutan directamente en la base de datos.'
                    : 'Actualmente no hay credenciales de Supabase configuradas en el entorno ni en el navegador. Las altas y bajas se guardan únicamente en la memoria local de tu navegador.'}
                </p>
                {isSupabaseConfigured && (
                  <div className="text-[11px] font-mono text-emerald-800 break-all pt-1">
                    URL: {SUPABASE_URL}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Test Connection Button & Result */}
          {isSupabaseConfigured && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Comprobando Tablas en Supabase...' : 'Comprobar Conexión en Vivo'}</span>
              </button>

              {testResult && (
                <div className={`p-3 rounded-xl text-xs font-medium border flex items-start gap-2 ${
                  testResult.success 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          )}

          {/* Credentials Form */}
          <form onSubmit={handleSaveCredentials} className="space-y-4 pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                Configurar Credenciales de Supabase
              </h4>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#83B141] hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Dashboard Supabase</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-neutral-400" />
                Project URL (VITE_SUPABASE_URL)
              </label>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://abcdefghijklmno.supabase.co"
                className="w-full px-3 py-2 bg-[#F8F9F8] border border-[#D3D2D3] rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#83B141]/30 focus:border-[#83B141] transition"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-neutral-400" />
                  Anon / Public API Key (VITE_SUPABASE_ANON_KEY)
                </label>
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="text-[11px] text-neutral-500 hover:text-neutral-800 cursor-pointer"
                >
                  {showKey ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3 py-2 bg-[#F8F9F8] border border-[#D3D2D3] rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#83B141]/30 focus:border-[#83B141] transition"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 bg-[#83B141] hover:bg-[#719b35] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Guardar y Conectar Supabase</span>
              </button>

              {isSupabaseConfigured && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="py-2.5 px-3 border border-neutral-300 hover:bg-neutral-100 text-neutral-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                  title="Volver a modo local"
                >
                  Desconectar
                </button>
              )}
            </div>
          </form>

          {/* Sync & Management Tools */}
          <div className="pt-4 border-t border-neutral-100 space-y-3">
            <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
              Herramientas de Mantenimiento
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Sync to Supabase */}
              <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-2">
                <div className="flex items-center gap-2 text-neutral-800 font-bold text-xs">
                  <UploadCloud className="w-4 h-4 text-emerald-700" />
                  <span>Subir Catálogo Local</span>
                </div>
                <p className="text-[11px] text-neutral-500 leading-normal">
                  Sube las obras, sedes y ejemplares locales a tus tablas de Supabase.
                </p>
                <button
                  type="button"
                  onClick={handleSyncToSupabase}
                  disabled={!isSupabaseConfigured || isSyncing}
                  className="w-full py-1.5 px-3 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-700 rounded-lg text-xs font-semibold transition disabled:opacity-40 cursor-pointer"
                >
                  {isSyncing ? 'Sincronizando...' : 'Migrar a Supabase'}
                </button>
                {syncResult && (
                  <p className="text-[10px] text-emerald-700 font-medium">{syncResult}</p>
                )}
              </div>

              {/* Reset Local Storage */}
              <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-2">
                <div className="flex items-center gap-2 text-neutral-800 font-bold text-xs">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Limpiar LocalStorage</span>
                </div>
                <p className="text-[11px] text-neutral-500 leading-normal">
                  Elimina los datos locales sin restaurar colecciones demo ni libros de prueba.
                </p>
                <button
                  type="button"
                  onClick={handleClearLocalStorage}
                  className="w-full py-1.5 px-3 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Limpiar Almacenamiento
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
