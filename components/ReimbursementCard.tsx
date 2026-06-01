import React, { useState } from 'react';
import { HelpCircle, PlusCircle, Check, X, ShieldAlert } from 'lucide-react';
import { Reimbursement, Account } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface ReimbursementCardProps {
  reimbursements: Reimbursement[];
  accounts: Account[];
  onRequestReimbursement: (reimb: {
    requesterName: string;
    accountId: string;
    amount: number;
    description: string;
  }) => void;
  onPayReimbursement: (id: string) => { success: boolean; error?: string };
  onRejectReimbursement: (id: string) => { success: boolean; error?: string };
  isAdmin: boolean;
}

export const ReimbursementCard: React.FC<ReimbursementCardProps> = ({
  reimbursements,
  accounts,
  onRequestReimbursement,
  onPayReimbursement,
  onRejectReimbursement,
  isAdmin,
}) => {
  const [showRequestForm, setShowRequestForm] = useState<boolean>(false);
  const [requesterName, setRequesterName] = useState<string>('');
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || '');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const getAccountName = (id: string) => {
    return accounts.find(a => a.id === id)?.name || id;
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setFeedback('Insira um valor numérico válido positivo superior a zero.');
      return;
    }

    if (!requesterName) {
      setFeedback('O nome do solicitante é obrigatório.');
      return;
    }

    onRequestReimbursement({
      requesterName,
      accountId,
      amount: val,
      description,
    });

    setFeedback('Solicitação de reembolso enviada com sucesso para aprovação do Administrador.');
    setTimeout(() => {
      setFeedback(null);
      setRequesterName('');
      setAmount('');
      setDescription('');
      setShowRequestForm(false);
    }, 1500);
  };

  return (
    <div id="reimbursement-manager" className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6">
      <div className="flex justify-between items-center mb-1">
        <div>
          <h3 className="text-base font-bold text-gray-900">Solicitação de Reembolsos</h3>
          <p className="text-xs text-gray-400 mt-1">
            Gasto extraordinário feito com recursos próprios? Solicite e acompanhe o pagamento do reembolso.
          </p>
        </div>
        <button
          id="toggle-reimbursement-form-btn"
          onClick={() => setShowRequestForm(!showRequestForm)}
          className="flex items-center gap-1 px-3 py-1.5 bg-black text-white hover:bg-neutral-800 rounded-lg text-xs font-bold transition shadow-xs"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Solicitar Reembolso
        </button>
      </div>

      {showRequestForm && (
        <div className="bg-neutral-50 border border-neutral-100 p-5 rounded-xl my-6">
          <h4 className="text-xs font-bold text-gray-800 uppercase mb-3">Nova Solicitação</h4>
          <form onSubmit={handleRequestSubmit} className="space-y-4">
            {feedback && <p className="text-xs font-bold text-emerald-700 bg-emerald-50 p-2 rounded-lg">{feedback}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reimb-requester-input" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Nome do Solicitante</label>
                <input
                  id="reimb-requester-input"
                  type="text"
                  placeholder="Ex: SILVANA MELO"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-white focus:ring-1 focus:ring-black outline-hidden"
                  required
                />
              </div>

              <div>
                <label htmlFor="reimb-account-select" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Caixa de Débito</label>
                <select
                  id="reimb-account-select"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full text-xs font-semibold border border-gray-200 rounded-lg p-2 bg-white focus:ring-1 focus:ring-black outline-hidden"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reimb-amount-input" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Valor do Reembolso (R$)</label>
                <input
                  id="reimb-amount-input"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full text-xs font-semibold border border-gray-200 rounded-lg p-2 bg-white focus:ring-1 focus:ring-black outline-hidden"
                  required
                />
              </div>

              <div>
                <label htmlFor="reimb-desc-input" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Finalidade / Motivo</label>
                <input
                  id="reimb-desc-input"
                  type="text"
                  placeholder="Ex: Compra de café do administrativo"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-white focus:ring-1 focus:ring-black outline-hidden"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs">
              <button
                id="cancel-reimb-form-btn"
                type="button"
                onClick={() => setShowRequestForm(false)}
                className="px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition"
              >
                Voltar
              </button>
              <button
                id="submit-reimb-form-btn"
                type="submit"
                className="px-4 py-1.5 bg-black text-white font-bold rounded-lg transition hover:bg-neutral-800"
              >
                Enviar Solicitação
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main List */}
      <div className="space-y-4 mt-6">
        {reimbursements.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-xs border border-dashed border-gray-100 rounded-xl bg-gray-50/50">
            Nenhuma solicitação de reembolso ativa.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reimbursements.map((r) => {
              const pending = r.status === 'PENDING';
              return (
                <div
                  id={`reimb-card-item-${r.id}`}
                  key={r.id}
                  className={`border rounded-2xl p-4 bg-white flex flex-col justify-between hover:shadow-xs transition ${
                    r.status === 'PAID'
                      ? 'border-emerald-100 bg-emerald-50/10'
                      : r.status === 'REJECTED'
                      ? 'border-gray-100 bg-gray-50/20 opacity-60'
                      : 'border-amber-100'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-bold text-xs text-gray-900">{r.requesterName}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          r.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : r.status === 'REJECTED'
                            ? 'bg-gray-100 text-gray-500 border border-gray-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}
                      >
                        {r.status === 'PAID' ? 'Pago' : r.status === 'REJECTED' ? 'Rejeitado' : 'Pendente'}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 mt-1.5">{r.description}</p>
                    <div className="text-[10px] text-gray-400 mt-2">
                       Caixa Destino: <strong className="text-gray-700">{getAccountName(r.accountId)}</strong>
                    </div>

                    <div className="text-sm font-black text-gray-900 mt-2">
                      {formatCurrency(r.amount)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 text-[10px] text-gray-400">
                    <span>{formatDate(r.date)}</span>

                    {/* Admin Actions */}
                    {pending && (
                      <div className="flex gap-1.5">
                        {isAdmin ? (
                          <>
                            <button
                              id={`reject-reimb-btn-${r.id}`}
                              onClick={() => {
                                if (confirm('Tem certeza de que deseja rejeitar este reembolso?')) {
                                  onRejectReimbursement(r.id);
                                }
                              }}
                              className="p-1 text-rose-600 hover:bg-rose-50 border border-rose-100 rounded-lg transition"
                              title="Rejeitar Reembolso"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`pay-reimb-btn-${r.id}`}
                              onClick={() => {
                                if (confirm('Marcar este reembolso como pago? Isso deduzirá o valor do saldo da conta correspondente.')) {
                                  const res = onPayReimbursement(r.id);
                                  if (!res.success) {
                                    alert(res.error);
                                  }
                                }
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg transition hover:bg-emerald-100"
                            >
                              <Check className="w-3 h-3" />
                              Pagar Reembolso
                            </button>
                          </>
                        ) : (
                          <span className="text-[8px] flex items-center gap-1 font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                            <ShieldAlert className="w-2.5 h-2.5" />
                            Aprovação Admin Requerida
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
