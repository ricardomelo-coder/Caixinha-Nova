import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Unlock, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  FolderLock, 
  PlusCircle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  AlertCircle,
  Clock,
  User,
  History,
  FileText
} from 'lucide-react';
import { useFechamentoMensal } from '../hooks/useFechamentoMensal';
import { ConfirmDialog } from './ConfirmDialog';
import { formatCurrency, getMonthName } from '../utils/formatters';
import { FechamentoMensal } from '../types';
import { ClosingReport } from './ClosingReport';

interface ClosingPanelProps {
  closings: any[]; // kept for signature compatibility with root page
  onCloseMonth: (year: number, month: number) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  isAdmin: boolean;
}

export const ClosingPanel: React.FC<ClosingPanelProps> = ({
  closings,
  onCloseMonth,
  isAdmin,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [reopenReason, setReopenReason] = useState<string>('');
  const [viewingReport, setViewingReport] = useState<boolean>(false);

  const {
    executarFechamento,
    reabrirFechamento,
    buscarFechamento,
    listarFechamentos,
    gerarPreview,
    loading,
    erro: hookErro,
  } = useFechamentoMensal();

  const [panelError, setPanelError] = useState<string | null>(null);
  const [panelSuccess, setPanelSuccess] = useState<string | null>(null);

  // Modal confirmations state
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showForceConfirm, setShowForceConfirm] = useState(false);
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);

  // Clear alerts helper
  const clearAlerts = () => {
    setPanelError(null);
    setPanelSuccess(null);
  };

  // Read current closed document active status
  const currentClosing = buscarFechamento(selectedMonth, selectedYear);
  const isCurrentlyClosed = currentClosing && currentClosing.status === 'BLOQUEADO';

  // Generate a live preview of the month if it is open (non-closed)
  const [previewDoc, setPreviewDoc] = useState<FechamentoMensal | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    const fetchPreview = async () => {
      if (isCurrentlyClosed) {
        setPreviewDoc(null);
        return;
      }
      setLoadingPreview(true);
      try {
        const doc = await gerarPreview(selectedMonth, selectedYear);
        if (active) {
          setPreviewDoc(doc);
        }
      } catch (err) {
        console.error('Error generating preview document', err);
      } finally {
        if (active) {
          setLoadingPreview(false);
        }
      }
    };
    fetchPreview();
    return () => {
      active = false;
    };
  }, [selectedMonth, selectedYear, isCurrentlyClosed]);

  // Calculate total pendencies under preview snapshots
  const totalPendencias = previewDoc?.contas.reduce((acc, c) => acc + c.pendencias.length, 0) || 0;
  const pendenciasList = previewDoc?.contas.flatMap(c => 
    c.pendencias.map(p => ({ ...p, accountName: c.accountName }))
  ) || [];

  // Submit standard closing
  const handleClosingSubmit = async () => {
    setPanelError(null);
    setPanelSuccess(null);
    setShowCloseConfirm(false);

    const res = await executarFechamento(selectedMonth, selectedYear, false);
    if (res.success) {
      setPanelSuccess(`Período de ${getMonthName(selectedMonth)}/${selectedYear} foi consolidado e trancado com sucesso.`);
      // Sync on main page via root callback triggers if mapped
      try {
        await onCloseMonth(selectedYear, selectedMonth);
      } catch (e) {
        // Safe fallback if parents states are fully managed independently
      }
    } else {
      setPanelError(res.error || 'Falha ao processar fechamento contábil.');
    }
  };

  // Submit forced closing
  const handleForcedClosingSubmit = async () => {
    setPanelError(null);
    setPanelSuccess(null);
    setShowForceConfirm(false);

    const res = await executarFechamento(selectedMonth, selectedYear, true);
    if (res.success) {
      setPanelSuccess(`Período de ${getMonthName(selectedMonth)}/${selectedYear} foi FORÇADO e trancado com sucesso.`);
      try {
        await onCloseMonth(selectedYear, selectedMonth);
      } catch (e) {}
    } else {
      setPanelError(res.error || 'Falha ao processar fechamento contábil forçado.');
    }
  };

  // Submit reopening
  const handleReopenSubmit = async () => {
    setPanelError(null);
    setPanelSuccess(null);
    setShowReopenConfirm(false);

    if (!reopenReason.trim()) {
      setPanelError('É obrigatório descrever uma justificativa formal para reabrir este ciclo.');
      return;
    }

    const res = await reabrirFechamento(selectedMonth, selectedYear, reopenReason);
    if (res.success) {
      setPanelSuccess(`O ciclo de ${getMonthName(selectedMonth)}/${selectedYear} foi destravado e reaberto para alterações.`);
      setReopenReason('');
    } else {
      setPanelError(res.error || 'Falha ao processar reabertura do período.');
    }
  };

  return (
    <div id="closing-panel-master-container" className="space-y-6 max-w-4xl mx-auto">
      
      {/* Upper selector & status header */}
      <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-700" />
              <h3 id="panel-title-text" className="text-base font-bold text-gray-900 leading-tight">Escolher Competência</h3>
            </div>
            <p className="text-[11px] text-gray-500 font-medium">
              Selecione o ciclo mensal para visualizar a prévia de conciliação ou as contas já consolidadas.
            </p>
          </div>

          {/* Selector selectors */}
          <div className="flex items-center gap-2">
            <div className="min-w-[120px]">
              <select
                id="select-month-control"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(Number(e.target.value));
                  setViewingReport(false);
                  clearAlerts();
                }}
                className="w-full text-xs font-bold border border-gray-200 hover:border-black rounded-lg p-2.5 bg-white cursor-pointer outline-hidden transition"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {getMonthName(i + 1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[90px]">
              <select
                id="select-year-control"
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(Number(e.target.value));
                  setViewingReport(false);
                  clearAlerts();
                }}
                className="w-full text-xs font-bold border border-gray-200 hover:border-black rounded-lg p-2.5 bg-white cursor-pointer outline-hidden transition"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
              </select>
            </div>
          </div>
        </div>

        {/* Global Feedback notification area */}
        {panelError && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2.5 text-[11px] text-rose-700 font-bold animate-fade-in shadow-2xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{panelError}</span>
          </div>
        )}
        {panelSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2.5 text-[11px] text-emerald-700 font-bold animate-fade-in shadow-2xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{panelSuccess}</span>
          </div>
        )}
      </div>

      {/* CASE A: MONTH IS ALREADY LOCKED / CLOSED */}
      {isCurrentlyClosed ? (
        viewingReport && currentClosing ? (
          <ClosingReport fechamento={currentClosing} onBack={() => setViewingReport(false)} />
        ) : (
          <div id="month-locked-state-card" className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-2xs animate-fade-in">
          
          {/* Header trancado banner */}
          <div className="bg-rose-500 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl border border-white/10">
                <Lock className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold tracking-tight uppercase">Período Trancado e Seguro</h4>
                <p className="text-[10px] text-rose-100 font-semibold mt-0.5">
                  Lançamentos e exclusões bloqueadas para {getMonthName(selectedMonth).toUpperCase()} de {selectedYear}
                </p>
              </div>
            </div>

            <div className="text-right sm:text-right">
              <span className="inline-flex items-center gap-1.5 bg-rose-600/80 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-rose-400/40">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                DADOS IMUTÁVEIS
              </span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            
            {/* Metadata and Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-gray-100 bg-neutral-50/50 p-4 rounded-xl flex items-center gap-3">
                <div className="p-2 bg-gray-100 border border-gray-200 text-gray-500 rounded-lg">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9px] font-extrabold text-gray-400 tracking-wider uppercase block">Consolidado Por</span>
                  <span className="text-xs font-bold text-gray-800">{currentClosing.criadoPor}</span>
                </div>
              </div>

              <div className="border border-gray-100 bg-neutral-50/50 p-4 rounded-xl flex items-center gap-3">
                <div className="p-2 bg-gray-100 border border-gray-200 text-gray-500 rounded-lg">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9px] font-extrabold text-gray-400 tracking-wider uppercase block">Data/Hora Encerramento</span>
                  <span className="text-xs font-bold text-gray-800">
                    {new Date(currentClosing.dataCriacao).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              <div className="border border-gray-100 bg-neutral-50/50 p-4 rounded-xl flex items-center gap-3">
                <div className="p-2 bg-gray-100 border border-gray-200 text-gray-500 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9px] font-extrabold text-gray-400 tracking-wider uppercase block">Resultado Comercial Liquido</span>
                  <span className={`text-xs font-extrabold ${currentClosing.resultadoLiquidoGeral >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(currentClosing.resultadoLiquidoGeral)}
                  </span>
                </div>
              </div>
            </div>

            {/* Show detailed ClosingReport button option */}
            <div className="bg-slate-50 border border-slate-200/85 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-3xs">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-800 block">Demonstrativo Financeiro & Relatórios</span>
                <p className="text-[11px] text-slate-500 font-medium">Veja a conciliação comercial, filtre lançamentos consolidados e baixe relatórios PDF ou CSV do período.</p>
              </div>
              <button
                id="view-closing-report-trigger-btn"
                type="button"
                onClick={() => setViewingReport(true)}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs whitespace-nowrap cursor-pointer shrink-0"
              >
                <FileText className="w-4 h-4 text-slate-300" />
                DRE & Relatório Completo
              </button>
            </div>

            {/* Expilcit list of Account snapshots */}
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-neutral-100 pb-2">
                <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Histórico de Saldos e Snapshot de Contas</h5>
                <span className="text-[10px] text-gray-500 font-semibold font-mono bg-neutral-50 border border-neutral-150 px-2 py-0.5 rounded-sm">
                  {currentClosing.contas.length} caixinhas salvos
                </span>
              </div>

              <div className="space-y-2.5">
                {currentClosing.contas.map((snap: any) => (
                  <div key={snap.accountId} className="border border-gray-150 hover:border-gray-350 p-4 rounded-xl bg-white transition shadow-3xs flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-xs font-extrabold text-gray-950 block">{snap.accountName}</span>
                        <div className="flex items-center gap-2 flex-wrap text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                          <span>Saldo Inicial: <b className="font-mono text-gray-700">{formatCurrency(snap.saldoInicial)}</b></span>
                          <span className="text-gray-300">•</span>
                          <span>Saldo Final: <b className="font-mono text-gray-800">{formatCurrency(snap.saldoFinal)}</b></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {snap.pendencias.length > 0 ? (
                          <div className="text-[10px] text-amber-600 font-bold bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg">
                            {snap.pendencias.length} pendências toleradas no fechamento
                          </div>
                        ) : (
                          <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            100% Conciliada
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-dashed border-gray-100 pt-3">
                      <div className="bg-emerald-50/40 p-2 rounded-lg border border-emerald-100/50">
                        <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider block">Entradas</span>
                        <span className="text-xs font-extrabold text-emerald-800 font-mono">+{formatCurrency(snap.totalEntradas)}</span>
                      </div>
                      <div className="bg-rose-50/40 p-2 rounded-lg border border-rose-100/50">
                        <span className="text-[9px] font-bold text-rose-700 uppercase tracking-wider block">Saídas</span>
                        <span className="text-xs font-extrabold text-rose-800 font-mono">-{formatCurrency(snap.totalSaidas)}</span>
                      </div>
                      <div className="bg-sky-50/40 p-2 rounded-lg border border-sky-100/50">
                        <span className="text-[9px] font-bold text-sky-700 uppercase tracking-wider block">Transf. Recebidas</span>
                        <span className="text-xs font-extrabold text-sky-800 font-mono">+{formatCurrency(snap.totalTransfRecebidas)}</span>
                      </div>
                      <div className="bg-gray-50/40 p-2 rounded-lg border border-gray-100/50">
                        <span className="text-[9px] font-bold text-gray-700 uppercase tracking-wider block">Transf. Enviadas</span>
                        <span className="text-xs font-extrabold text-gray-800 font-mono">-{formatCurrency(snap.totalTransfEnviadas)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ADMIN unlock option */}
            {isAdmin ? (
              <div className="mt-8 border-t border-dashed border-gray-150 pt-6">
                <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5 shadow-3xs space-y-4">
                  <div className="flex items-center gap-2">
                    <Unlock className="w-4.5 h-4.5 text-rose-600 animate-spin" />
                    <h5 className="text-xs font-extrabold text-gray-900 uppercase tracking-widest">Painel Administrativo: Reabrir Período</h5>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-normal max-w-xl font-medium">
                    A reabertura de uma competência já finalizada possibilita aditamentos, cancelamentos, retificações ou lançamentos retroativos de caixa.
                  </p>

                  <div className="space-y-2">
                    <label htmlFor="reopen-reason-input" className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block">Justificativa Formal para Auditoria</label>
                    <textarea
                      id="reopen-reason-input"
                      rows={2}
                      value={reopenReason}
                      onChange={(e) => setReopenReason(e.target.value)}
                      placeholder="Descreva o motivo pelo qual este mês precisa ser desbloqueado para alterações..."
                      className="w-full text-xs font-semibold bg-white border border-gray-200 py-2 px-3 rounded-xl focus:border-black outline-hidden focus:ring-1 focus:ring-black/10 transition leading-relaxed"
                    />
                  </div>

                  <div className="flex justify-start">
                    <button
                      id="trigger-reopen-dialog-btn"
                      type="button"
                      onClick={() => setShowReopenConfirm(true)}
                      disabled={!reopenReason.trim()}
                      className={`px-4 py-2.5 rounded-lg text-xs font-extrabold text-white transition cursor-pointer shadow-2xs ${
                        reopenReason.trim() ? 'bg-black hover:bg-neutral-800' : 'bg-neutral-300 cursor-not-allowed opacity-60'
                      }`}
                    >
                      Solicitar Reabertura do Mês
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl text-amber-800 text-[11px] font-semibold flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Apenas usuários com perfil Administrador estão autorizados a solicitar a destrava e reabertura deste período.</span>
              </div>
            )}

          </div>
        </div>
        )
      ) : (
        /* CASE B: MONTH IS OPEN (WANT TO CLOSE) */
        <div id="month-open-state-card" className="space-y-6 animate-fade-in">
          
          {/* Re-opening audit trace warning if it had status === 'REABERTO' previously */}
          {currentClosing?.status === 'REABERTO' && (
            <div className="bg-amber-50 border border-amber-100/85 p-4 rounded-2xl text-amber-900 text-xs flex flex-col gap-1.5 shadow-3xs animate-fade-in">
              <div className="flex items-center gap-2 text-amber-700 font-extrabold">
                <History className="w-4 h-4" />
                <span>Competência Reaberta Anteriormente</span>
              </div>
              <p className="text-[11px] font-semibold text-amber-800/90 leading-relaxed">
                Este ciclo foi formalmente desbloqueado por <strong>{currentClosing.criadoPor}</strong>.
                <br />
                <span className="italic block mt-1 bg-white/50 px-2.5 py-1 rounded-lg border border-amber-200/55">
                  Motivo Justificado: &quot;{currentClosing.motivoReabertura}&quot;
                </span>
              </p>
            </div>
          )}

          {/* PREVIEW CONSOLIDATED BOARD */}
          <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-2xs space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h4 className="text-sm font-extrabold tracking-tight text-gray-900 uppercase">Prévia de Consolidação</h4>
                <p className="text-[11px] text-gray-500 font-medium">Estatísticas calculadas a partir dos lançamentos vigentes no período.</p>
              </div>

              <span className="bg-neutral-100 border border-neutral-200 text-neutral-800 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                Mês Aberto
              </span>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-gray-100 bg-emerald-50/20 p-4 rounded-xl flex items-center gap-3">
                <div className="p-2 bg-emerald-100/50 border border-emerald-100 text-emerald-600 rounded-lg">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[9px] font-extrabold text-neutral-400 tracking-wider uppercase block">Receita Bruta Prevista</span>
                  <span className="text-sm font-extrabold text-emerald-800 font-mono">
                    +{formatCurrency(previewDoc?.contas.reduce((acc, c) => acc + c.totalEntradas, 0) || 0)}
                  </span>
                </div>
              </div>

              <div className="border border-gray-100 bg-rose-50/20 p-4 rounded-xl flex items-center gap-3">
                <div className="p-2 bg-rose-100/50 border border-rose-100 text-rose-600 rounded-lg">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[9px] font-extrabold text-neutral-400 tracking-wider uppercase block">Despesas Consolidadas</span>
                  <span className="text-sm font-extrabold text-rose-800 font-mono">
                    -{formatCurrency(previewDoc?.contas.reduce((acc, c) => acc + c.totalSaidas, 0) || 0)}
                  </span>
                </div>
              </div>

              <div className="border border-gray-100 bg-neutral-50/50 p-4 rounded-xl flex items-center gap-3">
                <div className="p-2 bg-gray-105 border border-gray-200 text-gray-600 rounded-lg">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[9px] font-extrabold text-neutral-400 tracking-wider uppercase block">Saldo Líquido Previsto</span>
                  <span className={`text-sm font-extrabold font-mono ${
                    (previewDoc?.resultadoLiquidoGeral || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {formatCurrency(previewDoc?.resultadoLiquidoGeral || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Account specifics list in preview */}
            <div className="space-y-2">
              <h5 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Resumo Prévio dos Caixinhas</h5>
              <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100">
                {previewDoc?.contas.map((snap) => (
                  <div key={snap.accountId} className="p-3 bg-neutral-50/20 hover:bg-neutral-50 flex items-center justify-between text-xs transition">
                    <div className="space-y-0.5">
                      <span className="font-bold text-gray-800 block">{snap.accountName}</span>
                      <span className="text-[10px] text-gray-400 font-semibold font-mono">
                        Saldo: {formatCurrency(snap.saldoFinal)} (Iniciou com: {formatCurrency(snap.saldoInicial)})
                      </span>
                    </div>

                    <div className="text-right">
                      {snap.pendencias.length > 0 ? (
                        <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-md border border-amber-100">
                          {snap.pendencias.length} pendências
                        </span>
                      ) : (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md border border-emerald-100">
                          Ok
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* WARNING BANNER FOR OPEN PENDING ITEMS (ADIANTAMENTOS OR REEMBOLSOS) */}
            {totalPendencias > 0 && (
              <div className="mt-6 bg-amber-50/70 border border-amber-200/80 p-5 rounded-2xl space-y-3.5 shadow-3xs animate-fade-in">
                <div className="flex items-center gap-2.5 text-amber-800 font-extrabold text-xs">
                  <AlertTriangle className="w-5 h-5 text-amber-600 animate-bounce-subtle" />
                  <span>PRESCRIÇÃO AUTOMÁTICA: {totalPendencias} Pendências em Aberto</span>
                </div>
                <p className="text-[11px] text-amber-805 leading-relaxed font-semibold">
                  Foram encontradas pendências de adiantamentos ou reembolsos não concluídos nesta competência. Para sua comodidade e segurança, ao efetuar o fechamento fiscal, estas pendências serão AUTOMATICAMENTE transferidas para o dia 1º do mês seguinte, liberando o fechamento do mês atual de forma limpa!
                </p>

                {/* Micro audit list of pending transactions */}
                <div className="max-h-[160px] overflow-y-auto space-y-1.5 border border-amber-200/60 rounded-xl p-3 bg-white text-[11px] divide-y divide-gray-100">
                  {pendenciasList.map((p, idx) => (
                    <div key={p.transactionId + '-' + idx} className="pt-1.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-gray-700">
                      <div>
                        <span className="font-extrabold text-amber-700/90 uppercase text-[9px] mr-1.5 bg-amber-50 border border-amber-100 px-1 rounded">
                          {p.tipo === 'ADIANTAMENTO_PENDENTE' ? 'Adiantamento' : 'Reembolso'}
                        </span>
                        <strong className="text-gray-950">{p.descricao}</strong>
                        <span className="text-gray-400 block sm:inline sm:ml-1.5 text-[10px]">({p.accountName})</span>
                      </div>
                      <span className="font-extrabold font-mono shrink-0 text-gray-900">{formatCurrency(p.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LOWER ACTIONS BUTTONS */}
            <div className="border-t border-gray-100 pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[10px] text-gray-400 font-medium leading-normal max-w-sm">
                Após bloquear este mês, as operações de inclusão, alteração e deleção referentes a qualquer dia deste ciclo serão permanentemente bloqueadas.
              </span>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Regular button (always enabled, shifts pendencies if present) */}
                <button
                  id="standard-close-period-btn"
                  type="button"
                  onClick={() => setShowCloseConfirm(true)}
                  className="px-4 py-2.5 bg-black hover:bg-neutral-800 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <FolderLock className="w-4 h-4" />
                  {totalPendencias > 0 ? "Fechar e Migrar Pendências" : "Fechar Período Fiscal"}
                </button>

                {/* Forçar fechamento (Only visible/actionable if has pendencies + ADMIN) */}
                {totalPendencias > 0 && isAdmin && (
                  <button
                    id="force-close-period-btn"
                    type="button"
                    onClick={() => setShowForceConfirm(true)}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <AlertTriangle className="w-4 h-4 text-white" />
                    Forçar Fechamento (Bypass)
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={showCloseConfirm}
        title="Encerrar Competência Mensal?"
        message={
          totalPendencias > 0
            ? `Esta ação irá consolidar e trancar os saldos do mês de ${getMonthName(selectedMonth)}/${selectedYear}.\n\nAs ${totalPendencias} pendências de adiantamentos/reembolsos serão AUTOMATICAMENTE transferidas para o dia 01 do mês seguinte (${getMonthName(selectedMonth === 12 ? 1 : selectedMonth + 1)}/${selectedMonth === 12 ? selectedYear + 1 : selectedYear}) para serem resolvidas lá.\n\nTem certeza de que deseja fechar e migrar estas pendências?`
            : `Esta ação irá trancá-las e consolidar todos os saldos sob dados em snapshot contábil.\n\nCompetência: ${getMonthName(selectedMonth)}/${selectedYear}\n\nTem certeza de que deseja prosseguir com o fechamento definitivo?`
        }
        onConfirm={handleClosingSubmit}
        onCancel={() => setShowCloseConfirm(false)}
        confirmText={totalPendencias > 0 ? "Fechar e Migrar" : "Confirmar Bloqueio"}
        cancelText="Voltar"
        variant="info"
      />

      <ConfirmDialog
        isOpen={showForceConfirm}
        title="Aviso: Forçar Fechamento de Mês com Pendências?"
        message={`Você está forçando o lock do período de ${getMonthName(selectedMonth)}/${selectedYear} contendo ${totalPendencias} pendências não liquidadas!\n\nAs consequências fiscais incluem tolerar adiantamentos ou reembolsos sem a prestação de contra-partida regular neste mês.\n\nDeseja realizar o bypass administrativo?`}
        onConfirm={handleForcedClosingSubmit}
        onCancel={() => setShowForceConfirm(false)}
        confirmText="Sim, Forçar Lock"
        cancelText="Cancelar"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showReopenConfirm}
        title="Reabrir Ciclo Declarado?"
        message={`Esta ação irá destravar todas as travas anti-fraude e auditoria para o mês de ${getMonthName(selectedMonth)}/${selectedYear}.\n\nTodos os usuários credenciados poderão inserir, alterar ou deletar lançamentos livremente no período.\n\nProsseguir com a reabertura registrada?`}
        onConfirm={handleReopenSubmit}
        onCancel={() => setShowReopenConfirm(false)}
        confirmText="Reabrir Ciclo"
        cancelText="Cancelar"
        variant="danger"
      />

    </div>
  );
};
