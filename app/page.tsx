'use client';

import React, { useState, useEffect } from 'react';
import { useFinancialState } from '../hooks/useFinancialState';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency, formatDate, getTransactionNames } from '../utils/formatters';
import { MonthlySummaryCards } from '../components/MonthlySummaryCards';
import { RecentTransactionsList } from '../components/RecentTransactionsList';
import { TransactionModal } from '../components/TransactionModal';
import { FiltersBar } from '../components/FiltersBar';
import { ClosingPanel } from '../components/ClosingPanel';
import { AccountManager } from '../components/AccountManager';
import { UserManager } from '../components/UserManager';
import { SettlementCard } from '../components/SettlementCard';
import { ReimbursementCard } from '../components/ReimbursementCard';
import { PendingSettlementsModal } from '../components/PendingSettlementsModal';
import { PendingReimbursementsModal } from '../components/PendingReimbursementsModal';
import { EditTransactionModal } from '../components/EditTransactionModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  Plus,
  Printer,
  LayoutDashboard,
  ArrowRightLeft,
  FileSpreadsheet,
  Users,
  Briefcase,
  HelpCircle,
  FileCheck2,
  CalendarDays,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  Trash2,
  Edit2
} from 'lucide-react';

export default function Home() {
  const {
    currentUser,
    accounts,
    transactions,
    settlements,
    reimbursements,
    closings,
    globalTotalBalance,
    addTransaction,
    cancelTransaction,
    editTransaction,
    deleteTransaction,
    resolveSettlement,
    requestReimbursement,
    payReimbursement,
    rejectReimbursement,
    closeMonth,
    toggleUserRole,
    addAccount,
    updateAccount,
    deleteAccount,
    toggleAccountActive,
    resetSystem,
  } = useFinancialState();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'closings' | 'users' | 'accounts'>('dashboard');
  const [toastError, setToastError] = useState<string | null>(null);
  const { user, loading, logout } = useAuth();

  // Route protection
  useEffect(() => {
    if (!loading && !user) {
      window.location.replace('/login');
    }
  }, [user, loading]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);
  const [isPendingSettlementsOpen, setIsPendingSettlementsOpen] = useState(false);
  const [isPendingReimbursementsOpen, setIsPendingReimbursementsOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  // Filters for Transactions history page
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const isAdmin = currentUser.role === 'ADMIN';

  // Protect tabs navigation from standard USER role (allow 'closings' for USER as requested)
  useEffect(() => {
    if (!isAdmin && (activeTab === 'users' || activeTab === 'accounts')) {
      const activeTimer = setTimeout(() => {
        setActiveTab('dashboard');
        setToastError('Acesso negado. Apenas administradores podem acessar usuários ou contas.');
      }, 0);
      const timer = setTimeout(() => setToastError(null), 4005);
      return () => {
        clearTimeout(activeTimer);
        clearTimeout(timer);
      };
    }
  }, [activeTab, isAdmin]);

  // Apply filters
  const filteredTxs = transactions.filter((tx) => {
    // Account Check
    if (selectedAccountId && tx.accountId !== selectedAccountId && tx.destinationAccountId !== selectedAccountId) {
      return false;
    }
    // Type Check
    if (selectedType && tx.type !== selectedType) {
      return false;
    }
    // Search Check (description, destinationName, originName)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const { origin, destination } = getTransactionNames(tx, accounts);
      const matchesDesc = tx.description?.toLowerCase().includes(q);
      const matchesDest = destination.toLowerCase().includes(q);
      const matchesOrig = origin.toLowerCase().includes(q);
      if (!matchesDesc && !matchesDest && !matchesOrig) {
        return false;
      }
    }
    // Date Check (Exact Match)
    if (startDate && tx.date !== startDate) {
      return false;
    }
    return true;
  });

  // Paginated elements
  const totalPages = Math.ceil(filteredTxs.length / itemsPerPage) || 1;
  const paginatedTxs = filteredTxs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getAccountName = (id: string) => {
    return accounts.find((a) => a.id === id)?.name || id;
  };

  const handleExportCSV = () => {
    try {
      if (filteredTxs.length === 0) {
        alert('Nenhum lançamento encontrado para os critérios de filtro atuais.');
        return;
      }

      const headers = [
        'ID',
        'Data',
        'Tipo',
        'Categoria de Saída',
        'Conta / Caixinha Origem',
        'Conta / Caixinha Destino',
        'Valor (R$)',
        'Forma de Pagamento',
        'Descrição',
        'Operador / Origem',
        'Destinatário / Beneficiário',
        'Status'
      ];

      const escapeCSV = (val: string | number | undefined | null) => {
        if (val === null || val === undefined) return '';
        let str = String(val);
        if (str.includes('"') || str.includes(';') || str.includes('\n') || str.includes('\r')) {
          str = '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      };

      const rows = filteredTxs.map((tx) => {
        // Format date from YYYY-MM-DD to DD/MM/YYYY
        let formattedDate = tx.date;
        if (tx.date && tx.date.includes('-')) {
          const parts = tx.date.split('-');
          if (parts.length === 3) {
            formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
          }
        }

        // Format amount for Portuguese Excel (e.g. 1250.50 -> 1250,50)
        const formattedAmount = tx.amount.toFixed(2).replace('.', ',');

        // Map status to friendly PT-BR text
        let statusText = 'Liquidado';
        if (tx.status === 'AWAITING_SETTLEMENT') statusText = 'Pendente Prestação';
        if (tx.status === 'AWAITING_REIMBURSEMENT') statusText = 'Pendente Reembolso';
        if (tx.status === 'CANCELLED') statusText = 'Cancelado';

        // Map category
        let categoryText = '-';
        if (tx.type === 'SAIDA') {
          if (tx.category === 'SAIDA_DIRETA') categoryText = 'Saída Direta';
          if (tx.category === 'ADIANTAMENTO') categoryText = 'Adiantamento';
          if (tx.category === 'REEMBOLSO') categoryText = 'Reembolso';
        }

        const { origin, destination } = getTransactionNames(tx, accounts);

        return [
          tx.id,
          formattedDate,
          tx.type,
          categoryText,
          getAccountName(tx.accountId),
          tx.destinationAccountId ? getAccountName(tx.destinationAccountId) : '-',
          formattedAmount,
          tx.paymentMethod,
          tx.description || '',
          origin || '',
          destination || '',
          statusText
        ];
      });

      // Construct CSV with semicolon separator
      const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.map(escapeCSV).join(';'))
      ].join('\r\n');

      // Use a BOM (\ufeff) so that Excel opens it correctly with UTF-8 encoding
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // Filename depending on filters
      let filename = 'relatorio_movimentacoes';
      if (selectedAccountId) {
        const accName = getAccountName(selectedAccountId).toLowerCase().replace(/\s+/g, '_');
        filename += `_${accName}`;
      }
      if (startDate) {
        filename += `_${startDate}`;
      }
      filename += '.csv';

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro ao exportar excel:', error);
      alert('Ocorreu um erro ao gerar o arquivo de exportação.');
    }
  };

  const handlePrintStatus = () => {
    const printYear = 2026;
    const printMonth = 5;
    const printMonthName = 'Maio';

    const currentMonthTxs = transactions.filter(tx => {
      if (tx.status === 'CANCELLED') return false;
      const txDate = new Date(tx.date);
      const y = txDate.getUTCFullYear();
      const m = txDate.getUTCMonth() + 1;
      return y === printYear && m === printMonth;
    });

    const totalEntradas = currentMonthTxs
      .filter(tx => tx.type === 'ENTRADA')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalSaidas = currentMonthTxs
      .filter(tx => tx.type === 'SAIDA')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const pendingSettlementCount = settlements.filter(s => s.status === 'PENDING').length;
    const pendingReimbursementsCount = reimbursements.filter(r => r.status === 'PENDING').length;

    const totalActiveBalance = accounts
      .filter(acc => acc.isActive !== false)
      .reduce((sum, acc) => sum + acc.balance, 0);

    const printAccountsRows = accounts.map(acc => {
      const statusLabel = acc.isActive !== false ? 'ATIVA' : 'INATIVA';
      const statusClass = acc.isActive !== false ? 'status-ativa' : 'status-inativa';
      return `
        <tr>
          <td style="font-weight: 600; font-size: 13px;">${acc.name}</td>
          <td><span class="badge-status ${statusClass}">${statusLabel}</span></td>
          <td style="font-weight: bold; text-align: right; font-size: 13px;">${formatCurrency(acc.balance)}</td>
        </tr>
      `;
    }).join('');

    const sortedTxs = [...currentMonthTxs].sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      if (timeA !== timeB) {
        return timeB - timeA;
      }
      const createA = new Date(a.createdAt || '').getTime();
      const createB = new Date(b.createdAt || '').getTime();
      return createB - createA;
    });

    const printTxsRows = sortedTxs.map(tx => {
      const { origin, destination } = getTransactionNames(tx, accounts);
      const dateFormatted = tx.date.split('-').reverse().join('/');
      
      let typeClass = '';
      let typeLabel = '';
      if (tx.type === 'ENTRADA') {
        typeClass = 'status-tx-entrada';
        typeLabel = 'Entrada';
      } else if (tx.type === 'SAIDA') {
        typeClass = 'status-tx-saida';
        typeLabel = 'Saída';
      } else {
        typeClass = 'status-tx-transferencia';
        typeLabel = 'Transf.';
      }

      const catLabel = tx.type === 'SAIDA' ? (
        tx.category === 'SAIDA_DIRETA' ? 'Saída Direta' :
        tx.category === 'ADIANTAMENTO' ? 'Adiantamento' :
        tx.category === 'REEMBOLSO' ? 'Reembolso' : tx.category
      ) : '-';

      return `
        <tr>
          <td style="white-space: nowrap;">${dateFormatted}</td>
          <td><span class="${typeClass}">${typeLabel}</span></td>
          <td>${origin} ➔ ${destination}</td>
          <td>${tx.paymentMethod}</td>
          <td>${catLabel}</td>
          <td>${tx.description || '-'}</td>
          <td style="font-weight: 600; text-align: right;" class="${typeClass}">
            ${tx.type === 'SAIDA' ? '-' : ''}${formatCurrency(tx.amount)}
          </td>
        </tr>
      `;
    }).join('');

    const printTxsContent = printTxsRows.length > 0 ? printTxsRows : `
      <tr>
        <td colspan="7" style="text-align: center; color: #64748b; padding: 20px;">Nenhuma movimentação registrada no período.</td>
      </tr>
    `;

    const generationDateTime = new Date().toLocaleString('pt-BR');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>SITUAÇÃO ATUAL — ${printMonthName.toUpperCase()} / ${printYear}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 15mm 15mm;
          }
          
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 0;
            background-color: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          /* Non-printed action bar */
          .no-print-actions {
            background-color: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            padding: 12px 30px;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
          }
          
          .btn-action {
            padding: 8px 16px;
            font-size: 12px;
            font-weight: bold;
            border-radius: 6px;
            cursor: pointer;
            transition: all 150ms;
          }
          
          .btn-print {
            background-color: #0f172a;
            color: #ffffff;
            border: none;
          }
          
          .btn-print:hover {
            background-color: #1e293b;
          }
          
          .btn-close {
            background-color: #ffffff;
            color: #0f172a;
            border: 1px solid #cbd5e1;
          }
          
          .btn-close:hover {
            background-color: #f1f5f9;
          }

          /* Printable container */
          .logo-box {
            background-color: #ffffff;
            color: #0f172a;
            padding: 6px 12px;
            border-radius: 6px;
            font-weight: 900;
            font-size: 12px;
            letter-spacing: -0.05em;
            display: inline-block;
          }
          
          .header-hero {
            background-color: #0f172a;
            color: #ffffff;
            padding: 24px 30px;
            border-radius: 12px;
            margin: 20px 30px 0 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .header-hero h1 {
            margin: 0;
            font-size: 18px;
            font-weight: 800;
            letter-spacing: -0.025em;
          }
          
          .header-hero .subtitle {
            margin: 4px 0 0 0;
            font-size: 10px;
            color: #cbd5e1;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .header-right {
            text-align: right;
          }

          .header-right .title-session {
            font-size: 16px;
            font-weight: 900;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 10px;
          }

          .header-right .meta-date {
            font-size: 10px;
            color: #cbd5e1;
            margin-top: 4px;
            font-weight: 500;
          }

          .badge-open {
            background-color: #10b981;
            color: #ffffff;
            font-size: 10px;
            font-weight: 800;
            padding: 2px 8px;
            border-radius: 9999px;
            letter-spacing: 0.05em;
          }
          
          .print-content {
            padding: 24px 30px;
          }
          
          .section {
            margin-bottom: 30px;
          }
          
          .section-title {
            font-size: 12px;
            font-weight: 850;
            color: #0f172a;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 6px;
            margin-bottom: 16px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          
          /* Seção 1 - Grid */
          .grid-kv {
            display: grid;
            grid-template-cols: repeat(4, 1fr);
            gap: 16px;
          }
          
          .card-kv {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
          }
          
          .card-kv-label {
            font-size: 9px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          
          .card-kv-value {
            font-size: 20px;
            font-weight: 950;
            margin-top: 6px;
            display: block;
          }
          
          .color-entradas { color: #10b981; }
          .color-saidas { color: #f43f5e; }
          .color-prestacao { color: #d97706; }
          .color-reembolso { color: #8b5cf6; }
          
          /* Tables */
          table {
            width: 100%;
            border-collapse: collapse;
          }
          
          th {
            background-color: #1e293b;
            color: #ffffff;
            font-size: 10px;
            font-weight: 700;
            text-align: left;
            padding: 8px 12px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          
          td {
            padding: 8px 12px;
            font-size: 11px;
            border-bottom: 1px solid #e2e8f0;
          }
          
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          
          .total-row {
            background-color: #cbd5e1 !important;
            font-weight: bold;
          }
          
          .total-row td {
            font-size: 12px;
            border-top: 2px solid #0f172a;
            border-bottom: 2px solid #0f172a;
            padding: 10px 12px;
          }
          
          .badge-status {
            font-size: 9px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
            display: inline-block;
          }
          
          .status-ativa {
            background-color: #d1fae5;
            color: #065f46;
          }
          
          .status-inativa {
            background-color: #fee2e2;
            color: #991b1b;
          }
          
          .status-tx-entrada { color: #10b981; font-weight: 700; }
          .status-tx-saida { color: #f43f5e; font-weight: 700; }
          .status-tx-transferencia { color: #3b82f6; font-weight: 700; }
          
          .print-footer {
            text-align: center;
            font-size: 9px;
            color: #64748b;
            margin-top: 40px;
            border-top: 1px dashed #e2e8f0;
            padding-top: 16px;
          }
          
          @media print {
            .no-print-actions {
              display: none !important;
            }
            body {
              margin: 0;
              padding: 0;
            }
            .header-hero {
              margin: 0 0 20px 0;
              box-shadow: none;
              border-radius: 0;
            }
            .print-content {
              padding: 0;
            }
            .section {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print-actions">
          <button class="btn-action btn-close" onclick="window.close()">Fechar Janela</button>
          <button class="btn-action btn-print" onclick="window.print()">Imprimir PDF / Papel</button>
        </div>
        
        <div class="header-hero">
          <div>
            <div class="logo-box">Caixinha Pro</div>
            <h1>CAIXINHA PRO</h1>
            <p class="subtitle">Responsável Logado: ${currentUser.name} • Perfil: ${currentUser.role}</p>
          </div>
          <div class="header-right">
            <div class="title-session">
              <span>SITUAÇÃO ATUAL — ${printMonthName.toUpperCase()} / ${printYear}</span>
              <span class="badge-open">PERÍODO ABERTO</span>
            </div>
            <p class="meta-date">Gerado em: ${generationDateTime}</p>
          </div>
        </div>
        
        <div class="print-content">
          <!-- SEÇÃO 1 -->
          <div class="section">
            <div class="section-title">Seção 1 — Resumo do mês vigente</div>
            <div class="grid-kv">
              <div class="card-kv">
                <span class="card-kv-label">Entradas do mês</span>
                <span class="card-kv-value color-entradas">${formatCurrency(totalEntradas)}</span>
              </div>
              <div class="card-kv">
                <span class="card-kv-label">Saídas do mês</span>
                <span class="card-kv-value color-saidas">${formatCurrency(totalSaidas)}</span>
              </div>
              <div class="card-kv">
                <span class="card-kv-label">Pendentes Prestação</span>
                <span class="card-kv-value color-prestacao">${pendingSettlementCount}</span>
              </div>
              <div class="card-kv">
                <span class="card-kv-label">Pendentes Reembolso</span>
                <span class="card-kv-value color-reembolso">${pendingReimbursementsCount}</span>
              </div>
            </div>
          </div>
          
          <!-- SEÇÃO 2 -->
          <div class="section">
            <div class="section-title">Seção 2 — Saldo por Conta</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 50%;">Nome da Conta</th>
                  <th style="width: 25%;">Status</th>
                  <th style="width: 25%; text-align: right;">Saldo Atual</th>
                </tr>
              </thead>
              <tbody>
                ${printAccountsRows}
                <tr class="total-row">
                  <td colspan="2" style="font-weight: 800;">Saldo Consolidado Geral (Contas Ativas)</td>
                  <td style="text-align: right; font-weight: 950; color: #0f172a;">${formatCurrency(totalActiveBalance)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- SEÇÃO 3 -->
          <div class="section">
            <div class="section-title">Seção 3 — Movimentações do mês vigente</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 10%;">Data</th>
                  <th style="width: 10%;">Tipo</th>
                  <th style="width: 25%;">Origem ➔ Destino</th>
                  <th style="width: 15%;">Método</th>
                  <th style="width: 15%;">Categoria</th>
                  <th style="width: 15%;">Descrição</th>
                  <th style="width: 10%; text-align: right;">Valor</th>
                </tr>
              </thead>
              <tbody>
                ${printTxsContent}
              </tbody>
            </table>
          </div>
          
          <div class="print-footer">
            Gerado eletronicamente pelo módulo Caixinha Pro — dados em tempo real, não auditado
          </div>
        </div>
        
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Seu navegador bloqueou popups. Por favor, libere popups para poder imprimir o relatório.');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-950"></div>
          <span className="text-xs font-semibold text-gray-500">Buscando sessão...</span>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F5F3] font-sans antialiased text-gray-900 pb-20">
      
      {/* 1. Header Area block matching layout */}
      <header id="app-header-bar" className="bg-white border-b border-gray-100 py-4 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo and Operator Meta */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-neutral-900 rounded-xl text-white">
              <span className="font-extrabold text-base tracking-tighter">Caixinha Pro</span>
            </div>
            <div>
              <h1 className="text-base font-extrabold text-gray-950 tracking-tight leading-none">Caixinha Pro</h1>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="text-xs font-bold text-gray-500 capitalize bg-gray-100 px-1.5 py-0.5 rounded">
                  {currentUser.name} • {currentUser.role}
                </span>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse animate-duration-1000"></span>
                  <span>Supabase Ativo</span>
                </div>
                {isAdmin && (
                  <button
                    id="simulate-role-toggle-header"
                    onClick={toggleUserRole}
                    className="text-[11px] font-extrabold text-sky-600 hover:text-sky-800 underline cursor-pointer ml-1.5"
                    title="Mudar role"
                  >
                    (Classificar Perfil)
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Current global balance display */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 sm:gap-6 justify-end">
            <div className="text-right">
              <span className="text-xs font-extrabold text-gray-400 tracking-wider uppercase block">Saldo Consolidado Geral</span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
                {formatCurrency(globalTotalBalance)}
              </span>
            </div>

            {/* Button: Imprimir Situação Atual */}
            <button
              id="header-shortcut-print-status"
              onClick={handlePrintStatus}
              className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 rounded-xl text-sm font-bold transition shadow-xs hover:shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4 text-gray-500" />
              Imprimir Situação Atual
            </button>

            {/* Main CTA: Nuevo Lanzamiento */}
            <button
              id="header-shortcut-new-transaction"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-5 py-3 bg-neutral-950 text-white hover:bg-neutral-800 rounded-xl text-sm font-bold transition shadow-xs hover:shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Novo Lançamento
            </button>

            <button
              id="header-logout-btn"
              onClick={() => {
                setIsLogoutConfirmOpen(true);
              }}
              className="p-2.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-rose-600 transition cursor-pointer"
              title="Encerrar sessão"
            >
              <LogOut className="w-4 h-4 text-gray-400 hover:text-rose-500" />
            </button>
          </div>

        </div>
      </header>

      {/* 2. Primary Navigation Tabs block */}
      <div id="sub-page-nav-bar" className="bg-white border-b border-gray-100 px-6 md:px-12 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center overflow-x-auto gap-3 py-3 scrollbar-none">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'transactions', label: 'Movimentações', icon: ArrowRightLeft },
            { id: 'closings', label: 'Relatório / Fechamento', icon: CalendarDays },
            { id: 'users', label: 'Usuários', icon: Users },
            { id: 'accounts', label: 'Contas', icon: Briefcase },
          ].filter((tab) => {
            if (!isAdmin) {
              return tab.id === 'dashboard' || tab.id === 'transactions' || tab.id === 'closings';
            }
            return true;
          }).map((tab) => {
            const ActiveIcon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                id={`tab-select-${tab.id}`}
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold tracking-tight transition whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-neutral-900 text-white shadow-xs border border-transparent'
                    : 'text-gray-600 hover:bg-gray-100/80 hover:text-black border border-transparent'
                }`}
              >
                <ActiveIcon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Main Body Container */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 mt-8">
        
        {/* Render specific component views according to state selections */}
        {activeTab === 'dashboard' && (
          <div id="dashboard-content-grid" className="animate-fade-in space-y-6">
            
            {/* 4 Summary Counters */}
            <MonthlySummaryCards
              transactions={transactions}
              settlements={settlements}
              reimbursements={reimbursements}
              onPendingSettlementsClick={() => setIsPendingSettlementsOpen(true)}
              onPendingReimbursementsClick={() => setIsPendingReimbursementsOpen(true)}
            />

            {/* Split layout: Recent transactions on left, quick actions on right */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column (Main list of 5 recent ones) */}
              <div className="lg:col-span-2">
                <RecentTransactionsList
                  transactions={transactions}
                  accounts={accounts}
                  onDeleteTransaction={deleteTransaction}
                  isAdmin={isAdmin}
                  onViewAll={() => setActiveTab('transactions')}
                  onEditTransaction={setEditingTx}
                />
              </div>

              {/* Right Column: Saldo por Conta */}
              <div id="accounts-sidebar-card" className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-gray-950 tracking-tight mb-6">Saldo por Conta</h3>

                  <div className="space-y-4">
                    {accounts.filter(acc => acc.isActive !== false).map((acc, index) => {
                      // Indicadores de cores baseados na conta
                      const indicatorColors = [
                        'bg-violet-600', // Admin
                        'bg-amber-500',  // Logística
                        'bg-slate-400',  // Manutenção
                        'bg-blue-600',   // Principal
                        'bg-orange-500', // Produção
                        'bg-indigo-400', // RH
                      ];
                      const indicatorColor = indicatorColors[index % indicatorColors.length];

                      return (
                        <div key={acc.id} className="flex items-center justify-between py-1.5 animate-fade-in">
                          <div className="flex items-center gap-3.5">
                            {/* Barra vertical de status */}
                            <div className={`w-1.5 h-9 rounded-full ${indicatorColor}`} />
                            <div>
                              <span className="text-sm font-extrabold text-gray-950 block tracking-tight">
                                {acc.name}
                              </span>
                              <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest block mt-0.5">
                                ATIVA
                              </span>
                            </div>
                          </div>
                          <span className="text-sm md:text-base font-bold text-gray-950">
                            {formatCurrency(acc.balance)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {isAdmin && (
                  <div className="mt-8 pt-4">
                    <button
                      id="sidebar-manage-accounts-shortcut-btn"
                      onClick={() => setActiveTab('accounts')}
                      className="w-full py-3 border border-dashed border-sky-200 hover:border-sky-500 text-sky-600 hover:text-sky-800 rounded-xl text-sm font-bold transition text-center cursor-pointer bg-sky-50/20"
                    >
                      + Gerenciar Contas
                    </button>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div id="transactions-content" className="animate-fade-in space-y-4">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
              <div>
                <h2 className="text-lg font-extrabold text-gray-950 tracking-tight">Histórico Completo de Movimentações</h2>
                <p className="text-sm text-gray-500">Total de {filteredTxs.length} lançamentos encontrados neste período.</p>
              </div>
              <button
                id="export-excel-header-btn"
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 hover:border-black rounded-xl text-sm font-bold bg-white transition shadow-xs cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                Exportar Excel
              </button>
            </div>

            {/* Filter controls */}
            <FiltersBar
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              onSelectAccount={setSelectedAccountId}
              selectedType={selectedType}
              onSelectType={setSelectedType}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              startDate={startDate}
              onStartDateChange={setStartDate}
            />

            {/* Transactions lists and pagination parent container */}
            <div id="transactions-list-parent" className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs">
              <div className="divide-y divide-gray-100">
                {paginatedTxs.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 text-sm font-semibold">
                    Nenhuma movimentação corresponde aos critérios de pesquisa informados.
                  </div>
                ) : (
                  paginatedTxs.map((tx) => {
                    const isCancelled = tx.status === 'CANCELLED';
                    const isEntrada = tx.type === 'ENTRADA';
                    const isTransfer = tx.type === 'TRANSFERENCIA';

                    let textClass = 'text-gray-990';
                    let amountText = formatCurrency(tx.amount);

                    if (isCancelled) {
                      textClass = 'text-gray-400 line-through';
                    } else if (isEntrada) {
                      textClass = 'text-emerald-600 font-extrabold';
                      amountText = `+ ${amountText}`;
                    } else if (isTransfer) {
                      textClass = 'text-blue-600 font-extrabold';
                      amountText = `⇄ ${amountText}`;
                    } else {
                      textClass = 'text-rose-600 font-extrabold';
                      amountText = `- ${amountText}`;
                    }

                    const { origin, destination } = getTransactionNames(tx, accounts);

                    return (
                      <div
                        id={`tx-history-row-${tx.id}`}
                        key={tx.id}
                        className={`flex flex-col gap-2.5 p-5 hover:bg-neutral-50/50 transition duration-150 ${
                          isCancelled ? 'opacity-50' : ''
                        }`}
                      >
                        {/* Line 1: Flow Badge + Flow names on left, Amount on right */}
                        <div className="flex items-center justify-between gap-4 font-sans">
                          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                            {/* Flow Type Badge */}
                            {isCancelled ? (
                              <span className="inline-flex items-center bg-gray-100 text-gray-500 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-gray-200 uppercase tracking-wider">
                                ∅ Cancelado
                              </span>
                            ) : isEntrada ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-100/70 tracking-tight">
                                <span className="text-emerald-500 font-black">↓</span> Entrada
                              </span>
                            ) : isTransfer ? (
                              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-100/70 tracking-tight">
                                <span className="text-blue-500 font-black">⇄</span> Transf.
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-rose-100/70 tracking-tight">
                                <span className="text-rose-505 font-extrabold">↕</span> Saída
                              </span>
                            )}

                            {/* Names Flow: Origin Name (regular) → Destination Name (bold) */}
                            <div className="text-sm text-gray-905 flex items-center gap-1 truncate font-medium">
                              <span className="text-gray-500 truncate max-w-[150px] md:max-w-[240px]" title={origin}>
                                {origin}
                              </span>
                              <span className={`font-black mx-0.5 transition-colors ${
                                isCancelled ? 'text-gray-300 font-normal' :
                                isEntrada ? 'text-emerald-500 font-extrabold' :
                                isTransfer ? 'text-blue-500 font-extrabold' :
                                'text-rose-500 font-extrabold'
                              }`}>→</span>
                              <span className="text-gray-900 font-extrabold truncate max-w-[150px] md:max-w-[240px]" title={destination}>
                                {destination}
                              </span>
                            </div>
                          </div>

                          {/* Transaction Amount */}
                          <span className={`text-base md:text-lg font-black shrink-0 text-right ${textClass}`}>
                            {amountText}
                          </span>
                        </div>

                        {/* Line 2: Payment Badge + Category Badge + Description/Origin/Status indicators on left, Date on right */}
                        <div className="flex items-center justify-between gap-3 font-sans">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            {/* Payment Method badge */}
                            <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-sky-100 uppercase tracking-wide">
                              {tx.paymentMethod === 'PIX' ? '⇄ Pix' : '💵 Dinheiro'}
                            </span>

                            {/* Category Badge formatted as 'Ref: category' */}
                            <span className="inline-flex items-center bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-gray-200">
                              Ref: {tx.type === 'ENTRADA' ? 'entrada' : tx.type === 'TRANSFERENCIA' ? 'transferência' : tx.category.toLowerCase().replace('_', ' ')}
                            </span>

                            {/* Status Badge */}
                            <span
                              className={`inline-flex items-center text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                                tx.status === 'SETTLED'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                                  : tx.status === 'AWAITING_SETTLEMENT'
                                  ? 'bg-amber-50 text-amber-800 border-amber-100'
                                  : tx.status === 'AWAITING_REIMBURSEMENT'
                                  ? 'bg-violet-50 text-violet-800 border-violet-100'
                                  : 'bg-gray-100 text-gray-500 border-gray-200'
                              }`}
                            >
                              {tx.status === 'SETTLED'
                                ? 'Quitada'
                                : tx.status === 'AWAITING_SETTLEMENT'
                                ? 'Prestação Pend.'
                                : tx.status === 'AWAITING_REIMBURSEMENT'
                                ? 'Reembolso Soli.'
                                : 'Cancelada'}
                            </span>

                            {/* Description if any */}
                            {tx.description && (
                              <span className="text-xs text-gray-500 font-semibold truncate max-w-[200px] md:max-w-[320px]" title={tx.description}>
                                {tx.description}
                              </span>
                            )}

                            {/* Account indicator badge */}
                            <span className="text-[10px] text-gray-400 font-bold bg-neutral-50 border border-neutral-100/80 px-1.5 py-0.2 rounded-sm" title="Caixa responsável">
                              caixa: {getAccountName(tx.accountId)}
                              {tx.destinationAccountId && ` → ${getAccountName(tx.destinationAccountId)}`}
                            </span>
                          </div>

                          {/* Date and actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-gray-400 font-extrabold uppercase tracking-wide text-right">
                              {formatDate(tx.date)}
                            </span>

                            {/* Actions (Edit / Cancellation) */}
                            {currentUser.role === 'ADMIN' && (
                              <div className="flex items-center gap-1.5 ml-1 select-none">
                                <button
                                  id={`edit-tx-btn-history-${tx.id}`}
                                  onClick={() => setEditingTx(tx)}
                                  className="text-gray-300 hover:text-black hover:bg-gray-100 p-1 rounded-md transition shrink-0"
                                  title="Corrigir / Alterar lançamento"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  id={`delete-tx-btn-history-${tx.id}`}
                                  onClick={() => {
                                    setDeletingTxId(tx.id);
                                  }}
                                  className="text-gray-300 hover:text-rose-500 hover:bg-rose-50 p-1 rounded-md transition shrink-0"
                                  title="Apagar lançamento permanentemente"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination controls */}
              <div className="p-5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                <span className="text-sm text-gray-600 font-semibold">
                  Mostrando página {currentPage} de {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    id="prev-page-btn"
                    onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-black hover:border-black disabled:opacity-40 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    id="next-page-btn"
                    onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-black hover:border-black disabled:opacity-40 transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Closings Tab */}
        {activeTab === 'closings' && (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-base font-bold text-gray-900 mb-1">Métricas de Auditoria & Competências</h2>
            <ClosingPanel
              closings={closings}
              onCloseMonth={closeMonth}
              isAdmin={isAdmin}
            />
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-base font-bold text-gray-900 mb-1">Responsáveis Contábeis</h2>
            <UserManager
              currentUser={currentUser}
              onToggleRole={toggleUserRole}
              onResetSystem={() => {
                resetSystem();
                setActiveTab('dashboard');
              }}
            />
          </div>
        )}

        {/* Accounts Tab */}
        {activeTab === 'accounts' && (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-base font-bold text-gray-900 mb-1">Detalhes dos Caixinhas de Controle Interno</h2>
            <AccountManager
              accounts={accounts}
              transactions={transactions}
              addAccount={addAccount}
              updateAccount={updateAccount}
              deleteAccount={deleteAccount}
              toggleAccountActive={toggleAccountActive}
              isAdmin={currentUser.role === 'ADMIN'}
            />
          </div>
        )}

      </section>

      {/* 5. Master Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        accounts={accounts.filter(acc => acc.isActive !== false)}
        onAddTransaction={addTransaction}
        currentUserId={currentUser.id}
      />

      {/* 6. Pending Settlements Modal */}
      <PendingSettlementsModal
        isOpen={isPendingSettlementsOpen}
        onClose={() => setIsPendingSettlementsOpen(false)}
        settlements={settlements}
        transactions={transactions}
        currentUser={currentUser}
        onResolveSettlement={resolveSettlement}
        onCancelTransaction={cancelTransaction}
      />

      {/* 7. Pending Reimbursements Modal */}
      <PendingReimbursementsModal
        isOpen={isPendingReimbursementsOpen}
        onClose={() => setIsPendingReimbursementsOpen(false)}
        reimbursements={reimbursements}
        transactions={transactions}
        accounts={accounts}
        currentUser={currentUser}
        onPayReimbursement={payReimbursement}
        onRejectReimbursement={rejectReimbursement}
      />

      {/* 8. Edit / Correction Transaction Modal for Admin */}
      <EditTransactionModal
        isOpen={!!editingTx}
        onClose={() => setEditingTx(null)}
        accounts={accounts}
        transaction={editingTx}
        onEditTransaction={editTransaction}
        onDeleteTransaction={deleteTransaction}
      />

      {/* Reusable premium ConfirmDialog for permanent deletions */}
      <ConfirmDialog
        isOpen={deletingTxId !== null}
        title="Excluir Lançamento Permanentemente?"
        message="Esta operação removerá o registro fisicamente de forma irreversível de nosso banco de dados local e recalculará todos os saldos de caixas disponíveis."
        variant="danger"
        confirmText="Excluir Permanentemente"
        cancelText="Voltar"
        onConfirm={async () => {
          if (deletingTxId) {
            const res = await deleteTransaction(deletingTxId);
            if (res && !res.success) {
              alert(res.error || 'Erro ao excluir.');
            }
            setDeletingTxId(null);
          }
        }}
        onCancel={() => setDeletingTxId(null)}
      />

      {/* Logout Confirmation Dialog to avoid blocked browser confirms inside custom runtimes */}
      <ConfirmDialog
        isOpen={isLogoutConfirmOpen}
        title="Deseja realmente sair do sistema?"
        message="A sua sessão ativa será encerrada de forma segura e você precisará realizar login novamente para acessar os caixas."
        variant="danger"
        confirmText="Sair com Segurança"
        cancelText="Permanecer Conectado"
        onConfirm={() => {
          setIsLogoutConfirmOpen(false);
          logout();
        }}
        onCancel={() => setIsLogoutConfirmOpen(false)}
      />

      {/* Dynamic Security/Permission Warning Toast */}
      {toastError && (
        <div 
          id="role-restriction-toast"
          className="fixed bottom-6 right-6 z-50 p-4 bg-rose-600 text-white rounded-2xl shadow-xl font-bold text-xs flex items-center gap-2.5 animate-slide-in max-w-sm md:max-w-md"
        >
          <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 animate-pulse" />
          <div className="flex-1 grid">
            <span className="font-extrabold tracking-tight text-white mb-0.5 block">Acesso Restrito</span>
            <span className="font-medium text-rose-100 leading-relaxed block">{toastError}</span>
          </div>
          <button 
            onClick={() => setToastError(null)} 
            className="ml-3 hover:text-gray-200 transition cursor-pointer text-lg font-bold p-1 leading-none"
          >
            ×
          </button>
        </div>
      )}

    </main>
  );
}
