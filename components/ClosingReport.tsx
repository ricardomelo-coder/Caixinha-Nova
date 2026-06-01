'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  Lock, 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  TrendingDown, 
  Filter, 
  Shuffle, 
  Calendar, 
  User, 
  Clock, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  FolderLock,
  Search,
  BookOpen
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FechamentoMensal, Transaction, Account } from '../types';
import { formatCurrency, formatDate, getMonthName, getTransactionNames } from '../utils/formatters';
import { createClient } from '../lib/supabase/client';

interface ClosingReportProps {
  fechamento: FechamentoMensal;
  onBack?: () => void;
}

export const ClosingReport: React.FC<ClosingReportProps> = ({
  fechamento,
  onBack
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Filters state
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState<string>('ALL');

  // Sorting state
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load data from Supabase
  useEffect(() => {
    let active = true;
    const loadReportData = async () => {
      try {
        const supabase = createClient();
        
        // 1. Load accounts to map names
        const { data: accountsData } = await supabase
          .from('accounts')
          .select('*');

        if (active && accountsData) {
          setAccounts(accountsData.map((a: any) => ({
            id: a.id,
            name: a.name,
            balance: Number(a.balance),
            initialBalance: Number(a.initial_balance),
            isActive: a.is_active
          })));
        }

        // 2. Load transactions of that specific month/year from Supabase
        const startDate = `${fechamento.ano}-${String(fechamento.mes).padStart(2, '0')}-01`;
        const lastDay = new Date(fechamento.ano, fechamento.mes, 0).getDate();
        const endDate = `${fechamento.ano}-${String(fechamento.mes).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        const { data: txsData } = await supabase
          .from('transactions')
          .select('*')
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true });

        if (active && txsData) {
          setTransactions(txsData.map((t: any) => ({
            id: t.id,
            type: t.type,
            category: t.category,
            accountId: t.account_id,
            destinationAccountId: t.destination_account_id || undefined,
            amount: Number(t.amount),
            paymentMethod: t.payment_method,
            description: t.description,
            originName: t.origin_name,
            destinationName: t.destination_name,
            date: t.date,
            status: t.status,
            userId: t.user_id || '',
            createdAt: t.created_at
          })));
        }
      } catch (err) {
        console.error('Erro ao buscar dados do fechamento no Supabase:', err);
      }
    };

    loadReportData();
    return () => {
      active = false;
    };
  }, [fechamento.ano, fechamento.mes]);

  // Aggregated card totals
  const totalEntradas = transactions
    .filter(t => t.type === 'ENTRADA' && t.status !== 'CANCELLED')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSaidas = transactions
    .filter(t => t.type === 'SAIDA' && t.status !== 'CANCELLED' && !(t.category === 'REEMBOLSO' && t.status === 'AWAITING_REIMBURSEMENT'))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalTransferencias = transactions
    .filter(t => t.type === 'TRANSFERENCIA' && t.status !== 'CANCELLED')
    .reduce((sum, t) => sum + t.amount, 0);

  // Filtered transactions for the display table
  const filteredTransactions = transactions.filter(tx => {
    const matchesAccount = selectedAccountFilter === 'ALL' || tx.accountId === selectedAccountFilter || tx.destinationAccountId === selectedAccountFilter;
    const matchesType = selectedTypeFilter === 'ALL' || tx.type === selectedTypeFilter;
    const matchesPayment = selectedPaymentFilter === 'ALL' || tx.paymentMethod === selectedPaymentFilter;
    return matchesAccount && matchesType && matchesPayment;
  });

  // Sorted transactions
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortBy === 'date') {
      const valA = new Date(a.date).getTime();
      const valB = new Date(b.date).getTime();
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    } else {
      return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
    }
  });

  const toggleSort = (field: 'date' | 'amount') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Export CSV Action
  const handleExportCSV = () => {
    const escapeCSV = (str: string) => `"${str.replace(/"/g, '""')}"`;
    
    const headers = ['Data', 'Tipo', 'Origem', 'Destino', 'Metodo Pagamento', 'Categoria', 'Descricao', 'Valor (R$)'];
    const rows = transactions.map(tx => {
      const { origin, destination } = getTransactionNames(tx, accounts);
      return [
        tx.date,
        tx.type,
        origin,
        destination,
        tx.paymentMethod,
        tx.category,
        tx.description,
        tx.amount
      ].map(val => escapeCSV(String(val))).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Demonstrativo_Financeiro_${fechamento.mes}_${fechamento.ano}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Landscape PDF Report
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
      const docWidth = doc.internal.pageSize.getWidth();

      // Top logo/brand header
      doc.setFillColor(15, 23, 42); // slate 900
      doc.rect(0, 0, docWidth, 40, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('CAIXINHA PRO', 20, 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 200);
      doc.text('ACOMPANHAMENTO CONCILIADO E AUDITORIA MENSAL', 20, 26);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text(`COMPETÊNCIA: ${getMonthName(fechamento.mes).toUpperCase()} / ${fechamento.ano}`, docWidth - 20, 20, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(200, 200, 200);
      doc.text(`STATUS: PERÍODO TRANCADO COM SUCESSO`, docWidth - 20, 26, { align: 'right' });

      // Core Information Fields
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('DADOS GERAIS DO FECHAMENTO:', 20, 52);

      doc.setFont('helvetica', 'normal');
      doc.text(`Responsável pelo encerramento: `, 20, 58);
      doc.setFont('helvetica', 'bold');
      doc.text(`${fechamento.criadoPor}`, 75, 58);

      doc.setFont('helvetica', 'normal');
      doc.text(`Data do processamento: `, 20, 64);
      doc.setFont('helvetica', 'bold');
      doc.text(`${new Date(fechamento.dataCriacao).toLocaleString('pt-BR')}`, 60, 64);

      doc.setFont('helvetica', 'normal');
      doc.text(`Bypass Administrativo (Forçado): `, docWidth - 110, 58);
      doc.setFont('helvetica', 'bold');
      doc.text(`${fechamento.forcado ? 'SIM (Contém pendências relevadas)' : 'NÃO (100% Conciliado)'}`, docWidth - 55, 58);

      doc.setFont('helvetica', 'normal');
      doc.text(`Resultado Líquido Consolidado: `, docWidth - 110, 64);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(fechamento.resultadoLiquidoGeral >= 0 ? 16 : 220, fechamento.resultadoLiquidoGeral >= 0 ? 124 : 38, fechamento.resultadoLiquidoGeral >= 0 ? 65 : 38);
      doc.text(`${formatCurrency(fechamento.resultadoLiquidoGeral)}`, docWidth - 55, 64);

      // Section 1: Accounts Snapshots Table
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('SNAPSHOT CONTÁBIL POR CAIXINHA (Saldos Consolidados)', 20, 78);

      const accountsHeaders = [['Nome do Caixinha', 'Saldo Inicial', 'Entradas (+)', 'Saídas (-)', 'Transf. Rec.', 'Transf. Env.', 'Saldo Final', 'Status']];
      const accountsRows = fechamento.contas.map(c => [
        c.accountName,
        formatCurrency(c.saldoInicial),
        formatCurrency(c.totalEntradas),
        formatCurrency(c.totalSaidas),
        formatCurrency(c.totalTransfRecebidas),
        formatCurrency(c.totalTransfEnviadas),
        formatCurrency(c.saldoFinal),
        c.pendencias.length > 0 ? `${c.pendencias.length} pendências` : '100% Conciliado'
      ]);

      autoTable(doc, {
        head: accountsHeaders,
        body: accountsRows,
        startY: 83,
        theme: 'striped',
        headStyles: { fillColor: [51, 65, 85] },
        styles: { fontSize: 8, cellPadding: 2.5 },
        margin: { left: 20, right: 20 }
      });

      // Section 2: All Monthly Transactions Table
      const nextY = (doc as any).lastAutoTable.finalY + 15;
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('RELAÇÃO DE MOVIMENTAÇÕES NO PERÍODO', 20, nextY);

      const txHeaders = [['Data', 'Tipo', 'Origem', 'Destino', 'Meio', 'Categoria', 'Descrição', 'Valor']];
      const txRows = transactions.map(tx => {
        const { origin, destination } = getTransactionNames(tx, accounts);
        return [
          tx.date,
          tx.type,
          origin,
          destination,
          tx.paymentMethod,
          tx.category,
          tx.description,
          formatCurrency(tx.amount)
        ];
      });

      autoTable(doc, {
        head: txHeaders,
        body: txRows,
        startY: nextY + 5,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 7, cellPadding: 2 },
        margin: { left: 20, right: 20 }
      });

      // Print footer information on each page if necessary
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Gerado eletronicamente pelo módulo de Auditoria Caixinha Pro. Dados criptografados e assegurados.', 20, doc.internal.pageSize.getHeight() - 10);

      // Save complete file
      doc.save(`Relatorio_Fechamento_${fechamento.mes}_${fechamento.ano}.pdf`);
    } catch (e) {
      console.error('Error generating PDF reports inside ClosingReport:', e);
      alert('Erro ao tentar exportar relatório em formato PDF.');
    }
  };

  return (
    <div id="closing-report-main-view" className="space-y-6">
      
      {/* 1. Elegant Header Area */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        
        {/* Subtle geometric circles decor */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-slate-800/20 rounded-full blur-2xl pointer-events-none" />
        
        {/* Left header detail */}
        <div className="space-y-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400 border border-emerald-500/30">
              <Lock className="w-5 h-5 text-emerald-400 animate-pulse" />
            </span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 bg-emerald-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold text-emerald-400 uppercase tracking-widest border border-emerald-500/40">
                PERÍODO TRANCADO
              </span>
              {fechamento.forcado && (
                <span className="inline-flex items-center gap-1 bg-amber-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold text-amber-400 uppercase tracking-widest border border-amber-500/40">
                  BYPASS ATIVO
                </span>
              )}
            </div>
          </div>

          <div>
            <h2 id="report-competence-title" className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Demonstrativo Contábil
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Competência consolidada de <strong className="text-white">{getMonthName(fechamento.mes)} de {fechamento.ano}</strong>
            </p>
          </div>
        </div>

        {/* Center / Right general details */}
        <div className="grid grid-cols-2 gap-4 md:gap-8 bg-slate-950/40 border border-slate-800 p-4 rounded-2xl max-w-md w-full">
          <div>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block">Consolidador</span>
            <span className="text-xs font-bold text-slate-200 mt-1 flex items-center gap-1.5 break-all">
              <User className="w-3.5 h-3.5 text-slate-400" />
              {fechamento.criadoPor}
            </span>
          </div>

          <div>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block">Data Processamento</span>
            <span className="text-xs font-bold text-slate-200 mt-1 flex items-center gap-1.5 font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {new Date(fechamento.dataCriacao).toLocaleDateString()}
            </span>
          </div>

          <div className="col-span-2 border-t border-slate-800/60 pt-3">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block">Resultado Comercial Líquido</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className={`text-base font-extrabold font-mono ${fechamento.resultadoLiquidoGeral >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrency(fechamento.resultadoLiquidoGeral)}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold font-mono">
                {fechamento.totalMovimentacoes} transações registradas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Export Actions Panel */}
      <div className="bg-white rounded-2xl border border-gray-150 p-4 shadow-3xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4.5 h-4.5 text-gray-500" />
          <span className="text-xs font-bold text-gray-800">Exportações Disponíveis para Auditoria:</span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            id="export-csv-report-btn"
            type="button"
            onClick={handleExportCSV}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-100 rounded-xl text-xs font-bold transition cursor-pointer shadow-3xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Baixar CSV
          </button>
          
          <button
            id="export-pdf-report-btn"
            type="button"
            onClick={handleExportPDF}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-3xs"
          >
            <FileText className="w-4 h-4 text-slate-300" />
            Baixar PDF Completo
          </button>

          {onBack && (
            <button
              id="back-report-btn"
              type="button"
              onClick={onBack}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition cursor-pointer border border-gray-200"
            >
              Voltar
            </button>
          )}
        </div>
      </div>

      {/* 3. Stat General Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Entradas */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-3xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">Registros de Crédito</span>
            <span className="text-lg font-extrabold text-emerald-600 font-mono">+{formatCurrency(totalEntradas)}</span>
          </div>
          <span className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </span>
        </div>

        {/* Saídas */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-3xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">Despesas Consolidadas</span>
            <span className="text-lg font-extrabold text-rose-600 font-mono">-{formatCurrency(totalSaidas)}</span>
          </div>
          <span className="p-2.5 bg-rose-50 rounded-xl border border-rose-100 text-rose-600">
            <TrendingDown className="w-5 h-5" />
          </span>
        </div>

        {/* Transferências */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-3xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">Transferências Internas</span>
            <span className="text-lg font-extrabold text-sky-600 font-mono">{formatCurrency(totalTransferencias)}</span>
          </div>
          <span className="p-2.5 bg-sky-50 rounded-xl border border-sky-100 text-sky-600">
            <Shuffle className="w-5 h-5" />
          </span>
        </div>

        {/* Resultado Liquido */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-3xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">Resultado Líquido</span>
            <span className={`text-lg font-extrabold font-mono ${fechamento.resultadoLiquidoGeral >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatCurrency(fechamento.resultadoLiquidoGeral)}
            </span>
          </div>
          <span className={`p-2.5 rounded-xl border ${
            fechamento.resultadoLiquidoGeral >= 0 
              ? 'bg-emerald-50/50 border-emerald-100 text-emerald-700' 
              : 'bg-rose-50/50 border-rose-100 text-rose-700'
          }`}>
            <TrendingUp className="w-5 h-5" />
          </span>
        </div>

      </div>

      {/* 4. Accounts Snapshot Board */}
      <div className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-3xs">
        <div className="px-5 py-4 border-b border-gray-100 bg-neutral-50/60 flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-widest flex items-center gap-1.5">
              <FolderLock className="w-4 h-4 text-gray-600" />
              Saldos De Snapshot Por Caixinha
            </h4>
            <p className="text-[10px] text-gray-500 font-medium">Relatório de valores de abertura e fechamento físico do mês.</p>
          </div>
          <span className="text-[10px] text-gray-500 font-bold bg-white px-2.5 py-1 rounded-lg border border-gray-200">
            {fechamento.contas.length} contas
          </span>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {fechamento.contas.map((snap) => (
            <div key={snap.accountId} className="border border-gray-150 p-4 rounded-xl bg-white space-y-3 shadow-3xs">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-xs font-extrabold text-gray-950 block">{snap.accountName}</span>
                {snap.pendencias.length > 0 ? (
                  <span className="inline-flex text-[9px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100">
                    {snap.pendencias.length} pendências toleradas
                  </span>
                ) : (
                  <span className="inline-flex text-[9px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100">
                    Ok
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[9px] text-gray-400 font-bold uppercase block">Saldo Inicial</span>
                  <span className="font-bold text-gray-800 font-mono">{formatCurrency(snap.saldoInicial)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 font-bold uppercase block">Saldo Final</span>
                  <span className="font-extrabold text-gray-950 font-mono">{formatCurrency(snap.saldoFinal)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-dashed border-gray-100 pt-3">
                <div className="text-emerald-700">
                  <span className="block text-gray-400 uppercase text-[9px]">Receitas</span>
                  <strong className="font-mono">{formatCurrency(snap.totalEntradas)}</strong>
                </div>
                <div className="text-rose-700">
                  <span className="block text-gray-400 uppercase text-[9px]">Despesas</span>
                  <strong className="font-mono">{formatCurrency(snap.totalSaidas)}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Transactions Table with Filters & Sorting */}
      <div className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-3xs">
        
        {/* Table title header */}
        <div className="px-5 py-4 border-b border-gray-100 bg-neutral-50/60 flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 id="report-tx-flow-title" className="text-xs font-extrabold text-gray-900 uppercase tracking-widest flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-gray-600" />
              Lançamentos Consolidados
            </h4>
            <p className="text-[10px] text-gray-500 font-medium">Use os filtros para pesquisar as transações incluídas no snapshot.</p>
          </div>
          <span className="text-[10px] text-gray-500 font-semibold font-mono">
            Exibindo {sortedTransactions.length} de {transactions.length} lançamentos
          </span>
        </div>

        {/* Filters bar */}
        <div className="p-4 border-b border-gray-100 bg-neutral-50/20 grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          <div className="space-y-1">
            <label htmlFor="filter-conta-select" className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest">Caixinha / Conta</label>
            <select
              id="filter-conta-select"
              value={selectedAccountFilter}
              onChange={(e) => setSelectedAccountFilter(e.target.value)}
              className="w-full text-xs font-bold border border-gray-200 hover:border-black rounded-lg p-2 bg-white cursor-pointer transition focus:outline-hidden"
            >
              <option value="ALL">Todas as Contas</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="filter-tipo-select" className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest">Tipo de Lançamento</label>
            <select
              id="filter-tipo-select"
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="w-full text-xs font-bold border border-gray-200 hover:border-black rounded-lg p-2 bg-white cursor-pointer transition focus:outline-hidden"
            >
              <option value="ALL">Todos os Tipos</option>
              <option value="ENTRADA">Crédito (Entrada)</option>
              <option value="SAIDA">Débito (Saída)</option>
              <option value="TRANSFERENCIA">Transferência</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="filter-metodo-select" className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest">Método</label>
            <select
              id="filter-metodo-select"
              value={selectedPaymentFilter}
              onChange={(e) => setSelectedPaymentFilter(e.target.value)}
              className="w-full text-xs font-bold border border-gray-200 hover:border-black rounded-lg p-2 bg-white cursor-pointer transition focus:outline-hidden"
            >
              <option value="ALL">Todos os Métodos</option>
              <option value="PIX">PIX</option>
              <option value="DINHEIRO">Dinheiro</option>
            </select>
          </div>

        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table id="monthly-report-table" className="w-full border-collapse text-left text-xs text-gray-500">
            <thead className="bg-neutral-50 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-150 select-none">
              <tr>
                <th 
                  onClick={() => toggleSort('date')}
                  className="px-5 py-3 cursor-pointer hover:bg-neutral-100 hover:text-black transition"
                >
                  <div className="flex items-center gap-1">
                    <span>Data</span>
                    {sortBy === 'date' ? (
                      sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                    ) : null}
                  </div>
                </th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Origem → Destino</th>
                <th className="px-5 py-3">Método</th>
                <th className="px-5 py-3">Categoria</th>
                <th className="px-5 py-3">Descrição</th>
                <th 
                  onClick={() => toggleSort('amount')}
                  className="px-5 py-3 text-right cursor-pointer hover:bg-neutral-100 hover:text-black transition"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Valor</span>
                    {sortBy === 'amount' ? (
                      sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                    ) : null}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 bg-white">
              {sortedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400 font-semibold italic text-xs">
                    Nenhum lançamento corresponde aos filtros ativos.
                  </td>
                </tr>
              ) : (
                sortedTransactions.map((tx) => {
                  const { origin, destination } = getTransactionNames(tx, accounts);

                  return (
                    <tr key={tx.id} className="hover:bg-neutral-50/50 transition">
                      <td className="px-5 py-3.5 font-semibold text-gray-900 whitespace-nowrap">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {tx.type === 'ENTRADA' && (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-100 uppercase">
                            Entrada
                          </span>
                        )}
                        {tx.type === 'SAIDA' && (
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-rose-100 uppercase">
                            Saída
                          </span>
                        )}
                        {tx.type === 'TRANSFERENCIA' && (
                          <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-sky-100 uppercase">
                            Transferência
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-gray-700">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-gray-950 text-xs">{origin}</span>
                          <ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="font-medium text-gray-600 text-xs">{destination}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap font-bold text-gray-800 uppercase text-[10px]">
                        {tx.paymentMethod}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-[10px] uppercase font-bold text-gray-400">
                        {tx.category}
                      </td>
                      <td className="px-5 py-3.5 text-[11px] font-semibold text-gray-700 max-w-[200px] truncate" title={tx.description}>
                        {tx.description}
                      </td>
                      <td className={`px-5 py-3.5 text-right font-extrabold font-mono whitespace-nowrap text-xs ${
                        tx.type === 'ENTRADA' ? 'text-emerald-700' : tx.type === 'SAIDA' ? 'text-rose-700' : 'text-gray-800'
                      }`}>
                        {tx.type === 'ENTRADA' ? `+${formatCurrency(tx.amount)}` : tx.type === 'SAIDA' ? `-${formatCurrency(tx.amount)}` : formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
