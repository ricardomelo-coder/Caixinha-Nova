import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Repeat, Trash2, CheckCircle2, Edit2 } from 'lucide-react';
import { Transaction, Account } from '../types';
import { formatCurrency, formatDate, getTransactionNames } from '../utils/formatters';
import { ConfirmDialog } from './ConfirmDialog';

interface RecentTransactionsListProps {
  transactions: Transaction[];
  accounts: Account[];
  onDeleteTransaction: (id: string) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  isAdmin: boolean;
  onViewAll?: () => void;
  onEditTransaction?: (tx: Transaction) => void;
}

export const RecentTransactionsList: React.FC<RecentTransactionsListProps> = ({
  transactions,
  accounts,
  onDeleteTransaction,
  isAdmin,
  onViewAll,
  onEditTransaction,
}) => {
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);

  const getAccountName = (id: string) => {
    return accounts.find((a) => a.id === id)?.name || id;
  };

  // Show top 5
  const displayed = transactions.slice(0, 5);

  return (
    <div id="recent-transactions-container" className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6 h-full flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-lg font-extrabold text-gray-950 tracking-tight">Últimas Movimentações</h3>
          {onViewAll && (
            <button
              id="view-all-transactions-btn"
              onClick={onViewAll}
              className="text-sm font-bold text-gray-500 hover:text-black hover:underline transition"
            >
              Ver tudo
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-6">Acompanhe os lançamentos mais recentes.</p>

        <div className="space-y-4">
          {displayed.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Nenhuma movimentação lançada.
            </div>
          ) : (
            displayed.map((tx) => {
              const isEntrada = tx.type === 'ENTRADA';
              const isTransfer = tx.type === 'TRANSFERENCIA';
              const isCancelled = tx.status === 'CANCELLED';

              let textClass = 'text-gray-900';
              let amountText = formatCurrency(tx.amount);
              let iconBg = 'bg-gray-100';
              let iconColor = 'text-gray-600';
              let iconElement = <ArrowDown className="w-4 h-4" />;

              if (isCancelled) {
                textClass = 'text-gray-400 line-through';
                amountText = `[Cancelado] ${amountText}`;
              } else if (isEntrada) {
                textClass = 'text-emerald-600 font-bold';
                amountText = `+ ${amountText}`;
                iconBg = 'bg-emerald-50';
                iconColor = 'text-emerald-600';
                iconElement = <ArrowUp className="w-4 h-4" />;
              } else if (isTransfer) {
                textClass = 'text-blue-600 font-bold';
                amountText = `⇄ ${amountText}`;
                iconBg = 'bg-blue-50';
                iconColor = 'text-blue-600';
                iconElement = <Repeat className="w-4 h-4" />;
              } else {
                textClass = 'text-rose-600 font-bold';
                amountText = `- ${amountText}`;
                iconBg = 'bg-rose-50';
                iconColor = 'text-rose-600';
                iconElement = <ArrowDown className="w-4 h-4" />;
              }

              const { origin, destination } = getTransactionNames(tx, accounts);

              return (
                <div
                  id={`tx-row-${tx.id}`}
                  key={tx.id}
                  className={`flex flex-col gap-2 p-3.5 rounded-xl hover:bg-neutral-50 border border-transparent hover:border-neutral-100 transition duration-150 ${
                    isCancelled ? 'opacity-50' : ''
                  }`}
                >
                  {/* Line 1: Badge + Flow names on left, Amount on right */}
                  <div className="flex items-center justify-between gap-4 font-sans">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
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
                          <span className="text-rose-500 font-extrabold">↕</span> Saída
                        </span>
                      )}

                      {/* Names Flow: Origin Name (regular) → Destination Name (bold) */}
                      <div className="text-sm text-gray-900 flex items-center gap-1 truncate font-medium">
                        <span className="text-gray-500 truncate max-w-[140px] md:max-w-[200px]" title={origin}>
                          {origin}
                        </span>
                        <span className={`font-black mx-0.5 transition-colors ${
                          isCancelled ? 'text-gray-300 font-normal' :
                          isEntrada ? 'text-emerald-500 font-extrabold' :
                          isTransfer ? 'text-blue-500 font-extrabold' :
                          'text-rose-500 font-extrabold'
                        }`}>→</span>
                        <span className="text-gray-900 font-extrabold truncate max-w-[140px] md:max-w-[200px]" title={destination}>
                          {destination}
                        </span>
                      </div>
                    </div>

                    {/* Transaction Amount */}
                    <span className={`text-base md:text-lg font-extrabold shrink-0 text-right ${textClass}`}>
                      {amountText}
                    </span>
                  </div>

                  {/* Line 2: Payment Badge + Category Badge + Description text on left, Date on right */}
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

                      {/* Description if any */}
                      {tx.description && (
                        <span className="text-xs text-gray-500 font-semibold truncate max-w-[200px] md:max-w-[360px]" title={tx.description}>
                          {tx.description}
                        </span>
                      )}

                      {/* Account indicator badge */}
                      <span className="text-[10px] text-gray-400 font-bold bg-neutral-50 border border-neutral-100/80 px-1.5 py-0.2 rounded-sm ml-1">
                        caixa: {getAccountName(tx.accountId)}
                      </span>
                    </div>

                    {/* Date and actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-gray-400 font-extrabold uppercase tracking-wide text-right">
                        {formatDate(tx.date)}
                      </span>

                      {/* Actions (Edit / Cancellation) */}
                      {isAdmin && (
                        <div className="flex items-center gap-1.5 ml-1 select-none">
                          {onEditTransaction && (
                            <button
                              id={`edit-tx-btn-recent-${tx.id}`}
                              onClick={() => onEditTransaction(tx)}
                              className="text-gray-300 hover:text-black hover:bg-gray-100 p-1 rounded-md transition shrink-0"
                              title="Corrigir / Alterar lançamento"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            id={`delete-tx-btn-${tx.id}`}
                            onClick={() => {
                              setDeletingTxId(tx.id);
                            }}
                            className="text-gray-300 hover:text-rose-500 hover:bg-rose-50 p-1 rounded-md transition shrink-0"
                            title="Apagar lançamento permanentemente"
                          >
                            <Trash2 className="w-3.5 h-3.5 animate-pulse" />
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
      </div>

      <ConfirmDialog
        isOpen={deletingTxId !== null}
        title="Excluir Lançamento Permanentemente?"
        message="Esta operação removerá o registro fisicamente de forma irreversível de nosso banco de dados local e recalculará todos os saldos de caixas disponíveis."
        variant="danger"
        confirmText="Excluir Permanentemente"
        cancelText="Voltar"
        onConfirm={async () => {
          if (deletingTxId) {
            const res = await onDeleteTransaction(deletingTxId);
            if (res && !res.success) {
              alert(res.error || 'Erro ao excluir.');
            }
            setDeletingTxId(null);
          }
        }}
        onCancel={() => setDeletingTxId(null)}
      />
    </div>
  );
};
