import React, { useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  BookOpen, 
  Users, 
  Clock, 
  Building2, 
  Sparkles, 
  PieChart, 
  CheckCircle2, 
  AlertCircle, 
  Award, 
  HeartHandshake, 
  Layers 
} from 'lucide-react';
import { getStoredWorks, getStoredCopies, getStoredBranches } from '../../lib/supabaseClient';
import { getStoredLoans } from '../../lib/loans';
import { getStoredPatrons } from '../../lib/patrons';

export function KohaReportsDashboard() {
  const works = getStoredWorks();
  const copies = getStoredCopies();
  const branches = getStoredBranches();
  const loans = getStoredLoans();
  const patrons = getStoredPatrons();

  // Statistics calculation
  const totalWorksCount = works.length;
  const totalCopiesCount = copies.length;
  const totalLoansCount = loans.length;
  const activeLoans = loans.filter((l) => l.status === 'active');
  const overdueLoans = loans.filter((l) => l.status === 'overdue');
  const returnedLoans = loans.filter((l) => l.status === 'returned');

  // Dewey Classes Distribution (000 - 900)
  const deweyClassStats = useMemo(() => {
    const classes = [
      { code: '000', name: 'Generalidades y Computación', count: 0, color: '#38bdf8' },
      { code: '100', name: 'Filosofía y Psicología', count: 0, color: '#818cf8' },
      { code: '200', name: 'Religión y Mitología', count: 0, color: '#c084fc' },
      { code: '300', name: 'Ciencias Sociales y Educación', count: 0, color: '#fb7185' },
      { code: '400', name: 'Lenguas y Lingüística', count: 0, color: '#f472b6' },
      { code: '500', name: 'Ciencias Naturales y Matemáticas', count: 0, color: '#34d399' },
      { code: '600', name: 'Tecnología y Ciencias Aplicadas', count: 0, color: '#4ade80' },
      { code: '700', name: 'Artes, Recreación y Deportes', count: 0, color: '#fbbf24' },
      { code: '800', name: 'Literatura y Retórica', count: 0, color: '#10b981' },
      { code: '900', name: 'Historia y Geografía', count: 0, color: '#f97316' },
    ];

    works.forEach((w) => {
      const deweyNum = parseInt(w.dewey_code.split('.')[0], 10);
      if (!isNaN(deweyNum)) {
        const classIdx = Math.floor(deweyNum / 100);
        if (classIdx >= 0 && classIdx < 10) {
          classes[classIdx].count++;
        }
      }
    });

    return classes;
  }, [works]);

  // Top Most Borrowed Books
  const topWorks = useMemo(() => {
    const workLoanCounts: Record<string, { work_title: string; work_author: string; count: number }> = {};
    loans.forEach((l) => {
      if (!workLoanCounts[l.work_id]) {
        workLoanCounts[l.work_id] = {
          work_title: l.work_title,
          work_author: l.work_author,
          count: 0,
        };
      }
      workLoanCounts[l.work_id].count++;
    });

    return Object.values(workLoanCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [loans]);

  // Top Readers (Patrons)
  const topReaders = useMemo(() => {
    const readerCounts: Record<string, { name: string; grade?: string; count: number }> = {};
    loans.forEach((l) => {
      const key = l.student_name.toLowerCase().trim();
      if (!readerCounts[key]) {
        readerCounts[key] = {
          name: l.student_name,
          grade: l.student_grade,
          count: 0,
        };
      }
      readerCounts[key].count++;
    });

    return Object.values(readerCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [loans]);

  // Semilla Manglareña rural dotation stats
  const donationStats = useMemo(() => {
    const ruralBranches = branches.filter((b) => b.type === 'external_donation');
    return ruralBranches.map((b) => {
      const branchCopies = copies.filter((c) => c.branch_id === b.id || (c.internal_code && c.internal_code.includes(b.name.split(' ')[0])));
      return {
        branch: b,
        copiesCount: branchCopies.length,
      };
    });
  }, [branches, copies]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center shadow-md shadow-emerald-950/20 shrink-0">
            <BarChart3 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Koha Reports & Analytics
              </span>
              <span className="text-xs text-slate-500">• Indicadores de Gestión Bibliotecaria</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
              Tablero de Estadísticas y Analítica de Circulación
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mt-1">
              Métricas cuantitativas del fondo documental, índice de rotación de préstamos, balance temático Dewey y alcance del programa de dotación rural "Semilla Manglareña".
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Títulos Catalogados</span>
            <BookOpen className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">{totalWorksCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">{totalCopiesCount} ejemplares físicos</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Préstamos Activos</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-900 mt-2">{activeLoans.length}</div>
          <div className="text-[11px] text-blue-600 font-semibold mt-1">
            {overdueLoans.length > 0 ? `${overdueLoans.length} con retraso` : 'Todos a tiempo'}
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Circulación Histórica</span>
            <CheckCircle2 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">{totalLoansCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">{returnedLoans.length} devoluciones procesadas</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Lectores Activos</span>
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">{patrons.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Estudiantes y docentes</div>
        </div>
      </div>

      {/* Main Charts & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Dewey Classification Distribution */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-700" />
                Distribución del Fondo por Clases Dewey (CDD)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Porcentaje de títulos por área del conocimiento.</p>
            </div>
          </div>

          <div className="space-y-3">
            {deweyClassStats.map((item) => {
              const pct = totalWorksCount > 0 ? Math.round((item.count / totalWorksCount) * 100) : 0;

              return (
                <div key={item.code} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="font-semibold text-slate-800 flex items-center gap-2 truncate max-w-sm">
                      <span className="font-mono font-bold text-slate-500">{item.code}</span>
                      <span className="truncate">{item.name}</span>
                    </div>
                    <span className="font-black text-slate-700">{item.count} ({pct}%)</span>
                  </div>

                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Top Borrowed Books & Active Readers */}
        <div className="lg:col-span-5 space-y-6">
          {/* Top Books */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Obras con Mayor Rotación de Préstamo
            </h4>

            {topWorks.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Sin préstamos registrados todavía.</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {topWorks.map((tw, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-amber-50 text-amber-800 font-bold flex items-center justify-center text-[10px] shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{tw.work_title}</div>
                        <div className="text-[11px] text-slate-500 truncate">{tw.work_author}</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px] shrink-0">
                      {tw.count} {tw.count === 1 ? 'préstamo' : 'préstamos'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Semilla Manglareña Impact */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-blue-600" />
              Programa "Semilla Manglareña" (Dotación Rural)
            </h4>

            <div className="space-y-2 text-xs">
              {donationStats.map((ds) => (
                <div key={ds.branch.id} className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-blue-950">{ds.branch.name}</div>
                    <div className="text-[11px] text-blue-800">{ds.branch.location}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-blue-700 text-white font-bold text-xs">
                    {ds.copiesCount} libros
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
