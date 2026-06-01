/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import { X, PlusCircle, HelpCircle } from 'lucide-react';
import { Account, TransactionType, PaymentMethod, OutputCategory } from '../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onAddTransaction: (tx: {
    type: TransactionType;
    category: OutputCategory;
    accountId: string;
    destinationAccountId?: string;
    amount: number;
    paymentMethod: PaymentMethod;
    description: string;
    originName: string;
    destinationName: string;
    date: string;
    status: any;
    userId: string;
  }) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  currentUserId: string;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onAddTransaction,
  currentUserId,
}) => {
  const [type, setType] = useState<TransactionType>('ENTRADA');
  const [category, setCategory] = useState<OutputCategory>('SAIDA_DIRETA');
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || '');
  const [destinationAccountId, setDestinationAccountId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [description, setDescription] = useState<string>('');
  const [originName, setOriginName] = useState<string>('');
  const [destinationName, setDestinationName] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [feedback, setFeedback] = useState<{ success?: boolean; msg?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize state when the modal opens but do not reset when accounts list updates dynamically
  useEffect(() => {
    if (isOpen) {
      const defaultAccountId = accounts[0]?.id || '';
      setAccountId(defaultAccountId);
      setDestinationAccountId('');
      setAmount('');
      setPaymentMethod('PIX');
      setDescription('');
      setOriginName('');
      setDestinationName('');
      setDate(new Date().toISOString().split('T')[0]);
      setFeedback(null);
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Handle transfer destination account selection automatically
  useEffect(() => {
    if (type === 'TRANSFERENCIA') {
      const otherAcc = accounts.find(a => a.id !== accountId);
      setDestinationAccountId(otherAcc?.id || '');
    }
  }, [type, accountId, accounts]);

  if (!isOpen) return null;

  const selectedAccName = accounts.find(a => a.id === accountId)?.name || 'Caixinha';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
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

    // Default status:
    // ADIANTAMENTO -> 'AWAITING_SETTLEMENT'
    // Other outputs -> 'SETTLED'
    // REEMBOLSO requested through main list -> usually we'll do REEMBOLSO request in a different button, but if done here it creates status 'SETTLED' or 'AWAITING_REIMBURSEMENT'.
    let targetStatus = 'SETTLED';
    if (type === 'SAIDA') {
      if (category === 'ADIANTAMENTO') {
        targetStatus = 'AWAITING_SETTLEMENT';
      } else if (category === 'REEMBOLSO') {
        targetStatus = 'AWAITING_REIMBURSEMENT';
      }
    }

    const selectedAccName = accounts.find(a => a.id === accountId)?.name || 'Caixinha';
    let finalOrigin = originName;
    let finalDest = destinationName;

    if (type === 'ENTRADA') {
      finalOrigin = originName || 'Origem Externa';
      finalDest = selectedAccName;
    } else if (type === 'SAIDA') {
      finalOrigin = selectedAccName;
      finalDest = destinationName || 'Favorecido Geral';
    } else if (type === 'TRANSFERENCIA') {
      finalOrigin = selectedAccName;
      finalDest = accounts.find(a => a.id === destinationAccountId)?.name || 'Caixinha Destino';
    }

    setIsSubmitting(true);

    const res = await onAddTransaction({
      type,
      category,
      accountId,
      destinationAccountId: type === 'TRANSFERENCIA' ? destinationAccountId : undefined,
      amount: val,
      paymentMethod,
      description,
      originName: finalOrigin,
      destinationName: finalDest,
      date,
      status: targetStatus,
      userId: currentUserId,
    });

    if (res.success) {
      setFeedback({ success: true, msg: 'Lançamento registrado com sucesso!' });
      setIsSubmitting(false);
    } else {
      setFeedback({ success: false, msg: res.error || 'Falha ao registrar Lançamento.' });
      setIsSubmitting(false);
    }
  };

  const isSuccess = feedback?.success === true;

  const handleCreateAnother = () => {
    setAmount('');
    setDescription('');
    setOriginName('');
    setDestinationName('');
    setFeedback(null);
    setIsSubmitting(false);
  };

  const handleCloseSuccess = () => {
    setAmount('');
    setDescription('');
    setOriginName('');
    setDestinationName('');
    setFeedback(null);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div id="transaction-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs transition-all duration-300">
      {isSuccess ? (
        <div id="transaction-success-card" className="bg-white w-full max-w-sm rounded-2xl border border-emerald-100 shadow-2xl p-8 flex flex-col items-center justify-center text-center animate-bounce-subtle">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-250 rounded-full flex items-center justify-center mb-5 text-emerald-600 animate-pulse shadow-md shadow-emerald-50/50">
            <svg className="w-8 h-8 font-extrabold stroke-[3.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-extrabold text-gray-950 tracking-tight leading-snug">
            Lançamento Concluído!
          </h3>
          <p className="text-xs text-gray-500 font-semibold mt-1.5 max-w-xs leading-relaxed">
            Seu lançamento foi processado e registrado com sucesso no banco de dados local. Os saldos das contas foram atualizados automaticamente.
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full font-bold uppercase tracking-wider mb-8">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
            Sincronizado e Recalculado
          </div>

          <div className="w-full flex flex-col gap-2">
            <button
              id="success-another-btn"
              type="button"
              onClick={handleCreateAnother}
              className="w-full py-2.5 bg-black hover:bg-neutral-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              Fazer Novo Lançamento
            </button>
            <button
              id="success-close-btn"
              type="button"
              onClick={handleCloseSuccess}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      ) : (
        <div id="transaction-modal-body" className="bg-white w-full max-w-lg rounded-2xl border border-gray-100 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <PlusCircle className="text-black w-5 h-5" />
              <h2 className="text-base font-bold text-gray-900">Novo Lançamento</h2>
            </div>
            <button id="close-modal-btn" onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-black hover:bg-gray-50 transition">
              <X className="w-4 h-4" />
            </button>
          </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          
          {feedback && (
            <div className={`p-3 rounded-xl text-xs font-semibold ${feedback.success ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {feedback.msg}
            </div>
          )}

          {/* Type Choice */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Tipo de Fluxo</label>
            <div className="grid grid-cols-3 gap-2">
              {(['ENTRADA', 'SAIDA', 'TRANSFERENCIA'] as TransactionType[]).map((t) => (
                <button
                  id={`type-btn-${t}`}
                  key={t}
                  type="button"
                  onClick={() => {
                    setType(t);
                    setFeedback(null);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                    type === t
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Output category context if SAIDA */}
          {type === 'SAIDA' && (
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Categoria da Saída</label>
              <div className="grid grid-cols-3 gap-2">
                {(['SAIDA_DIRETA', 'ADIANTAMENTO', 'REEMBOLSO'] as OutputCategory[]).map((cat) => (
                  <button
                    id={`cat-btn-${cat}`}
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategory(cat);
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition ${
                      category === cat
                        ? 'border-rose-300 bg-rose-50 text-rose-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {cat.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Account selections */}
          <div className="grid grid-cols-2 gap-4">
            <div className={type === 'TRANSFERENCIA' ? '' : 'col-span-2'}>
              <label htmlFor="modal-accountId-select" className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">
                {type === 'ENTRADA' 
                  ? 'Caixa Destinatário (que vai receber o dinheiro)' 
                  : type === 'SAIDA' 
                    ? 'Caixa de Origem (de onde sairá o dinheiro)' 
                    : 'Caixa Origem (envia)'}
              </label>
              <select
                id="modal-accountId-select"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full text-xs font-semibold border border-gray-200 rounded-lg p-2.5 bg-white focus:ring-1 focus:ring-black outline-hidden"
                required
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            {type === 'TRANSFERENCIA' && (
              <div>
                <label htmlFor="modal-dest-accountId-select" className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Caixa Destino (recebe)</label>
                <select
                  id="modal-dest-accountId-select"
                  value={destinationAccountId}
                  onChange={(e) => setDestinationAccountId(e.target.value)}
                  className="w-full text-xs font-semibold border border-gray-200 rounded-lg p-2.5 bg-white focus:ring-1 focus:ring-black outline-hidden"
                  required={type === 'TRANSFERENCIA'}
                >
                  <option value="">Selecione...</option>
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

          {/* Amount and Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="modal-amount-input" className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Valor (R$)</label>
              <input
                id="modal-amount-input"
                type="number"
                step="0.01"
                placeholder="R$ 0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-xs font-bold border border-gray-200 rounded-lg p-2.5 bg-white focus:ring-1 focus:ring-black outline-hidden"
                required
              />
            </div>
            <div>
              <label htmlFor="modal-date-input" className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Data do Lançamento</label>
              <input
                id="modal-date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs font-medium border border-gray-200 rounded-lg p-2.5 bg-white focus:ring-1 focus:ring-black outline-hidden"
                required
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Meio de Pagamento</label>
            <div className="flex gap-2">
              {(['PIX', 'DINHEIRO'] as PaymentMethod[]).map((pm) => (
                <button
                  id={`pm-btn-${pm}`}
                  key={pm}
                  type="button"
                  onClick={() => setPaymentMethod(pm)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition ${
                    paymentMethod === pm
                      ? 'border-sky-500 bg-sky-50 text-sky-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {pm}
                </button>
              ))}
            </div>
          </div>

          {/* Names - Simplified dynamically based on flow */}
          <div className="border border-gray-100 rounded-xl p-3 bg-neutral-50/55">
            {type === 'ENTRADA' && (
              <div>
                <label htmlFor="modal-origin-input" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                  Origem do Recurso / Quem enviou?
                </label>
                <input
                  id="modal-origin-input"
                  type="text"
                  placeholder="Ex: SEVERINO JOSÉ DOS SANTOS ou Aporte Sócio"
                  value={originName}
                  onChange={(e) => setOriginName(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-white focus:ring-1 focus:ring-black outline-hidden font-medium"
                  required
                />
                <p className="text-[10px] text-gray-400 mt-1.5">
                  Quem recebe é automaticamente o caixa <span className="font-bold text-gray-700">{selectedAccName}</span>.
                </p>
              </div>
            )}

            {type === 'SAIDA' && (
              <div>
                <label htmlFor="modal-destination-input" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                  Destinatário / Quem está recebendo o dinheiro?
                </label>
                <input
                  id="modal-destination-input"
                  type="text"
                  placeholder="Ex: ROMERO JOSÉ DA SILVA ou Fornecedor Grafica"
                  value={destinationName}
                  onChange={(e) => setDestinationName(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-white focus:ring-1 focus:ring-black outline-hidden font-medium"
                  required
                />
                <p className="text-[10px] text-gray-400 mt-1.5">
                  Quem paga é automaticamente o caixa <span className="font-bold text-gray-700">{selectedAccName}</span>.
                </p>
              </div>
            )}

            {type === 'TRANSFERENCIA' && (
              <div className="text-[11px] text-blue-800 font-medium">
                ✨ <strong>Transferência Interna Automática:</strong> Os nomes de envio e recebimento serão preenchidos de forma transparente com as contas de origem e destino selecionadas acima.
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="modal-desc-textarea" className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Descrição / Referente</label>
            <textarea
              id="modal-desc-textarea"
              placeholder="Digite o detalhe da transação..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-white focus:ring-1 focus:ring-black outline-hidden resize-none h-20"
              required
            />
          </div>

        </form>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-2 border-t border-gray-100">
          <button
            id="cancel-modal-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 transition"
          >
            Cancelar
          </button>
          <button
            id="save-modal-btn"
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition flex items-center gap-1.5 ${
              isSubmitting ? 'bg-neutral-600 cursor-not-allowed opacity-80' : 'bg-black hover:bg-neutral-800 cursor-pointer'
            }`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Gravando...
              </>
            ) : (
              'Gravar Lançamento'
            )}
          </button>
        </div>

      </div>
      )}
    </div>
  );
};
