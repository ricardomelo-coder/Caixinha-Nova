import React from 'react';
import { ArrowUpCircle, ArrowDownCircle, Clock, AlertTriangle } from 'lucide-react';
import { Transaction, Settlement, Reimbursement } from '../types';
import { formatCurrency } from '../utils/formatters';

interface MonthlySummaryCardsProps {
  transactions: Transaction[];
  settlements: Settlement[];
  reimbursements: Reimbursement[];
  onPendingSettlementsClick?: () => void;
  onPendingReimbursementsClick?: () => void;
}

export const MonthlySummaryCards: React.FC<MonthlySummaryCardsProps> = ({
  transactions,
  settlements,
  reimbursements,
  onPendingSettlementsClick,
  onPendingReimbursementsClick,
}) => {
  // Current month (May 2026 based on timestamp)
  const currentYear = 2026;
  const currentMonth = 5;

  const currentMonthTxs = transactions.filter(tx => {
    if (tx.status === 'CANCELLED') return false;
    const txDate = new Date(tx.date);
    const y = txDate.getUTCFullYear();
    const m = txDate.getUTCMonth() + 1;
    return y === currentYear && m === currentMonth;
  });

  const totalEntradas = currentMonthTxs
    .filter(tx => tx.type === 'ENTRADA')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalSaidas = currentMonthTxs
    .filter(tx => tx.type === 'SAIDA')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Awaiting settlements
  const pendingSettlementCount = settlements.filter(s => s.status === 'PENDING').length;

  // Awaiting Reimbursements
  const pendingReimbursementsCount = reimbursements.filter(r => r.status === 'PENDING').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
      {/* Cardano Entradas */}
      <div id="card-summary-entradas" className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between min-h-[140px] hover:border-emerald-200 transition duration-150">
        <div>
          <span className="text-xs md:text-sm font-bold text-gray-400 tracking-wider uppercase">Entradas (Mês)</span>
          <div className="flex items-center gap-2.5 mt-3">
            <ArrowUpCircle className="w-6 h-6 text-emerald-500" />
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
              {formatCurrency(totalEntradas)}
            </span>
          </div>
        </div>
      </div>

      {/* Cardano Saídas */}
      <div id="card-summary-saidas" className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between min-h-[140px] hover:border-rose-200 transition duration-150">
        <div>
          <span className="text-xs md:text-sm font-bold text-gray-400 tracking-wider uppercase">Saídas (Mês)</span>
          <div className="flex items-center gap-2.5 mt-3">
            <ArrowDownCircle className="w-6 h-6 text-rose-500" />
            <span className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
              {formatCurrency(totalSaidas)}
            </span>
          </div>
        </div>
      </div>

      {/* Cardano Prestação Pendente */}
      <div 
        id="card-summary-prestacao" 
        onClick={onPendingSettlementsClick}
        className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between min-h-[140px] hover:border-amber-300 hover:bg-amber-50/10 cursor-pointer transition duration-150 group"
      >
        <div>
          <span className="text-xs md:text-sm font-bold text-gray-400 tracking-wider uppercase group-hover:text-amber-700 transition">Pendentes Prestação</span>
          <div className="flex items-center gap-2.5 mt-3">
            <Clock className="w-6 h-6 text-amber-500 group-hover:scale-110 transition" />
            <span className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">
              {pendingSettlementCount}
            </span>
          </div>
        </div>
      </div>

      {/* Cardano Reembolso Pendente */}
      <div 
        id="card-summary-reembolso" 
        onClick={onPendingReimbursementsClick}
        className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between min-h-[140px] hover:border-violet-300 hover:bg-violet-50/10 cursor-pointer transition duration-150 group"
      >
        <div>
          <span className="text-xs md:text-sm font-bold text-gray-400 tracking-wider uppercase group-hover:text-violet-700 transition">Pendentes Reembolso</span>
          <div className="flex items-center gap-2.5 mt-3">
            <AlertTriangle className="w-6 h-6 text-violet-500 group-hover:scale-110 transition" />
            <span className="text-2xl sm:text-3xl font-black text-violet-600 tracking-tight">
              {pendingReimbursementsCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
