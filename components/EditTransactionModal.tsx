/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import { X, Edit3, AlertCircle, Info, Trash2 } from 'lucide-react';
import { Account, Transaction, TransactionType, PaymentMethod, OutputCategory, TransactionStatus } from '../types';
import { ConfirmDialog } from './ConfirmDialog';

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  transaction: Transaction | null;
  onEditTransaction: (
    id: string,
    updatedFields: Partial<Omit<Transaction, 'id' | 'createdAt'>>
  ) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  onDeleteTransaction: (id: string) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  accounts,
  transaction,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const [type, setType] = useState<TransactionType>('ENTRADA');
  const [category, setCategory] = useState<OutputCategory>('SAIDA_DIRETA');
  const [accountId, setAccountId] = useState<string>('');
  const [destinationAccountId, setDestinationAccountId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [description, setDescription] = useState<string>('');
  const [originName, setOriginName] = useState<string>('');
  const [destinationName, setDestinationName] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [status, setStatus] = useState<TransactionStatus>('SETTLED');
  const [feedback, setFeedback] = useState<{ success?: boolean; msg?: string } | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Load transaction current details when opened
  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setCategory(transaction.category || 'SAIDA_DIRETA');
      setAccountId(transaction.accountId);
      setDestinationAccountId(transaction.destinationAccountId || '');
      setAmount(transaction.amount.toString());
      setPaymentMethod(transaction.paymentMethod);
      setDescription(transaction.description);
      setOriginName(transaction.originName);
      setDestinationName(transaction.destinationName);
      setDate(transaction.date);
      setStatus(transaction.status);
      setFeedback(null);
      setShowConfirmDelete(false);
    }
  }, [transaction, isOpen]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setFeedback({ success: false, msg: 'Insira um valor numérico positivo superior a zero.' });
      return;
    }

    if (type === 'TRANSFERENCIA' && (!destinationAccountId || destinationAccountId === accountId)) {
      setFeedback({ success: false, msg: 'Selecione uma conta de destino válida e diferente da conta de origem.' });
      return;
    }

    // Determine default status for the edited transaction if not customized
    let targetStatus = status;
    if (type === 'SAIDA') {
      if (category === 'ADIANTAMENTO' && status === 'SETTLED') {
        targetStatus = 'AWAITING_SETTLEMENT';
      } else if (category === 'REEMBOLSO' && status === 'SETTLED') {
        targetStatus = 'AWAITING_REIMBURSEMENT';
      }
    } else {
      if (status === 'AWAITING_SETTLEMENT' || status === 'AWAITING_REIMBURSEMENT') {
        targetStatus = 'SETTLED';
      }
    }

    const res = await onEditTransaction(transaction.id, {
      type,
      category: type === 'SAIDA' ? category : 'SAIDA_DIRETA',
      accountId,
      destinationAccountId: type === 'TRANSFERENCIA' ? destinationAccountId : undefined,
      amount: val,
      paymentMethod,
      description,
      originName,
      destinationName,
      date,
      status: targetStatus,
    });

    if (res.success) {
      setFeedback({ success: true, msg: 'Lançamento atualizado e corrigido com sucesso!' });
      setTimeout(() => {
        setFeedback(null);
        onClose();
      }, 1000);
    } else {
      setFeedback({ success: false, msg: res.error || 'Falha ao atualizar Lançamento.' });
    }
  };

  const handleDeleteClick = () => {
    setShowConfirmDelete(true);
  };

  const handleConfirmDelete = async () => {
    setShowConfirmDelete(false);
    const res = await onDeleteTransaction(transaction.id);
    if (res.success) {
      setFeedback({ success: true, msg: 'Lançamento excluído permanentemente!' });
      setTimeout(() => {
        setFeedback(null);
        onClose();
      }, 1000);
    } else {
      setFeedback({ success: false, msg: res.error || 'Falha ao excluir o lançamento.' });
    }
  };

  return (
    <div id="edit-transaction-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs">
      <div id="edit-transaction-modal-body" className="bg-white w-full max-w-lg rounded-2xl border border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Edit3 className="text-gray-900 w-5 h-5 animate-pulse" />
            <h2 className="text-base font-bold text-gray-900">Corrigir Lançamento (Administrador)</h2>
          </div>
          <button id="close-edit-modal-btn" onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-black hover:bg-gray-50 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          
          {feedback && (
            <div className={`p-4 rounded-xl flex gap-3 text-xs leading-relaxed border ${
              feedback.success 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {feedback.success ? <Info className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>{feedback.msg}</span>
            </div>
          )}

          {!feedback?.success && (
            <>
              {/* Type selector */}
              <div>
                <span className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">Tipo de Fluxo</span>
                <div className="grid grid-cols-3 gap-2">
                  {(['ENTRADA', 'SAIDA', 'TRANSFERENCIA'] as TransactionType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setType(t);
                        if (t === 'TRANSFERENCIA') {
                          setCategory('SAIDA_DIRETA');
                        }
                      }}
                      className={`py-2 px-3 border rounded-xl text-xs font-extrabold transition text-center cursor-pointer ${
                        type === t
                          ? t === 'ENTRADA'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : t === 'SAIDA'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-blue-50 text-blue-800 border-blue-300'
                          : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-500 border-neutral-200'
                      }`}
                    >
                      {t === 'ENTRADA' ? '↓ Entrada' : t === 'SAIDA' ? '↑ Saída' : '⇄ Transf. Interna'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category (Only if SAIDA) */}
              {type === 'SAIDA' && (
                <div>
                  <label htmlFor="edit-modal-category-select" className="text-xs font-bold text-gray-450 uppercase tracking-widest block mb-1.5">Regra / Categoria Financeira</label>
                  <select
                    id="edit-modal-category-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as OutputCategory)}
                    className="w-full text-sm bg-neutral-50 border border-neutral-250 py-2.5 px-3 rounded-xl focus:bg-white focus:border-black outline-hidden focus:ring-1 focus:ring-black/10 transition font-medium"
                  >
                    <option value="SAIDA_DIRETA">Saída Direta (gasto imediato com nota fiscal)</option>
                    <option value="ADIANTAMENTO">Adiantamento (para prestação de contas futura)</option>
                    <option value="REEMBOLSO">Reembolso (solicitação a ser aprovada e paga)</option>
                  </select>
                </div>
              )}

              {/* Account selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-modal-accountId-select" className="text-xs font-bold text-gray-450 uppercase tracking-widest block mb-1.5 font-sans">
                    {type === 'TRANSFERENCIA' ? 'Caixa Origem (envia)' : 'Caixinha / Conta'}
                  </label>
                  <select
                    id="edit-modal-accountId-select"
                    required
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full text-sm bg-neutral-50 border border-neutral-250 py-2.5 px-3 rounded-xl focus:bg-white focus:border-black outline-hidden focus:ring-1 focus:ring-black/10 transition font-medium"
                  >
                    <option value="">Selecione a conta...</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {type === 'TRANSFERENCIA' && (
                  <div>
                    <label htmlFor="edit-modal-dest-accountId-select" className="text-xs font-bold text-gray-450 uppercase tracking-widest block mb-1.5">Caixa Destino (recebe)</label>
                    <select
                      id="edit-modal-dest-accountId-select"
                      required
                      value={destinationAccountId}
                      onChange={(e) => setDestinationAccountId(e.target.value)}
                      className="w-full text-sm bg-neutral-50 border border-neutral-250 py-2.5 px-3 rounded-xl focus:bg-white focus:border-black outline-hidden"
                    >
                      <option value="">Selecione destino...</option>
                      {accounts
                        .filter((acc) => acc.id !== accountId)
                        .map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-modal-amount-input" className="text-xs font-bold text-gray-450 uppercase tracking-widest block mb-1.5">Valor (R$)</label>
                  <input
                    id="edit-modal-amount-input"
                    type="number"
                    step="0.01"
                    required
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full text-sm bg-neutral-50 border border-neutral-250 py-2.5 px-3 rounded-xl focus:bg-white focus:border-black outline-hidden"
                  />
                </div>

                <div>
                  <label htmlFor="edit-modal-date-input" className="text-xs font-bold text-gray-450 uppercase tracking-widest block mb-1.5">Data do Lançamento</label>
                  <input
                    id="edit-modal-date-input"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-sm bg-neutral-50 border border-neutral-250 py-2.5 px-3 rounded-xl focus:bg-white"
                  />
                </div>
              </div>

              {/* Status field */}
              <div>
                <label htmlFor="edit-modal-status-select" className="text-xs font-bold text-gray-450 uppercase tracking-widest block mb-1.5">Status Geral</label>
                <select
                  id="edit-modal-status-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TransactionStatus)}
                  className="w-full text-sm bg-neutral-50 border border-neutral-250 py-2.5 px-3 rounded-xl focus:bg-white focus:border-black outline-hidden font-medium"
                >
                  <option value="SETTLED">Quitada / Conciliada</option>
                  <option value="AWAITING_SETTLEMENT">Pendente de Prestação (Adiantamento)</option>
                  <option value="AWAITING_REIMBURSEMENT">Pendente de Reembolso</option>
                  <option value="CANCELLED">Cancelada / Invalidada</option>
                </select>
              </div>

              {/* Origin / Recipient details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-modal-origin-input" className="text-xs font-bold text-gray-450 uppercase tracking-widest block mb-1.5">Origem / Quem Pagou</label>
                  <input
                    id="edit-modal-origin-input"
                    type="text"
                    required
                    placeholder="Identificação do pagador..."
                    value={originName}
                    onChange={(e) => setOriginName(e.target.value)}
                    className="w-full text-sm bg-neutral-50 border border-neutral-250 py-2.5 px-3 rounded-xl focus:bg-white focus:border-black outline-hidden"
                  />
                </div>

                <div>
                  <label htmlFor="edit-modal-dest-input" className="text-xs font-bold text-gray-450 uppercase tracking-widest block mb-1.5">Destino / Favorecido</label>
                  <input
                    id="edit-modal-dest-input"
                    type="text"
                    required
                    placeholder="Identificação do recebedor..."
                    value={destinationName}
                    onChange={(e) => setDestinationName(e.target.value)}
                    className="w-full text-sm bg-neutral-50 border border-neutral-250 py-2.5 px-3 rounded-xl focus:bg-white focus:border-black outline-hidden"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Forma de Pagamento</span>
                <div className="flex items-center gap-4">
                  {(['PIX', 'DINHEIRO'] as PaymentMethod[]).map((method) => (
                    <label key={method} className="flex items-center gap-2 text-sm text-gray-700 font-bold cursor-pointer">
                      <input
                        type="radio"
                        name="edit-paymentMethod"
                        value={method}
                        checked={paymentMethod === method}
                        onChange={() => setPaymentMethod(method)}
                        className="text-black focus:ring-black/10 accent-neutral-900 focus:outline-hidden scale-110"
                      />
                      {method === 'PIX' ? 'Pix (Conta Bancária)' : 'Dinheiro Físico'}
                    </label>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="edit-modal-desc-textarea" className="text-xs font-bold text-gray-450 uppercase tracking-widest block mb-1.5">Descrição / Justificativa</label>
                <textarea
                  id="edit-modal-desc-textarea"
                  rows={2}
                  required
                  placeholder="Justificativa da alteração ou histórico original..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-sm bg-neutral-50 border border-neutral-250 py-2.5 px-3 rounded-xl focus:bg-white"
                />
              </div>
            </>
          )}

          {/* Buttons Footer */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-2.5">
            <div>
              {!feedback?.success && (
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Apagar permanentemente este lançamento"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Apagar Registro
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {!feedback?.success ? 'Cancelar' : 'Fechar'}
              </button>
              {!feedback?.success && (
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  Salvar Alterações
                </button>
              )}
            </div>
          </div>

        </form>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDelete}
        title="Apagar Lançamento Permanentemente?"
        message={`Tem certeza de que prefere EXCLUIR permanentemente o lançamento do caixa?\n\nEsta ação removerá o registro de forma irreversível e reajustará os saldos anteriores das contas afetadas.`}
        variant="danger"
        confirmText="Apagar Registro"
        cancelText="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowConfirmDelete(false)}
      />
    </div>
  );
};
