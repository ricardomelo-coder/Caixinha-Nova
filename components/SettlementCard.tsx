import React, { useState } from 'react';
import { Clock, HelpCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { Settlement, Transaction } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface SettlementCardProps {
  settlements: Settlement[];
  transactions: Transaction[];
  onResolveSettlement: (settlementId: string, amountUsed: number, description: string) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
}

export const SettlementCard: React.FC<SettlementCardProps> = ({
  settlements,
  transactions,
  onResolveSettlement,
}) => {
  const [selectedSet, setSelectedSet] = useState<string | null>(null);
  const [amountUsed, setAmountUsed] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const getTxDescription = (txId: string) => {
    return transactions.find(t => t.id === txId)?.description || 'Adiantamento';
  };

  const getTxBeneficiary = (txId: string) => {
    return transactions.find(t => t.id === txId)?.destinationName || 'Funcionário';
  };

  const currentPending = settlements.filter(s => s.status === 'PENDING');
  const currentResolved = settlements.filter(s => s.status === 'RESOLVED');

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSet) return;

    const val = parseFloat(amountUsed);
    if (isNaN(val) || val < 0) {
      setFeedback('Insira um valor utilizado válido superior ou igual a zero.');
      return;
    }

    const res = await onResolveSettlement(selectedSet, val, description);
    if (res.success) {
      setFeedback('Prestação de contas resolvida e ajustada com sucesso!');
      setTimeout(() => {
        setFeedback(null);
        setSelectedSet(null);
        setAmountUsed('');
        setDescription('');
      }, 1500);
    } else {
      setFeedback(res.error || 'Erro ao processar prestação.');
    }
  };

  return (
    <div id="settlement-manager-panel" className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6">
      <div className="mb-6">
        <h3 className="text-base font-bold text-gray-900">Prestação de Contas (Adiantamentos)</h3>
        <p className="text-xs text-gray-400 mt-1">
          Adiantamentos criam pendências. O funcionário deve relatar as despesas reais para devolver sobras ou receber reembolsos excedentes.
        </p>
      </div>

      {selectedSet && (
        <div className="bg-neutral-50 border border-neutral-100 p-5 rounded-xl mb-6">
          <h4 className="text-xs font-bold text-gray-800 uppercase mb-3">Prestar Contas do Adiantamento</h4>
          
          <form onSubmit={handleSettleSubmit} className="space-y-4">
            {feedback && (
              <p className="text-xs font-bold text-sky-700 bg-sky-50 p-2 rounded-lg">{feedback}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="settle-amount-input" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Valor Gasto Real (R$)</label>
                <input
                  id="settle-amount-input"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={amountUsed}
                  onChange={(e) => setAmountUsed(e.target.value)}
                  className="w-full text-xs font-semibold border border-gray-200 rounded-lg p-2 bg-white focus:ring-1 focus:ring-black outline-hidden"
                  required
                />
              </div>
              <div>
                <label htmlFor="settle-desc-input" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Observações da Prestação</label>
                <input
                  id="settle-desc-input"
                  type="text"
                  placeholder="Ex: Anexou NF-230-b"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-white focus:ring-1 focus:ring-black outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs">
              <button
                id="cancel-settle-btn"
                type="button"
                onClick={() => setSelectedSet(null)}
                className="px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition"
              >
                Voltar
              </button>
              <button
                id="confirm-settle-btn"
                type="submit"
                className="px-4 py-1.5 bg-black text-white font-bold rounded-lg transition hover:bg-neutral-800"
              >
                Concluir Prestação
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Settlements */}
        <div>
          <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            Pendentes ({currentPending.length})
          </h4>

          {currentPending.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-gray-100 rounded-xl text-xs text-gray-400 bg-gray-50/50">
              Nenhuma prestação pendente atualmente.
            </div>
          ) : (
            <div className="space-y-3">
              {currentPending.map(s => (
                <div key={s.id} className="bg-white border border-amber-100 p-4 rounded-xl flex items-center justify-between gap-4 hover:border-amber-200 transition">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-gray-900 block truncate">{getTxBeneficiary(s.transactionId)}</span>
                    <span className="text-[10px] text-gray-405 block text-gray-400 truncate mb-1">{getTxDescription(s.transactionId)}</span>
                    <span className="text-xs text-amber-700 font-bold">Valor adiantado: {formatCurrency(s.amountTransferred)}</span>
                  </div>
                  <button
                    id={`action-settle-btn-${s.id}`}
                    onClick={() => {
                      setSelectedSet(s.id);
                      setAmountUsed(s.amountTransferred.toString());
                    }}
                    className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold rounded-lg text-xs transition"
                  >
                    Prestar Contas
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resolved Settlements */}
        <div>
          <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4" />
            Histórico Resolvido ({currentResolved.length})
          </h4>

          {currentResolved.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-gray-100 rounded-xl text-xs text-gray-400 bg-gray-50/50">
              Nenhuma prestação concluída neste período.
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {currentResolved.map(s => (
                <div key={s.id} className="bg-gray-50/50 border border-gray-100 p-3 rounded-xl">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-semibold text-gray-800">{getTxBeneficiary(s.transactionId)}</span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded uppercase">Feito</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 mt-2.5 text-[10px] text-gray-500 font-medium">
                    <div>
                      <span className="block text-gray-400 uppercase tracking-wide text-[8px] font-bold">Adiantado</span>
                      <span className="font-bold text-gray-700">{formatCurrency(s.amountTransferred)}</span>
                    </div>
                    <div>
                      <span className="block text-gray-400 uppercase tracking-wide text-[8px] font-bold">Gasto Real</span>
                      <span className="font-bold text-gray-700">{formatCurrency(s.amountUsed)}</span>
                    </div>
                    <div>
                      {s.returnedAmount > 0 && (
                        <>
                          <span className="block text-amber-600 uppercase tracking-wide text-[8px] font-bold">Devolvido</span>
                          <span className="font-bold text-amber-600">{formatCurrency(s.returnedAmount)}</span>
                        </>
                      )}
                      {s.reimbursementRequired > 0 && (
                        <>
                          <span className="block text-red-500 uppercase tracking-wide text-[8px] font-bold">A Reembolsar</span>
                          <span className="font-bold text-red-500">{formatCurrency(s.reimbursementRequired)}</span>
                        </>
                      )}
                      {s.amountTransferred === s.amountUsed && (
                        <>
                          <span className="block text-gray-400 uppercase tracking-wide text-[8px] font-bold">Resultado</span>
                          <span className="font-medium text-gray-600">Zero a Zero</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-[9px] text-gray-400 mt-2 italic font-serif">
                    Obs: {s.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
