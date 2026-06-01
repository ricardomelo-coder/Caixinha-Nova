'use client';

import React, { useState } from 'react';
import { 
  Users, 
  Trash2, 
  RotateCw, 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  UserPlus, 
  Trash,
  AlertTriangle,
  Mail,
  User as UserIcon,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { UserProfile } from '../types';

interface UserManagerProps {
  currentUser: { id: string; name: string; email: string; role: 'ADMIN' | 'USER' };
  onToggleRole: () => void;
  onResetSystem?: () => void;
}

export const UserManager: React.FC<UserManagerProps> = ({
  currentUser,
  onToggleRole,
  onResetSystem,
}) => {
  const { 
    users, 
    addUser, 
    deleteUser, 
    resetUserPassword, 
    clearDraftUsers,
    user: authenticatedUser
  } = useAuth();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<'ADMIN' | 'USER'>('USER');

  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const isAdmin = currentUser.role === 'ADMIN';

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      setAlertMessage({ type: 'error', text: 'Preencha todos os campos obrigatórios.' });
      return;
    }

    const res = await addUser(formName, formEmail, formRole);
    if (res.success) {
      setFormName('');
      setFormEmail('');
      setFormRole('USER');
      setIsAddModalOpen(false);
      showTemporaryAlert('success', `Colaborador "${formName}" cadastrado com sucesso! A senha padrão é 123456.`);
    } else {
      setAlertMessage({ type: 'error', text: res.error || 'Erro ao criar colaborador.' });
    }
  };

  const showTemporaryAlert = (type: 'success' | 'error', text: string) => {
    setAlertMessage({ type, text });
    setTimeout(() => {
      setAlertMessage(null);
    }, 4500);
  };

  const handleResetPassword = async (userId: string) => {
    const res = await resetUserPassword(userId);
    if (res.success) {
      showTemporaryAlert('success', res.message || 'Senha redefinida para "123456" com sucesso!');
    } else {
      showTemporaryAlert('error', res.error || 'Não foi possível redefinir a senha.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUserId) return;
    const res = await deleteUser(deletingUserId);
    if (res.success) {
      setDeletingUserId(null);
      showTemporaryAlert('success', 'Colaborador removido com sucesso!');
    } else {
      setDeletingUserId(null);
      showTemporaryAlert('error', res.error || 'Não foi possível remover o colaborador.');
    }
  };

  const handleClearDrafts = async () => {
    if (confirm('Deseja realmente limpar as contas criadas e redefinir o sistema de simulação para os colaboradores padrão?')) {
      await clearDraftUsers();
      showTemporaryAlert('success', 'Todas as contas de teste adicionais foram limpas!');
    }
  };

  // Generate nice pastel background colors for avatar matching its starting letter
  const getAvatarBg = (name: string) => {
    const char = name.trim().charAt(0).toUpperCase();
    const hash = char.charCodeAt(0) % 5;
    const colors = [
      'bg-blue-100 text-blue-700',
      'bg-indigo-100 text-indigo-700',
      'bg-emerald-100 text-emerald-700',
      'bg-amber-100 text-amber-700',
      'bg-purple-100 text-purple-700'
    ];
    return colors[hash] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div id="collaborator-management-section" className="space-y-6 max-w-5xl mx-auto">
      
      {/* Dynamic Toast Alerts */}
      {alertMessage && (
        <div 
          id="collaborator-toast-alert"
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-slide-in max-w-md ${
            alertMessage.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          {alertMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-100 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-100 shrink-0" />
          )}
          <div className="flex-1 text-xs font-bold leading-relaxed">{alertMessage.text}</div>
          <button onClick={() => setAlertMessage(null)} className="hover:text-gray-200 text-sm font-black p-1 leading-none">×</button>
        </div>
      )}

      {/* Main card panel matching exactly the attachment design */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        
        {/* Header Block with Actions */}
        <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-50">
          <div>
            <h2 id="collaborators-main-title" className="text-xl font-bold text-gray-900 tracking-tight">Gestão de Colaboradores</h2>
            <p className="text-xs text-gray-500 mt-1 select-none">
              Gerencie quem tem acesso ao sistema e seus respectivos níveis de permissão.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              id="clear-test-users-btn"
              onClick={handleClearDrafts}
              className="px-4 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-300 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Trash className="w-3.5 h-3.5" />
              Limpar Sujeira
            </button>

            <button
              id="new-collaborator-btn"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-neutral-950 hover:bg-neutral-850 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Novo Colaborador
            </button>
          </div>
        </div>

        {/* Users Table / List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider select-none">
                <th className="py-4.5 px-6 md:px-8">Nome</th>
                <th className="py-4.5 px-6">E-mail</th>
                <th className="py-4.5 px-6">Função</th>
                <th className="py-4.5 px-6 md:px-8 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((usr) => {
                const isCurrentLogged = usr.email.toLowerCase() === currentUser.email.toLowerCase();
                const userInit = usr.name ? usr.name.charAt(0).toUpperCase() : 'C';
                
                return (
                  <tr key={usr.id} className="hover:bg-gray-50/40 transition group">
                    <td className="py-3.5 px-6 md:px-8">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none ${getAvatarBg(usr.name)}`}>
                          {userInit}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-[#111111] text-[13px] tracking-tight block">
                              {usr.name}
                            </span>
                            {isCurrentLogged && (
                              <span className="bg-neutral-900 text-white text-[8px] font-black px-1.5 py-0.2 rounded uppercase select-none tracking-tight">
                                VOCÊ
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-3.5 px-6 text-xs text-gray-500 font-medium select-all">
                      {usr.email}
                    </td>

                    <td className="py-3.5 px-6">
                      {usr.role === 'ADMIN' ? (
                        <span className="bg-rose-55 text-rose-600 bg-rose-50/60 border border-rose-100 rounded-full px-2.5 py-1 text-[9px] font-bold tracking-tight">
                          ADMIN
                        </span>
                      ) : (
                        <span className="bg-blue-55 text-blue-600 bg-blue-50/60 border border-blue-100 rounded-full px-2.5 py-1 text-[9px] font-bold tracking-tight">
                          FINANCEIRO
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-6 md:px-8 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleResetPassword(usr.id)}
                          className="p-2 text-gray-300 hover:text-neutral-900 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                          title="Resetar senha para '123456'"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            if (isCurrentLogged) {
                              showTemporaryAlert('error', 'Por motivos de segurança, você não pode excluir sua própria conta atualmente conectada.');
                              return;
                            }
                            setDeletingUserId(usr.id);
                          }}
                          disabled={isCurrentLogged}
                          className={`p-2 rounded-lg transition scroll-m-2 ${
                            isCurrentLogged 
                              ? 'text-gray-200 cursor-not-allowed opacity-30' 
                              : 'text-gray-300 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                          }`}
                          title={isCurrentLogged ? 'Sua própria conta ativa' : 'Excluir colaborador'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

      {/* Simulator Quick Toggle Box at the bottom for quick permissions check */}
      {isAdmin && (
        <div className="bg-[#FAF9F5] border border-amber-100 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-white border border-amber-150 rounded-xl mt-0.5">
              <ShieldCheck className={`w-5 h-5 ${isAdmin ? 'text-neutral-900' : 'text-gray-400'}`} />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                Zona de Simulação de Perfis Rápida
              </h4>
              <p className="text-[11px] text-amber-700/80 mt-0.5 leading-relaxed max-w-xl">
                Alterne rapidamente seu papel logado de teste para verificar as regras de governança e permissões da aplicação entre <strong>ADMIN</strong> e <strong>USER (Financeiro)</strong> na aba atual.
              </p>
            </div>
          </div>

          <button
            id="toggle-user-role-simulation-btn-upgraded"
            onClick={onToggleRole}
            className="flex items-center gap-2 px-4 py-2.5 border border-amber-200 hover:border-neutral-950 rounded-xl bg-white text-xs font-extrabold text-neutral-900 transition shrink-0 cursor-pointer hover:shadow-xs"
          >
            {isAdmin ? (
              <>
                Simular como Financeiro (USER)
                <ToggleRight className="w-5 h-5 text-neutral-950 animate-pulse" />
              </>
            ) : (
              <>
                Simular como Admin (ADMIN)
                <ToggleLeft className="w-5 h-5 text-gray-400" />
              </>
            )}
          </button>
        </div>
      )}

      {/* System Wipe Danger Zone */}
      {isAdmin && onResetSystem && (
        <div className="bg-white rounded-2xl border border-rose-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-xs font-black text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Zona de Perigo Administrativa
            </h4>
            <p className="text-[11px] text-gray-400 leading-relaxed max-w-xl">
              Zerar banco de dados do sistema. Isso apagará permanentemente todas as contas/caixinhas, histórico completo de lançamentos, prestações de contas resolvidas, reembolsos e logs de fechamento competencial.
            </p>
          </div>
          <button
            id="reset-system-database-btn"
            onClick={() => {
              if (confirm('ATENÇÃO: Deseja REALMENTE zerar todo o banco de dados do sistema?\n\nEsta operação é definitiva, removerá permanentemente todos os lançamentos de caixinha, prestações, reembolsos, e excluirá todas as contas salvando saldos em R$ 0,00.')) {
                onResetSystem();
                showTemporaryAlert('success', 'Banco de dados redefinido com sucesso! Sistema iniciado do zero.');
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            Zerar Banco de Dados do Sistema
          </button>
        </div>
      )}

      {/* 1. Modal: Novo Colaborador */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 animate-scale-up">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-neutral-50">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-700" />
                <h3 className="font-extrabold text-sm text-gray-900">Novo Colaborador</h3>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 px-[7px] text-gray-400 hover:text-gray-900 hover:bg-gray-200/60 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Alert embedded */}
            {alertMessage && alertMessage.type === 'error' && (
              <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{alertMessage.text}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                  Nome Completo
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Lucineia de Souza"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 hover:bg-gray-100/50 focus:bg-white border border-gray-200 focus:border-neutral-900 rounded-xl text-xs font-bold tracking-tight outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                  Endereço de E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    placeholder="compras@charquesuprema.com.br"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 hover:bg-gray-100/50 focus:bg-white border border-gray-200 focus:border-neutral-900 rounded-xl text-xs font-bold tracking-tight outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 select-none">
                  Nível de Permissão (Função)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormRole('USER')}
                    className={`p-3 border rounded-xl flex flex-col justify-start text-left cursor-pointer transition ${
                      formRole === 'USER' 
                        ? 'border-blue-500 bg-blue-50/50' 
                        : 'border-gray-200 hover:border-gray-400 bg-white'
                    }`}
                  >
                    <span className={`text-[10px] font-black ${formRole === 'USER' ? 'text-blue-700' : 'text-gray-500'}`}>
                      FINANCEIRO
                    </span>
                    <span className="text-[9px] text-gray-400 mt-0.5 leading-relaxed">
                      Lançamentos simples e relatórios básicos
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormRole('ADMIN')}
                    className={`p-3 border rounded-xl flex flex-col justify-start text-left cursor-pointer transition ${
                      formRole === 'ADMIN' 
                        ? 'border-rose-500 bg-rose-50/50' 
                        : 'border-gray-200 hover:border-gray-400 bg-white'
                    }`}
                  >
                    <span className={`text-[10px] font-black ${formRole === 'ADMIN' ? 'text-rose-700' : 'text-gray-500'}`}>
                      ADMINISTRADOR
                    </span>
                    <span className="text-[9px] text-gray-400 mt-0.5 leading-relaxed">
                      Acesso total, exclusões e fechamento mensal
                    </span>
                  </button>
                </div>
              </div>

              <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3 text-[10px] text-amber-800 leading-relaxed">
                <strong>Simulação de Acesso:</strong> Todos os novos colaboradores entram no sistema usando a senha padrão <strong>123456</strong> para facilitar testes em múltiplos navegadores.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 text-gray-600 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-950 hover:bg-neutral-850 text-white rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  Cadastrar Colaborador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Confirm Deletion */}
      {deletingUserId && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 border border-gray-100 text-center animate-scale-up">
            <div className="mx-auto w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="font-extrabold text-gray-900 text-sm tracking-tight">Excluir Colaborador?</h3>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Deseja realmente remover permanentemente este colaborador? Ele perderá imediatamente todo o acesso ao sistema.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setDeletingUserId(null)}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold transition cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
