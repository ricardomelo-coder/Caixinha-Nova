import React, { useState } from 'react';
import { Wallet, Plus, Edit2, Trash2, AlertCircle, X, ShieldAlert, Info, Power } from 'lucide-react';
import { Account, Transaction } from '../types';
import { formatCurrency } from '../utils/formatters';

interface AccountManagerProps {
  accounts: Account[];
  transactions: Transaction[];
  addAccount: (name: string, initialBalance?: number) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  updateAccount: (id: string, name: string) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  deleteAccount: (id: string) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  toggleAccountActive: (id: string) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  isAdmin: boolean;
}

export const AccountManager: React.FC<AccountManagerProps> = ({
  accounts,
  transactions,
  addAccount,
  updateAccount,
  deleteAccount,
  toggleAccountActive,
  isAdmin,
}) => {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit' | 'delete' | 'toggle-active'>('create');
  const [targetAccount, setTargetAccount] = useState<Account | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [balanceInput, setBalanceInput] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);

  const openCreateModal = () => {
    setNameInput('');
    setBalanceInput('');
    setErrorText(null);
    setSuccessText(null);
    setModalType('create');
    setTargetAccount(null);
    setIsOpenModal(true);
  };

  const openEditModal = (acc: Account) => {
    setNameInput(acc.name);
    setErrorText(null);
    setSuccessText(null);
    setModalType('edit');
    setTargetAccount(acc);
    setIsOpenModal(true);
  };

  const openDeleteModal = (acc: Account) => {
    setErrorText(null);
    setSuccessText(null);
    setModalType('delete');
    setTargetAccount(acc);
    setIsOpenModal(true);
  };

  const openToggleActiveModal = (acc: Account) => {
    setErrorText(null);
    setSuccessText(null);
    setModalType('toggle-active');
    setTargetAccount(acc);
    setIsOpenModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    
    if (modalType === 'create') {
      const initialBalance = parseFloat(balanceInput) || 0;
      const res = await addAccount(nameInput, initialBalance);
      if (res.success) {
        setSuccessText('Caixinha criado com sucesso!');
        setTimeout(() => {
          setIsOpenModal(false);
          setNameInput('');
          setBalanceInput('');
          setSuccessText(null);
        }, 1000);
      } else {
        setErrorText(res.error || 'Erro ao criar caixinha.');
      }
    } else if (modalType === 'edit' && targetAccount) {
      const res = await updateAccount(targetAccount.id, nameInput);
      if (res.success) {
        setSuccessText('Caixinha atualizado com sucesso!');
        setTimeout(() => {
          setIsOpenModal(false);
          setNameInput('');
          setSuccessText(null);
        }, 1000);
      } else {
        setErrorText(res.error || 'Erro ao atualizar caixinha.');
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (!targetAccount) return;
    setErrorText(null);
    const res = await deleteAccount(targetAccount.id);
    if (res.success) {
      setSuccessText('Caixinha excluído com sucesso!');
      setTimeout(() => {
        setIsOpenModal(false);
        setSuccessText(null);
        setTargetAccount(null);
      }, 1000);
    } else {
      setErrorText(res.error || 'Erro ao excluir caixinha.');
    }
  };

  const handleToggleActiveConfirm = async () => {
    if (!targetAccount) return;
    setErrorText(null);
    const res = await toggleAccountActive(targetAccount.id);
    if (res.success) {
      const isDeactivating = targetAccount.isActive !== false;
      setSuccessText(isDeactivating ? 'Caixinha desativado com sucesso!' : 'Caixinha ativado com sucesso!');
      setTimeout(() => {
        setIsOpenModal(false);
        setSuccessText(null);
        setTargetAccount(null);
      }, 1000);
    } else {
      setErrorText(res.error || 'Erro ao alterar status do caixinha.');
    }
  };

  const activeAccountsCount = accounts.filter(acc => acc.isActive !== false).length;

  return (
    <div id="account-manager-container" className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6 relative">
      
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-bold text-gray-900">Saldos dos Caixinhas</h3>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {activeAccountsCount} {activeAccountsCount === 1 ? 'Conta Ativa' : 'Contas Ativas'}
            </span>
          </div>
          <p className="text-xs text-gray-400">Valores reativos atualizados dinamicamente de acordo com as receitas e despesas registradas.</p>
        </div>

        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="w-full sm:w-auto px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Adicionar Caixinha
          </button>
        )}
      </div>

      <div className="border-b border-gray-100 w-full my-4"></div>
      {/* Accounts List Grid */}
      {accounts.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center bg-gray-50/50">
          <Wallet className="w-9 h-9 text-gray-300 mb-3" />
          <h4 className="text-sm font-bold text-gray-800">Nenhum caixinha cadastrado</h4>
          <p className="text-xs text-gray-400 mt-1 max-w-sm">Adicione o seu primeiro caixinha de controle para começar a cadastrar movimentações de entrada, saída e transferências.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => {
            // Get count of transactions for this account
            const txCount = transactions.filter(t => t.accountId === acc.id || t.destinationAccountId === acc.id).length;
            const isAccActive = acc.isActive !== false;

            return (
              <div
                id={`account-grid-item-${acc.id}`}
                key={acc.id}
                className={`border p-5 rounded-2xl flex flex-col justify-between min-h-[145px] transition group relative ${
                  isAccActive 
                    ? 'bg-gray-50/50 hover:bg-neutral-50 border-gray-100' 
                    : 'bg-neutral-100/40 border-neutral-200 border-dashed opacity-85'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="p-2.5 rounded-xl bg-white border border-gray-100 shadow-2xs">
                    <Wallet className={`w-4 h-4 ${isAccActive ? 'text-gray-700' : 'text-gray-400'}`} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isAccActive ? (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Ativo
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-gray-550 bg-gray-100 border border-gray-250 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Inativo
                      </span>
                    )}
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider bg-gray-200/50 px-1.5 py-0.5 rounded">
                      {txCount} {txCount === 1 ? 'lançamento' : 'lançamentos'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex justify-between items-end">
                  <div className="truncate pr-2">
                    <span className={`text-xs font-bold block truncate ${isAccActive ? 'text-gray-800' : 'text-gray-450'}`} title={acc.name}>
                      {acc.name}
                    </span>
                    <span className={`text-lg sm:text-xl font-black mt-1 block ${!isAccActive ? 'text-gray-400' : acc.balance >= 0 ? 'text-gray-900' : 'text-rose-600'}`}>
                      {formatCurrency(acc.balance)}
                    </span>
                    <span className="text-[9px] font-mono text-gray-400 block mt-0.5">ID: {acc.id}</span>
                  </div>

                  {/* Edit/Delete/Toggle-Active Actions (Only for Admin) */}
                  {isAdmin && (
                    <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1 bg-white border border-gray-150 rounded-lg p-1.5 shadow-md self-end absolute bottom-4 right-4 z-10">
                      <button
                        onClick={() => openEditModal(acc)}
                        title="Editar caixinha"
                        className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openToggleActiveModal(acc)}
                        title={isAccActive ? 'Desativar caixinha' : 'Reativar caixinha'}
                        className={`p-1.5 rounded-md transition cursor-pointer ${
                          isAccActive 
                            ? 'text-amber-500 hover:text-amber-700 hover:bg-amber-50' 
                            : 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(acc)}
                        title="Excluir caixinha"
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Action Modal (Create, Edit, Delete, Toggle-Active) */}
      {isOpenModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl border border-gray-100 shadow-2xl overflow-hidden flex flex-col text-left">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                {modalType === 'create' && <Plus className="w-4 h-4 text-emerald-600" />}
                {modalType === 'edit' && <Edit2 className="w-4 h-4 text-emerald-600" />}
                {modalType === 'delete' && <ShieldAlert className="w-4 h-4 text-rose-600" />}
                {modalType === 'toggle-active' && <Power className="w-4 h-4 text-amber-500" />}
                {modalType === 'create' && 'Criar Novo Caixinha'}
                {modalType === 'edit' && 'Editar Caixinha'}
                {modalType === 'delete' && 'Confirmação de Exclusão'}
                {modalType === 'toggle-active' && (targetAccount?.isActive !== false ? 'Desativar Caixinha' : 'Ativar Caixinha')}
              </h4>
              <button
                onClick={() => setIsOpenModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            {modalType === 'create' || modalType === 'edit' ? (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                
                {/* Error/Success Feedbacks */}
                {errorText && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex gap-2 text-rose-800 text-xs text-left animate-shake">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{errorText}</span>
                  </div>
                )}
                {successText ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex gap-2 text-emerald-800 text-xs text-left animate-fade-in">
                    <Info className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{successText}</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="account-name-input" className="block text-xs font-bold text-gray-750 mb-1.5 uppercase tracking-wide">
                        Nome do Caixinha <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="account-name-input"
                        type="text"
                        required
                        placeholder="Ex: Caixinha Diretoria"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="w-full text-sm bg-neutral-50 hover:bg-neutral-100/50 border border-neutral-250 py-3 px-4 rounded-xl text-neutral-850 font-medium leading-normal placeholder-neutral-400 focus:bg-white focus:border-black outline-hidden focus:ring-1 focus:ring-black/10 transition"
                        autoFocus
                      />
                      <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed">
                        Este nome identificará o caixinha em lançamentos, transferências, prestações de contas e relatórios administrativos executivos.
                      </p>
                    </div>

                    {modalType === 'create' && (
                      <div>
                        <label htmlFor="account-balance-input" className="block text-xs font-bold text-gray-750 mb-1.5 uppercase tracking-wide">
                          Saldo Inicial (R$)
                        </label>
                        <input
                          id="account-balance-input"
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={balanceInput}
                          onChange={(e) => setBalanceInput(e.target.value)}
                          className="w-full text-sm bg-neutral-50 hover:bg-neutral-100/50 border border-neutral-250 py-3 px-4 rounded-xl text-neutral-850 font-medium leading-normal placeholder-neutral-400 focus:bg-white focus:border-black outline-hidden focus:ring-1 focus:ring-black/10 transition"
                        />
                        <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed">
                          Defina o saldo de abertura deste caixinha. Se não preenchido, começará com R$ 0,00.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Form Footer Buttons */}
                {!successText && (
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsOpenModal(false)}
                      className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      {modalType === 'create' ? 'Salvar Caixinha' : 'Atualizar'}
                    </button>
                  </div>
                )}

              </form>
            ) : modalType === 'delete' ? (
              // Delete Confirmation modal view
              <div className="p-6 space-y-4">
                {targetAccount && (() => {
                  const hasLinkedTransactions = transactions.some(
                    (t) => t.accountId === targetAccount.id || t.destinationAccountId === targetAccount.id
                  );

                  return (
                    <>
                      {/* Warning if there's related records */}
                      {hasLinkedTransactions ? (
                        <div className="space-y-4 text-left">
                          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex gap-3 text-rose-800 text-xs">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold mb-1 uppercase tracking-wide">Impossível Excluir Caixinha</p>
                              <p className="leading-relaxed text-rose-700">
                                O caixinha &ldquo;{targetAccount.name}&rdquo; possui lançamentos de caixinha vinculados! Para garantir a conformidade fiscal e integridade de auditoria dos relatórios financeiros, caixinhas com lançamentos existentes não podem ser excluídos do sistema.
                              </p>
                            </div>
                          </div>
                          
                          <p className="text-xs text-gray-500 leading-relaxed">
                            Você pode alterar o nome do caixinha ou desativá-lo, mas a exclusão permanente não é autorizada enquanto houver registros em seu histórico administrativo.
                          </p>

                          <div className="flex items-center justify-end pt-2">
                            <button
                              type="button"
                              onClick={() => setIsOpenModal(false)}
                              className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                            >
                              Entendido
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {errorText && (
                            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex gap-2 text-rose-800 text-xs text-left animate-shake">
                              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                              <span>{errorText}</span>
                            </div>
                          )}

                          {successText ? (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex gap-2 text-emerald-800 text-xs text-left animate-fade-in">
                              <Info className="w-4 h-4 mt-0.5 shrink-0" />
                              <span>{successText}</span>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm text-gray-700 text-left leading-relaxed">
                                Tem certeza de que gostaria de remover permanentemente o caixinha <strong className="text-gray-900">&ldquo;{targetAccount.name}&rdquo;</strong>? Esta ação é irreversível.
                              </p>
                              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex gap-2 text-yellow-800 text-[11px] text-justify leading-relaxed">
                                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>Apenas caixinhas sem lançamentos podem ser removidos. Nenhuma informação de saldo inicial poderá ser recuperada após a remoção.</span>
                              </div>
                            </>
                          )}

                          {/* Action Buttons for Delete */}
                          {!successText && (
                            <div className="flex items-center justify-end gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => setIsOpenModal(false)}
                                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={handleDeleteConfirm}
                                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                              >
                                Confirmar Exclusão
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              // Toggle Active confirmation modal view
              <div className="p-6 space-y-4">
                {targetAccount && (() => {
                  const isDeactivating = targetAccount.isActive !== false;
                  const canDeactivate = targetAccount.balance === 0;

                  return (
                    <div className="space-y-4">
                      {errorText && (
                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex gap-2 text-rose-800 text-xs text-left animate-shake">
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>{errorText}</span>
                        </div>
                      )}

                      {successText ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex gap-2 text-emerald-800 text-xs text-left animate-fade-in">
                          <Info className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>{successText}</span>
                        </div>
                      ) : (
                        <>
                          {isDeactivating ? (
                            <>
                              {!canDeactivate ? (
                                <div className="space-y-3">
                                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex gap-3 text-rose-800 text-xs">
                                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                    <div>
                                      <p className="font-bold mb-1 uppercase tracking-wide">Impossível Desativar Caixinha</p>
                                      <p className="leading-relaxed">
                                        O caixinha &ldquo;{targetAccount.name}&rdquo; possui um saldo ativo de <strong>{formatCurrency(targetAccount.balance)}</strong>!
                                      </p>
                                    </div>
                                  </div>
                                  <p className="text-xs text-gray-500 leading-relaxed">
                                    Para desativar uma conta de caixinha, seu saldo atual deve ser exatamente <strong>R$ 0,00</strong>. Realize uma transferência ou registro de saída para zerar este saldo antes de desativá-lo.
                                  </p>
                                  <div className="flex items-center justify-end pt-2">
                                    <button
                                      type="button"
                                      onClick={() => setIsOpenModal(false)}
                                      className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer"
                                    >
                                      Entendido
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3 text-left">
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    Tem certeza de que deseja desativar o caixinha <strong className="text-gray-900">&ldquo;{targetAccount.name}&rdquo;</strong>?
                                  </p>
                                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-amber-800 text-[11px] leading-relaxed">
                                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>Após a desativação, este caixinha não aparecerá mais como opção em novos lançamentos e transferências, e será ocultado do dashboard principal de controle. Todos os lançamentos históricos vinculados a ele serão mantidos intactos para auditoria fiscal.</span>
                                  </div>
                                  
                                  <div className="flex items-center justify-end gap-2 pt-2">
                                    <button
                                      type="button"
                                      onClick={() => setIsOpenModal(false)}
                                      className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition cursor-pointer"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleToggleActiveConfirm}
                                      className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                                    >
                                      Confirmar Desativação
                                    </button>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="space-y-3 text-left">
                              <p className="text-sm text-gray-700 leading-relaxed">
                                Deseja reativar o caixinha <strong className="text-gray-900">&ldquo;{targetAccount.name}&rdquo;</strong>?
                              </p>
                              <p className="text-xs text-gray-500 leading-relaxed">
                                Uma vez reativado, ele voltará a estar disponível para lançamentos de entrada, saída e transferências, além de compor o dashboard de sitemas e saldos ativos.
                              </p>

                              <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() => setIsOpenModal(false)}
                                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={handleToggleActiveConfirm}
                                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                                >
                                  Confirmar Reativação
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
