import React, { useState, useEffect } from 'react';
import { 
  ScanLine, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  PlusCircle, 
  Play, 
  StopCircle, 
  Sparkles, 
  Search, 
  Building2, 
  RotateCcw,
  Check
} from 'lucide-react';
import type { 
  StockAuditSession, 
  StockAuditItem, 
  PreservationItem, 
  DamageType, 
  PreservationStatus 
} from '../../types/database';
import { 
  getStoredAuditSessions, 
  createAuditSession, 
  scanItemInSession, 
  getStoredPreservationItems, 
  registerItemForPreservation, 
  updatePreservationStatus 
} from '../../lib/inventoryAudit';
import { getStoredBranches, getStoredCopies } from '../../lib/supabaseClient';

export function StocktakingHub() {
  const [activeTab, setActiveTab] = useState<'audit' | 'preservation'>('audit');
  
  // Stocktaking state
  const [sessions, setSessions] = useState<StockAuditSession[]>([]);
  const [activeSession, setActiveSession] = useState<StockAuditSession | null>(null);
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [lastScannedResult, setLastScannedResult] = useState<{ item: StockAuditItem; isNew: boolean } | null>(null);
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState<boolean>(false);
  const [newSessionBranchId, setNewSessionBranchId] = useState<string>('');
  const [newSessionShelfRange, setNewSessionShelfRange] = useState<string>('Estantes 800 - 899 (Literatura)');

  // Preservation state
  const [preservationItems, setPreservationItems] = useState<PreservationItem[]>([]);
  const [isRegisterPreservationModalOpen, setIsRegisterPreservationModalOpen] = useState<boolean>(false);
  const [presCopyCode, setPresCopyCode] = useState<string>('');
  const [presDamageType, setPresDamageType] = useState<DamageType>('lomo_danado');
  const [presDiagnosis, setPresDiagnosis] = useState<string>('');
  const [presTechnician, setPresTechnician] = useState<string>('');

  const branches = getStoredBranches();

  useEffect(() => {
    const list = getStoredAuditSessions();
    setSessions(list);
    if (list.length > 0) {
      setActiveSession(list[0]);
    }
    setPreservationItems(getStoredPreservationItems());
    if (branches.length > 0) {
      setNewSessionBranchId(branches[0].id);
    }
  }, []);

  const handleStartSession = (e: React.FormEvent) => {
    e.preventDefault();
    const branch = branches.find((b) => b.id === newSessionBranchId) || branches[0];
    const session = createAuditSession({
      branchId: branch.id,
      branchName: branch.name,
      shelfRange: newSessionShelfRange,
    });
    setSessions(getStoredAuditSessions());
    setActiveSession(session);
    setIsNewSessionModalOpen(false);
    setLastScannedResult(null);
  };

  const handleScanCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !barcodeInput.trim()) return;

    const res = scanItemInSession(activeSession.id, barcodeInput.trim());
    if (res) {
      setActiveSession(res.session);
      setSessions(getStoredAuditSessions());
      setLastScannedResult({ item: res.item, isNew: res.isNew });
    }
    setBarcodeInput('');
  };

  const handleRegisterPreservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!presCopyCode.trim() || !presDiagnosis.trim()) return;

    const res = registerItemForPreservation({
      copyCode: presCopyCode,
      damageType: presDamageType,
      diagnosis: presDiagnosis,
      technicianName: presTechnician,
    });

    if (res.success) {
      setPreservationItems(getStoredPreservationItems());
      setIsRegisterPreservationModalOpen(false);
      setPresCopyCode('');
      setPresDiagnosis('');
    } else {
      alert(res.error);
    }
  };

  const handleUpdatePresStatus = (id: string, status: PreservationStatus) => {
    updatePreservationStatus(id, status);
    setPreservationItems(getStoredPreservationItems());
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-700 text-white flex items-center justify-center shadow-md shadow-indigo-950/20 shrink-0">
            <ScanLine className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                Koha Tools & Preservation
              </span>
              <span className="text-xs text-slate-500">• Auditoría de Estantería y Restauración</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
              Inventario Físico y Taller de Preservación
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mt-1">
              Control de estantería por escáner de marbete continuo para detectar libros extraviados o desubicados y gestión del taller de encuadernación.
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'audit' ? 'bg-indigo-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ScanLine className="w-4 h-4" />
            Auditoría de Estantería
          </button>
          <button
            onClick={() => setActiveTab('preservation')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'preservation' ? 'bg-indigo-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wrench className="w-4 h-4" />
            Taller de Preservación ({preservationItems.filter((i) => i.status !== 'restaurado').length})
          </button>
        </div>
      </div>

      {activeTab === 'audit' ? (
        <div className="space-y-6">
          {/* Active Session & Scanner Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Sesión de Auditoría Activa
                </div>
                {activeSession ? (
                  <div className="mt-1">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-indigo-600" />
                      {activeSession.branch_name}
                    </h3>
                    <div className="text-xs text-slate-500 font-semibold mt-0.5">
                      Sector: {activeSession.shelf_range} • Iniciada: {new Date(activeSession.started_at).toLocaleTimeString('es-VE')}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">No hay ninguna sesión iniciada.</p>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setIsNewSessionModalOpen(true)}
                  className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  Nueva Sesión de Estante
                </button>
              </div>
            </div>

            {/* Continuous Barcode Input Form */}
            {activeSession && (
              <form onSubmit={handleScanCode} className="space-y-3">
                <label className="font-bold text-xs text-slate-700 block">
                  Pasa la pistola lectora o escribe el código de marbete (ej. MOS-BAC-863-OTEc-001):
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <ScanLine className="w-5 h-5 text-indigo-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Escanear marbete de lomo..."
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-indigo-200 rounded-2xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-indigo-800 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl transition cursor-pointer"
                  >
                    Registrar
                  </button>
                </div>
              </form>
            )}

            {/* Last Scanned Feedback Banner */}
            {lastScannedResult && (
              <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
                lastScannedResult.item.status === 'found_in_place'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : lastScannedResult.item.status === 'found_misplaced'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <div className="flex items-center gap-3">
                  {lastScannedResult.item.status === 'found_in_place' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                  {lastScannedResult.item.status === 'found_misplaced' && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />}
                  {lastScannedResult.item.status === 'unexpected' && <HelpCircle className="w-5 h-5 text-rose-600 shrink-0" />}

                  <div>
                    <span className="font-mono font-bold">{lastScannedResult.item.copy_code}</span>: <strong>{lastScannedResult.item.work_title}</strong>
                    <div className="text-[11px] opacity-80">
                      {lastScannedResult.item.status === 'found_in_place' && '✓ Ejemplar verificado en su ubicación correcta.'}
                      {lastScannedResult.item.status === 'found_misplaced' && `⚠ Ejemplar desubicado. Sede esperada: ${lastScannedResult.item.expected_branch_name}.`}
                      {lastScannedResult.item.status === 'unexpected' && '✕ Marbete no reconocido en la base de datos.'}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-white/60">
                  {lastScannedResult.isNew ? 'Nuevo Escaneo' : 'Ya Registrado'}
                </span>
              </div>
            )}

            {/* Audit Statistics */}
            {activeSession && (
              <div className="grid grid-cols-3 gap-4 text-center pt-2">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="text-xs text-slate-400 font-semibold">Total Escaneados</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">{activeSession.scanned_count}</div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                  <div className="text-xs text-emerald-700 font-semibold">En Ubicación Correcta</div>
                  <div className="text-2xl font-black text-emerald-800 mt-1">
                    {activeSession.items.filter((i) => i.status === 'found_in_place').length}
                  </div>
                </div>
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                  <div className="text-xs text-amber-700 font-semibold">Desubicados / Alertas</div>
                  <div className="text-2xl font-black text-amber-800 mt-1">{activeSession.misplaced_count}</div>
                </div>
              </div>
            )}
          </div>

          {/* Scanned Items Log */}
          {activeSession && activeSession.items.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h4 className="font-bold text-sm text-slate-900">
                Registro de Ejemplares Escaneados en esta Sesión ({activeSession.items.length})
              </h4>

              <div className="divide-y divide-slate-100 text-xs">
                {activeSession.items.map((item, idx) => (\n                  <div key={idx} className=\"py-3 flex items-center justify-between gap-3\">\n                    <div className=\"flex items-center gap-3\">\n                      <span className=\"font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded\">\n                        {item.copy_code}\n                      </span>\n                      <div>\n                        <div className=\"font-bold text-slate-900\">{item.work_title || 'Obra Desconocida'}</div>\n                        <div className=\"text-slate-500 text-[11px]\">\n                          {item.dewey_code && `CDD ${item.dewey_code} • `} {item.work_author}\n                        </div>\n                      </div>\n                    </div>\n\n                    <div className=\"flex items-center gap-2\">\n                      <span className=\"text-[11px] text-slate-400\">\n                        {new Date(item.scanned_at).toLocaleTimeString('es-VE')}\n                      </span>\n                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${\n                        item.status === 'found_in_place'\n                          ? 'bg-emerald-100 text-emerald-800'\n                          : item.status === 'found_misplaced'\n                          ? 'bg-amber-100 text-amber-800'\n                          : 'bg-rose-100 text-rose-800'\n                      }`}>\n                        {item.status === 'found_in_place' ? 'En Orden' : item.status === 'found_misplaced' ? 'Desubicado' : 'No Registrado'}\n                      </span>\n                    </div>\n                  </div>\n                ))}\n              </div>\n            </div>\n          )}\n        </div>\n      ) : (\n        /* Preservation Tab */\n        <div className=\"space-y-6\">\n          <div className=\"flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-xs\">\n            <div>\n              <h3 className=\"text-lg font-bold text-slate-900\">Taller de Restauración y Encuadernación</h3>\n              <p className=\"text-xs text-slate-500 mt-0.5\">Control de libros en cuarentena, reparación de lomos y tratamiento de hongos.</p>\n            </div>\n            <button\n              onClick={() => setIsRegisterPreservationModalOpen(true)}\n              className=\"px-4 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer\"\n            >\n              <PlusCircle className=\"w-4 h-4\" />\n              Ingresar Ejemplar al Taller\n            </button>\n          </div>\n\n          <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">\n            {preservationItems.map((item) => (\n              <div\n                key={item.id}\n                className=\"bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between\"\n              >\n                <div>\n                  <div className=\"flex items-start justify-between gap-2\">\n                    <div>\n                      <span className=\"font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded\">\n                        {item.copy_code}\n                      </span>\n                      <h4 className=\"text-sm font-bold text-slate-900 mt-1.5 leading-tight\">\n                        {item.work_title}\n                      </h4>\n                      <p className=\"text-xs text-slate-500\">{item.work_author}</p>\n                    </div>\n\n                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${\n                      item.status === 'restaurado'\n                        ? 'bg-emerald-100 text-emerald-800'\n                        : item.status === 'en_tratamiento'\n                        ? 'bg-amber-100 text-amber-800'\n                        : 'bg-slate-100 text-slate-700'\n                    }`}>\n                      {item.status.replace('_', ' ').toUpperCase()}\n                    </span>\n                  </div>\n\n                  <div className=\"mt-3 p-3 bg-slate-50 rounded-2xl text-xs space-y-1 text-slate-700\">\n                    <div><strong>Daño:</strong> {item.damage_type.replace('_', ' ')}</div>\n                    <div><strong>Diagnóstico:</strong> {item.diagnosis}</div>\n                    {item.treatment_applied && (\n                      <div className=\"text-indigo-800\"><strong>Tratamiento:</strong> {item.treatment_applied}</div>\n                    )}\n                  </div>\n                </div>\n\n                <div className=\"pt-3 border-t border-slate-100 flex items-center justify-between text-xs\">\n                  <div className=\"text-[11px] text-slate-400\">\n                    Ingresado: {new Date(item.entered_at).toLocaleDateString('es-VE')}\n                  </div>\n\n                  <div className=\"flex gap-1.5\">\n                    {item.status === 'en_espera' && (\n                      <button\n                        onClick={() => handleUpdatePresStatus(item.id, 'en_tratamiento')}\n                        className=\"px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs\"\n                      >\n                        Iniciar Reparación\n                      </button>\n                    )}\n                    {item.status === 'en_tratamiento' && (\n                      <button\n                        onClick={() => handleUpdatePresStatus(item.id, 'restaurado')}\n                        className=\"px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1\"\n                      >\n                        <Check className=\"w-3.5 h-3.5\" />\n                        Restaurado y Disponible\n                      </button>\n                    )}\n                  </div>\n                </div>\n              </div>\n            ))}\n          </div>\n        </div>\n      )}\n\n      {/* Modal: New Audit Session */}\n      {isNewSessionModalOpen && (\n        <div className=\"fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4\">\n          <div className=\"bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200\">\n            <h3 className=\"font-bold text-base text-slate-900 pb-3 border-b border-slate-100\">\n              Iniciar Nueva Auditoría de Estantería\n            </h3>\n\n            <form onSubmit={handleStartSession} className=\"mt-4 space-y-3.5 text-xs\">\n              <div>\n                <label className=\"font-bold text-slate-700 block mb-1\">Sede / Biblioteca</label>\n                <select\n                  value={newSessionBranchId}\n                  onChange={(e) => setNewSessionBranchId(e.target.value)}\n                  className=\"w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl\"\n                >\n                  {branches.map((b) => (\n                    <option key={b.id} value={b.id}>{b.name}</option>\n                  ))}\n                </select>\n              </div>\n\n              <div>\n                <label className=\"font-bold text-slate-700 block mb-1\">Sector o Rango de Estantería</label>\n                <input\n                  type=\"text\"\n                  required\n                  value={newSessionShelfRange}\n                  onChange={(e) => setNewSessionShelfRange(e.target.value)}\n                  className=\"w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium\"\n                />\n              </div>\n\n              <div className=\"pt-4 border-t border-slate-100 flex justify-end gap-2\">\n                <button\n                  type=\"button\"\n                  onClick={() => setIsNewSessionModalOpen(false)}\n                  className=\"px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl\"\n                >\n                  Cancelar\n                </button>\n                <button\n                  type=\"submit\"\n                  className=\"px-5 py-2 bg-indigo-900 text-white font-bold rounded-xl\"\n                >\n                  Iniciar Auditoría\n                </button>\n              </div>\n            </form>\n          </div>\n        </div>\n      )}\n\n      {/* Modal: Register Preservation Item */}\n      {isRegisterPreservationModalOpen && (\n        <div className=\"fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4\">\n          <div className=\"bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200\">\n            <h3 className=\"font-bold text-base text-slate-900 pb-3 border-b border-slate-100\">\n              Ingresar Ejemplar a Preservación\n            </h3>\n\n            <form onSubmit={handleRegisterPreservation} className=\"mt-4 space-y-3.5 text-xs\">\n              <div>\n                <label className=\"font-bold text-slate-700 block mb-1\">Código de Marbete *</label>\n                <input\n                  type=\"text\"\n                  required\n                  placeholder=\"ej. MOS-BAC-863-OTEc-001\"\n                  value={presCopyCode}\n                  onChange={(e) => setPresCopyCode(e.target.value)}\n                  className=\"w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono\"\n                />\n              </div>\n\n              <div>\n                <label className=\"font-bold text-slate-700 block mb-1\">Tipo de Deterioro</label>\n                <select\n                  value={presDamageType}\n                  onChange={(e) => setPresDamageType(e.target.value as any)}\n                  className=\"w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl\"\n                >\n                  <option value=\"lomo_danado\">Lomo Desprendido o Roto</option>\n                  <option value=\"hojas_sueltas\">Hojas Sueltas / Desencuadernado</option>\n                  <option value=\"humedad_hongos\">Humedad o Manchas</option>\n                  <option value=\"cubierta_rota\">Cubierta o Pasta Rota</option>\n                  <option value=\"rayones\">Rayones o Deterioro General</option>\n                </select>\n              </div>\n\n              <div>\n                <label className=\"font-bold text-slate-700 block mb-1\">Diagnóstico Inicial *</label>\n                <textarea\n                  rows={2}\n                  required\n                  placeholder=\"Descripción del daño que presenta el libro...\"\n                  value={presDiagnosis}\n                  onChange={(e) => setPresDiagnosis(e.target.value)}\n                  className=\"w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl\"\n                />\n              </div>\n\n              <div>\n                <label className=\"font-bold text-slate-700 block mb-1\">Responsable del Taller (opcional)</label>\n                <input\n                  type=\"text\"\n                  placeholder=\"ej. Prof. Ana Teresa Valera\"\n                  value={presTechnician}\n                  onChange={(e) => setPresTechnician(e.target.value)}\n                  className=\"w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl\"\n                />\n              </div>\n\n              <div className=\"pt-4 border-t border-slate-100 flex justify-end gap-2\">\n                <button\n                  type=\"button\"\n                  onClick={() => setIsRegisterPreservationModalOpen(false)}\n                  className=\"px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl\"\n                >\n                  Cancelar\n                </button>\n                <button\n                  type=\"submit\"\n                  className=\"px-5 py-2 bg-indigo-900 text-white font-bold rounded-xl\"\n                >\n                  Registrar en Taller\n                </button>\n              </div>\n            </form>\n          </div>\n        </div>\n      )}\n    </div>\n  );\n}\n